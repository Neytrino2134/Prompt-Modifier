import { addMetadataToPNG } from '../../utils/pngMetadata';
import { convertToPNG } from '../../utils/imageUtils';
import { OpenAiImageGenerationOptions } from './types';
import { getOpenAiApiKey, mapAspectRatioToOpenAiSize, mapToOpenAiApiImageModel } from './config';

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
