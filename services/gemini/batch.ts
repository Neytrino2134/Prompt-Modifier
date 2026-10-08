import { Modality } from "@google/genai";
import { convertToPNG } from '../../utils/imageUtils';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { getDeviceId, formatWithDeviceTag, extractDeviceId } from '../../utils/deviceId';
import { getModelForMode, normalizeImageModelId } from '../modelConfig';
import {
    createOpenAiBatchImageJob,
    getOpenAiBatchJobStatus,
    extractImagesFromOpenAiBatchJob,
    cancelOpenAiBatchJob,
    listOpenAiBatchJobs
} from '../openaiService';
import { createAIClient, callWithRetry, getApiKey } from './client';
import { BatchRequestItemInput } from './types';

// ==========================================
// BATCH API (Delayed Async Processing)
// ==========================================

/**
 * Creates a Batch API job for asynchronous processing up to 24h with 50% discount.
 */
export const createBatchImageJob = async (
    items: BatchRequestItemInput[],
    model: string = 'gemini-3-pro-image-preview',
    displayName?: string
): Promise<{ name: string; state: string; rawJsonl?: string }> => {
    const normalizedModel = normalizeImageModelId(model) || 'gemini-3-pro-image-preview';
    const currentDeviceId = getDeviceId();
    const taggedDisplayName = formatWithDeviceTag(displayName || `Gemini Batch`, currentDeviceId);

    const isOpenAi = normalizedModel.startsWith('dall-e') || normalizedModel.startsWith('openai') || normalizedModel.startsWith('gpt-image') || normalizedModel.includes('gpt-image');
    if (isOpenAi) {
        return await createOpenAiBatchImageJob(items, normalizedModel, taggedDisplayName);
    }

    return callWithRetry(async () => {
        const ai = createAIClient();

        // Build inlined requests
        const inlinedRequests = items.map(item => {
            const isNanoBananaProOrFlash = normalizedModel === 'gemini-nano-banana-2.1' ||
                normalizedModel === 'gemini-3-pro-image-preview' ||
                normalizedModel === 'gemini-3-pro-image' ||
                normalizedModel === 'gemini-3.1-flash-image-preview' ||
                normalizedModel === 'gemini-3.1-flash-image';

            if (isNanoBananaProOrFlash) {
                const parts: any[] = [];
                if (item.images && item.images.length > 0) {
                    item.images.forEach(img => {
                        parts.push({
                            inlineData: {
                                data: img.base64ImageData,
                                mimeType: img.mimeType || 'image/png'
                            }
                        });
                    });
                }
                if (item.prompt && item.prompt.trim() !== '') {
                    parts.push({ text: item.prompt });
                } else {
                    parts.push({ text: "High quality image" });
                }

                const itemConfig: any = {
                    imageConfig: {
                        aspectRatio: item.aspectRatio || '1:1',
                        imageSize: item.resolution || '1K'
                    }
                };

                if (
                    item.thinkingLevel &&
                    item.thinkingLevel !== 'AUTO' &&
                    item.thinkingLevel !== 'DEFAULT' &&
                    (normalizedModel === 'gemini-nano-banana-2.1' || normalizedModel.startsWith('gemini-3'))
                ) {
                    itemConfig.thinkingConfig = {
                        thinkingLevel: item.thinkingLevel
                    };
                }

                if (item.searchGrounding && item.searchGrounding !== 'none') {
                    if (normalizedModel === 'gemini-nano-banana-2.1') {
                        const searchTypes: any = {};
                        if (item.searchGrounding === 'web' || item.searchGrounding === 'both') {
                            searchTypes.webSearch = {};
                        }
                        if (item.searchGrounding === 'image' || item.searchGrounding === 'both') {
                            searchTypes.imageSearch = {};
                        }
                        if (Object.keys(searchTypes).length > 0) {
                            itemConfig.tools = [{ googleSearch: { searchTypes } }];
                        }
                    } else if (normalizedModel === 'gemini-3-pro-image-preview' || normalizedModel === 'gemini-3-pro-image') {
                        if (item.searchGrounding === 'web' || item.searchGrounding === 'both') {
                            itemConfig.tools = [{ googleSearch: {} }];
                        }
                    }
                }

                return {
                    contents: [{ parts }],
                    config: itemConfig
                };
            } else {
                // Fallback for gemini-2.5-flash-image or others
                const parts: any[] = [];
                if (item.images && item.images.length > 0) {
                    item.images.forEach(img => {
                        parts.push({
                            inlineData: {
                                data: img.base64ImageData,
                                mimeType: img.mimeType || 'image/png'
                            }
                        });
                    });
                }
                parts.push({ text: item.prompt || " " });

                const config: any = { responseModalities: [Modality.IMAGE] };
                if (item.aspectRatio && item.aspectRatio !== '1:1') {
                    config.imageConfig = { aspectRatio: item.aspectRatio };
                }

                return {
                    contents: [{ parts }],
                    config
                };
            }
        });

        const targetModel = getModelForMode(normalizedModel);
        const batchJob = await ai.batches.create({
            model: targetModel,
            src: inlinedRequests,
            config: taggedDisplayName ? { displayName: taggedDisplayName } : undefined
        });

        return {
            name: batchJob.name || '',
            state: (batchJob.state as string) || 'JOB_STATE_PENDING'
        };
    });
};

/**
 * Fetches the current status and metadata of a Batch API job.
 */
export const getBatchJobStatus = async (jobName: string, options?: { downloadResults?: boolean }): Promise<any> => {
    if (jobName.startsWith('openai_') || jobName.startsWith('batch_')) {
        return await getOpenAiBatchJobStatus(jobName, options);
    }

    return callWithRetry(async () => {
        const ai = createAIClient();
        const batchJob = await ai.batches.get({ name: jobName });
        return batchJob;
    });
};

/**
 * Cancels an active Batch API job.
 */
export const cancelBatchJobService = async (jobName: string): Promise<void> => {
    if (jobName.startsWith('openai_') || jobName.startsWith('batch_')) {
        return await cancelOpenAiBatchJob(jobName);
    }

    return callWithRetry(async () => {
        const ai = createAIClient();
        await ai.batches.cancel({ name: jobName });
    });
};

/**
 * Extracts and formats generated images from a completed BatchJob response.
 */
export const extractImagesFromBatchJob = async (
    batchJob: any,
    itemsMeta: { id: string; prompt: string }[]
): Promise<Array<{ id: string; imageUrl?: string; error?: string; prompt?: string }>> => {
    if (batchJob?.batch || batchJob?.name?.startsWith('openai_') || batchJob?.name?.startsWith('batch_')) {
        return await extractImagesFromOpenAiBatchJob(batchJob, itemsMeta);
    }

    const results: Array<{ id: string; imageUrl?: string; error?: string; prompt?: string }> = [];

    if (batchJob.dest?.inlinedResponses && Array.isArray(batchJob.dest.inlinedResponses)) {
        for (let i = 0; i < batchJob.dest.inlinedResponses.length; i++) {
            const respItem = batchJob.dest.inlinedResponses[i];
            const reqItem = batchJob.src?.inlinedRequests?.[i];
            const promptFromReq = reqItem?.contents?.[0]?.parts?.find((p: any) => p.text)?.text;
            const promptText = (itemsMeta[i] && itemsMeta[i].prompt && !itemsMeta[i].prompt.startsWith('Recovered Batch'))
                ? itemsMeta[i].prompt
                : (promptFromReq || `Batch Item #${i + 1}`);
            const metaId = itemsMeta[i]?.id || `item-${i}`;

            if (respItem.error) {
                results.push({
                    id: metaId,
                    prompt: promptText,
                    error: respItem.error.message || `Error code: ${respItem.error.code || 'UNKNOWN'}`
                });
                continue;
            }

            const response = respItem.response;
            const candidate = response?.candidates?.[0];
            const part = candidate?.content?.parts?.find((p: any) => p.inlineData);

            if (part?.inlineData) {
                try {
                    const mime = part.inlineData.mimeType || 'image/png';
                    const data = part.inlineData.data || '';
                    const dataUrl = `data:${mime};base64,${data}`;
                    const pngDataUrl = await convertToPNG(dataUrl);
                    const finalWithMeta = addMetadataToPNG(pngDataUrl, 'prompt', promptText);
                    results.push({ id: metaId, imageUrl: finalWithMeta, prompt: promptText });
                } catch (e: any) {
                    console.error("Failed to process batch item image:", e);
                    results.push({ id: metaId, prompt: promptText, error: e?.message || 'Image conversion error' });
                }
            } else {
                results.push({
                    id: metaId,
                    prompt: promptText,
                    error: 'No image data in batch response candidate.'
                });
            }
        }
    }

    return results;
};

/**
 * Lists remote Batch API jobs from Gemini.
 */
export const listBatchJobsService = async (): Promise<any[]> => {
    try {
        const apiKey = getApiKey();
        if (!apiKey) return [];
        return await callWithRetry(async () => {
            const ai = createAIClient();
            const response = await ai.batches.list({ config: { pageSize: 50 } });
            const jobs: any[] = [];
            if (Array.isArray(response)) {
                jobs.push(...response);
            } else if (response && Array.isArray((response as any).batchJobs)) {
                jobs.push(...(response as any).batchJobs);
            } else if (response && typeof (response as any)[Symbol.asyncIterator] === 'function') {
                for await (const job of (response as any)) {
                    jobs.push(job);
                }
            }
            return jobs;
        });
    } catch (err) {
        console.warn("Could not list remote Gemini batch jobs:", err);
        return [];
    }
};

/**
 * Lists all remote batch jobs across active providers (Gemini & OpenAI).
 */
export const listAllRemoteBatchJobs = async (): Promise<any[]> => {
    const results: any[] = [];
    try {
        const geminiJobs = await listBatchJobsService();
        if (Array.isArray(geminiJobs)) {
            geminiJobs.forEach((gJob: any) => {
                const devId = extractDeviceId(gJob.displayName) || extractDeviceId(gJob.name);
                results.push({
                    ...gJob,
                    deviceId: devId
                });
            });
        }
    } catch (e) {
        console.warn("Failed to list Gemini batch jobs:", e);
    }

    try {
        const openAiBatches = await listOpenAiBatchJobs();
        if (Array.isArray(openAiBatches)) {
            openAiBatches.forEach(b => {
                const devId = (b as any).deviceId || extractDeviceId(b.displayName) || extractDeviceId(b.id);
                results.push({
                    name: b.id,
                    displayName: b.displayName,
                    model: b.model,
                    state: b.state === 'SUCCEEDED' ? 'JOB_STATE_SUCCEEDED' : (b.state === 'FAILED' ? 'JOB_STATE_FAILED' : (b.state === 'CANCELLED' ? 'JOB_STATE_CANCELLED' : 'JOB_STATE_RUNNING')),
                    createTime: new Date(b.createdAt).toISOString(),
                    deviceId: devId,
                    batch: b
                });
            });
        }
    } catch (e) {
        console.warn("Failed to list OpenAI batch jobs:", e);
    }

    return results;
};
