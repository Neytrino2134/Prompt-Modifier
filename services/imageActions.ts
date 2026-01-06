
import { formatImageForAspectRatio } from '../utils/imageUtils';
import { generateImage } from './geminiService';

export const OUTPAINTING_PROMPT_SUFFIX = "Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.";

/**
 * Expands an image to a specific aspect ratio using a white background padding 
 * and then performs outpainting using Gemini to fill the background.
 * 
 * @param imageDataUrl - The source image as a Base64 Data URL.
 * @param targetRatio - The target aspect ratio string (e.g., "16:9", "9:16").
 * @param currentPrompt - The prompt describing the original image (optional).
 * @param model - The model to use (default: 'gemini-3-flash-preview').
 * @param promptSuffix - Optional custom instruction for filling the background.
 * @returns Promise<string> - The resulting image as a Base64 Data URL.
 */
export const expandImageAspectRatio = async (
    imageDataUrl: string, 
    targetRatio: string, 
    currentPrompt: string = '',
    model: string = 'gemini-3-flash-preview',
    promptSuffix: string = OUTPAINTING_PROMPT_SUFFIX
): Promise<string> => {
    
    // 1. Format the image locally (resize canvas + add white bars)
    const { formattedImage } = await formatImageForAspectRatio(imageDataUrl, targetRatio);
    
    // 2. Prepare the payload for the API
    // Split "data:image/png;base64,..." to get raw base64 and mime type
    const parts = formattedImage.split(',');
    const base64ImageData = parts[1];
    const mimeType = formattedImage.match(/:(.*?);/)?.[1] || 'image/png';
    
    // 3. Construct the prompt
    // If there is an existing prompt, append the instruction. If not, just use the instruction.
    const fullPrompt = currentPrompt 
        ? `${currentPrompt}. ${promptSuffix}`
        : `High quality image. ${promptSuffix}`;

    // 4. Call Gemini API
    // We pass the formatted image as input
    const resultImageUrl = await generateImage(
        fullPrompt,
        targetRatio, 
        [{ base64ImageData, mimeType }], 
        model
    );

    return resultImageUrl;
};
