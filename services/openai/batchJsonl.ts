import {
    OPENAI_BATCH_IMAGE_EDITS_ENDPOINT,
    OPENAI_BATCH_IMAGE_GEN_ENDPOINT,
    StoredOpenAiBatch
} from './types';
import {
    mapAspectRatioToOpenAiSize,
    mapToOpenAiApiImageModel,
    resolveOpenAiBatchModel
} from './config';
import { getStoredOpenAiBatches } from './batchStorage';

// ==========================================
// OpenAI Batch JSONL Formatting & Parsing
// ==========================================

export const normalizeOpenAiBatchError = (value: any, fallback: string): string => {
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

export const buildDataUrlFromOpenAiBatchBody = (body: any): string | undefined => {
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

export const buildOpenAiBatchRequestBody = (
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
export const parseOpenAiBatchErrorLine = (line: string): { customId: string; errorMsg: string } | null => {
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

export const applyCachedOutput = (target: StoredOpenAiBatch, fileText: string): void => {
    for (const line of fileText.trim().split('\n').filter(Boolean)) {
        try {
            const parsed = JSON.parse(line);
            const customId = parsed.custom_id || '';
            const itemId = customId.includes('__') ? customId.split('__')[1] : customId;
            const item = target.items.find(item => item.id === itemId);
            if (!item) continue;
            const resultUrl = buildDataUrlFromOpenAiBatchBody(parsed.response?.body);
            if (resultUrl) {
                item.resultUrl = resultUrl;
                item.status = 'completed';
                item.error = undefined;
            } else if (parsed.error || parsed.response?.body?.error) {
                item.error = parseOpenAiBatchErrorLine(line)?.errorMsg || normalizeOpenAiBatchError(parsed.error || parsed.response?.body?.error, 'OpenAI batch item failed');
                item.status = 'failed';
            }
        } catch (error) {
            console.warn('Invalid OpenAI output line:', error);
        }
    }
};
