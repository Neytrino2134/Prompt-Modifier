
import { useState, useCallback, useRef } from 'react';
import { generateImage } from '../../services/geminiService';
import { generateThumbnail, formatImageForAspectRatio, cropImageTo169 } from '../../utils/imageUtils';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { GeminiGenerationCommonProps } from './types';

// Helper for local download triggering within the hook
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

// Helper to make the promise cancellable via AbortSignal
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

export const useEditorNode = ({
    nodes,
    getUpstreamNodeValues,
    setError,
    t,
    registerOperation,
    unregisterOperation,
    updateNodeInStorage,
    getFullSizeImage,
    activeTabId,
    activeTabName,
    activeTabIdRef
}: GeminiGenerationCommonProps) => {
    const [isEditingImage, setIsEditingImage] = useState<boolean>(false);
    const [isStoppingEdit, setIsStoppingEdit] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleEditImage = useCallback(async (nodeId: string, indicesToProcess?: number[]) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const parsed = JSON.parse(node.value || '{}');
        const isSequenceMode = parsed.isSequenceMode;

        // Gather Inputs A
        const textInputs = getUpstreamNodeValues(nodeId, 'text').filter(v => typeof v === 'string') as string[];
        const imageInputs = getUpstreamNodeValues(nodeId, 'image').filter(v => typeof v === 'object') as { base64ImageData: string, mimeType: string }[];
        
        // Gather Inputs B (for sequence combination)
        const imageInputsB = getUpstreamNodeValues(nodeId, 'image_b').filter(v => typeof v === 'object') as { base64ImageData: string, mimeType: string }[];

        // --- NEW: Parse Upstream Prompts (from Sequence Editor) ---
        const upstreamPromptMap = new Map<number, string>(); // Key: FrameIndex (0-based)
        textInputs.forEach(text => {
            try {
                // Try to parse as JSON (Script Modifier Data or generic prompts)
                const json = JSON.parse(text);
                let prompts = [];
                
                // Handle Prompt Sequence Editor Data (sourcePrompts/modifiedPrompts)
                if (json.sourcePrompts || json.modifiedPrompts) {
                    const source = json.sourcePrompts || [];
                    const mod = json.modifiedPrompts || [];
                    
                    // Merge logic: Modified takes precedence if it exists
                    const mergedPromptsMap = new Map();
                    source.forEach((p: any) => mergedPromptsMap.set(p.frameNumber, p));
                    mod.forEach((p: any) => mergedPromptsMap.set(p.frameNumber, { ...mergedPromptsMap.get(p.frameNumber), ...p }));
                    
                    prompts = Array.from(mergedPromptsMap.values());
                } 
                // Handle Script Modifier Data
                else if (json.type === 'script-prompt-modifier-data') {
                    prompts = json.finalPrompts || json.prompts || [];
                } else if (Array.isArray(json)) {
                    prompts = json;
                }
                
                if (prompts.length > 0) {
                    prompts.forEach((p: any, i: number) => {
                        const frameIdx = (p.frameNumber !== undefined ? p.frameNumber : i + 1) - 1; // Convert 1-based to 0-based for internal loop
                        if (p.prompt) upstreamPromptMap.set(frameIdx, p.prompt);
                    });
                }
            } catch {
                // Regular string, handled as global prompt part later
            }
        });

        // Prepare local inputs A
        const localImages = (parsed.inputImages || []).map((thumbnailUrl: string, index: number) => {
             const fullRes = getFullSizeImage(node.id, index + 1);
             const imgDataUrl = fullRes || thumbnailUrl;
             return {
                 base64ImageData: imgDataUrl.split(',')[1],
                 mimeType: imgDataUrl.match(/:(.*?);/)?.[1] || 'image/png'
             };
        });
        
        // Prepare local inputs B
        const localImagesB = (parsed.inputImagesB || []).map((thumbnailUrl: string, index: number) => {
             const fullRes = getFullSizeImage(node.id, 2000 + index + 1); 
             const imgDataUrl = fullRes || thumbnailUrl;
             return {
                 base64ImageData: imgDataUrl.split(',')[1],
                 mimeType: imgDataUrl.match(/:(.*?);/)?.[1] || 'image/png'
             };
        });

        const allInputImages = [...localImages, ...imageInputs];
        const allInputImagesB = [...localImagesB, ...imageInputsB];

        // Validation - Removed strict B check here as we allow empty B for text-to-image
        if (!parsed.isSequentialEditingWithPrompts) {
             if (allInputImages.length === 0 && parsed.model !== 'gemini-3-pro-image-preview') {
                 setError("No input image provided for editing.");
                 return;
             }
        }

        setIsEditingImage(true);
        setError(null);
        setIsStoppingEdit(false);
        abortControllerRef.current = new AbortController();
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.editing'), tabId: activeTabId, tabName: activeTabName });

        try {
            if (isSequenceMode) {
                 // Sequence Mode Logic
                 // If indicesToProcess is provided (Run Selected from Output), use it.
                 // Otherwise, use checkedInputIndices (Apply from Main Toolbar).
                 const targetIndices = indicesToProcess || (
                     // If using sequential editing with prompts, default to all frames (based on B inputs or total count)
                     // because checkedInputIndices usually tracks Input A.
                     parsed.isSequentialEditingWithPrompts 
                        ? (parsed.checkedSequenceOutputIndices || allInputImagesB.map((_: any, i: number) => i))
                        : (parsed.checkedInputIndices ?? allInputImages.map((_: any, i: number) => i))
                 );

                 const sequenceOutputs = parsed.sequenceOutputs || [];
                 
                 // Initialize status for targeted indices
                 const newOutputs = [...sequenceOutputs];
                 targetIndices.forEach((i: number) => {
                     newOutputs[i] = { status: 'pending', thumbnail: null };
                 });
                 updateNodeInStorage(currentTabId, nodeId, (prev) => ({ ...prev, sequenceOutputs: newOutputs }));

                 for (const i of targetIndices) {
                    if (abortControllerRef.current.signal.aborted) break;
                    
                    let imagesForFrame: { base64ImageData: string, mimeType: string }[] = [];

                    if (parsed.isSequentialEditingWithPrompts) {
                        // Use ALL images from B for every frame
                        imagesForFrame = allInputImagesB;
                    } else {
                        const imgA = allInputImages[i];
                        if (!imgA && parsed.model !== 'gemini-3-pro-image-preview') continue;
                        if (imgA) imagesForFrame = [imgA];
                        
                        if (parsed.isSequentialCombinationMode) {
                            if (allInputImagesB.length > 0) {
                                imagesForFrame.push(...allInputImagesB);
                            }
                        }
                    }

                    // Mark as generating
                    updateNodeInStorage(currentTabId, nodeId, (prev) => {
                        const nextOutputs = [...(prev.sequenceOutputs || [])];
                        nextOutputs[i] = { ...nextOutputs[i], status: 'generating' };
                        return { ...prev, sequenceOutputs: nextOutputs };
                    });

                    try {
                        // PROMPT LOGIC
                        let basePrompt = parsed.prompt;
                        
                        // If specific prompt for this frame exists (from Upstream or Local)
                        if (parsed.isSequentialPromptMode || parsed.isSequentialEditingWithPrompts) {
                            // Upstream takes priority
                            if (upstreamPromptMap.has(i)) {
                                basePrompt = upstreamPromptMap.get(i);
                            } else if (parsed.framePrompts && parsed.framePrompts[i]) {
                                basePrompt = parsed.framePrompts[i];
                            }
                        }

                        // Append generic text inputs (that weren't JSON strings)
                        const genericTexts = textInputs.filter(t => !t.trim().startsWith('{') && !t.trim().startsWith('['));
                        let promptToUse = [basePrompt, ...genericTexts].filter(Boolean).join(', ');
                        
                        const imagesToUse = await Promise.all(imagesForFrame.map(async (image) => {
                             const imageDataUrl = `data:${image.mimeType};base64,${image.base64ImageData}`;
                             if (parsed.enableAspectRatio && parsed.aspectRatio && parsed.aspectRatio !== 'Auto') {
                                 const { formattedImage } = await formatImageForAspectRatio(imageDataUrl, parsed.aspectRatio);
                                 return {
                                     base64ImageData: formattedImage.split(',')[1],
                                     mimeType: formattedImage.match(/:(.*?);/)?.[1] || 'image/png'
                                 };
                             }
                             return image;
                        }));

                        if (parsed.enableOutpainting) {
                             const outpaintingTemplate = parsed.outpaintingPrompt || '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.';
                             promptToUse = outpaintingTemplate.replace('{main_prompt}', promptToUse);
                        }

                        // WRAP GENERATION IN RACE WITH ABORT SIGNAL
                        const imageUrl = await raceWithAbort(
                            generateImage(promptToUse, parsed.aspectRatio, imagesToUse, parsed.model, parsed.resolution),
                            abortControllerRef.current.signal
                        );
                        
                        let finalImageUrl = imageUrl;
                        if (parsed.autoCrop169) {
                            try {
                                finalImageUrl = await cropImageTo169(imageUrl);
                            } catch (e) { console.error(e); }
                        }
                        
                        const thumb = await generateThumbnail(finalImageUrl, 256, 256);
                        
                        updateNodeInStorage(currentTabId, nodeId, (prev) => {
                            const nextOutputs = [...(prev.sequenceOutputs || [])];
                            nextOutputs[i] = { status: 'done', thumbnail: thumb };
                            return { ...prev, sequenceOutputs: nextOutputs };
                        }, { frame: 1000 + i, url: finalImageUrl });

                        // Auto-Download for Sequence Mode
                        if (parsed.autoDownload) {
                             // Use unified filename format for manual/auto consistency
                             // Image_Editor_Frame_XXX_Date
                             const now = new Date();
                             const date = now.toISOString().split('T')[0];
                             const paddedFrame = String(i + 1).padStart(3, '0');
                             const filename = `Image_Editor_Frame_${paddedFrame}_${date}.png`;
                             
                             let assetUrl = finalImageUrl;
                             if (finalImageUrl.startsWith('data:image/png')) {
                                 assetUrl = addMetadataToPNG(finalImageUrl, 'prompt', promptToUse);
                             }
                             const link = document.createElement('a');
                             link.href = assetUrl;
                             link.download = filename;
                             document.body.appendChild(link);
                             link.click();
                             document.body.removeChild(link);
                        }

                    } catch (err: any) {
                        if (err.name === 'AbortError' || err.message === 'Aborted') {
                             updateNodeInStorage(currentTabId, nodeId, (prev) => {
                                const nextOutputs = [...(prev.sequenceOutputs || [])];
                                nextOutputs[i] = { ...nextOutputs[i], status: 'pending' }; 
                                return { ...prev, sequenceOutputs: nextOutputs };
                            });
                             break; // Exit loop immediately
                        } else {
                            console.error(`Frame ${i} failed`, err);
                            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                                const nextOutputs = [...(prev.sequenceOutputs || [])];
                                nextOutputs[i] = { status: 'error', thumbnail: null };
                                return { ...prev, sequenceOutputs: nextOutputs };
                            });
                        }
                    }
                 }

            } else {
                // Single Mode Logic
                let imagesToUse: { base64ImageData: string; mimeType: string; }[] = [];
                const checkedInputIndices = parsed.checkedInputIndices;
                
                if (checkedInputIndices && Array.isArray(checkedInputIndices)) {
                    imagesToUse = allInputImages.filter((_, i) => checkedInputIndices.includes(i));
                } else {
                     imagesToUse = allInputImages;
                }

                // Filter out JSON strings from text inputs for Single Mode prompt
                const genericTexts = textInputs.filter(t => !t.trim().startsWith('{') && !t.trim().startsWith('['));
                let promptToUse = [parsed.prompt, ...genericTexts].filter(Boolean).join(', ');

                const processedImages = await Promise.all(imagesToUse.map(async (image) => {
                     const imageDataUrl = `data:${image.mimeType};base64,${image.base64ImageData}`;
                     if (parsed.enableAspectRatio && parsed.aspectRatio && parsed.aspectRatio !== 'Auto') {
                         const { formattedImage } = await formatImageForAspectRatio(imageDataUrl, parsed.aspectRatio);
                         return {
                             base64ImageData: formattedImage.split(',')[1],
                             mimeType: formattedImage.match(/:(.*?);/)?.[1] || 'image/png'
                         };
                     }
                     return image;
                }));

                if (parsed.enableOutpainting) {
                     const outpaintingTemplate = parsed.outpaintingPrompt || '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.';
                     promptToUse = outpaintingTemplate.replace('{main_prompt}', promptToUse);
                }

                // WRAP GENERATION IN RACE WITH ABORT SIGNAL
                const imageUrl = await raceWithAbort(
                     generateImage(promptToUse, parsed.aspectRatio, processedImages, parsed.model, parsed.resolution),
                     abortControllerRef.current.signal
                );
                
                let finalImageUrl = imageUrl;
                if (parsed.autoCrop169) {
                     try {
                         finalImageUrl = await cropImageTo169(imageUrl);
                     } catch (e) { console.error(e); }
                }

                const thumb = await generateThumbnail(finalImageUrl, 256, 256);
                
                updateNodeInStorage(currentTabId, nodeId, (prev) => ({ ...prev, outputImage: thumb }), { frame: 0, url: finalImageUrl });

                // Auto-Download for Single Mode
                if (parsed.autoDownload) {
                     triggerDownload(finalImageUrl, promptToUse);
                }
            }

        } catch (e: any) {
            if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                setError(e.message);
            }
        } finally {
            setIsEditingImage(false);
            setIsStoppingEdit(false);
            abortControllerRef.current = null;
            unregisterOperation(nodeId);
        }
    }, [nodes, getUpstreamNodeValues, getFullSizeImage, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, activeTabIdRef]);

    const handleStopEdit = useCallback(() => {
        if (abortControllerRef.current) {
            setIsStoppingEdit(true);
            abortControllerRef.current.abort();
        }
    }, []);

    return {
        isEditingImage,
        isStoppingEdit,
        handleEditImage,
        handleStopEdit
    };
};
