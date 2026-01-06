
import { NodeProcessor } from './types';
import { generateImage } from '../geminiService';
import { generateThumbnail, formatImageForAspectRatio, cropImageTo169 } from '../../utils/imageUtils';
import { addMetadataToPNG } from '../../utils/pngMetadata';

const triggerDownload = (url: string, prompt: string) => {
    let assetUrl = url;
    if (url.startsWith('data:image/png')) {
        assetUrl = addMetadataToPNG(url, 'prompt', prompt);
    }
    const link = document.createElement('a');
    link.href = assetUrl;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const filename = `Image_Editor_Frame_001_${date}.png`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const raceWithAbort = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            if (signal.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
            }
            const onAbort = () => {
                signal.removeEventListener('abort', onAbort);
                reject(new DOMException('Aborted', 'AbortError'));
            };
            signal.addEventListener('abort', onAbort);
        })
    ]);
};

export const processImageOutput: NodeProcessor = async ({ node, upstreamData, saveImageToCache }) => {
    const texts = upstreamData.filter(v => typeof v === 'string') as string[];
    const prompt = texts.join(', ');
    if (!prompt) {
        throw new Error("Prompt is empty. Make sure a node with text is connected and has been processed.");
    }
    
    const imageUrl = await generateImage(prompt, node.aspectRatio, undefined, node.model, node.resolution);
    const thumbnailUrl = await generateThumbnail(imageUrl, 256, 256);
    
    saveImageToCache(0, imageUrl);

    return {
        value: thumbnailUrl,
        downloadData: node.autoDownload ? { url: imageUrl, prompt, type: node.type } : undefined
    };
};

export const processImageEditor = async (
    node: any, 
    textInputs: string[], 
    imageInputs: { base64ImageData: string, mimeType: string }[], 
    localImages: { base64ImageData: string, mimeType: string }[],
    localImagesB: { base64ImageData: string, mimeType: string }[], 
    imageInputsB: { base64ImageData: string, mimeType: string }[], 
    saveImageToCache: (frame: number, url: string) => void
) => {
    const parsed = JSON.parse(node.value);
    
    const allInputImages = [...localImages, ...imageInputs];
    const allInputImagesB = [...localImagesB, ...imageInputsB];

    // Validation Logic - Relaxed for text-only potential
    if (!parsed.isSequentialEditingWithPrompts) {
         // Standard modes require Input A
         if (allInputImages.length === 0 && parsed.model !== 'gemini-3-pro-image-preview') {
            throw new Error("No input image provided for editing.");
        }
    }

    let promptToUse = [parsed.prompt, ...textInputs].filter(Boolean).join(', ');
    
    let imagesForFrame: { base64ImageData: string, mimeType: string }[] = [];

    if (parsed.isSequenceMode) {
        // If in sequence mode but executed as a chain node, we process the *first* selected frame 
        // to produce a result.
        
        // Note: The loop in useEditorNode handles the actual batch processing when triggered from the node UI.
        // This function handles single frame return for chain execution.
    } else {
        // Single Mode Logic setup
        let imagesToUse = allInputImages;
        const checkedInputIndices = parsed.checkedInputIndices;
        
        if (checkedInputIndices && Array.isArray(checkedInputIndices)) {
            imagesToUse = allInputImages.filter((_, i) => checkedInputIndices.includes(i));
        } else {
             imagesToUse = allInputImages;
        }
        imagesForFrame = imagesToUse;
    }
    
    // Check if we are running in Single Mode (non-sequence)
    if (!parsed.isSequenceMode) {
        if (imagesForFrame.length === 0 && parsed.model !== 'gemini-3-pro-image-preview') {
             throw new Error("No images selected for processing.");
        }

        const formattingPromises = imagesForFrame.map(async (image) => {
            const imageDataUrl = `data:${image.mimeType};base64,${image.base64ImageData}`;
            if (parsed.enableAspectRatio && parsed.aspectRatio && parsed.aspectRatio !== 'Auto') {
                const { formattedImage } = await formatImageForAspectRatio(imageDataUrl, parsed.aspectRatio);
                return {
                    base64ImageData: formattedImage.split(',')[1],
                    mimeType: formattedImage.match(/:(.*?);/)?.[1] || 'image/png'
                };
            }
            return image;
        });
        
        const processedImages = await Promise.all(formattingPromises);

        if (parsed.enableOutpainting) {
            const outpaintingTemplate = parsed.outpaintingPrompt || '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.';
            promptToUse = outpaintingTemplate.replace('{main_prompt}', promptToUse);
        }

        // WRAP GENERATION IN RACE WITH ABORT SIGNAL
        // Note: Chain execution passes an undefined signal usually, or we need to handle it.
        // For this refactor, we assume simple execution unless the hook provides a signal.
        const imageUrl = await generateImage(promptToUse, parsed.aspectRatio, processedImages, parsed.model, parsed.resolution);
        
        let finalImageUrl = imageUrl;
        if (parsed.autoCrop169) {
            try {
                finalImageUrl = await cropImageTo169(imageUrl);
            } catch (cropError: any) {
                console.error("Failed to auto-crop image:", cropError.message);
            }
        }

        const thumbnailUrl = await generateThumbnail(finalImageUrl, 256, 256);
        saveImageToCache(0, finalImageUrl);

        return {
            value: { ...parsed, outputImage: thumbnailUrl },
            downloadData: parsed.autoDownload ? { url: finalImageUrl, prompt: promptToUse, type: node.type } : undefined
        };
    }

    // --- SEQUENCE MODE CHAIN EXECUTION ---
    // If we are here, we are in Sequence Mode triggered by Chain Execution
    // We process the FIRST index for the sake of chain continuity.
    
    let targetIndex = 0;
    if (parsed.checkedInputIndices && parsed.checkedInputIndices.length > 0) targetIndex = parsed.checkedInputIndices[0];
    if (parsed.isSequentialEditingWithPrompts) targetIndex = 0; // Default to first frame

    let imagesToProcess: { base64ImageData: string, mimeType: string }[] = [];

    if (parsed.isSequentialEditingWithPrompts) {
        imagesToProcess = allInputImagesB; // Send ALL images from B
    } else {
        const imgSource = allInputImages[targetIndex] || (allInputImages.length > 0 ? allInputImages[0] : undefined);
        if (!imgSource && parsed.model !== 'gemini-3-pro-image-preview') {
             throw new Error("No image found for sequence chain execution.");
        }
        if (imgSource) imagesToProcess = [imgSource];
        
        if (parsed.isSequentialCombinationMode && !parsed.isSequentialEditingWithPrompts && imgSource) {
             if (allInputImagesB.length > 0) {
                 imagesToProcess.push(...allInputImagesB);
             }
        }
    }

    // Process this single frame for chain return
    const formattingPromises = imagesToProcess.map(async (image) => {
        const imageDataUrl = `data:${image.mimeType};base64,${image.base64ImageData}`;
        if (parsed.enableAspectRatio && parsed.aspectRatio && parsed.aspectRatio !== 'Auto') {
            const { formattedImage } = await formatImageForAspectRatio(imageDataUrl, parsed.aspectRatio);
            return {
                base64ImageData: formattedImage.split(',')[1],
                mimeType: formattedImage.match(/:(.*?);/)?.[1] || 'image/png'
            };
        }
        return image;
    });
    
    const processedImages = await Promise.all(formattingPromises);
    
    // Handle Prompt for Sequence (Generic + Specific)
    // For chain execution, we just use the base prompt + inputs
    if (parsed.enableOutpainting) {
         const outpaintingTemplate = parsed.outpaintingPrompt || '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.';
         promptToUse = outpaintingTemplate.replace('{main_prompt}', promptToUse);
    }

    const imageUrl = await generateImage(promptToUse, parsed.aspectRatio, processedImages, parsed.model, parsed.resolution);
    
    let finalImageUrl = imageUrl;
    if (parsed.autoCrop169) {
        try {
            finalImageUrl = await cropImageTo169(imageUrl);
        } catch (cropError: any) {
            console.error("Failed to auto-crop image:", cropError.message);
        }
    }

    const thumbnailUrl = await generateThumbnail(finalImageUrl, 256, 256);
    // For chain, we save to output slot 0 so it's visible as the node "result"
    saveImageToCache(0, finalImageUrl);

    return {
        value: { ...parsed, outputImage: thumbnailUrl }, // Update outputImage to show result
        downloadData: parsed.autoDownload ? { url: finalImageUrl, prompt: promptToUse, type: node.type } : undefined
    };
};
