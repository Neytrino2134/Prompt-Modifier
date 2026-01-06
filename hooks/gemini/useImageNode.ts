
import { useState, useCallback } from 'react';
import { generateImage } from '../../services/geminiService';
import { generateThumbnail } from '../../utils/imageUtils';
import { GeminiGenerationCommonProps } from './types';
import { NodeType } from '../../types';
import { RATIO_INDICES } from '../../utils/nodeUtils';

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
    setFullSizeImage
}: GeminiGenerationCommonProps) => {
    const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);

    const handleGenerateImage = useCallback(async (nodeId: string, cardIndex: number = 0) => {
        const currentTabId = activeTabIdRef.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        setIsGeneratingImage(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.generating'), tabId: activeTabId, tabName: activeTabName });

        try {
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
                // Standard Image Output uses upstream data
                const texts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
                prompt = texts.join(', ');
            }

            if (!prompt) {
                throw new Error("Prompt is empty. Connect a text node or enter a prompt.");
            }
            
            const imageUrl = await generateImage(prompt, aspectRatio, undefined, node.model, node.resolution);
            const thumbnailUrl = await generateThumbnail(imageUrl, 256, 256);
            
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
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsGeneratingImage(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, activeTabIdRef, setFullSizeImage]);

    return {
        isGeneratingImage,
        handleGenerateImage
    };
};
