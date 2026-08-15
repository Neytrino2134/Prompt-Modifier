
import { useState, useCallback } from 'react';
import { generateImage } from '../../services/geminiService';
import { generateThumbnail } from '../../utils/imageUtils';
import { GeminiGenerationCommonProps } from './types';
import { NodeType } from '../../types';
import { RATIO_INDICES } from '../../utils/nodeUtils';
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
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `Image_000_${date}_${time}.png`;
    
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

export const useImageNode = ({
    nodes,
    getUpstreamNodeValues,
    setError,
    t,
    registerOperation,
    unregisterOperation,
    updateNodeInStorage,
    activeTabId,
    activeTabName,
    activeTabIdRef,
    setFullSizeImage,
    addToHistory,
    taskQueue
}: GeminiGenerationCommonProps) => {
    const [isGeneratingImageLocal, setIsGeneratingImageLocal] = useState<string | null>(null);

    const isGeneratingImage = useCallback((nodeId?: string, cardIndex?: number) => {
        if (nodeId && taskQueue) {
            return taskQueue.isTaskRunningForNode(nodeId, cardIndex);
        }
        return isGeneratingImageLocal === nodeId;
    }, [taskQueue, isGeneratingImageLocal]);

    const handleStopImage = useCallback((nodeId?: string) => {
        if (nodeId && taskQueue) {
            taskQueue.cancelAllNodeTasks(nodeId);
        }
    }, [taskQueue]);

    const handleGenerateImage = useCallback(async (nodeId: string, cardIndex: number = 0) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let prompt = '';
        let aspectRatio = node.aspectRatio || '1:1';
        
        if (node.type === NodeType.CHARACTER_CARD) {
            // Character Card can now hold an array
            let parsed = JSON.parse(node.value || '[]');
            if (!Array.isArray(parsed)) {
                parsed = [parsed];
            }
            
            // Logic: Generate for the specific character based on cardIndex
            const char = parsed[cardIndex] || {};
            const basePrompt = char.prompt || '';
            aspectRatio = char.selectedRatio || '1:1';
            
            // Add suffix if available
            const suffix = char.additionalPrompt !== undefined ? char.additionalPrompt : "Full body character concept on a gray background";
            
            if (suffix.trim()) {
                prompt = basePrompt ? `${basePrompt}, ${suffix}` : suffix;
            } else {
                prompt = basePrompt;
            }
            
        } else {
            // Standard Image Output uses upstream data or custom prompt
            const texts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            prompt = texts.length > 0 ? texts.join(', ') : (node.customPrompt || '');
        }

        if (!prompt) {
            setError("Prompt is empty. Connect a text node or enter a prompt.");
            return;
        }

        setError(null);

        const executeGen = async (signal: AbortSignal) => {
            registerOperation({ id: nodeId, type: 'generation', description: t('node.content.generating'), tabId: activeTabId, tabName: activeTabName });
            return await raceWithAbort(
                generateImage(prompt, aspectRatio, undefined, node.model, node.resolution),
                signal
            );
        };

        const onSuccess = async (imageUrl: string) => {
            const thumbnailUrl = await generateThumbnail(imageUrl, 256, 256);
            
            if (addToHistory) {
                addToHistory(imageUrl, prompt, node.model || 'imagen-4.0-generate-001', { aspectRatio, resolution: node.resolution });
            }
            
            if (node.type === NodeType.CHARACTER_CARD) {
                const ratioIdx = RATIO_INDICES[aspectRatio] || 1;
                // Calculate precise frame index for cache: (cardIndex * 10) + ratioIndex
                const specificFrameIndex = (cardIndex * 10) + ratioIdx;

                updateNodeInStorage(currentTabId, nodeId, (prev) => {
                     let chars = Array.isArray(prev) ? [...prev] : [prev];
                     if (!chars[cardIndex]) return prev;
                     
                     // Update the specific character's ratio thumbnail and active image
                     const updatedThumbnails = { ...(chars[cardIndex].thumbnails || {}), [aspectRatio]: thumbnailUrl };
                     chars[cardIndex] = {
                         ...chars[cardIndex],
                         image: thumbnailUrl,
                         thumbnails: updatedThumbnails
                     };
                     return chars;
                }, { frame: specificFrameIndex, url: imageUrl });
                
                // Also store as active high-res output for this specific card (base index 10*i)
                setFullSizeImage(nodeId, cardIndex * 10, imageUrl);
                setFullSizeImage(nodeId, specificFrameIndex, imageUrl);

            } else {
                updateNodeInStorage(currentTabId, nodeId, () => thumbnailUrl, { frame: 0, url: imageUrl });
                
                if (node.autoDownload) {
                    triggerDownload(imageUrl, prompt);
                }
            }
            unregisterOperation(nodeId);
        };

        const onError = (e: any) => {
            unregisterOperation(nodeId);
            if (e?.name !== 'AbortError' && e?.message !== 'Aborted') {
                setError(e?.message || 'Generation failed');
            }
        };

        if (taskQueue) {
            taskQueue.enqueueTask({
                nodeId,
                nodeTitle: node.title || (node.type === NodeType.CHARACTER_CARD ? 'Character Card' : 'Image Output'),
                frameIndex: cardIndex,
                prompt,
                type: node.type === NodeType.CHARACTER_CARD ? 'character_gen' : 'image_gen',
                tabId: currentTabId,
                tabName: activeTabName,
                execute: executeGen,
                onSuccess,
                onError
            });
        } else {
            try {
                setIsGeneratingImageLocal(nodeId);
                const abortCtrl = new AbortController();
                const url = await executeGen(abortCtrl.signal);
                await onSuccess(url);
            } catch (e: any) {
                onError(e);
            } finally {
                setIsGeneratingImageLocal(null);
            }
        }
    }, [nodes, getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, activeTabIdRef, setFullSizeImage, addToHistory, taskQueue]);

    return {
        isGeneratingImage,
        handleGenerateImage,
        handleStopImage
    };
};
