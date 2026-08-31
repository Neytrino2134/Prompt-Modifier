import { addMetadataToPNG } from '../utils/pngMetadata';
import { convertToPNG } from '../utils/imageUtils';

export const STORAGE_KEY_OPENAI_ENABLED = 'settings_openai_enabled';
export const STORAGE_KEY_OPENAI_API_KEY = 'settings_openai_api_key';
export const OPENAI_CONFIG_CHANGE_EVENT = 'openai-config-changed';

/**
 * Check if OpenAI API is enabled in settings
 */
export const isOpenAiEnabled = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY_OPENAI_ENABLED) === 'true';
    } catch {
        return false;
    }
};

/**
 * Enable or disable OpenAI API
 */
export const setOpenAiEnabled = (enabled: boolean): void => {
    try {
        localStorage.setItem(STORAGE_KEY_OPENAI_ENABLED, String(enabled));
        notifyOpenAiConfigChanged();
    } catch (e) {
        console.error('Failed to set OpenAI enabled status', e);
    }
};

/**
 * Get configured OpenAI API Key
 */
export const getOpenAiApiKey = (): string => {
    try {
        const key = localStorage.getItem(STORAGE_KEY_OPENAI_API_KEY);
        if (key && key.trim()) {
            return key.trim();
        }
    } catch {}
    return (process.env.OPENAI_API_KEY || '').trim();
};

/**
 * Save OpenAI API Key
 */
export const setOpenAiApiKey = (key: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_OPENAI_API_KEY, key.trim());
        notifyOpenAiConfigChanged();
    } catch (e) {
        console.error('Failed to save OpenAI API Key', e);
    }
};

/**
 * Notify subscribers about OpenAI config updates
 */
export const notifyOpenAiConfigChanged = (): void => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OPENAI_CONFIG_CHANGE_EVENT, {
            detail: {
                enabled: isOpenAiEnabled(),
                hasKey: !!getOpenAiApiKey()
            }
        }));
    }
};

/**
 * Map aspect ratio or direct size to supported OpenAI resolutions
 */
export const mapAspectRatioToOpenAiSize = (
    aspectRatio?: string,
    model: string = 'gpt-image-2',
    sizeOverride?: string
): string => {
    if (sizeOverride && (sizeOverride === '1024x1024' || sizeOverride === '1024x1536' || sizeOverride === '1536x1024' || sizeOverride === '1792x1024' || sizeOverride === '1024x1792' || sizeOverride === '512x512' || sizeOverride === '256x256')) {
        return sizeOverride;
    }

    if (model.includes('gpt-image-2') || model.startsWith('gpt-image')) {
        if (!aspectRatio) return '1024x1024';
        const ratio = aspectRatio.trim();
        if (ratio === '16:9' || ratio === '4:3' || ratio === '3:2' || ratio === '4:1' || ratio === '8:1') {
            return '1536x1024'; // Landscape for GPT-Image-2
        }
        if (ratio === '9:16' || ratio === '3:4' || ratio === '2:3' || ratio === '1:4' || ratio === '1:8') {
            return '1024x1536'; // Portrait for GPT-Image-2
        }
        return '1024x1024';
    }

    if (model === 'dall-e-2') {
        return '1024x1024';
    }
    
    if (!aspectRatio) return '1024x1024';
    const ratio = aspectRatio.trim();

    if (ratio === '16:9' || ratio === '4:3' || ratio === '4:1' || ratio === '8:1') {
        return '1792x1024'; // Wide horizontal
    }
    if (ratio === '9:16' || ratio === '3:4' || ratio === '1:4' || ratio === '1:8') {
        return '1024x1792'; // Tall vertical
    }
    return '1024x1024'; // Square (1:1)
};

export interface OpenAiImageGenerationOptions {
    model?: string;
    aspectRatio?: string;
    quality?: 'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd' | string;
    style?: 'vivid' | 'natural';
    resolution?: string;
    size?: string;
    outputFormat?: 'png' | 'jpeg' | 'webp' | string;
    images?: { base64ImageData: string; mimeType: string }[];
}

/**
 * Generate an image using OpenAI DALL-E or GPT-Image API
 */
export const generateOpenAiImage = async (
    prompt: string,
    options: OpenAiImageGenerationOptions = {}
): Promise<string> => {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new Error("OpenAI API Key is missing. Please enter your OpenAI API key in Settings.");
    }

    if (!prompt || !prompt.trim()) {
        throw new Error("Prompt is required for OpenAI image generation.");
    }

    const rawModel = options.model || 'gpt-image-2';
    const isGptImage2 = rawModel.includes('gpt-image-2') || rawModel.startsWith('gpt-image');
    let targetModel = isGptImage2 ? 'gpt-image-2' : 'dall-e-3';
    let style: 'vivid' | 'natural' | undefined = undefined;
    let quality: string = isGptImage2 ? (options.quality || 'auto') : (options.quality || 'hd');
    const outputFormat = options.outputFormat || 'png';

    if (!isGptImage2) {
        if (rawModel.includes('dall-e-2')) {
            targetModel = 'dall-e-2';
            quality = 'standard';
        } else if (rawModel.includes('vivid')) {
            targetModel = 'dall-e-3';
            style = 'vivid';
        } else if (rawModel.includes('natural')) {
            targetModel = 'dall-e-3';
            style = 'natural';
        }
    }

    // 1. If input images are provided for image editing / variations:
    if (options.images && options.images.length > 0) {
        try {
            const firstImg = options.images[0];
            const byteString = atob(firstImg.base64ImageData);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: firstImg.mimeType || 'image/png' });
            
            const formData = new FormData();
            formData.append('image', blob, 'input.png');
            formData.append('prompt', prompt.trim());
            formData.append('model', 'dall-e-2');
            formData.append('size', '1024x1024');
            formData.append('response_format', 'b64_json');
            formData.append('n', '1');

            const response = await fetch('https://api.openai.com/v1/images/edits', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok && !data.error && (data.data?.[0]?.b64_json || data.data?.[0]?.url)) {
                const b64 = data.data[0].b64_json;
                if (b64) {
                    const dataUrl = `data:image/png;base64,${b64}`;
                    const pngDataUrl = await convertToPNG(dataUrl);
                    return addMetadataToPNG(pngDataUrl, 'prompt', prompt);
                }
            }
        } catch (editError: any) {
            console.warn("OpenAI image edit fallback to generations endpoint:", editError?.message);
        }
    }

    // 2. Standard Generation with Automatic Fallback for model availability (gpt-image-2 -> dall-e-3)
    const callOpenAiGen = async (modelToUse: string, isGptImg2: boolean) => {
        const genSize = mapAspectRatioToOpenAiSize(options.aspectRatio, modelToUse, options.size);
        const requestBody: Record<string, any> = {
            model: modelToUse,
            prompt: prompt.trim(),
            n: 1,
            size: genSize,
        };

        if (isGptImg2 && modelToUse === 'gpt-image-2') {
            requestBody.quality = quality;
            if (outputFormat) {
                requestBody.output_format = outputFormat;
            }
        } else {
            requestBody.response_format = 'b64_json';
            if (modelToUse === 'dall-e-3') {
                requestBody.quality = (quality === 'auto' || quality === 'high') ? 'hd' : (quality || 'hd');
                if (style) requestBody.style = style;
            }
        }

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        return { response, data };
    };

    let { response, data } = await callOpenAiGen(targetModel, isGptImage2);

    // If model 'gpt-image-2' returned model_not_found, 400 or 404, retry seamlessly with 'dall-e-3'
    if (!response.ok && isGptImage2 && (data.error?.code === 'model_not_found' || data.error?.message?.includes('model') || response.status === 400 || response.status === 404)) {
        console.warn(`OpenAI model '${targetModel}' not available, retrying seamlessly with dall-e-3...`);
        const retryResult = await callOpenAiGen('dall-e-3', false);
        response = retryResult.response;
        data = retryResult.data;
    }

    if (!response.ok || data.error) {
        const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : `OpenAI API returned status ${response.status}`);
        throw new Error(errorMsg);
    }

    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
        // Fallback if URL was returned
        const url = data.data?.[0]?.url;
        if (url) {
            const imgRes = await fetch(url);
            const imgBlob = await imgRes.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async () => {
                    const dataUrl = reader.result as string;
                    try {
                        const pngDataUrl = await convertToPNG(dataUrl);
                        resolve(addMetadataToPNG(pngDataUrl, 'prompt', prompt));
                    } catch {
                        resolve(dataUrl);
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(imgBlob);
            });
        }
        throw new Error("No image data returned from OpenAI API.");
    }

    const dataUrl = `data:image/png;base64,${b64}`;
    try {
        const pngDataUrl = await convertToPNG(dataUrl);
        return addMetadataToPNG(pngDataUrl, 'prompt', prompt);
    } catch (e) {
        console.error("Failed to add metadata to OpenAI image:", e);
        return dataUrl;
    }
};

// ==========================================
// OpenAI Batch API & Delayed Queue Service
// ==========================================

const STORAGE_KEY_OPENAI_BATCH_JOBS = 'openai_batch_store_v1';

interface StoredOpenAiBatch {
    id: string;
    model: string;
    displayName: string;
    state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    createdAt: number;
    updatedAt: number;
    nativeBatchId?: string;
    items: {
        id: string;
        prompt: string;
        aspectRatio?: string;
        size?: string;
        quality?: string;
        outputFormat?: string;
        images?: { base64ImageData: string; mimeType: string }[];
        status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
        resultUrl?: string;
        error?: string;
    }[];
}

const getStoredOpenAiBatches = (): StoredOpenAiBatch[] => {
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

const saveStoredOpenAiBatches = (batches: StoredOpenAiBatch[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY_OPENAI_BATCH_JOBS, JSON.stringify(batches));
    } catch (e) {
        console.error("Failed to save OpenAI batches to storage", e);
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

/**
 * Submit an OpenAI Batch Image Job
 */
export const createOpenAiBatchImageJob = async (
    items: Array<{
        id: string;
        prompt: string;
        aspectRatio?: string;
        resolution?: string;
        size?: string;
        quality?: string;
        outputFormat?: string;
        images?: { base64ImageData: string; mimeType: string }[];
    }>,
    model: string = 'gpt-image-2',
    displayName?: string
): Promise<{ name: string; state: string }> => {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new Error("OpenAI API Key is missing. Please enter your OpenAI API key in Settings.");
    }

    const batchInternalId = `openai_batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isGptImage2 = model.includes('gpt-image-2') || model.startsWith('gpt-image');
    const targetModel = isGptImage2 ? 'gpt-image-2' : (model.includes('dall-e-2') ? 'dall-e-2' : 'dall-e-3');

    // Attempt OpenAI native Batch API file upload & batch creation
    let nativeBatchId: string | undefined = undefined;

    try {
        // Construct jsonl lines for OpenAI Batch API
        const jsonlLines = items.map((item, idx) => {
            const size = mapAspectRatioToOpenAiSize(item.aspectRatio, targetModel, item.size);
            const quality = item.quality || (isGptImage2 ? 'auto' : 'hd');
            const body: any = {
                model: targetModel,
                prompt: item.prompt,
                n: 1,
                size,
            };
            if (isGptImage2) {
                body.quality = quality;
                if (item.outputFormat) body.output_format = item.outputFormat;
            } else {
                body.response_format = 'b64_json';
                if (targetModel === 'dall-e-3') {
                    body.quality = quality === 'auto' ? 'hd' : quality;
                }
            }

            return JSON.stringify({
                custom_id: `${batchInternalId}__${item.id || idx}`,
                method: "POST",
                url: "/v1/images/generations",
                body
            });
        });

        const jsonlBlob = new Blob([jsonlLines.join('\n')], { type: 'application/json' });
        const fileFormData = new FormData();
        fileFormData.append('file', jsonlBlob, `batch_${batchInternalId}.jsonl`);
        fileFormData.append('purpose', 'batch');

        const fileRes = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: fileFormData
        });

        if (fileRes.ok) {
            const fileData = await fileRes.json();
            if (fileData?.id) {
                const batchRes = await fetch('https://api.openai.com/v1/batches', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        input_file_id: fileData.id,
                        endpoint: '/v1/images/generations',
                        completion_window: '24h'
                    })
                });

                if (batchRes.ok) {
                    const batchData = await batchRes.json();
                    if (batchData?.id) {
                        nativeBatchId = batchData.id;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("OpenAI native Batch API not available or file upload rejected, using asynchronous delayed batch processing:", e);
    }

    const newBatch: StoredOpenAiBatch = {
        id: batchInternalId,
        model,
        displayName: displayName || `OpenAI Batch (${model})`,
        state: 'RUNNING',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nativeBatchId,
        items: items.map(item => ({
            id: item.id,
            prompt: item.prompt,
            aspectRatio: item.aspectRatio,
            size: item.size,
            quality: item.quality,
            outputFormat: item.outputFormat,
            images: item.images,
            status: 'queued'
        }))
    };

    const batches = getStoredOpenAiBatches();
    batches.push(newBatch);
    saveStoredOpenAiBatches(batches);

    // If running in local background runner, kick off first processing step
    triggerNextOpenAiBatchItem(batchInternalId).catch(console.error);

    return {
        name: batchInternalId,
        state: 'JOB_STATE_RUNNING'
    };
};

/**
 * Check status of an OpenAI Batch Job
 */
export const getOpenAiBatchJobStatus = async (jobName: string): Promise<any> => {
    const batches = getStoredOpenAiBatches();
    const batch = batches.find(b => b.id === jobName || b.nativeBatchId === jobName);
    if (!batch) {
        return { state: 'JOB_STATE_FAILED', error: { message: 'OpenAI Batch not found' } };
    }

    const apiKey = getOpenAiApiKey();

    // If connected to native OpenAI Batch API
    if (batch.nativeBatchId && apiKey) {
        try {
            const res = await fetch(`https://api.openai.com/v1/batches/${batch.nativeBatchId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (res.ok) {
                const batchStatus = await res.json();
                const status = batchStatus.status; // validating, in_progress, completed, failed, expired, cancelling, cancelled
                if (status === 'completed') {
                    // Fetch completed output file
                    if (batchStatus.output_file_id) {
                        const fileRes = await fetch(`https://api.openai.com/v1/files/${batchStatus.output_file_id}/content`, {
                            headers: { 'Authorization': `Bearer ${apiKey}` }
                        });
                        if (fileRes.ok) {
                            const fileText = await fileRes.text();
                            const lines = fileText.trim().split('\n').filter(Boolean);
                            lines.forEach(line => {
                                try {
                                    const parsed = JSON.parse(line);
                                    const customId = parsed.custom_id || '';
                                    const itemId = customId.includes('__') ? customId.split('__')[1] : customId;
                                    const b64 = parsed.response?.body?.data?.[0]?.b64_json;
                                    const url = parsed.response?.body?.data?.[0]?.url;
                                    const item = batch.items.find(it => it.id === itemId);
                                    if (item) {
                                        if (b64) {
                                            item.resultUrl = `data:image/png;base64,${b64}`;
                                            item.status = 'completed';
                                        } else if (url) {
                                            item.resultUrl = url;
                                            item.status = 'completed';
                                        }
                                    }
                                } catch {}
                            });
                        }
                    }
                    batch.state = 'SUCCEEDED';
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);
                    return { state: 'JOB_STATE_SUCCEEDED', batch };
                } else if (status === 'failed' || status === 'expired') {
                    batch.state = 'FAILED';
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);
                    return { state: 'JOB_STATE_FAILED', error: { message: batchStatus.errors || 'Batch job failed' }, batch };
                } else if (status === 'cancelled') {
                    batch.state = 'CANCELLED';
                    saveStoredOpenAiBatches(batches);
                    return { state: 'JOB_STATE_CANCELLED', batch };
                }
            }
        } catch (e) {
            console.warn("Could not query OpenAI native batch:", e);
        }
    }

    // Step-by-step background processing
    await triggerNextOpenAiBatchItem(batch.id);

    const allDone = batch.items.every(it => it.status === 'completed' || it.status === 'failed' || it.status === 'cancelled');
    if (allDone) {
        const anySuccess = batch.items.some(it => it.status === 'completed');
        batch.state = anySuccess ? 'SUCCEEDED' : 'FAILED';
        saveStoredOpenAiBatches(batches);
        return {
            state: anySuccess ? 'JOB_STATE_SUCCEEDED' : 'JOB_STATE_FAILED',
            batch
        };
    }

    return {
        state: 'JOB_STATE_RUNNING',
        batch
    };
};

/**
 * Step-by-step processor for OpenAI Batch items
 */
const triggerNextOpenAiBatchItem = async (batchId: string): Promise<void> => {
    const batches = getStoredOpenAiBatches();
    const batch = batches.find(b => b.id === batchId);
    if (!batch || batch.state !== 'RUNNING') return;

    const nextItem = batch.items.find(it => it.status === 'queued');
    if (!nextItem) {
        const allDone = batch.items.every(it => it.status === 'completed' || it.status === 'failed' || it.status === 'cancelled');
        if (allDone) {
            const anySuccess = batch.items.some(it => it.status === 'completed');
            batch.state = anySuccess ? 'SUCCEEDED' : 'FAILED';
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
        batch.updatedAt = Date.now();
        saveStoredOpenAiBatches(batches);
    }
};

/**
 * Extract images from completed OpenAI batch job
 */
export const extractImagesFromOpenAiBatchJob = async (
    sdkJob: any,
    itemsMeta: Array<{ id: string; prompt: string }>
): Promise<Array<{ id: string; imageUrl?: string; error?: string; prompt?: string }>> => {
    const batch: StoredOpenAiBatch | undefined = sdkJob?.batch || getStoredOpenAiBatches().find(b => b.id === sdkJob?.name);
    if (!batch) return [];

    if (!itemsMeta || itemsMeta.length === 0) {
        return batch.items.map(it => ({
            id: it.id,
            imageUrl: it.resultUrl,
            error: it.error,
            prompt: it.prompt
        }));
    }

    return itemsMeta.map((meta, idx) => {
        const item = batch.items.find(it => it.id === meta.id) || batch.items[idx];
        return {
            id: meta.id || item?.id || `item-${idx}`,
            imageUrl: item?.resultUrl,
            error: item?.error,
            prompt: item?.prompt || meta.prompt
        };
    });
};

/**
 * Cancel an OpenAI Batch job
 */
export const cancelOpenAiBatchJob = async (jobName: string): Promise<void> => {
    const batches = getStoredOpenAiBatches();
    const batch = batches.find(b => b.id === jobName || b.nativeBatchId === jobName);
    if (!batch) return;

    batch.state = 'CANCELLED';
    batch.items.forEach(it => {
        if (it.status === 'queued' || it.status === 'running') it.status = 'cancelled';
    });
    saveStoredOpenAiBatches(batches);

    if (batch.nativeBatchId) {
        const apiKey = getOpenAiApiKey();
        if (apiKey) {
            try {
                await fetch(`https://api.openai.com/v1/batches/${batch.nativeBatchId}/cancel`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
            } catch {}
        }
    }
};

/**
 * List OpenAI Batch jobs (combines locally stored batches and remote native batches)
 */
export const listOpenAiBatchJobs = async (): Promise<StoredOpenAiBatch[]> => {
    const localBatches = getStoredOpenAiBatches();
    const apiKey = getOpenAiApiKey();
    if (!apiKey) return localBatches;

    try {
        const res = await fetch('https://api.openai.com/v1/batches?limit=50', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (res.ok) {
            const data = await res.json();
            const remoteBatches = data.data || [];
            let changed = false;
            for (const rb of remoteBatches) {
                const existing = localBatches.find(b => b.nativeBatchId === rb.id || b.id === rb.id);
                if (!existing) {
                    const mappedStatus = rb.status === 'completed' ? 'SUCCEEDED' : (rb.status === 'failed' || rb.status === 'expired' ? 'FAILED' : (rb.status === 'cancelled' ? 'CANCELLED' : 'RUNNING'));
                    localBatches.push({
                        id: `openai_batch_${rb.id}`,
                        model: 'gpt-image-2',
                        displayName: `OpenAI Batch (${rb.id})`,
                        state: mappedStatus,
                        createdAt: rb.created_at ? rb.created_at * 1000 : Date.now(),
                        updatedAt: Date.now(),
                        nativeBatchId: rb.id,
                        items: [{
                            id: '0',
                            prompt: 'Batch Item',
                            status: rb.status === 'completed' ? 'completed' : 'queued'
                        }]
                    });
                    changed = true;
                }
            }
            if (changed) {
                saveStoredOpenAiBatches(localBatches);
            }
        }
    } catch (e) {
        console.warn("Failed to fetch OpenAI remote batches:", e);
    }
    return localBatches;
};

