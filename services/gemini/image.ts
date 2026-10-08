import { Modality } from "@google/genai";
import { convertToPNG } from '../../utils/imageUtils';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { getModelForMode, normalizeImageModelId } from '../modelConfig';
import { 
    generateOpenAiImage, 
    isOpenAiTextModel, 
    openAiDescribeImage, 
    openAiGeneratePromptFromImage, 
    openAiExtractTextFromImage 
} from '../openaiService';
import { createAIClient, callWithRetry } from './client';

export const generateImage = async (
    prompt: string,
    aspectRatio: string = '1:1',
    images: { base64ImageData: string, mimeType: string }[] | undefined,
    model: string = 'gemini-2.5-flash-image', // Default to nano banana for image gen
    resolution: string = '1K',
    options?: { quality?: string; outputFormat?: string; size?: string; thinkingLevel?: string; searchGrounding?: string }
): Promise<string> => {
    const normalizedModel = normalizeImageModelId(model) || 'gemini-2.5-flash-image';

    // Wrapping generateImage with retry as well, although usually less prone to 503s on Imagen
    return callWithRetry(async () => {
        const ai = createAIClient();

        // Helper to process the returned image
        const processReturnedImage = async (mimeType: string, base64Data: string, originalPrompt: string): Promise<string> => {
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            try {
                const pngDataUrl = await convertToPNG(dataUrl);
                return addMetadataToPNG(pngDataUrl, 'prompt', originalPrompt);
            } catch (e) {
                console.error("Failed to add metadata:", e);
                return dataUrl;
            }
        };

        try {
            if (normalizedModel.startsWith('dall-e') || normalizedModel.startsWith('openai') || normalizedModel.startsWith('gpt-image') || normalizedModel.includes('gpt-image')) {
                return await generateOpenAiImage(prompt, {
                    model: normalizedModel,
                    aspectRatio,
                    resolution,
                    quality: options?.quality,
                    outputFormat: options?.outputFormat,
                    size: options?.size,
                    images
                });
            }

            if (
                normalizedModel === 'gemini-nano-banana-2.1' ||
                normalizedModel === 'gemini-3-pro-image-preview' ||
                normalizedModel === 'gemini-3-pro-image' ||
                normalizedModel === 'gemini-3.1-flash-image-preview' ||
                normalizedModel === 'gemini-3.1-flash-image'
            ) {
                const imageParts = (images || []).map(image => ({
                    inlineData: { data: image.base64ImageData, mimeType: image.mimeType },
                }));
                const parts: any[] = [...imageParts];
                if (prompt && prompt.trim() !== '') {
                    parts.push({ text: prompt });
                } else if (parts.length === 0) {
                    parts.push({ text: 'High quality image' });
                }

                const requestConfig: any = {
                    imageConfig: {
                        aspectRatio: aspectRatio || '1:1',
                        imageSize: resolution || '1K' // '512px', '1K', '2K', '4K'
                    }
                };

                // Configurable Thinking Mode (Nano Banana 2.1 / Gemini 3 series)
                if (
                    options?.thinkingLevel &&
                    options.thinkingLevel !== 'AUTO' &&
                    options.thinkingLevel !== 'DEFAULT' &&
                    (normalizedModel === 'gemini-nano-banana-2.1' || normalizedModel.startsWith('gemini-3'))
                ) {
                    requestConfig.thinkingConfig = {
                        thinkingLevel: options.thinkingLevel
                    };
                }

                // Search Grounding (Web Search & Image Search for Nano Banana 2.1 / Gemini 3 Pro Image)
                if (options?.searchGrounding && options.searchGrounding !== 'none') {
                    if (normalizedModel === 'gemini-nano-banana-2.1') {
                        const searchTypes: any = {};
                        if (options.searchGrounding === 'web' || options.searchGrounding === 'both') {
                            searchTypes.webSearch = {};
                        }
                        if (options.searchGrounding === 'image' || options.searchGrounding === 'both') {
                            searchTypes.imageSearch = {};
                        }
                        if (Object.keys(searchTypes).length > 0) {
                            requestConfig.tools = [{ googleSearch: { searchTypes } }];
                        }
                    } else if (normalizedModel === 'gemini-3-pro-image-preview' || normalizedModel === 'gemini-3-pro-image') {
                        if (options.searchGrounding === 'web' || options.searchGrounding === 'both') {
                            requestConfig.tools = [{ googleSearch: {} }];
                        }
                    }
                }

                const response = await ai.models.generateContent({
                    model: normalizedModel,
                    contents: { parts },
                    config: requestConfig
                });

                const candidate = response.candidates?.[0];
                const candidateParts = candidate?.content?.parts || [];
                const part = candidateParts.find((p: any) => p.inlineData && !p.thought) || candidateParts.find((p: any) => p.inlineData);
                if (part?.inlineData) {
                    return await processReturnedImage(part.inlineData.mimeType || 'image/png', part.inlineData.data || '', prompt || '');
                }
                throw new Error("No image returned. The prompt may have been blocked or the model encountered an error.");
            }

            // Editing Mode (Input Images present)
            if (images && images.length > 0) {
                const imageParts = images.map(image => ({
                    inlineData: { data: image.base64ImageData, mimeType: image.mimeType },
                }));
                const parts: any[] = [...imageParts];
                if (prompt && prompt.trim() !== '') {
                    parts.push({ text: prompt });
                } else {
                    // Ensure we send at least an empty text part if prompt is missing, as 2.5 editing expects text
                    parts.push({ text: " " });
                }

                // Use the passed model if available, otherwise default logic
                // Fix: Ensure we use a valid image model for editing. 3-flash-preview (text) cannot generate/edit images.
                let editingModel = model || 'gemini-2.5-flash-image';
                if (editingModel === 'gemini-3-flash-preview') {
                    editingModel = 'gemini-2.5-flash-image';
                }

                const config: any = { responseModalities: [Modality.IMAGE] };

                // Allow aspectRatio config for 2.5 flash image in editing mode if specified
                if (editingModel === 'gemini-2.5-flash-image' && aspectRatio && aspectRatio !== '1:1') {
                    config.imageConfig = { aspectRatio: aspectRatio };
                }

                const response = await ai.models.generateContent({
                    model: editingModel,
                    contents: { parts },
                    config: config,
                });

                const candidate = response.candidates?.[0];
                const part = candidate?.content?.parts?.find(p => p.inlineData);
                if (part?.inlineData) {
                    return await processReturnedImage(part.inlineData.mimeType || 'image/png', part.inlineData.data || '', prompt || '');
                }
                throw new Error("No image returned. The prompt may have been blocked.");

            }
            // Generation Mode
            else {
                if (!prompt || prompt.trim() === '') throw new Error("Prompt required.");

                if (model.startsWith('imagen-4.0')) {
                    const response = await ai.models.generateImages({
                        model: model,
                        prompt: prompt,
                        config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: aspectRatio },
                    });
                    if (response.generatedImages?.[0]?.image?.imageBytes) {
                        return await processReturnedImage('image/png', response.generatedImages[0].image.imageBytes || '', prompt || '');
                    }
                    throw new Error("No image returned.");
                } else {
                    // Ensure we use the correct model for image gen. 
                    // If user passed a text model by mistake, fallback to 2.5 flash image.
                    const modelToUse = (model === 'gemini-3-flash-preview' || !model) ? 'gemini-2.5-flash-image' : model;

                    const response = await ai.models.generateContent({
                        model: modelToUse,
                        contents: { parts: [{ text: prompt }] },
                        config: {
                            responseModalities: [Modality.IMAGE],
                            imageConfig: { aspectRatio } // Enabled aspect ratio for gemini-2.5-flash-image
                        },
                    });
                    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (part?.inlineData) {
                        return await processReturnedImage(part.inlineData.mimeType || 'image/png', part.inlineData.data || '', prompt || '');
                    }
                    throw new Error("No image returned.");
                }
            }
        } catch (error: any) {
            let message = error.message || '';
            if (error.status) message += ` Status: ${error.status}`;
            if (error.code) message += ` Code: ${error.code}`;
            if (error.details) message += ` Details: ${JSON.stringify(error.details)}`;

            if (!message && typeof error === 'object') {
                message = JSON.stringify(error);
            }

            throw new Error(`Failed to generate image. ${message}`);
        }
    }, 2, 2000); // Fewer retries for image gen as it is more expensive/slow
};

export const describeImage = async (base64ImageData: string, mimeType: string, softPrompt: boolean | undefined): Promise<string> => {
    const flashModel = getModelForMode('flash');
    if (isOpenAiTextModel(flashModel)) {
        return openAiDescribeImage(base64ImageData, mimeType, softPrompt, flashModel);
    }

    return callWithRetry(async () => {
        const ai = createAIClient();
        const softInstruction = softPrompt ? `Important: Use neutral, safe terms.` : '';
        const prompt = `${softInstruction} Describe this image in detail (subject, setting, colors, mood).`;

        try {
            const response = await ai.models.generateContent({
                model: flashModel,
                contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            });
            return response.text || "";
        } catch (error: any) {
            console.error("Error describing image:", error);
            throw error;
        }
    });
};

export const generatePromptFromImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const flashModel = getModelForMode('flash');
    if (isOpenAiTextModel(flashModel)) {
        return openAiGeneratePromptFromImage(base64ImageData, mimeType, flashModel);
    }

    return callWithRetry(async () => {
        const ai = createAIClient();
        const prompt = `Analyze the visual appearance of the character in this image to create a text-to-image prompt.

        **REQUIREMENTS:**
        1. **SUBJECT ONLY**: Describe ONLY the character's physical features (face, hair, body type) and clothing/accessories in detail.
        2. **STYLE**: Describe the artistic style and render quality using general descriptive terms (e.g., '3D stylized render', 'soft lighting', 'detailed textures').

        **NEGATIVE CONSTRAINTS (DO NOT INCLUDE):**
        - DO NOT describe the pose, action, or gesture.
        - DO NOT describe the background or environment.
        - DO NOT use trademarked studio names (e.g., avoid 'Pixar', 'Disney'). Use generic style descriptions instead.

        Return ONLY the raw prompt text.`;

        try {
            const response = await ai.models.generateContent({
                model: flashModel,
                contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            });
            return response.text || "";
        } catch (error: any) {
            console.error("Error generating prompt from image:", error);
            throw error;
        }
    });
};

export const extractTextFromImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const flashModel = getModelForMode('flash');
    if (isOpenAiTextModel(flashModel)) {
        return openAiExtractTextFromImage(base64ImageData, mimeType, flashModel);
    }

    return callWithRetry(async () => {
        const ai = createAIClient();
        const prompt = `Extract all text from this image. Return only the text found, without any description. If no text is found, say "No text found".`;

        try {
            const response = await ai.models.generateContent({
                model: flashModel,
                contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            });
            return response.text || "";
        } catch (error: any) {
            console.error("Error extracting text from image:", error);
            throw error;
        }
    });
};
