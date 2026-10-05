import { STORAGE_KEY_OPENAI_BATCH_JOBS, StoredOpenAiBatch } from './types';

// ==========================================
// OpenAI Batch Local Storage Management
// ==========================================

export const getStoredOpenAiBatches = (): StoredOpenAiBatch[] => {
    try {
        const s = localStorage.getItem(STORAGE_KEY_OPENAI_BATCH_JOBS);
        if (!s) return [];
        const parsed = JSON.parse(s);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(b => b && typeof b === 'object' && b.id && Array.isArray(b.items));
    } catch {
        return [];
    }
};

export const saveStoredOpenAiBatches = (batches: StoredOpenAiBatch[]): void => {
    try {
        localStorage.setItem(
            STORAGE_KEY_OPENAI_BATCH_JOBS,
            JSON.stringify(
                batches.map(batch =>
                    batch.outputCached
                        ? { ...batch, items: batch.items.map(({ resultUrl, ...item }) => item) }
                        : batch
                )
            )
        );
    } catch (e) {
        console.error("Failed to save OpenAI batches to storage", e);
    }
};

/**
 * Delete a specific OpenAI batch from storage
 */
export const deleteStoredOpenAiBatch = (jobId: string): void => {
    try {
        const batches = getStoredOpenAiBatches().filter(b => b.id !== jobId && b.nativeBatchId !== jobId);
        saveStoredOpenAiBatches(batches);
    } catch (e) {
        console.error("Failed to delete stored OpenAI batch:", e);
    }
};

/**
 * Clear all OpenAI batch jobs from localStorage
 */
export const clearAllOpenAiBatches = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY_OPENAI_BATCH_JOBS);
    } catch (e) {
        console.error("Failed to clear OpenAI batches storage:", e);
    }
};
