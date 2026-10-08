import { Modality } from "@google/genai";
import { convertToPNG } from '../../utils/imageUtils';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { getModelForMode } from '../modelConfig';
import { 
    generateOpenAiImage, 
    isOpenAiTextModel, 
    openAiDescribeImage, 
    openAiGeneratePromptFromImage, 
    openAiExtractTextFromImage 
} from '../openaiService';
import { createAIClient, callWithRetry } from './client';

export interface GenerateImageOptions {
    quality?: string;
    outputFormat?: string;
    size?: string;
    thinkingLevel?: 'minimal' | 'medium' | 'high';
    thinkingBudget?: number;
    useSearch?: boolean;
    images?: { base64ImageData: string, mimeType: string }[];
}

/**
 * Normalizes any legacy or alias model string into an official valid Gemini API image model identifier.
 */
export const normalizeImageModelName = (model?: string): string => {
    if (!model) return 'gemini-nano-banana-2.1';
    const clean = model.trim();
    if (
        clean === 'gemini-3.6-flash-image' ||
        clean === 'gemini-3.6-image' ||
        clean === 'gemini-3.6-flash' ||
        clean === 'gemini-nano-banana-2.1' ||
        clean.includes('banana-2.1') ||
        clean.includes('banana 2.1') ||
        clean.includes('nana banana')
    ) {
        return 'gemini-nano-banana-2.1';
    }
    if (
        clean === 'gemini-3-pro-image' ||
        clean === 'gemini-3-pro-image-preview' ||
        clean.includes('banana-pro') ||
        clean.includes('banana pro')
    ) {
        return 'gemini-3-pro-image';
    }
    if (clean === 'gemini-3.1-flash-image' || clean.includes('banana 2')) {
        return 'gemini-3.1-flash-image';
    }
    if (clean === 'gemini-3.1-flash-image-preview') {
        return 'gemini-3.1-flash-image-preview';
    }
    if (clean === 'gemini-2.5-flash-image' || clean.includes('banana')) {
        return 'gemini-2.5-flash-image';
    }
    if (clean === 'gemini-3-flash-preview' || clean.startsWith('gemini-3.5') || clean.startsWith('gemini-3.7') || clean.startsWith('gemini-3.8')) {
        return 'gemini-nano-banana-2.1';
    }
    return clean;
};

export const generateImage = async (
    prompt: string,
    aspectRatio: string = '1:1',
    images: { base64ImageData: string, mimeType: string }[] | undefined,
    model: string = 'gemini-nano-banana-2.1', // Default to Gemini Nano Banana 2.1
    resolution: string = '1K',
    options?: GenerateImageOptions
): Promise<string> => {
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
            if (model.startsWith('dall-e') || model.startsWith('openai') || model.startsWith('gpt-image') || model.includes('gpt-image')) {
                return await generateOpenAiImage(prompt, {
                    model,
                    aspectRatio,
                    resolution,
                    quality: options?.quality,
                    outputFormat: options?.outputFormat,
                    size: options?.size,
                    images
                });
            }

            // Imagen 3 & 4 generation models
            if (model.startsWith('imagen-')) {
                if (!prompt || prompt.trim() === '') throw new Error("Prompt required for Imagen.");
                const response = await ai.models.generateImages({
                    model: model,
                    prompt: prompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: options?.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png',
                        aspectRatio: (aspectRatio && aspectRatio !== 'Auto') ? aspectRatio : '1:1'
                    },
                });
                if (response.generatedImages?.[0]?.image?.imageBytes) {
                    return await processReturnedImage('image/png', response.generatedImages[0].image.imageBytes || '', prompt || '');
                }
                throw new Error("No image returned from Imagen.");
            }

            // Gemini Multimodal Native Image Models (Nano Banana 2.1, Nano Banana Pro, Nano Banana 2, etc.)
            const normalizedModel = normalizeImageModelName(model);

            // Assemble input parts: Images (up to 14) + Text prompt
            const allImages = images || options?.images || [];
            const imageParts = allImages.map(image => ({
                inlineData: { data: image.base64ImageData, mimeType: image.mimeType || 'image/png' },
            }));
            const parts: any[] = [...imageParts];
            if (prompt && prompt.trim() !== '') {
                parts.push({ text: prompt });
            } else if (parts.length === 0) {
                throw new Error("Prompt or input image required.");
            } else {
                parts.push({ text: " " });
            }

            // Build config for generateContent
            const config: any = {
                responseModalities: [Modality.IMAGE],
            };

            // Image Aspect Ratio & Size configuration
            const imageConfig: any = {};
            if (aspectRatio && aspectRatio !== 'Auto') {
                imageConfig.aspectRatio = aspectRatio;
            }
            if (resolution && resolution !== 'Auto') {
                imageConfig.imageSize = resolution; // '512px', '1K', '2K', '4K'
            }
            if (Object.keys(imageConfig).length > 0) {
                config.imageConfig = imageConfig;
            }

            // Configurable Thinking Mode (minimal, medium, high)
            if (options?.thinkingLevel) {
                config.thinkingConfig = {
                    thinkingLevel: options.thinkingLevel
                };
            } else if (options?.thinkingBudget !== undefined) {
                config.thinkingConfig = {
                    thinkingBudget: options.thinkingBudget
                };
            }

            // Search Grounding support for Gemini Nano Banana 2.1
            if (options?.useSearch) {
                config.tools = [{ googleSearch: {} }];
            }

            const response = await ai.models.generateContent({
                model: normalizedModel,
                contents: { parts },
                config
            });

            const candidate = response.candidates?.[0];
            const part = candidate?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData?.data) {
                return await processReturnedImage(
                    part.inlineData.mimeType || 'image/png',
                    part.inlineData.data,
                    prompt || ''
                );
            }

            const textPart = candidate?.content?.parts?.find(p => p.text);
            if (textPart?.text) {
                throw new Error(`Model returned text response instead of image: ${textPart.text}`);
            }

            throw new Error("No image returned. The prompt may have been blocked or the model encountered an error.");
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
