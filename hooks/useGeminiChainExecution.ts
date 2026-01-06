
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, NodeType, Connection, ActiveOperation, Tab } from '../types';
import { addMetadataToPNG } from '../utils/pngMetadata';
import { getProcessor, processImageEditor, ProcessingContext } from '../services/processors';

interface UseGeminiChainExecutionProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    connections: Connection[];
    setError: (error: string | null) => void;
    getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
    t: (key: string) => string;
    setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
    activeTabId: string;
    activeTabName: string;
    registerOperation: (op: ActiveOperation) => void;
    unregisterOperation: (id: string) => void;
    isGlobalProcessing: boolean;
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
}

const downloadGeneratedAsset = (url: string, prompt: string, nodeType: NodeType) => {
    const isVideo = nodeType === 'VIDEO_OUTPUT';
    const prefix = isVideo ? 'video_output' : (nodeType === 'IMAGE_EDITOR' ? 'image_editor' : (nodeType === 'IMAGE_SEQUENCE_GENERATOR' ? 'sequence' : 'image_output'));
    const extension = isVideo ? 'mp4' : 'png';
    
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    
    // Unified format as requested: Image_Editor_Frame_001_Date
    // Since chain execution typically processes a single frame/result state, we default to 001.
    // For specific nodes like Image Output, we stick to the requested pattern.
    let filename = `${prefix}_${date}.${extension}`;
    
    if (nodeType === 'IMAGE_EDITOR') {
        filename = `Image_Editor_Frame_001_${date}.${extension}`;
    } else if (nodeType === 'IMAGE_SEQUENCE_GENERATOR') {
        // Sequence generator usually outputs many frames, but if executed via chain, it might output just one or the last.
        // Assuming single frame output context here.
        filename = `Sequence_Frame_001_${date}.${extension}`;
    } else {
        // Fallback for others
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        filename = `${prefix}_${date}_${time}.${extension}`;
    }

    let assetUrl = url;
    if (!isVideo && url.startsWith('data:image/png')) {
        assetUrl = addMetadataToPNG(url, 'prompt', prompt);
    }
    
    const link = document.createElement('a');
    link.href = assetUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const useGeminiChainExecution = ({ nodes, setNodes, connections, setError, getUpstreamNodeValues, t, setFullSizeImage, getFullSizeImage, activeTabId, activeTabName, registerOperation, unregisterOperation, isGlobalProcessing, setTabs }: UseGeminiChainExecutionProps) => {
    const [isExecutingChain, setIsExecutingChain] = useState(false);
    const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
    const chainExecutionController = useRef<AbortController | null>(null);
    
    const activeTabIdRef = useRef(activeTabId);
    useEffect(() => {
        activeTabIdRef.current = activeTabId;
    }, [activeTabId]);

    // Helper to update node data across tabs
    const updateNodeInStorage = useCallback((targetTabId: string, nodeId: string, value: string, imageCacheUpdate?: { frame: number, url: string }) => {
        if (activeTabIdRef.current === targetTabId) {
            // Update UI directly
            if (imageCacheUpdate) setFullSizeImage(nodeId, imageCacheUpdate.frame, imageCacheUpdate.url);
            setNodes(prevNodes => prevNodes.map(n => (n.id === nodeId ? { ...n, value } : n)));
        } else {
            // Update background state
            setTabs(prevTabs => prevTabs.map(tab => {
                if (tab.id === targetTabId) {
                    const newNodes = tab.state.nodes.map(n => (n.id === nodeId ? { ...n, value } : n));
                    
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
                    return { ...tab, state: { ...tab.state, nodes: newNodes, fullSizeImageCache: newCache } };
                }
                return tab;
            }));
        }
    }, [setNodes, setTabs, setFullSizeImage]);


    // Helper to execute logic for a single node using the processor pattern
    const _executeNodeLogic = useCallback(async (node: Node, currentNodes: Node[], targetTabId: string) => {
        
        // Special handling for Image Editor due to cache complexity
        if (node.type === NodeType.IMAGE_EDITOR) {
            const textInputs = getUpstreamNodeValues(node.id, 'text', currentNodes).filter(v => typeof v === 'string') as string[];
            const imageInputs = getUpstreamNodeValues(node.id, 'image', currentNodes).filter(v => typeof v === 'object') as { base64ImageData: string, mimeType: string }[];
            const imageInputsB = getUpstreamNodeValues(node.id, 'image_b', currentNodes).filter(v => typeof v === 'object') as { base64ImageData: string, mimeType: string }[];

            const parsed = JSON.parse(node.value);
            
            // Local A Images (Index 1+)
            const localImages = (parsed.inputImages || []).map((thumbnailUrl: string, index: number) => {
                 const fullRes = getFullSizeImage(node.id, index + 1);
                 const imgDataUrl = fullRes || thumbnailUrl;
                 return {
                     base64ImageData: imgDataUrl.split(',')[1],
                     mimeType: imgDataUrl.match(/:(.*?);/)?.[1] || 'image/png'
                 };
            });
            
            // Local B Images (Index 2000+)
            const localImagesB = (parsed.inputImagesB || []).map((thumbnailUrl: string, index: number) => {
                 const fullRes = getFullSizeImage(node.id, 2000 + index + 1);
                 const imgDataUrl = fullRes || thumbnailUrl;
                 return {
                     base64ImageData: imgDataUrl.split(',')[1],
                     mimeType: imgDataUrl.match(/:(.*?);/)?.[1] || 'image/png'
                 };
            });

            // Pass a save callback that handles cross-tab updates
            const saveCallback = (frame: number, url: string) => {
                 if (activeTabIdRef.current === targetTabId) {
                    setFullSizeImage(node.id, frame, url);
                 } 
            };

            return await processImageEditor(
                node, 
                textInputs, 
                imageInputs, 
                localImages,
                localImagesB,
                imageInputsB,
                saveCallback
            );
        }

        // General Processor Lookup
        const processor = getProcessor(node.type);
        
        if (processor) {
            // Gather inputs (default handle undefined)
            const upstreamData = getUpstreamNodeValues(node.id, undefined, currentNodes);
            
            const context: ProcessingContext = {
                node,
                upstreamData,
                saveImageToCache: (frame, url) => {
                    if (activeTabIdRef.current === targetTabId) {
                        setFullSizeImage(node.id, frame, url);
                    }
                }
            };

            return await processor(context);
        }

        // Fallback or unknown node type
        return { value: null, downloadData: undefined };

    }, [getUpstreamNodeValues, setFullSizeImage, getFullSizeImage]);
    
    const runChain = useCallback(async (startNodeId: string, type: 'execute' | 'forward') => {
        if (isExecutingChain) return;
        
        const executionTabId = activeTabIdRef.current; // Capture current tab as execution context
        const executionNodes = [...nodes]; // Snapshot of nodes at start
        const executionConnections = [...connections]; // Snapshot of connections

        setIsExecutingChain(true);
        registerOperation({ id: startNodeId, type: 'chain', description: type === 'execute' ? t('node.action.executeChain') : t('node.action.processChainForward'), tabId: activeTabId, tabName: activeTabName });
        chainExecutionController.current = new AbortController();

        let queue: string[] = [];

        if (type === 'execute') {
             // Build dependency queue (backwards)
            const visited = new Set<string>();
            const buildQueue = (nodeId: string) => {
                if (visited.has(nodeId)) return;
                visited.add(nodeId);
                const inputConnections = executionConnections.filter(c => c.toNodeId === nodeId);
                for (const conn of inputConnections) {
                    buildQueue(conn.fromNodeId);
                }
                queue.push(nodeId);
            };
            buildQueue(startNodeId);
        } else {
            // Build forward queue
             let currentNodeId: string | null = startNodeId;
             while (currentNodeId) {
                 queue.push(currentNodeId);
                 const outConn = executionConnections.find(c => c.fromNodeId === currentNodeId);
                 currentNodeId = outConn ? outConn.toNodeId : null;
             }
        }
    
        try {
            // We use a local map of updated values to pass down the chain without relying on async state updates
            const localNodeState = new Map(executionNodes.map(n => [n.id, n]));

            for (const nodeId of queue) {
                if (chainExecutionController.current.signal.aborted) throw new Error("Aborted");

                setExecutingNodeId(nodeId); // UI feedback (only if on same tab)
                
                const nodeToExecute = localNodeState.get(nodeId);
                const isExecutable = nodeToExecute && (nodeToExecute.type !== NodeType.TEXT_INPUT && nodeToExecute.type !== NodeType.IMAGE_INPUT && nodeToExecute.type !== NodeType.NOTE && nodeToExecute.type !== NodeType.REROUTE_DOT && nodeToExecute.type !== NodeType.DATA_READER);

                if (isExecutable && nodeToExecute) {
                    // Pass current state of nodes (including updates from previous steps in this chain)
                    const currentNodesSnapshot = Array.from(localNodeState.values());
                    
                    const result = await _executeNodeLogic(nodeToExecute, currentNodesSnapshot, executionTabId);
                    
                    const { value: resultValue, downloadData } = result;

                    if (resultValue !== null && resultValue !== undefined) {
                        const finalValue = typeof resultValue === 'object' ? JSON.stringify(resultValue) : String(resultValue);
                        
                        // Update local state for next steps
                        localNodeState.set(nodeId, { ...nodeToExecute, value: finalValue });
                        
                        updateNodeInStorage(executionTabId, nodeId, finalValue);
                    }

                    if (downloadData) {
                        downloadGeneratedAsset(downloadData.url, downloadData.prompt, downloadData.type);
                    }
                }
            }
        } catch (e: any) {
            if (e.name !== 'AbortError' && e.message !== 'Aborted') {
                setError(e.message);
            }
        } finally {
            setIsExecutingChain(false);
            setExecutingNodeId(null);
            chainExecutionController.current = null;
            unregisterOperation(startNodeId);
        }
    }, [isExecutingChain, nodes, connections, setError, _executeNodeLogic, registerOperation, unregisterOperation, activeTabId, activeTabName, t, updateNodeInStorage]);

    return {
        isExecutingChain,
        executingNodeId,
        handleExecuteChain: (id: string) => runChain(id, 'execute'),
        stopChainExecution: () => { if (chainExecutionController.current) chainExecutionController.current.abort(); setIsExecutingChain(false); },
        handleProcessChainForward: (id: string) => runChain(id, 'forward'),
    };
};
