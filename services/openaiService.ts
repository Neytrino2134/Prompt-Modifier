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
    model: string = 'gpt-image-2.5-flare',
    sizeOverride?: string
): string => {
    if (sizeOverride && (sizeOverride === '1024x1024' || sizeOverride === '1024x1536' || sizeOverride === '1536x1024' || sizeOverride === '1792x1024' || sizeOverride === '1024x1792' || sizeOverride === '512x512' || sizeOverride === '256x256')) {
        return sizeOverride;
    }

    if (model.includes('gpt-image') || model.startsWith('gpt-image')) {
        if (!aspectRatio) return '1024x1024';
        const ratio = aspectRatio.trim();
        if (ratio === '16:9' || ratio === '4:3' || ratio === '3:2' || ratio === '4:1' || ratio === '8:1') {
            return '1536x1024'; // Landscape for GPT-Image models
        }
        if (ratio === '9:16' || ratio === '3:4' || ratio === '2:3' || ratio === '1:4' || ratio === '1:8') {
            return '1024x1536'; // Portrait for GPT-Image models
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

/**
 * Maps user-selected model presets (e.g. 'gpt-image-2.5-flare', 'gpt-image-2.5-sunburst')
 * or internal model IDs to valid, supported OpenAI API image model names ('gpt-image-2', 'dall-e-3', 'dall-e-2').
 * Prevents non-existent models or accidental LLM models (e.g. 'gpt-5.6') from being sent to image endpoints.
 */
export const mapToOpenAiApiImageModel = (modelName?: string): string => {
    if (!modelName) return 'gpt-image-2';
    const m = modelName.trim().toLowerCase();
    if (m.includes('dall-e-2') || m === 'dall-e-2') return 'dall-e-2';
    if (m.includes('dall-e-3') || m.includes('dalle3') || m === 'dall-e-3') return 'dall-e-3';
    // All GPT-Image models and presets in OpenAI API are backed by 'gpt-image-2'
    if (m.includes('gpt-image') || m.includes('flare') || m.includes('sunburst')) return 'gpt-image-2';
    // Guard against accidental LLM model names passed to image generation/editing
    if (m.startsWith('gpt-')) return 'gpt-image-2';
    return 'gpt-image-2';
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

    const rawModel = options.model || 'gpt-image-2.5-flare';
    const isGptImage = rawModel.includes('gpt-image') || rawModel.includes('flare') || rawModel.includes('sunburst') || rawModel.startsWith('gpt-');
    
    // Map to official OpenAI API model ID ('gpt-image-2', 'dall-e-3', 'dall-e-2')
    let targetModel = mapToOpenAiApiImageModel(rawModel);

    let style: 'vivid' | 'natural' | undefined = undefined;
    let quality: string = isGptImage ? (options.quality || (rawModel.includes('sunburst') ? 'high' : 'auto')) : (options.quality || 'hd');
    const outputFormat = options.outputFormat || 'png';

    if (!isGptImage) {
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
        const genSize = mapAspectRatioToOpenAiSize(options.aspectRatio, targetModel, options.size);
        const formData = new FormData();
        
        // Append input images
        for (let idx = 0; idx < options.images.length; idx++) {
            const img = options.images[idx];
            if (!img || !img.base64ImageData) continue;
            
            const byteString = atob(img.base64ImageData);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const mime = img.mimeType || 'image/png';
            const blob = new Blob([ab], { type: mime });
            const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : (mime.includes('webp') ? 'webp' : 'png');
            formData.append('image', blob, `input_${idx}.${ext}`);
            
            // DALL-E 2 only accepts a single square PNG image
            if (targetModel === 'dall-e-2') break;
        }

        formData.append('prompt', prompt.trim());
        formData.append('model', targetModel);
        formData.append('n', '1');

        if (isGptImage) {
            formData.append('size', genSize);
            if (quality) formData.append('quality', quality);
            if (outputFormat) formData.append('output_format', outputFormat);
        } else if (targetModel === 'dall-e-2') {
            formData.append('size', (genSize === '512x512' || genSize === '256x256') ? genSize : '1024x1024');
            formData.append('response_format', 'b64_json');
        } else {
            formData.append('size', genSize);
            formData.append('response_format', 'b64_json');
        }

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
            const url = data.data[0].url;
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
        }

        // If editing returned an error, report it directly so the user gets proper feedback
        if (data?.error) {
            const errorMsg = data.error.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
            throw new Error(`OpenAI Image Edit error: ${errorMsg}`);
        } else if (!response.ok) {
            throw new Error(`OpenAI Image Edit failed with status ${response.status}`);
        }
        throw new Error("No image data returned from OpenAI image edit endpoint.");
    }

    // 2. Standard Generation with Automatic Fallback for model availability (gpt-image-2.5 -> gpt-image-2 -> dall-e-3)
    const callOpenAiGen = async (modelToUse: string, isGpt: boolean) => {
        const genSize = mapAspectRatioToOpenAiSize(options.aspectRatio, modelToUse, options.size);
        const requestBody: Record<string, any> = {
            model: modelToUse,
            prompt: prompt.trim(),
            n: 1,
            size: genSize,
        };

        if (isGpt) {
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

    let { response, data } = await callOpenAiGen(targetModel, isGptImage);

    // If new model returned model_not_found, 400 or 404, retry seamlessly with 'gpt-image-2' or 'dall-e-3'
    if (!response.ok && isGptImage && (data.error?.code === 'model_not_found' || data.error?.message?.includes('model') || response.status === 400 || response.status === 404)) {
        if (targetModel !== 'gpt-image-2') {
            console.warn(`OpenAI model '${targetModel}' not available, retrying with gpt-image-2...`);
            const retryResult = await callOpenAiGen('gpt-image-2', true);
            response = retryResult.response;
            data = retryResult.data;
        }
        if (!response.ok) {
            console.warn(`Retrying OpenAI generation seamlessly with dall-e-3...`);
            const retryDalle = await callOpenAiGen('dall-e-3', false);
            response = retryDalle.response;
            data = retryDalle.data;
        }
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
const OPENAI_BATCH_IMAGE_GEN_ENDPOINT = '/v1/images/generations';
const OPENAI_BATCH_IMAGE_EDITS_ENDPOINT = '/v1/images/edits';

export const resolveOpenAiBatchModel = (modelName?: string): string => {
    if (!modelName) return 'gpt-image-2.5-flare';
    const m = modelName.trim().toLowerCase();
    if (m.includes('flare') || m === 'gpt-image-2.5-flare') return 'gpt-image-2.5-flare';
    if (m.includes('sunburst') || m === 'gpt-image-2.5-sunburst') return 'gpt-image-2.5-sunburst';
    if (m === 'gpt-image-2.5') return 'gpt-image-2.5';
    if (m === 'gpt-image-2' || m.includes('gpt-image-2')) return 'gpt-image-2';
    if (m.includes('gpt-image-1.5')) return 'gpt-image-1.5';
    if (m.includes('gpt-image-1-mini')) return 'gpt-image-1-mini';
    if (m.includes('gpt-image-1')) return 'gpt-image-1';
    if (m.startsWith('gpt-image')) return 'gpt-image-2';
    if (m.includes('dall-e-2')) return 'dall-e-2';
    if (m.includes('dall-e-3')) return 'dall-e-3';
    // If an LLM model or invalid name is passed, fallback safely to gpt-image-2.5-flare
    if (m.startsWith('gpt-')) return 'gpt-image-2.5-flare';
    return 'gpt-image-2.5-flare';
};

interface StoredOpenAiBatch {
    id: string;
    model: string;
    displayName: string;
    state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    createdAt: number;
    updatedAt: number;
    nativeBatchId?: string;
    endpoint?: string;
    error?: string;
    rawJsonl?: string;
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

const normalizeOpenAiBatchError = (value: any, fallback: string): string => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (value.message && typeof value.message === 'string') return value.message;
    if (Array.isArray(value.data)) {
        const messages = value.data
            .map((err: any) => err?.message || err?.code)
            .filter(Boolean);
        if (messages.length > 0) return messages.join('; ');
    }
    try {
        return JSON.stringify(value);
    } catch {
        return fallback;
    }
};

const waitForOpenAiBatchFileReady = async (fileId: string, apiKey: string): Promise<void> => {
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            throw new Error(normalizeOpenAiBatchError(errorData?.error || errorData, `OpenAI could not retrieve uploaded batch file ${fileId}`));
        }

        const fileData = await res.json();
        const status = String(fileData?.status || '').toLowerCase();
        if (!status || status === 'processed' || status === 'uploaded') {
            return;
        }
        if (status === 'error' || status === 'failed') {
            throw new Error(normalizeOpenAiBatchError(fileData?.status_details || fileData?.error, `OpenAI failed to process batch file ${fileId}`));
        }

        await new Promise(resolve => setTimeout(resolve, 500 + attempt * 300));
    }
};

const buildDataUrlFromOpenAiBatchBody = (body: any): string | undefined => {
    // 1. Standard OpenAI Images API b64_json
    const b64 = body?.data?.[0]?.b64_json;
    if (b64) {
        const format = body?.data?.[0]?.output_format || body?.output_format || 'png';
        return `data:image/${format};base64,${b64}`;
    }

    // 2. Direct OpenAI CDN URL
    const url = body?.data?.[0]?.url;
    if (url) return url;

    // 3. Fallback for potential wrapped outputs
    const output = Array.isArray(body?.output) ? body.output : [];
    const imageCall = output.find((item: any) => (item?.type === 'image_generation_call' || item?.type === 'image') && (item?.result || item?.b64_json));
    if (imageCall) {
        const data = imageCall.result || imageCall.b64_json;
        const format = body?.metadata?.output_format || 'png';
        return `data:image/${format};base64,${data}`;
    }

    return undefined;
};

const buildOpenAiBatchRequestBody = (
    item: {
        prompt: string;
        aspectRatio?: string;
        size?: string;
        quality?: string;
        outputFormat?: string;
        images?: { base64ImageData: string; mimeType: string }[];
    },
    targetModel: string,
    endpoint: string,
    uploadedImageFileId?: string,
    fallbackImage?: { base64ImageData: string; mimeType: string }
): Record<string, any> => {
    // Ensure the model in request body is a valid OpenAI image model ('gpt-image-2', 'dall-e-3', 'dall-e-2')
    const apiModel = mapToOpenAiApiImageModel(targetModel);
    const size = mapAspectRatioToOpenAiSize(item.aspectRatio, apiModel, item.size);
    const isGpt = apiModel.startsWith('gpt-image') || apiModel.includes('gpt-image');
    const promptText = item.prompt?.trim() || 'Generate a high quality image.';

    // Preserve preset quality semantics: sunburst -> high, flare -> auto
    let quality = item.quality;
    if (!quality || quality === 'auto') {
        if (targetModel.includes('sunburst')) {
            quality = 'high';
        } else if (targetModel.includes('flare')) {
            quality = 'auto';
        }
    }

    if (endpoint === OPENAI_BATCH_IMAGE_EDITS_ENDPOINT) {
        const body: Record<string, any> = {
            model: apiModel,
            prompt: promptText,
            n: 1,
            size
        };

        if (isGpt) {
            body.quality = quality || 'auto';
            if (item.outputFormat) {
                body.output_format = item.outputFormat;
            }
        }

        // OpenAI Batch API for /v1/images/edits REQUIRES the `images` parameter as an array.
        // Each entry must have either `file_id` or `image_url`.
        const imagesList: Array<{ image_url?: string; file_id?: string }> = [];

        if (uploadedImageFileId) {
            imagesList.push({ file_id: uploadedImageFileId });
        } else {
            const sourceImages = (item.images && item.images.length > 0)
                ? item.images
                : (fallbackImage ? [fallbackImage] : []);

            for (const img of sourceImages) {
                if (img?.base64ImageData) {
                    const raw = img.base64ImageData;
                    if (raw.startsWith('http://') || raw.startsWith('https://')) {
                        imagesList.push({ image_url: raw });
                    } else {
                        const mime = img.mimeType || 'image/png';
                        const dataUrl = raw.startsWith('data:') ? raw : `data:${mime};base64,${raw}`;
                        imagesList.push({ image_url: dataUrl });
                    }
                }
            }
        }

        body.images = imagesList;

        return body;
    }

    // Default: /v1/images/generations
    const body: Record<string, any> = {
        model: apiModel,
        prompt: promptText,
        n: 1,
        size
    };

    if (isGpt) {
        body.quality = quality || 'auto';
        if (item.outputFormat) {
            body.output_format = item.outputFormat;
        }
    } else if (apiModel === 'dall-e-3') {
        body.quality = (quality === 'auto' || quality === 'high') ? 'hd' : (quality || 'standard');
        body.response_format = 'b64_json';
    } else if (apiModel === 'dall-e-2') {
        body.size = (size === '512x512' || size === '256x256') ? size : '1024x1024';
        body.response_format = 'b64_json';
    }

    return body;
};

/**
 * Triggers browser download of a JSONL string as a .jsonl file
 */
export const downloadJsonlFile = (jsonlString: string, filename: string = 'batch_request.jsonl'): void => {
    const safeName = filename.endsWith('.jsonl') ? filename : `${filename}.jsonl`;
    const blob = new Blob([jsonlString], { type: 'application/jsonl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Generates the raw JSONL string for an OpenAI Batch request
 */
export const generateOpenAiBatchJsonl = (
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
    model: string = 'gpt-image-2.5-flare',
    batchPrefixId: string = `openai_batch_${Date.now()}`
): string => {
    const targetModel = resolveOpenAiBatchModel(model);
    const hasInputImages = items.some(it => it.images && it.images.length > 0 && !!it.images[0]?.base64ImageData);
    const chosenEndpoint = hasInputImages ? OPENAI_BATCH_IMAGE_EDITS_ENDPOINT : OPENAI_BATCH_IMAGE_GEN_ENDPOINT;
    const fallbackImage = items.find(it => it.images && it.images.length > 0 && !!it.images[0]?.base64ImageData)?.images?.[0];

    const lines = items.map((item, idx) => {
        const body = buildOpenAiBatchRequestBody(item, targetModel, chosenEndpoint, undefined, fallbackImage);
        const batchRequest = {
            custom_id: `${batchPrefixId}__${item.id || idx}`,
            method: "POST",
            url: chosenEndpoint,
            body
        };
        return JSON.stringify(batchRequest);
    });

    return lines.join('\n');
};

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
    model: string = 'gpt-image-2.5-flare',
    displayName?: string
): Promise<{ name: string; state: string; rawJsonl?: string }> => {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new Error("OpenAI API Key is missing. Please enter your OpenAI API key in Settings.");
    }

    const batchInternalId = `openai_batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const targetModel = resolveOpenAiBatchModel(model);
    const hasInputImages = items.some(it => it.images && it.images.length > 0 && !!it.images[0]?.base64ImageData);
    const chosenEndpoint = hasInputImages ? OPENAI_BATCH_IMAGE_EDITS_ENDPOINT : OPENAI_BATCH_IMAGE_GEN_ENDPOINT;

    // Attempt OpenAI native Batch API file upload & batch creation
    let nativeBatchId: string | undefined = undefined;
    let nativeBatchCreationError: string | undefined = undefined;
    let jsonlLines: string[] = [];

    try {
        // 1. If any items have input images for /v1/images/edits, upload them to Files API first
        const uploadedFileIds: Record<number, string> = {};
        if (hasInputImages) {
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const img = it.images?.[0];
                if (img?.base64ImageData) {
                    try {
                        const byteChars = atob(img.base64ImageData);
                        const byteNums = new Array(byteChars.length);
                        for (let j = 0; j < byteChars.length; j++) byteNums[j] = byteChars.charCodeAt(j);
                        const byteArray = new Uint8Array(byteNums);
                        const blob = new Blob([byteArray], { type: img.mimeType || 'image/png' });
                        const fileFormData = new FormData();
                        fileFormData.append('file', blob, `input_${i}.png`);
                        fileFormData.append('purpose', 'batch');
                        const uploadRes = await fetch('https://api.openai.com/v1/files', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${apiKey}` },
                            body: fileFormData
                        });
                        if (uploadRes.ok) {
                            const upData = await uploadRes.json();
                            if (upData?.id) {
                                uploadedFileIds[i] = upData.id;
                                await waitForOpenAiBatchFileReady(upData.id, apiKey);
                            }
                        }
                    } catch (err) {
                        console.warn(`Could not pre-upload image ${i} to OpenAI Files API:`, err);
                    }
                }
            }
        }

        const fallbackImage = items.find(it => it.images && it.images.length > 0 && !!it.images[0]?.base64ImageData)?.images?.[0];

        // 2. Construct JSONL lines for OpenAI Batch API
        jsonlLines = items.map((item, idx) => {
            const body = buildOpenAiBatchRequestBody(item, targetModel, chosenEndpoint, uploadedFileIds[idx], fallbackImage);

            const batchRequest = {
                custom_id: `${batchInternalId}__${item.id || idx}`,
                method: "POST",
                url: chosenEndpoint,
                body
            };

            console.log(`[OpenAI Batch Request #${idx + 1} Payload]:`, JSON.stringify(batchRequest, null, 2));

            return JSON.stringify(batchRequest);
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
                await waitForOpenAiBatchFileReady(fileData.id, apiKey);
                const batchRes = await fetch('https://api.openai.com/v1/batches', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        input_file_id: fileData.id,
                        endpoint: chosenEndpoint,
                        completion_window: '24h'
                    })
                });

                if (batchRes.ok) {
                    const batchData = await batchRes.json();
                    if (batchData?.id) {
                        nativeBatchId = batchData.id;
                    }
                } else {
                    const errorData = await batchRes.json().catch(() => null);
                    nativeBatchCreationError = normalizeOpenAiBatchError(errorData?.error || errorData, `OpenAI Batch API returned status ${batchRes.status}`);
                }
            }
        } else {
            const errorData = await fileRes.json().catch(() => null);
            nativeBatchCreationError = normalizeOpenAiBatchError(errorData?.error || errorData, `OpenAI file upload returned status ${fileRes.status}`);
        }
    } catch (e: any) {
        nativeBatchCreationError = e?.message || String(e);
    }

    if (!nativeBatchId) {
        console.warn(`OpenAI native Batch API could not be created directly (${nativeBatchCreationError}). Running local queue fallback.`);
    }

    const rawJsonlString = jsonlLines.join('\n');

    const newBatch: StoredOpenAiBatch = {
        id: batchInternalId,
        model: targetModel,
        displayName: displayName || `OpenAI Batch (${targetModel})`,
        state: nativeBatchId ? 'PENDING' : 'RUNNING',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nativeBatchId,
        endpoint: chosenEndpoint,
        rawJsonl: rawJsonlString,
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

    // Only the local fallback runner executes requests itself. Native OpenAI
    // Batch jobs wait for OpenAI's discounted asynchronous pipeline.
    if (!nativeBatchId) {
        triggerNextOpenAiBatchItem(batchInternalId).catch(console.error);
    }

    return {
        name: batchInternalId,
        state: nativeBatchId ? 'JOB_STATE_PENDING' : 'JOB_STATE_RUNNING',
        rawJsonl: rawJsonlString
    };
};

/**
 * Retrieves raw JSONL for an OpenAI Batch job (either saved or dynamically reconstructed)
 */
export const getStoredOpenAiBatchJsonl = (jobId: string): string | undefined => {
    const batches = getStoredOpenAiBatches();
    const found = batches.find(b => b.id === jobId || b.nativeBatchId === jobId);
    if (found?.rawJsonl) return found.rawJsonl;
    if (found && found.items && found.items.length > 0) {
        return generateOpenAiBatchJsonl(found.items, found.model, found.id);
    }
    return undefined;
};

/**
 * Parse an error line from OpenAI Batch error_file_id or output_file_id JSONL.
 * Formats as: "400 invalid_request_error: The provided model '...' is not supported (param: 'model')"
 */
const parseOpenAiBatchErrorLine = (line: string): { customId: string; errorMsg: string } | null => {
    try {
        const parsed = JSON.parse(line);
        const customId = parsed.custom_id || '';
        const statusCode = parsed.response?.status_code;
        const errObj = parsed.response?.body?.error || parsed.error || parsed.response?.body;
        let errorMsg = '';
        if (errObj && typeof errObj === 'object') {
            const parts: string[] = [];
            if (statusCode) parts.push(String(statusCode));
            if (errObj.type) parts.push(errObj.type);
            else if (errObj.code) parts.push(errObj.code);
            const detailMsg = errObj.message || JSON.stringify(errObj);
            const param = errObj.param ? `(param: '${errObj.param}')` : '';
            const main = [detailMsg, param].filter(Boolean).join(' ');
            errorMsg = parts.length > 0 ? `${parts.join(' ')}: ${main}` : main;
        } else if (typeof errObj === 'string') {
            errorMsg = statusCode ? `${statusCode}: ${errObj}` : errObj;
        } else if (statusCode) {
            errorMsg = `HTTP ${statusCode} request failed`;
        } else {
            errorMsg = 'Unknown batch error';
        }
        return { customId, errorMsg };
    } catch {
        return null;
    }
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
                const status = batchStatus.status; // validating, in_progress, finalizing, completed, failed, expired, cancelling, cancelled

                // If error_file_id is available, parse error details for individual items
                if (batchStatus.error_file_id) {
                    try {
                        const errFileRes = await fetch(`https://api.openai.com/v1/files/${batchStatus.error_file_id}/content`, {
                            headers: { 'Authorization': `Bearer ${apiKey}` }
                        });
                        if (errFileRes.ok) {
                            const errFileText = await errFileRes.text();
                            const errLines = errFileText.trim().split('\n').filter(Boolean);
                            errLines.forEach(line => {
                                const parsedErr = parseOpenAiBatchErrorLine(line);
                                if (parsedErr) {
                                    const itemId = parsedErr.customId.includes('__') ? parsedErr.customId.split('__')[1] : parsedErr.customId;
                                    const item = batch.items.find(it => it.id === itemId);
                                    if (item) {
                                        item.error = parsedErr.errorMsg;
                                        item.status = 'failed';
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.warn("Could not read OpenAI error file:", e);
                    }
                }

                if (batchStatus.errors && Array.isArray(batchStatus.errors.data)) {
                    const topErrors = batchStatus.errors.data.map((e: any) => `${e.code || 'error'}: ${e.message}`).join('; ');
                    if (topErrors) {
                        batch.error = topErrors;
                    }
                }

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
                                    const item = batch.items.find(it => it.id === itemId);
                                    if (item) {
                                        const resultUrl = buildDataUrlFromOpenAiBatchBody(parsed.response?.body);
                                        if (resultUrl) {
                                            item.resultUrl = resultUrl;
                                            item.status = 'completed';
                                        } else if (parsed.error || parsed.response?.body?.error) {
                                            const parsedErr = parseOpenAiBatchErrorLine(line);
                                            item.error = parsedErr?.errorMsg || normalizeOpenAiBatchError(parsed.error || parsed.response?.body?.error, 'OpenAI batch item failed');
                                            item.status = 'failed';
                                        }
                                    }
                                } catch {}
                            });
                        }
                    }

                    const anySuccess = batch.items.some(it => it.status === 'completed');
                    batch.state = anySuccess ? 'SUCCEEDED' : 'FAILED';
                    
                    const itemErrors = batch.items.map(it => it.error).filter(Boolean) as string[];
                    const uniqueErrors = Array.from(new Set(itemErrors));
                    let detailedErrorMessage = 'All batch items failed';
                    if (uniqueErrors.length > 0) {
                        detailedErrorMessage = `All batch items failed:\n${uniqueErrors.join('\n')}`;
                    } else if (batch.error) {
                        detailedErrorMessage = `All batch items failed: ${batch.error}`;
                    }

                    if (!anySuccess) {
                        batch.error = detailedErrorMessage;
                    }
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);

                    return {
                        state: batch.state === 'SUCCEEDED' ? 'JOB_STATE_SUCCEEDED' : 'JOB_STATE_FAILED',
                        error: !anySuccess ? { message: detailedErrorMessage } : undefined,
                        batch
                    };
                } else if (status === 'failed' || status === 'expired') {
                    batch.state = 'FAILED';
                    const itemErrors = batch.items.map(it => it.error).filter(Boolean) as string[];
                    const uniqueErrors = Array.from(new Set(itemErrors));
                    let detailedErrorMessage = normalizeOpenAiBatchError(batchStatus.errors, `Batch job ${status}`);
                    if (uniqueErrors.length > 0) {
                        detailedErrorMessage += `:\n${uniqueErrors.join('\n')}`;
                    }
                    batch.error = detailedErrorMessage;
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);
                    return { state: 'JOB_STATE_FAILED', error: { message: detailedErrorMessage }, batch };
                } else if (status === 'cancelled') {
                    batch.state = 'CANCELLED';
                    saveStoredOpenAiBatches(batches);
                    return { state: 'JOB_STATE_CANCELLED', batch };
                } else {
                    batch.state = status === 'validating' ? 'PENDING' : 'RUNNING';
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);
                    return { state: batch.state === 'PENDING' ? 'JOB_STATE_PENDING' : 'JOB_STATE_RUNNING', batch };
                }
            }
        } catch (e) {
            console.warn("Could not query OpenAI native batch:", e);
        }
    }

    // Step-by-step background processing fallback (when running locally)
    await triggerNextOpenAiBatchItem(batch.id);

    const allDone = batch.items.every(it => it.status === 'completed' || it.status === 'failed' || it.status === 'cancelled');
    if (allDone) {
        const anySuccess = batch.items.some(it => it.status === 'completed');
        batch.state = anySuccess ? 'SUCCEEDED' : 'FAILED';
        const itemErrors = batch.items.map(it => it.error).filter(Boolean) as string[];
        const uniqueErrors = Array.from(new Set(itemErrors));
        let detailedErrorMessage = 'All batch items failed';
        if (uniqueErrors.length > 0) {
            detailedErrorMessage = `All batch items failed:\n${uniqueErrors.join('\n')}`;
        } else if (batch.error) {
            detailedErrorMessage = `All batch items failed: ${batch.error}`;
        }
        if (!anySuccess) {
            batch.error = detailedErrorMessage;
        }
        batch.updatedAt = Date.now();
        saveStoredOpenAiBatches(batches);
        return {
            state: anySuccess ? 'JOB_STATE_SUCCEEDED' : 'JOB_STATE_FAILED',
            error: !anySuccess ? { message: detailedErrorMessage } : undefined,
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

/**
 * Extract images from completed OpenAI batch job
 */
export const extractImagesFromOpenAiBatchJob = async (
    sdkJob: any,
    itemsMeta: Array<{ id: string; prompt: string }>
): Promise<Array<{ id: string; imageUrl?: string; error?: string; prompt?: string }>> => {
    const batch: StoredOpenAiBatch | undefined = sdkJob?.batch || getStoredOpenAiBatches().find(b => b.id === sdkJob?.name);
    if (!batch) return [];

    const metaItems = itemsMeta && itemsMeta.length > 0 ? itemsMeta : batch.items.map(it => ({ id: it.id, prompt: it.prompt }));
    const results: Array<{ id: string; imageUrl?: string; error?: string; prompt?: string }> = [];

    for (let idx = 0; idx < metaItems.length; idx++) {
        const meta = metaItems[idx];
        const item = batch.items.find(it => it.id === meta.id) || batch.items[idx];
        const promptText = item?.prompt || meta.prompt || `Batch Item #${idx + 1}`;
        const metaId = meta.id || item?.id || `item-${idx}`;

        if (item?.error) {
            results.push({
                id: metaId,
                prompt: promptText,
                error: item.error
            });
            continue;
        }

        if (item?.resultUrl) {
            try {
                let finalUrl = item.resultUrl;
                if (finalUrl.startsWith('data:')) {
                    const pngDataUrl = await convertToPNG(finalUrl);
                    finalUrl = addMetadataToPNG(pngDataUrl, 'prompt', promptText);
                } else if (finalUrl.startsWith('http')) {
                    const res = await fetch(finalUrl);
                    const blob = await res.blob();
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    const pngDataUrl = await convertToPNG(dataUrl);
                    finalUrl = addMetadataToPNG(pngDataUrl, 'prompt', promptText);
                }
                results.push({
                    id: metaId,
                    imageUrl: finalUrl,
                    prompt: promptText
                });
            } catch (err: any) {
                results.push({
                    id: metaId,
                    imageUrl: item.resultUrl,
                    prompt: promptText
                });
            }
        } else {
            results.push({
                id: metaId,
                prompt: promptText,
                error: item?.status === 'failed' ? (item?.error || 'Item generation failed') : undefined
            });
        }
    }

    return results;
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

