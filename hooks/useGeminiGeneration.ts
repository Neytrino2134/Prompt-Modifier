
import React, { useCallback, useRef, useEffect } from 'react';
import type { Node, Connection, ActiveOperation, Tab, ToastType } from '../types';
import { useImageNode } from './gemini/useImageNode';
import { useVideoNode } from './gemini/useVideoNode';
import { useEditorNode } from './gemini/useEditorNode';
import { useSequenceNode } from './gemini/useSequenceNode';
import { useCharacterNode } from './gemini/useCharacterNode';

interface UseGeminiGenerationProps {
    nodes: Node[];
    connections: Connection[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
    setError: (error: string | null) => void;
    showApiKeyDialog: (callbacks: { onSelect: () => void; onClose: () => void }) => void;
    t: (key: string) => string;
    setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
    connectedCharacterData: Map<string, any[]>;
    activeTabId: string;
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    activeTabName: string;
    registerOperation: (op: ActiveOperation) => void;
    unregisterOperation: (id: string) => void;
    isGlobalProcessing: boolean;
    addToast: (message: string, type?: ToastType) => void;
}

export const useGeminiGeneration = ({ 
    nodes, 
    connections,
    setNodes, 
    getUpstreamNodeValues, 
    setError, 
    showApiKeyDialog, 
    t, 
    setFullSizeImage, 
    getFullSizeImage,
    connectedCharacterData,
    activeTabId,
    setTabs,
    activeTabName,
    registerOperation,
    unregisterOperation,
    isGlobalProcessing,
    addToast
}: UseGeminiGenerationProps) => {
    
    const activeTabIdRef = useRef(activeTabId);
    useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

    const updateNodeInStorage = useCallback((targetTabId: string, nodeId: string, valueUpdater: (prevVal: any) => any, imageCacheUpdate?: { frame: number, url: string }) => {
        const safeParse = (val: string) => {
            try { 
                const parsed = JSON.parse(val || '{}');
                return parsed;
            } catch { 
                return val; 
            } 
        };

        if (activeTabIdRef.current === targetTabId) {
            if (imageCacheUpdate) setFullSizeImage(nodeId, imageCacheUpdate.frame, imageCacheUpdate.url);
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

                    return { ...tab, state: { ...tab.state, nodes: newNodes, fullSizeImageCache: newCache }};
                }
                return tab;
            }));
        }
    }, [setNodes, setTabs, setFullSizeImage]);

    const commonProps = {
        nodes,
        setNodes,
        getUpstreamNodeValues,
        setError,
        t,
        setFullSizeImage,
        getFullSizeImage,
        activeTabId,
        setTabs,
        activeTabName,
        registerOperation,
        unregisterOperation,
        updateNodeInStorage,
        activeTabIdRef,
        addToast
    };

    const imageNode = useImageNode(commonProps);
    const videoNode = useVideoNode({ ...commonProps, showApiKeyDialog });
    const editorNode = useEditorNode(commonProps);
    const sequenceNode = useSequenceNode({ ...commonProps, connectedCharacterData });
    const characterNode = useCharacterNode(commonProps);

    return {
        isGeneratingImage: imageNode.isGeneratingImage,
        handleGenerateImage: imageNode.handleGenerateImage,

        isGeneratingVideo: videoNode.isGeneratingVideo,
        handleGenerateVideo: videoNode.handleGenerateVideo,

        isEditingImage: editorNode.isEditingImage,
        isStoppingEdit: editorNode.isStoppingEdit,
        handleEditImage: editorNode.handleEditImage,
        handleStopEdit: editorNode.handleStopEdit,

        isGeneratingSequence: sequenceNode.isGeneratingSequence,
        isStoppingSequence: sequenceNode.isStoppingSequence,
        handleGenerateImageSequence: sequenceNode.handleGenerateImageSequence,
        handleGenerateSelectedFrames: sequenceNode.handleGenerateSelectedFrames,
        handleStopImageSequence: sequenceNode.handleStopImageSequence,

        isGeneratingCharacterImage: characterNode.isGeneratingCharacterImage,
        handleGenerateCharacterImage: characterNode.handleGenerateCharacterImage,
    };
};