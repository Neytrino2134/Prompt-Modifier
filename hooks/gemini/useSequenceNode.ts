
import { useState, useCallback, useRef } from 'react';
import { generateImage } from '../../services/geminiService';
import { generateThumbnail, formatImageForAspectRatio, cropImageTo169 } from '../../utils/imageUtils';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { GeminiGenerationCommonProps } from './types';

interface UseSequenceNodeProps extends GeminiGenerationCommonProps {
    connectedCharacterData: Map<string, any[]>;
}

const SHOT_TYPE_INSTRUCTIONS: Record<string, string> = {
    'WS': "Integrate the character/object with a Wide Shot (WS) into the scene and action. Show the environment.",
    'MS': "Integrate the character/object with a Medium Shot (MS) into the scene. Character from waist up.",
    'CU': "Integrate the character/object with a Close-Up (CU) into the scene.",
    'ECU': "Integrate the character/object with an Extreme Close-Up (ECU) into the scene. Maximum detail.",
    'LS': "Integrate the character/object with a Long Shot (LS) into the scene to show scale."
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

const triggerDownload = (url: string, frameNumber: number, prompt: string) => {
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
    link.download = `Frame_${paddedFrame}_seq_gen_${date}_${time}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const useSequenceNode = ({
    nodes,
    setError,
    t,
    registerOperation,
    unregisterOperation,
    updateNodeInStorage,
    connectedCharacterData,
    activeTabId,
    activeTabName,
    activeTabIdRef,
    addToast,
    setFullSizeImage
}: UseSequenceNodeProps) => {
    const [isGeneratingSequence, setIsGeneratingSequence] = useState<string | null>(null);
    const [isStoppingSequence, setIsStoppingSequence] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const prepareConcepts = (parsed: any, nodeId: string) => {
        const characterConcepts = parsed.characterConcepts || [];
        const connectedChars = connectedCharacterData.get(nodeId) || [];
        const mappedUpstream = connectedChars.map((c: any) => ({
            ...c,
            id: c.index || c.alias || c.name || `upstream-${Math.random().toString(36).substr(2, 5)}`,
            isUpstream: true
        }));
        return [...mappedUpstream, ...characterConcepts];
    };

    const resolveCharacterConcept = (charRef: string, allConcepts: any[]) => {
        if (!charRef) return null;
        // Normalize strings to handle "Character-1", "character 1", "Character1" consistently
        const normalize = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = normalize(charRef);

        return allConcepts.find((c: any) => {
            if (c.index && normalize(c.index) === target) return true;
            if (c.alias && normalize(c.alias) === target) return true;
            if (c.name && normalize(c.name) === target) return true;
            if (c.id && normalize(c.id) === target) return true;
            return false;
        });
    };

    const cleanupNodeStatuses = useCallback((targetTabId: string, nodeId: string) => {
        updateNodeInStorage(targetTabId, nodeId, (prev) => {
            const currentStatuses = { ...(prev.frameStatuses || {}) };
            let hasChanges = false;
            Object.keys(currentStatuses).forEach(key => {
                const status = currentStatuses[key];
                if (status === 'pending' || status === 'generating' || status === 'prompt_processing') {
                    currentStatuses[key] = 'idle';
                    hasChanges = true;
                }
            });
            return hasChanges ? { ...prev, frameStatuses: currentStatuses } : prev;
        });
    }, [updateNodeInStorage]);

    const handleGenerateImageSequence = useCallback(async (nodeId: string, startIndex: number = 0) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        setIsGeneratingSequence(nodeId);
        setError(null);
        setIsStoppingSequence(false);
        abortControllerRef.current = new AbortController();
        registerOperation({ id: nodeId, type: 'sequence', description: t('node.content.generating'), tabId: activeTabId, tabName: activeTabName });

        try {
            const parsed = JSON.parse(node.value || '{}');
            const prompts = parsed.prompts || [];
            const allConcepts = prepareConcepts(parsed, nodeId);
            const framesToProcess = prompts.slice(startIndex);
            const isStyleInserted = parsed.isStyleInserted !== false; // Default true
            const prefix = parsed.integrationPrompt || "Integrate these characters/objects into the scene and action. Fill the background with environmental elements — fill in the gray area of the source scene image naturally.";

            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                const newStatuses = { ...(prev.frameStatuses || {}) };
                framesToProcess.forEach(p => { newStatuses[p.frameNumber] = 'pending'; });
                return { ...prev, frameStatuses: newStatuses };
            });

            for (const promptItem of framesToProcess) {
                if (abortControllerRef.current?.signal.aborted) break;
                const frameNum = promptItem.frameNumber;
                
                updateNodeInStorage(currentTabId, nodeId, (prev) => ({
                    ...prev,
                    frameStatuses: { ...(prev.frameStatuses || {}), [frameNum]: 'generating' }
                }));

                try {
                    // 1. Prepare images first to determine if we need the prefix
                    let charNames = promptItem.characters || [];
                    
                    // FALLBACK: If characters array is empty, check the prompt text for tags like Character-1
                    if (charNames.length === 0 && promptItem.prompt) {
                        const foundTags = promptItem.prompt.match(/(?:character|entity)-\d+/gi);
                        if (foundTags) {
                             // Use a Set to remove duplicates
                             charNames = [...new Set(foundTags)];
                        }
                    }

                    const imagesToSend: any[] = [];
                    const usedIndices = new Set<string>();

                    for (const charRef of charNames) {
                        const concept = resolveCharacterConcept(charRef, allConcepts);
                        
                        // Prevent sending duplicate images for the same character reference
                        if (!concept || usedIndices.has(concept.index || concept.id)) continue;
                        
                        // Prioritize the full resolution image from upstream cache, fallback to thumbnail
                        const imgSource = concept._fullResImage || concept.image;
                        
                        if (imgSource && typeof imgSource === 'string' && imgSource.startsWith('data:')) {
                             const mimeMatch = imgSource.match(/:(.*?);/);
                             const base64ImageData = imgSource.split(',')[1];
                             
                             if (base64ImageData) {
                                 imagesToSend.push({ 
                                    base64ImageData, 
                                    mimeType: mimeMatch ? mimeMatch[1] : 'image/png',
                                    _dataUrl: imgSource 
                                 });
                                 usedIndices.add(concept.index || concept.id);
                             }
                        }
                    }

                    // 2. Construct Prompt
                    // Only add prefix if we are actually sending reference images (editing mode)
                    let fullPrompt = promptItem.prompt;
                    if (imagesToSend.length > 0) {
                        // Look for Shot Type specific instruction
                        const shotInstruction = SHOT_TYPE_INSTRUCTIONS[promptItem.shotType] || "";
                        fullPrompt = `${prefix}\n${shotInstruction}\n\n${fullPrompt}`;
                    }
                    
                    // Replace Tags Logic
                    if (parsed.characterPromptCombination === 'replace') {
                        // Regex to match "Character-1", "character-2", etc. more robustly
                        fullPrompt = fullPrompt.replace(/((?:Character|Entity)[-\s]?\d+|(?:Character|Entity)[-\s]?\w+)/gi, (match: string) => {
                             const concept = resolveCharacterConcept(match, allConcepts);
                             if (concept && concept.prompt) {
                                 // "Character-1 (description...)"
                                 return `${match} (${concept.prompt})`;
                             }
                             return match;
                        });
                    }
                    
                    let finalImagesToSend: { base64ImageData: string, mimeType: string }[] = [];
                    if (parsed.enableAspectRatio && parsed.aspectRatio && parsed.aspectRatio !== 'Auto' && imagesToSend.length > 0) {
                         finalImagesToSend = await Promise.all(imagesToSend.map(async (img) => {
                             try {
                                 const { formattedImage } = await formatImageForAspectRatio(img._dataUrl!, parsed.aspectRatio);
                                 return { base64ImageData: formattedImage.split(',')[1], mimeType: formattedImage.match(/:(.*?);/)?.[1] || 'image/png' };
                             } catch (e) { return { base64ImageData: img.base64ImageData, mimeType: img.mimeType }; }
                         }));
                    } else {
                        finalImagesToSend = imagesToSend.map(i => ({ base64ImageData: i.base64ImageData, mimeType: i.mimeType }));
                    }

                    // Insert Style Logic
                    if (isStyleInserted && parsed.styleOverride) {
                        fullPrompt = `${fullPrompt}\n\n[Visual Style]: ${parsed.styleOverride}`;
                    }

                    const imageUrl = await raceWithAbort(
                        generateImage(fullPrompt, parsed.aspectRatio, finalImagesToSend.length > 0 ? finalImagesToSend : undefined, parsed.model),
                        abortControllerRef.current!.signal
                    );
                    
                    let finalUrl = imageUrl;
                    if (parsed.autoCrop169 && parsed.aspectRatio === '16:9') {
                         try { finalUrl = await cropImageTo169(imageUrl); } catch(e) {}
                    }
                    
                    const thumb = await generateThumbnail(finalUrl, 128, 128);
                    
                    // Update Node state (thumbnail + status) AND pass Full Res for storage/cache
                    // Passing finalUrl as the 4th argument ensures it gets saved to the correct tab's cache
                    updateNodeInStorage(currentTabId, nodeId, (prev) => ({
                        ...prev,
                        images: { ...(prev.images || {}), [frameNum]: thumb },
                        frameStatuses: { ...(prev.frameStatuses || {}), [frameNum]: 'done' }
                    }), { frame: 1000 + frameNum, url: finalUrl });

                    if (parsed.autoDownload) {
                        triggerDownload(finalUrl, frameNum, promptItem.prompt);
                    }

                } catch (err: any) {
                    if (err.name === 'AbortError' || err.message === 'Aborted') {
                        updateNodeInStorage(currentTabId, nodeId, (prev) => ({
                            ...prev,
                            frameStatuses: { ...(prev.frameStatuses || {}), [frameNum]: 'idle' } 
                        }));
                        break;
                    } else {
                        console.error(`Frame ${frameNum} failed:`, err);
                        updateNodeInStorage(currentTabId, nodeId, (prev) => ({
                            ...prev,
                            frameStatuses: { ...(prev.frameStatuses || {}), [frameNum]: 'error' }
                        }));
                    }
                }
            }
        } catch (e: any) {
             if (e.name !== 'AbortError' && e.message !== 'Aborted') setError(e.message);
        } finally {
            cleanupNodeStatuses(currentTabId, nodeId);
            setIsGeneratingSequence(null);
            setIsStoppingSequence(false);
            abortControllerRef.current = null;
            unregisterOperation(nodeId);
        }
    }, [nodes, connectedCharacterData, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, activeTabIdRef, addToast, setFullSizeImage, cleanupNodeStatuses]);

    const handleGenerateSelectedFrames = useCallback(async (nodeId: string, framesOverride?: number[]) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const parsed = JSON.parse(node.value || '{}');
        const framesToProcessIndices = framesOverride || parsed.checkedFrameNumbers || [];
        if (framesToProcessIndices.length === 0) return;
        
        setIsGeneratingSequence(nodeId);
        setError(null);
        setIsStoppingSequence(false);
        abortControllerRef.current = new AbortController();
        registerOperation({ id: nodeId, type: 'sequence', description: t('node.content.generating'), tabId: activeTabId, tabName: activeTabName });

        try {
            const prompts = parsed.prompts || [];
            const allConcepts = prepareConcepts(parsed, nodeId);
            const framesToProcess = prompts.filter((p: any) => framesToProcessIndices.includes(p.frameNumber));
            const isStyleInserted = parsed.isStyleInserted !== false;
            const prefix = parsed.integrationPrompt || "Integrate these characters/objects into the scene and action. Fill the background with environmental elements — fill in the gray area of the source scene image naturally.";

            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                const newStatuses = { ...(prev.frameStatuses || {}) };
                framesToProcessIndices.forEach(fNum => { newStatuses[fNum] = 'pending'; });
                return { ...prev, frameStatuses: newStatuses };
            });

            for (const promptItem of framesToProcess) {
                if (abortControllerRef.current?.signal.aborted) break;
                const frameNum = promptItem.frameNumber;
                
                updateNodeInStorage(currentTabId, nodeId, (prev) => ({
                    ...prev,
                    frameStatuses: { ...(prev.frameStatuses || {}), [frameNum]: 'generating' }
                }));

                try {
                    // 1. Prepare images first
                    let charNames = promptItem.characters || [];
                    
                    // FALLBACK: If characters array is empty, check the prompt text for tags like Character-1
                    if (charNames.length === 0 && promptItem.prompt) {
                        const foundTags = promptItem.prompt.match(/(?:character|entity)-\d+/gi);
                        if (foundTags) {
                             // Use a Set to remove duplicates
                             charNames = [...new Set(foundTags)];
                        }
                    }

                    const imagesToSend: any[] = [];
                    const usedIndices = new Set<string>();

                    for (const charRef of charNames) {
                        const concept = resolveCharacterConcept(charRef, allConcepts);
                        
                        if (!concept || usedIndices.has(concept.index || concept.id)) continue;
                        
                        const imgSource = concept._fullResImage || concept.image;
                        if (imgSource && typeof imgSource === 'string' && imgSource.startsWith('data:')) {
                             const mimeMatch = imgSource.match(/:(.*?);/);
                             const base64ImageData = imgSource.split(',')[1];
                             if (base64ImageData) {
                                imagesToSend.push({ 
                                    base64ImageData, 
                                    mimeType: mimeMatch ? mimeMatch[1] : 'image/png',
                                    _dataUrl: imgSource 
                                });
                                usedIndices.add(concept.index || concept.id);
                             }
                        }
                    }

                    // 2. Construct Prompt with conditional prefix and shot type
                    let fullPrompt = promptItem.prompt;
                    if (imagesToSend.length > 0) {
                         // Look for Shot Type specific instruction
                        const shotInstruction = SHOT_TYPE_INSTRUCTIONS[promptItem.shotType] || "";
                        fullPrompt = `${prefix}\n${shotInstruction}\n\n${fullPrompt}`;
                    }
                    
                    // Replace Tags Logic
                    if (parsed.characterPromptCombination === 'replace') {
                        fullPrompt = fullPrompt.replace(/((?:Character|Entity)[-\s]?\d+|(?:Character|Entity)[-\s]?\w+)/gi, (match: string) => {
                             const concept = resolveCharacterConcept(match, allConcepts);
                             if (concept && concept.prompt) {
                                 return `${match} (${concept.prompt})`;
                             }
                             return match;
                        });
                    }

                    let finalImagesToSend: { base64ImageData: string, mimeType: string }[] = [];
                    if (parsed.enableAspectRatio && parsed.aspectRatio && parsed.aspectRatio !== 'Auto' && imagesToSend.length > 0) {
                         finalImagesToSend = await Promise.all(imagesToSend.map(async (img) => {
                             try {
                                 const { formattedImage } = await formatImageForAspectRatio(img._dataUrl!, parsed.aspectRatio);
                                 return { base64ImageData: formattedImage.split(',')[1], mimeType: formattedImage.match(/:(.*?);/)?.[1] || 'image/png' };
                             } catch (e) { return { base64ImageData: img.base64ImageData, mimeType: img.mimeType }; }
                         }));
                    } else {
                        finalImagesToSend = imagesToSend.map(i => ({ base64ImageData: i.base64ImageData, mimeType: i.mimeType }));
                    }
                    
                    // Insert Style Logic
                    if (isStyleInserted && parsed.styleOverride) {
                        fullPrompt = `${fullPrompt}\n\n[Visual Style]: ${parsed.styleOverride}`;
                    }

                    const imageUrl = await raceWithAbort(
                        generateImage(fullPrompt, parsed.aspectRatio, finalImagesToSend.length > 0 ? finalImagesToSend : undefined, parsed.model),
                        abortControllerRef.current!.signal
                    );

                    let finalUrl = imageUrl;
                    if (parsed.autoCrop169 && parsed.aspectRatio === '16:9') {
                         try { finalUrl = await cropImageTo169(imageUrl); } catch(e) {}
                    }
                    
                    const thumb = await generateThumbnail(finalUrl, 128, 128);
                    
                    // Update Node state (thumbnail + status) AND pass Full Res for storage/cache
                    // Passing finalUrl as the 4th argument ensures it gets saved to the correct tab's cache
                    updateNodeInStorage(currentTabId, nodeId, (prev) => ({
                        ...prev,
                        images: { ...(prev.images || {}), [frameNum]: thumb },
                        frameStatuses: { ...(prev.frameStatuses || {}), [frameNum]: 'done' }
                    }), { frame: 1000 + frameNum, url: finalUrl });
                    
                    if (parsed.autoDownload) {
                        triggerDownload(finalUrl, frameNum, promptItem.prompt);
                    }

                } catch (err: any) {
                    if (err.name === 'AbortError' || err.message === 'Aborted') {
                        updateNodeInStorage(currentTabId, nodeId, (prev) => ({
                            ...prev,
                            frameStatuses: { ...(prev.frameStatuses || {}), [frameNum]: 'idle' }
                        }));
                        break; 
                    } else {
                        console.error(`Frame ${frameNum} failed:`, err);
                        updateNodeInStorage(currentTabId, nodeId, (prev) => ({
                            ...prev,
                            frameStatuses: { ...(prev.frameStatuses || {}), [frameNum]: 'error' }
                        }));
                    }
                }
            }
        } catch (e: any) {
             if (e.name !== 'AbortError' && e.message !== 'Aborted') setError(e.message);
        } finally {
            cleanupNodeStatuses(currentTabId, nodeId);
            setIsGeneratingSequence(null);
            setIsStoppingSequence(false);
            abortControllerRef.current = null;
            unregisterOperation(nodeId);
        }
    }, [nodes, connectedCharacterData, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, activeTabIdRef, addToast, setFullSizeImage, cleanupNodeStatuses]);

    const handleStopImageSequence = useCallback(() => {
        if (abortControllerRef.current) {
            setIsStoppingSequence(true);
            abortControllerRef.current.abort();
        }
    }, []);

    return {
        isGeneratingSequence,
        isStoppingSequence,
        handleGenerateImageSequence,
        handleGenerateSelectedFrames,
        handleStopImageSequence
    };
};
