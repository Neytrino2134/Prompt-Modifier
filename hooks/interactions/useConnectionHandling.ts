
import React, { useState, useCallback, useRef, MutableRefObject } from 'react';
import { Node, Connection, ConnectingInfo, NodeType, Point } from '../../types';
import { getOutputHandleType, getInputHandleType, COLLAPSED_NODE_HEIGHT } from '../../utils/nodeUtils';

interface UseConnectionHandlingProps {
    nodesRef: MutableRefObject<Node[]>;
    connectionsRef: MutableRefObject<Connection[]>;
    getTransformedPoint: (point: Point) => Point;
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    addConnection: (connection: Omit<Connection, 'id'>) => void;
    handleOpenConnectionQuickAdd: (position: Point, connectingInfo: ConnectingInfo, sourceNodeType?: NodeType) => void;
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>; // Added setter
}

export const useConnectionHandling = ({
    nodesRef,
    connectionsRef,
    getTransformedPoint,
    setConnections,
    addConnection,
    handleOpenConnectionQuickAdd,
    setNodes
}: UseConnectionHandlingProps) => {
    const [connectingInfo, setConnectingInfo] = useState<ConnectingInfo | null>(null);
    const [connectionTarget, setConnectionTarget] = useState<{ nodeId: string; handleId?: string } | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    const handleStartConnection = useCallback((e: React.MouseEvent<HTMLDivElement>, fromNodeId: string, fromHandleId?: string) => {
        e.stopPropagation(); e.preventDefault(); 
        const node = nodesRef.current.find(n => n.id === fromNodeId);
        if (!node) return;
        const type = getOutputHandleType(node, fromHandleId);
        const startPoint = getTransformedPoint({ x: e.clientX, y: e.clientY });
        setConnectingInfo({ fromNodeId, fromHandleId, fromPoint: startPoint, fromType: type });
    }, [getTransformedPoint, setConnectingInfo, nodesRef]);

    const handleStartConnectionTouch = useCallback((e: React.TouchEvent<HTMLDivElement>, fromNodeId: string, fromHandleId?: string) => {
        e.stopPropagation();
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const node = nodesRef.current.find(n => n.id === fromNodeId);
        if (!node) return;
        const type = getOutputHandleType(node, fromHandleId);
        const startPoint = getTransformedPoint({ x: touch.clientX, y: touch.clientY });
        setConnectingInfo({ fromNodeId, fromHandleId, fromPoint: startPoint, fromType: type });
    }, [getTransformedPoint, setConnectingInfo, nodesRef]);

    const processConnectionDrag = (currentPointerPosition: Point, e: MouseEvent | TouchEvent) => {
        if (!connectingInfo) return;

        // 1. Try Precise DOM Hit for specific handles
        let clientX, clientY;
        if ('touches' in e) {
             clientX = e.touches[0].clientX;
             clientY = e.touches[0].clientY;
        } else {
             clientX = (e as MouseEvent).clientX;
             clientY = (e as MouseEvent).clientY;
        }

        const element = document.elementFromPoint(clientX, clientY);
        const handleElement = element?.closest('[data-is-input-handle="true"]');

        let newTarget: { nodeId: string; handleId?: string } | null = null;
        let foundNodeId: string | null = null;

        if (handleElement) {
             const nodeId = handleElement.getAttribute('data-node-id');
             // Handle empty string as undefined for default handle
             const handleIdAttr = handleElement.getAttribute('data-handle-id');
             const handleId = handleIdAttr === '' ? undefined : handleIdAttr;
             
             const handleType = handleElement.getAttribute('data-handle-type');
             
             if (nodeId && nodeId !== connectingInfo.fromNodeId) {
                 foundNodeId = nodeId;
                 // Allow connection if types match OR if handle is generic (empty or 'any' type usually implies default acceptance logic, but we check stricter here)
                 // If handleType is present, check against fromType. 
                 // Note: handleType comes from DOM as string. connectingInfo.fromType is string | null.
                 
                 // If handleType matches, or if one is null (implying 'any' for Reroute/Data Reader inputs), accept.
                 if (!handleType || handleType === connectingInfo.fromType) {
                     newTarget = { nodeId, handleId: handleId || undefined };
                 }
             }
        }

        // 2. Fallback to Geometric Node Hit if no specific handle was hit
        if (!newTarget) {
            for (let i = nodesRef.current.length - 1; i >= 0; i--) {
                const node = nodesRef.current[i];
                const hoverTolerance = 20;

                // Determine effective dimensions for hit testing based on visual state
                let effectiveWidth = node.width;
                let effectiveHeight = node.height;

                if (node.dockState) {
                    // Proxy Node Dimensions
                    effectiveWidth = 160;
                    effectiveHeight = 48;
                } else if (node.isCollapsed) {
                    // Collapsed Node Dimensions
                    effectiveHeight = COLLAPSED_NODE_HEIGHT;
                }

                if (
                    currentPointerPosition.x >= node.position.x - hoverTolerance &&
                    currentPointerPosition.x <= node.position.x + effectiveWidth + hoverTolerance &&
                    currentPointerPosition.y >= node.position.y &&
                    currentPointerPosition.y <= node.position.y + effectiveHeight
                ) {
                    foundNodeId = node.id;
                    break;
                }
            }

            if (foundNodeId && foundNodeId !== connectingInfo.fromNodeId) {
                const targetNode = nodesRef.current.find(n => n.id === foundNodeId);
                if (targetNode) {
                    let targetHandleId: string | undefined = undefined;
                    let isValid = false;

                    if (targetNode.type === NodeType.IMAGE_EDITOR) {
                        const fromType = connectingInfo.fromType;
                        if (fromType === 'image') {
                            let isSeqCombo = false;
                            let isSeqEditPrompts = false;
                            let topPaneHeight = 330;
                            try {
                                const val = JSON.parse(targetNode.value || '{}');
                                isSeqCombo = val.isSequenceMode && val.isSequentialCombinationMode;
                                isSeqEditPrompts = val.isSequenceMode && val.isSequentialEditingWithPrompts;
                                if (val.topPaneHeight) topPaneHeight = val.topPaneHeight;
                            } catch {}

                            if (isSeqEditPrompts) {
                                // In Sequential Editing with Prompts, input A is ignored, B is mandatory.
                                targetHandleId = 'image_b';
                                isValid = true;
                            } else if (isSeqCombo) {
                                const HEADER_HEIGHT = 40; const CONTENT_PADDING = 12;
                                const realImageSectionTop = HEADER_HEIGHT + CONTENT_PADDING;
                                const yA = targetNode.position.y + realImageSectionTop + (topPaneHeight * 0.25);
                                const yB = targetNode.position.y + realImageSectionTop + (topPaneHeight * 0.75);
                                const distA = Math.abs(currentPointerPosition.y - yA);
                                const distB = Math.abs(currentPointerPosition.y - yB);
                                targetHandleId = distB < distA ? 'image_b' : 'image';
                                isValid = true;
                            } else {
                                targetHandleId = 'image';
                                isValid = true;
                            }
                        } else if (fromType === 'text') {
                            targetHandleId = 'text';
                            isValid = true;
                        }
                    } else if (targetNode.type === NodeType.VIDEO_EDITOR) {
                        // Video Editor Handles Layout Fallback
                        // Header 40px + 20px padding start + 50px steps
                        // Video: 60px relative to node top
                        // Audio: 110px
                        // Image: 160px
                        // Text: 210px
                        
                        const handlePositions: Record<string, number> = {
                            'video': targetNode.position.y + 60,
                            'audio': targetNode.position.y + 110,
                            'image': targetNode.position.y + 160,
                            'text': targetNode.position.y + 210
                        };

                        // Check which handle matches the source type
                        const fromType = connectingInfo.fromType;
                        
                        if (fromType && handlePositions[fromType]) {
                            targetHandleId = fromType;
                            isValid = true;
                        } else {
                             // If connecting from generic or mismatch, find nearest compatible handle visually
                             // This is heuristic, usually 'fromType' matches one of them exactly.
                             // But if user drags from Reroute (any), we might need to pick nearest physically.
                             
                             let minDist = Infinity;
                             let bestHandle = null;
                             
                             for(const [hid, yPos] of Object.entries(handlePositions)) {
                                 const dist = Math.abs(currentPointerPosition.y - yPos);
                                 if (dist < minDist) {
                                     minDist = dist;
                                     bestHandle = hid;
                                 }
                             }
                             
                             if (bestHandle) {
                                 targetHandleId = bestHandle;
                                 isValid = true;
                             }
                        }
                        
                    } else if (targetNode.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
                        // Geometric fallback for sequence generator is tricky because it has 2 specific inputs.
                        // If DOM hit failed, we try to guess based on height, similar to getConnectionPoints layout
                        if (connectingInfo.fromType === 'text') {
                             targetHandleId = 'prompt_input'; 
                             isValid = true;
                        } else if (connectingInfo.fromType === 'character_data') {
                             targetHandleId = 'character_data';
                             isValid = true;
                        }
                    } else if (targetNode.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
                        if (connectingInfo.fromType === 'text') { targetHandleId = 'prompts_sequence'; isValid = true; }
                    } else if (targetNode.type === NodeType.NOTE) {
                        if (connectingInfo.fromType === 'text') { targetHandleId = 'prompt_data'; isValid = true; }
                    } else if (targetNode.type === NodeType.REROUTE_DOT || targetNode.type === NodeType.DATA_READER) {
                        const hasExistingInput = connectionsRef.current.some(c => c.toNodeId === foundNodeId);
                        const evt = e instanceof MouseEvent ? e : (e as unknown as TouchEvent).touches[0];
                        const isCtrl = (evt as any).ctrlKey || (evt as any).metaKey; 
                        if (!hasExistingInput || isCtrl) {
                            targetHandleId = undefined;
                            isValid = true;
                        }
                    } else {
                        const toType = getInputHandleType(targetNode);
                        if (toType && connectingInfo.fromType === toType) {
                            targetHandleId = undefined;
                            isValid = true;
                        }
                    }

                    if (isValid) {
                        newTarget = { nodeId: foundNodeId, handleId: targetHandleId };
                    }
                }
            }
        }
        
        if (hoveredNodeId !== foundNodeId) {
            setHoveredNodeId(foundNodeId);
        }

        setConnectionTarget(prev => {
            if (prev?.nodeId === newTarget?.nodeId && prev?.handleId === newTarget?.handleId) return prev;
            return newTarget;
        });
    };

    const endConnection = (e: MouseEvent | TouchEvent, isPanning: boolean, currentDraggingInfo: any) => {
        if (!connectingInfo) return;

        if (connectionTarget) {
            const evt = e as any; // Cast to access modifiers
            if (evt.ctrlKey || evt.metaKey) {
                setConnections(prev => prev.filter(c => !(c.toNodeId === connectionTarget.nodeId && c.toHandleId === connectionTarget.handleId)));
            }
            addConnection({
                fromNodeId: connectingInfo.fromNodeId,
                fromHandleId: connectingInfo.fromHandleId,
                toNodeId: connectionTarget.nodeId,
                toHandleId: connectionTarget.handleId,
            });

            // --- Reroute Dot Type Update Logic ---
            const targetNode = nodesRef.current.find(n => n.id === connectionTarget.nodeId);
            if (targetNode && targetNode.type === NodeType.REROUTE_DOT) {
                 const sourceNode = nodesRef.current.find(n => n.id === connectingInfo.fromNodeId);
                 if (sourceNode) {
                     const type = getOutputHandleType(sourceNode, connectingInfo.fromHandleId);
                     if (type) {
                         setNodes(prev => prev.map(n => 
                             n.id === targetNode.id ? { ...n, value: JSON.stringify({ type }) } : n
                         ));
                     }
                 }
            }
            // ------------------------------------

        } else if (!hoveredNodeId && !isPanning && !currentDraggingInfo) {
            // Quick Add Logic
            let clientX, clientY;
            if ('changedTouches' in e) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            } else {
                clientX = (e as MouseEvent).clientX;
                clientY = (e as MouseEvent).clientY;
            }
            
            const target = e.target as HTMLElement;
            // Relaxed check: allows drops on the main app container, transform layer, or any svg elements (grid, connections)
            // that might be catching the click when not over a node.
            const isCanvas = 
                target.id === 'app-container' || 
                target.id === 'canvas-transform-layer' || 
                target.tagName.toLowerCase() === 'svg' ||
                target.closest('#canvas-transform-layer');

            if (isCanvas) {
                if(handleOpenConnectionQuickAdd) {
                    const sourceNode = nodesRef.current.find(n => n.id === connectingInfo.fromNodeId);
                    handleOpenConnectionQuickAdd({ x: clientX, y: clientY }, connectingInfo, sourceNode?.type);
                }
            }
        }
        setConnectingInfo(null);
        setConnectionTarget(null);
        setHoveredNodeId(null);
    };

    return {
        connectingInfo,
        connectionTarget,
        hoveredNodeId,
        setHoveredNodeId,
        handleStartConnection,
        handleStartConnectionTouch,
        processConnectionDrag,
        endConnection,
        setConnectingInfo,
        setConnectionTarget
    };
};
