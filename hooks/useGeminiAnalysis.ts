
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Tab, ActiveOperation, ToastType } from '../types';
import { NodeType } from '../types';
import { analyzePrompt, describeImage, analyzeCharacter, generateImage, extractTextFromImage, generatePromptFromImage } from '../services/geminiService';
import { generateThumbnail } from '../utils/imageUtils';

interface UseGeminiAnalysisProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
    setError: (error: string | null) => void;
    t: (key: string) => string;
    setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
    activeTabId: string;
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    activeTabName: string;
    registerOperation: (op: ActiveOperation) => void;
    unregisterOperation: (id: string) => void;
    addToast: (message: string, type?: ToastType) => void;
}

export const useGeminiAnalysis = ({ nodes, setNodes, getUpstreamNodeValues, setError, t, setFullSizeImage, getFullSizeImage, activeTabId, setTabs, activeTabName, registerOperation, unregisterOperation, addToast }: UseGeminiAnalysisProps) => {
    const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
    const [isAnalyzingCharacter, setIsAnalyzingCharacter] = useState<string | null>(null);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState<string | null>(null);
    const [isProcessingImage, setIsProcessingImage] = useState<string | null>(null);
    const [isUpdatingCharacterPrompt, setIsUpdatingCharacterPrompt] = useState<string | null>(null);

    const activeTabIdRef = useRef(activeTabId);
    useEffect(() => {
        activeTabIdRef.current = activeTabId;
    }, [activeTabId]);

    const updateNodeInStorage = useCallback((targetTabId: string, nodeId: string, valueUpdater: (prevVal: any) => any, imageCacheUpdate?: { frame: number, url: string }) => {
        const safeParse = (val: string) => {
            try { return JSON.parse(val || '{}'); } catch { return val; } 
        };

        if (activeTabIdRef.current === targetTabId) {
            if (imageCacheUpdate) {
                setFullSizeImage(nodeId, imageCacheUpdate.frame, imageCacheUpdate.url);
            }
            setNodes(nds => nds.map(n => {
                if (n.id === nodeId) {
                    const currentVal = safeParse(n.value);
                    const newVal = valueUpdater(currentVal);
                    const finalValue = typeof newVal === 'string' ? newVal : JSON.stringify(newVal);
                    return { ...n, value: finalValue };
                }
                return n;
            }));
        } else {
            setTabs(prevTabs => prevTabs.map(tab => {
                if (tab.id === targetTabId) {
                    const newNodes = tab.state.nodes.map(n => {
                        if (n.id === nodeId) {
                            const currentVal = safeParse(n.value);
                            const newVal = valueUpdater(currentVal);
                            const finalValue = typeof newVal === 'string' ? newVal : JSON.stringify(newVal);
                            return { ...n, value: finalValue };
                        }
                        return n;
                    });
                    
                    let newCache = tab.state.fullSizeImageCache || {};
                    if (imageCacheUpdate) {
                        newCache = {
                            ...newCache,
                            [nodeId]: {
                                ...(newCache[nodeId] || {}),
                                [imageCacheUpdate.frame]: imageCacheUpdate.url
                            }
                        };
                    }
                    
                    return { 
                        ...tab, 
                        state: { 
                            ...tab.state, 
                            nodes: newNodes,
                            fullSizeImageCache: newCache
                        } 
                    };
                }
                return tab;
            }));
        }
    }, [setNodes, setTabs, setFullSizeImage]);


    const handleAnalyzePrompt = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsAnalyzing(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'analysis', description: t('node.content.analyzing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const softPrompt = JSON.parse(node.value || '{}').softPrompt || false;
            const texts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            const combinedText = texts.join(', ');
            const analysis = await analyzePrompt(combinedText, softPrompt);
            
            updateNodeInStorage(currentTabId, nodeId, (prevVal) => ({ ...prevVal, ...analysis }));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsAnalyzing(null);
            unregisterOperation(nodeId);
        }
    }, [getUpstreamNodeValues, setError, nodes, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);

    const handleAnalyzeCharacter = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsAnalyzingCharacter(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'analysis', description: t('node.content.analyzing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const texts = getUpstreamNodeValues(nodeId).filter(v => typeof v === 'string') as string[];
            const combinedText = texts.join(', ');
            const analysis = await analyzeCharacter(combinedText);
            
            updateNodeInStorage(currentTabId, nodeId, () => analysis);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsAnalyzingCharacter(null);
            unregisterOperation(nodeId);
        }
    }, [getUpstreamNodeValues, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);

    const handleAnalyzeImage = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsAnalyzingImage(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'analysis', description: t('node.content.analyzing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const parsed = JSON.parse(node.value || '{}');
            const softPrompt = parsed.softPrompt || false;

            const inputs = getUpstreamNodeValues(nodeId);
            const imageInput = inputs.find(v => typeof v === 'object') as { base64ImageData: string, mimeType: string } | undefined;
            
            let imageData: { base64: string, mime: string } | null = null;
            
            if (imageInput) {
                imageData = { base64: imageInput.base64ImageData, mime: imageInput.mimeType };
            } else if (parsed.image && typeof parsed.image === 'string' && parsed.image.startsWith('data:image')) {
                const parts = parsed.image.split(',');
                if (parts.length === 2) {
                    const mimeMatch = parsed.image.match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                    const base64 = parts[1];
                    imageData = { base64, mime };
                }
            }

            if (!imageData) throw new Error("No image provided to analyzer.");

            const description = await describeImage(imageData.base64, imageData.mime, softPrompt);
            
            updateNodeInStorage(currentTabId, nodeId, (prevVal) => ({ ...prevVal, description }));

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsAnalyzingImage(null);
            unregisterOperation(nodeId);
        }
    }, [getUpstreamNodeValues, nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName]);
    
    const handleImageToText = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsAnalyzingImage(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'analysis', description: t('node.content.analyzing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const parsed = JSON.parse(node.value || '{}');

            const inputs = getUpstreamNodeValues(nodeId);
            const imageInput = inputs.find(v => typeof v === 'object') as { base64ImageData: string, mimeType: string } | undefined;
            
            let imageData: { base64: string, mime: string } | null = null;
            
            if (imageInput) {
                // Connected Input
                imageData = { base64: imageInput.base64ImageData, mime: imageInput.mimeType };
            } else {
                // Check for local Full Size Image First
                const fullSizeImage = getFullSizeImage(nodeId, 0);
                let src = fullSizeImage;
                
                // Fallback to thumbnail in node value if no full size cache
                if (!src && parsed.image && typeof parsed.image === 'string' && parsed.image.startsWith('data:image')) {
                     src = parsed.image;
                }

                if (src) {
                    const parts = src.split(',');
                    if (parts.length === 2) {
                        const mimeMatch = src.match(/:(.*?);/);
                        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                        const base64 = parts[1];
                        imageData = { base64, mime };
                    }
                }
            }

            if (!imageData) throw new Error("No image provided.");

            const extractedText = await extractTextFromImage(imageData.base64, imageData.mime);
            const targetField = node.type === NodeType.IMAGE_INPUT ? 'prompt' : 'description';
            
            updateNodeInStorage(currentTabId, nodeId, (prevVal) => ({ ...prevVal, [targetField]: extractedText }));

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsAnalyzingImage(null);
            unregisterOperation(nodeId);
        }
    }, [getUpstreamNodeValues, nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, getFullSizeImage]);

    const handleProcessImage = useCallback(async (nodeId: string) => {
        const currentTabId = activeTabIdRef.current;
        setIsProcessingImage(nodeId);
        setError(null);
        registerOperation({ id: nodeId, type: 'generation', description: t('node.content.processing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;

            let base64ImageData = '';
            let mimeType = '';

            if (node.type === NodeType.IMAGE_INPUT) {
                const fullRes = getFullSizeImage(nodeId, 0);
                let imageSrc = fullRes;
                if (!imageSrc) {
                    try {
                        const parsed = JSON.parse(node.value || '{}');
                        imageSrc = parsed.image;
                    } catch {}
                }
                if (!imageSrc) throw new Error("No image found in node.");
                if (imageSrc.startsWith('data:')) {
                    base64ImageData = imageSrc.split(',')[1];
                    mimeType = imageSrc.match(/:(.*?);/)?.[1] || 'image/png';
                } else throw new Error("Image format not supported.");
            } else {
                const upstreamValues = getUpstreamNodeValues(nodeId, 'image');
                const imageInput = upstreamValues.find(v => typeof v === 'object') as { base64ImageData: string; mimeType: string; } | undefined;
                if (imageInput) {
                    base64ImageData = imageInput.base64ImageData;
                    mimeType = imageInput.mimeType;
                }
            }
            
            if (!base64ImageData) throw new Error("No image to process.");

            const removalPrompt = "Remove all possible overlays, text, watermarks, and watermarked texts. Pay special attention to the top and bottom of the image, restoring the original background naturally.";

            const newFullResUrl = await generateImage(removalPrompt, '1:1', [{ base64ImageData, mimeType }], 'gemini-3-flash-preview');
            const newThumbnailUrl = await generateThumbnail(newFullResUrl, 256, 256); 
            
            updateNodeInStorage(currentTabId, nodeId, (prevVal) => ({ ...prevVal, image: newThumbnailUrl }), { frame: 0, url: newFullResUrl });

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsProcessingImage(null);
            unregisterOperation(nodeId);
        }
    }, [nodes, setError, getUpstreamNodeValues, getFullSizeImage, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, t]);
    
    const handleUpdateCharacterPromptFromImage = useCallback(async (nodeId: string, cardIndex: number) => {
        const currentTabId = activeTabIdRef.current;
        const opKey = `${nodeId}-${cardIndex}`;
        setIsUpdatingCharacterPrompt(opKey);
        setError(null);
        registerOperation({ id: opKey, type: 'analysis', description: t('node.content.analyzing'), tabId: activeTabId, tabName: activeTabName });

        try {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const parsedArray = JSON.parse(node.value || '[]');
            const characters = Array.isArray(parsedArray) ? parsedArray : [parsedArray];
            const charData = characters[cardIndex];
            
            if (!charData) throw new Error("Character card not found.");

            // Get current active image (full res cache or thumbnail)
            // Logic mirrors CharacterCardNode: (cardIndex * 10) is base high-res
            // Also check charData.image as fallback
            const activeImage = getFullSizeImage(nodeId, cardIndex * 10) || charData.image;

            if (!activeImage || !activeImage.startsWith('data:')) {
                throw new Error("No valid image found to analyze.");
            }

            const parts = activeImage.split(',');
            const base64ImageData = parts[1];
            const mimeMatch = activeImage.match(/:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

            const newPrompt = await generatePromptFromImage(base64ImageData, mimeType);

            updateNodeInStorage(currentTabId, nodeId, (prev) => {
                const next = Array.isArray(prev) ? [...prev] : [prev];
                if (next[cardIndex]) {
                    next[cardIndex] = { ...next[cardIndex], prompt: newPrompt };
                }
                return next;
            });
            
            addToast("Prompt updated from image", "success");

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsUpdatingCharacterPrompt(null);
            unregisterOperation(opKey);
        }
    }, [nodes, setError, t, updateNodeInStorage, registerOperation, unregisterOperation, activeTabId, activeTabName, getFullSizeImage, addToast]);


    return {
        isAnalyzing,
        isAnalyzingCharacter,
        isAnalyzingImage,
        isProcessingImage,
        handleAnalyzePrompt,
        handleAnalyzeCharacter,
        handleAnalyzeImage,
        handleImageToText,
        handleProcessImage,
        handleUpdateCharacterPromptFromImage,
        isUpdatingCharacterPrompt
    };
};
