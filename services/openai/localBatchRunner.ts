import { generateOpenAiImage } from './imageGeneration';
import { getStoredOpenAiBatches, saveStoredOpenAiBatches } from './batchStorage';

// ==========================================
// OpenAI Batch Local Queue Fallback Runner
// ==========================================

/**
 * Step-by-step processor for OpenAI Batch items when running locally
 */
export const triggerNextOpenAiBatchItem = async (batchId: string): Promise<void> => {
    const batches = getStoredOpenAiBatches();
    const batch = batches.find(b => b.id === batchId);
    if (!batch || batch.state !== 'RUNNING') return;

    const nextItem = batch.items.find(it => it.status === 'queued');
    if (!nextItem) {
        const allDone = batch.items.every(it => it.status === 'completed' || it.status === 'failed' || it.status === 'cancelled');
        if (allDone) {
            const anySuccess = batch.items.some(it => it.status === 'completed');
            batch.state = anySuccess ? 'SUCCEEDED' : 'FAILED';
            if (!anySuccess) {
                const itemErrors = batch.items.map(it => it.error).filter(Boolean) as string[];
                const uniqueErrors = Array.from(new Set(itemErrors));
                batch.error = uniqueErrors.length > 0
                    ? `All batch items failed:\n${uniqueErrors.join('\n')}`
                    : 'All batch items failed';
            }
            batch.updatedAt = Date.now();
            saveStoredOpenAiBatches(batches);
        }
        return;
    }

    nextItem.status = 'running';
    saveStoredOpenAiBatches(batches);

    try {
        const resultUrl = await generateOpenAiImage(nextItem.prompt, {
            model: batch.model,
            aspectRatio: nextItem.aspectRatio,
            size: nextItem.size,
            quality: nextItem.quality,
            outputFormat: nextItem.outputFormat,
            images: nextItem.images
        });
        nextItem.resultUrl = resultUrl;
        nextItem.status = 'completed';
    } catch (e: any) {
        nextItem.error = typeof e?.message === 'string' ? e.message : (typeof e === 'string' ? e : 'Generation failed');
        nextItem.status = 'failed';
    }

    batch.updatedAt = Date.now();
    saveStoredOpenAiBatches(batches);

    // Continue to next queued item if batch is still active
    const remainingQueued = batch.items.some(it => it.status === 'queued');
    if (remainingQueued) {
        setTimeout(() => {
            triggerNextOpenAiBatchItem(batchId).catch(console.error);
        }, 500);
    } else {
        const anySuccess = batch.items.some(it => it.status === 'completed');
        batch.state = anySuccess ? 'SUCCEEDED' : 'FAILED';
        if (!anySuccess) {
            const itemErrors = batch.items.map(it => it.error).filter(Boolean) as string[];
            const uniqueErrors = Array.from(new Set(itemErrors));
            batch.error = uniqueErrors.length > 0
                ? `All batch items failed:\n${uniqueErrors.join('\n')}`
                : 'All batch items failed';
        }
        batch.updatedAt = Date.now();
        saveStoredOpenAiBatches(batches);
    }
};
