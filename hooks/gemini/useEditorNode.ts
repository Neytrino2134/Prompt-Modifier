




import { useState, useCallback, useRef } from 'react';
import { generateImage } from '../../services/geminiService';
import { generateThumbnail, formatImageForAspectRatio, cropImageTo169 } from '../../utils/imageUtils';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { GeminiGenerationCommonProps } from './types';

// Helper for local download triggering within the hook
const triggerDownload = (url: string, prompt: string, frameNumber: number = 0) => {
    let assetUrl = url;
    if (url.startsWith('data:image/png')) {
        assetUrl = addMetadataToPNG(url, 'prompt', prompt);
    }
    
    const link = document.createElement('a');
    link.href = assetUrl;
    
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const paddedFrame = String(frameNumber).padStart(3, '0');
    const filename = `Image_${paddedFrame}_${date}_${time}.png`;
    
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
    activeTabIdRef,
    addToHistory,
    taskQueue
}: GeminiGenerationCommonProps) => {
    const [isEditingImageLocal, setIsEditingImageLocal] = useState<boolean>(false);
    const [isStoppingEdit, setIsStoppingEdit] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const isEditingImage = useCallback((nodeId?: string) => {
        if (nodeId && taskQueue) {
            return taskQueue.isTaskRunningForNode(nodeId);
        }
        return isEditingImageLocal || (taskQueue ? taskQueue.activeTaskCount > 0 : false);
    }, [taskQueue, isEditingImageLocal]);

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
                const json = JSON.parse(text);
                let prompts = [];
                
                if (json.sourcePrompts || json.modifiedPrompts) {
                    const source = json.sourcePrompts || [];
                    const mod = json.modifiedPrompts || [];
                    
                    const mergedPromptsMap = new Map();
                    source.forEach((p: any) => mergedPromptsMap.set(p.frameNumber, p));
                    mod.forEach((p: any) => mergedPromptsMap.set(p.frameNumber, { ...mergedPromptsMap.get(p.frameNumber), ...p }));
                    
                    prompts = Array.from(mergedPromptsMap.values());
                } 
                else if (json.type === 'script-prompt-modifier-data') {
                    prompts = json.finalPrompts || json.prompts || [];
                } else if (Array.isArray(json)) {
                    prompts = json;
                }
                
                if (prompts.length > 0) {
                    prompts.forEach((p: any, i: number) => {
                        const frameIdx = (p.frameNumber !== undefined ? p.frameNumber : i + 1) - 1;
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

        // Validation - Relaxed for text-only potential
        if (!parsed.isSequentialEditingWithPrompts) {
             const genericTextsForCheck = textInputs.filter(t => !t.trim().startsWith('{') && !t.trim().startsWith('['));
             const hasPrompt = !!(parsed.prompt || genericTextsForCheck.length > 0);
             if (allInputImages.length === 0 && parsed.model !== 'gemini-3-pro-image-preview' && !hasPrompt) {
                 setError("No input image or prompt provided for generation/editing.");
                 return;
             }
        }

        setError(null);
        setIsStoppingEdit(false);

        if (isSequenceMode) {
             const targetIndices = indicesToProcess || (
                 parsed.isSequentialEditingWithPrompts 
                    ? (parsed.checkedSequenceOutputIndices || allInputImagesB.map((_: any, i: number) => i))
                    : (parsed.checkedInputIndices ?? allInputImages.map((_: any, i: number) => i))
             );

             const sequenceOutputs = parsed.sequenceOutputs || [];
             const newOutputs = [...sequenceOutputs];
             targetIndices.forEach((i: number) => {
                 newOutputs[i] = { status: 'queued', thumbnail: null };
             });
             updateNodeInStorage(currentTabId, nodeId, (prev) => ({ ...prev, sequenceOutputs: newOutputs }));

             for (const i of targetIndices) {
                let imagesForFrame: { base64ImageData: string, mimeType: string }[] = [];

                if (parsed.isSequentialEditingWithPrompts) {
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

                // PROMPT LOGIC
                let basePrompt = parsed.prompt;
                if (parsed.isSequentialPromptMode || parsed.isSequentialEditingWithPrompts) {
                    if (upstreamPromptMap.has(i)) {
                        basePrompt = upstreamPromptMap.get(i);
                    } else if (parsed.framePrompts && parsed.framePrompts[i]) {
                        basePrompt = parsed.framePrompts[i];
                    }
                }

                const genericTexts = textInputs.filter(t => !t.trim().startsWith('{') && !t.trim().startsWith('['));
                let promptToUse = [basePrompt, ...genericTexts].filter(Boolean).join(', ');
                if (!promptToUse.trim()) promptToUse = "High quality image";

                const executeFrame = async (signal: AbortSignal) => {
                    updateNodeInStorage(currentTabId, nodeId, (prev) => {
                        const nextOutputs = [...(prev.sequenceOutputs || [])];
                        nextOutputs[i] = { ...nextOutputs[i], status: 'generating' };
                        return { ...prev, sequenceOutputs: nextOutputs };
                    });

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

                    let promptWithOutpaint = promptToUse;
                    if (parsed.enableOutpainting) {
                         const outpaintingTemplate = parsed.outpaintingPrompt || '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.';
                         promptWithOutpaint = outpaintingTemplate.replace('{main_prompt}', promptToUse);
                    }

                    return await raceWithAbort(
                        generateImage(promptWithOutpaint, parsed.aspectRatio, imagesToUse, parsed.model, parsed.resolution),
                        signal
                    );
                };

                const onSuccess = async (imageUrl: string) => {
                    if (addToHistory) addToHistory(imageUrl, promptToUse);
                    let finalImageUrl = imageUrl;
                    if (parsed.autoCrop169) {
                         try { finalImageUrl = await cropImageTo169(imageUrl); } catch(e) {}
                    }
                    const thumb = await generateThumbnail(finalImageUrl, 256, 256);
                    
                    updateNodeInStorage(currentTabId, nodeId, (prev) => {
                        const nextOutputs = [...(prev.sequenceOutputs || [])];
                        nextOutputs[i] = { status: 'done', thumbnail: thumb };
                        return { ...prev, sequenceOutputs: nextOutputs };
                    }, { frame: 1000 + i, url: finalImageUrl });

                    if (parsed.autoDownload) {
                         triggerDownload(finalImageUrl, promptToUse, i + 1);
                    }
                };

                const onError = (err: any) => {
                    updateNodeInStorage(currentTabId, nodeId, (prev) => {
                        const nextOutputs = [...(prev.sequenceOutputs || [])];
                        nextOutputs[i] = { status: err?.name === 'AbortError' || err?.message === 'Aborted' ? 'pending' : 'error', thumbnail: null };
                        return { ...prev, sequenceOutputs: nextOutputs };
                    });
                };

                if (taskQueue) {
                    taskQueue.enqueueTask({
                        nodeId,
                        nodeTitle: node.title || 'Image Editor',
                        frameIndex: i,
                        prompt: promptToUse,
                        type: 'sequence_frame',
                        tabId: currentTabId,
                        tabName: activeTabName,
                        execute: executeFrame,
                        onSuccess,
                        onError
                    });
                } else {
                    // Fallback local execution if taskQueue not present
                    try {
                        const abortCtrl = new AbortController();
                        abortControllerRef.current = abortCtrl;
                        setIsEditingImageLocal(true);
                        const res = await executeFrame(abortCtrl.signal);
                        await onSuccess(res);
                    } catch (e) {
                        onError(e);
                    } finally {
                        setIsEditingImageLocal(false);
                    }
                }
             }

        } else {
            // Single Mode Logic
            let imagesToUseInputs: { base64ImageData: string; mimeType: string; }[] = [];
            const checkedInputIndices = parsed.checkedInputIndices;
            
            if (checkedInputIndices && Array.isArray(checkedInputIndices)) {
                imagesToUseInputs = allInputImages.filter((_, i) => checkedInputIndices.includes(i));
            } else {
                 imagesToUseInputs = allInputImages;
            }

            const genericTexts = textInputs.filter(t => !t.trim().startsWith('{') && !t.trim().startsWith('['));
            let promptToUse = [parsed.prompt, ...genericTexts].filter(Boolean).join(', ');
            if (!promptToUse.trim()) promptToUse = "High quality image";

            const executeSingle = async (signal: AbortSignal) => {
                const processedImages = await Promise.all(imagesToUseInputs.map(async (image) => {
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

                let promptWithOutpaint = promptToUse;
                if (parsed.enableOutpainting) {
                     const outpaintingTemplate = parsed.outpaintingPrompt || '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.';
                     promptWithOutpaint = outpaintingTemplate.replace('{main_prompt}', promptToUse);
                }

                return await raceWithAbort(
                     generateImage(promptWithOutpaint, parsed.aspectRatio, processedImages, parsed.model, parsed.resolution),
                     signal
                );
            };

            const onSuccess = async (imageUrl: string) => {
                if (addToHistory) addToHistory(imageUrl, promptToUse);
                let finalImageUrl = imageUrl;
                if (parsed.autoCrop169) {
                     try { finalImageUrl = await cropImageTo169(imageUrl); } catch(e) {}
                }
                const thumb = await generateThumbnail(finalImageUrl, 256, 256);
                
                updateNodeInStorage(currentTabId, nodeId, (prev) => ({ ...prev, outputImage: thumb }), { frame: 0, url: finalImageUrl });

                if (parsed.autoDownload) {
                     triggerDownload(finalImageUrl, promptToUse);
                }
            };

            const onError = (e: any) => {
                if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                    setError(e.message);
                }
            };

            if (taskQueue) {
                taskQueue.enqueueTask({
                    nodeId,
                    nodeTitle: node.title || 'Image Editor',
                    frameIndex: 0,
                    prompt: promptToUse,
                    type: 'image_edit',
                    tabId: currentTabId,
                    tabName: activeTabName,
                    execute: executeSingle,
                    onSuccess,
                    onError
                });
            } else {
                try {
                    const abortCtrl = new AbortController();
                    abortControllerRef.current = abortCtrl;
                    setIsEditingImageLocal(true);
                    const res = await executeSingle(abortCtrl.signal);
                    await onSuccess(res);
                } catch (e) {
                    onError(e);
                } finally {
                    setIsEditingImageLocal(false);
                }
            }
        }
    }, [nodes, getUpstreamNodeValues, getFullSizeImage, setError, updateNodeInStorage, activeTabName, activeTabIdRef, addToHistory, taskQueue]);

    const handleStopEdit = useCallback((nodeId?: string) => {
        if (nodeId && taskQueue) {
            taskQueue.cancelAllNodeTasks(nodeId);
        }
        if (abortControllerRef.current) {
            setIsStoppingEdit(true);
            abortControllerRef.current.abort();
        }
    }, [taskQueue]);

    return {
        isEditingImage: isEditingImage(),
        isStoppingEdit,
        handleEditImage,
        handleStopEdit
    };
};