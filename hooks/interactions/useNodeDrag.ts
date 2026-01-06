
import React, { useState, useCallback, useRef } from 'react';
import { Node, Point, DraggingInfo, SmartGuide, Group, DockMode, Connection, NodeType } from '../../types';
import { getMinNodeSize, calculateGroupBounds, isPointNearConnection, getConnectionPoints, getOutputHandleType, COLLAPSED_NODE_HEIGHT } from '../../utils/nodeUtils';

interface UseNodeDragProps {
    nodesRef: React.MutableRefObject<Node[]>;
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    groupsRef: React.MutableRefObject<Group[]>;
    setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
    viewTransform: { scale: number; translate: Point };
    isSnapToGrid: boolean;
    isSmartGuidesEnabled: boolean;
    setSmartGuides: React.Dispatch<React.SetStateAction<SmartGuide[]>>;
    handleCloseAddNodeMenus: () => void;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    selectedNodeIds: string[];
    getTransformedPoint: (point: Point) => Point;
    activeTool: string;
    handleDockNode?: (nodeId: string, mode: DockMode, capturePosition?: Point) => void;
    setIsDockingMenuVisible: (visible: boolean) => void;
    setDockHoverMode: (mode: DockMode | null) => void;
    dockHoverMode: DockMode | null;
    connections?: Connection[]; 
    setConnections?: React.Dispatch<React.SetStateAction<Connection[]>>;
}

interface ResizingInfo {
    nodeId: string;
    startPosition: Point;
    startSize: { width: number; height: number };
    direction?: string;
}

export const useNodeDrag = ({
    nodesRef,
    setNodes,
    groupsRef,
    setGroups,
    viewTransform,
    isSnapToGrid,
    isSmartGuidesEnabled,
    setSmartGuides,
    handleCloseAddNodeMenus,
    setSelectedNodeIds,
    selectedNodeIds,
    getTransformedPoint,
    activeTool,
    handleDockNode,
    setIsDockingMenuVisible,
    setDockHoverMode,
    dockHoverMode,
    connections,
    setConnections
}: UseNodeDragProps) => {
    const [draggingInfo, setDraggingInfo] = useState<DraggingInfo | null>(null);
    const draggingInfoRef = useRef<DraggingInfo | null>(null);
    
    const [resizingInfo, setResizingInfo] = useState<ResizingInfo | null>(null);
    const resizingInfoRef = useRef<ResizingInfo | null>(null);
    
    const [hoveredGroupIdForDrop, setHoveredGroupIdForDrop] = useState<string | null>(null);
    const hoveredGroupIdForDropRef = useRef<string | null>(null);

    // Sync ref
    React.useEffect(() => {
        draggingInfoRef.current = draggingInfo;
    }, [draggingInfo]);

    // Sync resizing ref
    React.useEffect(() => {
        resizingInfoRef.current = resizingInfo;
    }, [resizingInfo]);

    const handleNodeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        handleCloseAddNodeMenus();

        setNodes(prevNodes => {
             const index = prevNodes.findIndex(n => n.id === nodeId);
             if (index === -1) return prevNodes;
             const node = prevNodes[index];
             
             const needsMoveToFront = index !== prevNodes.length - 1;
             const needsClearNewFlag = node.isNewlyCreated;

             if (!needsMoveToFront && !needsClearNewFlag) return prevNodes;

             const newNodes = [...prevNodes];
             const [splicedNode] = newNodes.splice(index, 1);
             newNodes.push({ ...splicedNode, isNewlyCreated: false });
             return newNodes;
        });

        let newSelectedIds = [...selectedNodeIds];
        const isSelected = newSelectedIds.includes(nodeId);

        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (isSelected) newSelectedIds = newSelectedIds.filter(id => id !== nodeId);
            else newSelectedIds.push(nodeId);
            setSelectedNodeIds(newSelectedIds);
        } else {
            if (!isSelected) {
                 newSelectedIds = [nodeId];
                 setSelectedNodeIds(newSelectedIds);
            }
        }

        if (newSelectedIds.includes(nodeId)) {
            if (activeTool === 'edit' && (e.ctrlKey || e.metaKey) && !e.altKey) return;
            if (activeTool === 'cutter') return;

            const worldMouse = getTransformedPoint({ x: e.clientX, y: e.clientY });
            const offsets = new Map<string, Point>();
            const initialPositions = new Map<string, Point>();
            const nodesToDrag = nodesRef.current.filter(n => newSelectedIds.includes(n.id));
            
            nodesToDrag.forEach(n => {
                 offsets.set(n.id, { x: worldMouse.x - n.position.x, y: worldMouse.y - n.position.y });
                 initialPositions.set(n.id, { ...n.position });
            });
            
            const info: DraggingInfo = { type: 'node', id: nodeId, offsets: offsets, initialPositions, isDetaching: e.altKey };
            draggingInfoRef.current = info;
            setDraggingInfo(info);
        }
    }, [selectedNodeIds, setSelectedNodeIds, getTransformedPoint, setDraggingInfo, handleCloseAddNodeMenus, activeTool, setNodes, nodesRef]);

    const handleNodeTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, nodeId: string) => {
        if (e.touches.length !== 1) return;
        handleCloseAddNodeMenus();
        const touch = e.touches[0];
        e.stopPropagation();

        setNodes(prevNodes => {
            const index = prevNodes.findIndex(n => n.id === nodeId);
            if (index === -1) return prevNodes;
             const node = prevNodes[index];
             const needsMoveToFront = index !== prevNodes.length - 1;
             const needsClearNewFlag = node.isNewlyCreated;
             if (!needsMoveToFront && !needsClearNewFlag) return prevNodes;
            const newNodes = [...prevNodes];
            const [splicedNode] = newNodes.splice(index, 1);
            newNodes.push({ ...splicedNode, isNewlyCreated: false });
            return newNodes;
        });
        
        let newSelectedIds = [...selectedNodeIds];
        if (!newSelectedIds.includes(nodeId)) {
             newSelectedIds = [nodeId];
             setSelectedNodeIds(newSelectedIds);
        }

        const worldMouse = getTransformedPoint({ x: touch.clientX, y: touch.clientY });
        const offsets = new Map<string, Point>();
        const initialPositions = new Map<string, Point>();
        const nodesToDrag = nodesRef.current.filter(n => newSelectedIds.includes(n.id));
        nodesToDrag.forEach(n => {
                 offsets.set(n.id, { x: worldMouse.x - n.position.x, y: worldMouse.y - n.position.y });
                 initialPositions.set(n.id, { ...n.position });
        });

        const info: DraggingInfo = { type: 'node', id: nodeId, offsets: offsets, initialPositions, isDetaching: false };
        draggingInfoRef.current = info;
        setDraggingInfo(info);
    }, [selectedNodeIds, setSelectedNodeIds, getTransformedPoint, setDraggingInfo, handleCloseAddNodeMenus, setNodes, nodesRef]);

    const handleNodeResizeMouseDown = useCallback((e: React.PointerEvent<HTMLDivElement>, nodeId: string, direction?: string) => {
        e.stopPropagation(); e.preventDefault();
        if (e.currentTarget.setPointerCapture) {
             e.currentTarget.setPointerCapture(e.pointerId);
        }
        const node = nodesRef.current.find(n => n.id === nodeId);
        if (node) {
            const info: ResizingInfo = { 
                nodeId, 
                startPosition: { x: e.clientX, y: e.clientY }, 
                startSize: { width: node.width, height: node.height },
                direction 
            };
            setResizingInfo(info);
            resizingInfoRef.current = info;
        }
    }, [nodesRef]);

    const handleGroupMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, groupId: string) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        handleCloseAddNodeMenus();
        
        setGroups(prevGroups => {
             const index = prevGroups.findIndex(g => g.id === groupId);
             if (index === -1 || index === prevGroups.length - 1) return prevGroups;
             const newGroups = [...prevGroups];
             const [group] = newGroups.splice(index, 1);
             newGroups.push(group);
             return newGroups;
        });

        setSelectedNodeIds([]); 
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group) return;
        
        const worldMouse = getTransformedPoint({ x: e.clientX, y: e.clientY });
        const offsets = new Map<string, Point>();
        
        // Save offset for the group itself
        offsets.set(groupId, { x: worldMouse.x - group.position.x, y: worldMouse.y - group.position.y });
        
        // Save offsets for each node inside the group
        group.nodeIds.forEach(nid => {
            const n = nodesRef.current.find(node => node.id === nid);
            if (n) {
                 offsets.set(nid, { x: worldMouse.x - n.position.x, y: worldMouse.y - n.position.y });
            }
        });
        
        const info: DraggingInfo = { type: 'group', id: groupId, offsets: offsets };
        draggingInfoRef.current = info;
        setDraggingInfo(info);
    }, [getTransformedPoint, setDraggingInfo, handleCloseAddNodeMenus, setSelectedNodeIds, setGroups, groupsRef, nodesRef]);

    const handleGroupTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, groupId: string) => {
        e.stopPropagation();
        if (e.touches.length !== 1) return;
        handleCloseAddNodeMenus();
        const touch = e.touches[0];

        setGroups(prevGroups => {
             const index = prevGroups.findIndex(g => g.id === groupId);
             if (index === -1 || index === prevGroups.length - 1) return prevGroups;
             const newGroups = [...prevGroups];
             const [group] = newGroups.splice(index, 1);
             newGroups.push(group);
             return newGroups;
        });

        setSelectedNodeIds([]);
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group) return;
        const worldMouse = getTransformedPoint({ x: touch.clientX, y: touch.clientY });
        const offsets = new Map<string, Point>();
        
        // Group offset
        offsets.set(groupId, { x: worldMouse.x - group.position.x, y: worldMouse.y - group.position.y });
        
        // Node offsets
        group.nodeIds.forEach(nid => {
            const n = nodesRef.current.find(node => node.id === nid);
            if (n) {
                 offsets.set(nid, { x: worldMouse.x - n.position.x, y: worldMouse.y - n.position.y });
            }
        });
        const info: DraggingInfo = { type: 'group', id: groupId, offsets: offsets };
        draggingInfoRef.current = info;
        setDraggingInfo(info);
    }, [getTransformedPoint, setDraggingInfo, handleCloseAddNodeMenus, setSelectedNodeIds, setGroups, groupsRef, nodesRef]);

    const processDrag = (point: { clientX: number, clientY: number }, isAltDown: boolean, isShiftDown: boolean) => {
        const transformedClientX = (point.clientX - viewTransform.translate.x) / viewTransform.scale;
        const transformedClientY = (point.clientY - viewTransform.translate.y) / viewTransform.scale;

        if (draggingInfoRef.current) {
            const currentDraggingInfo = draggingInfoRef.current;
            const gridSnap = isSnapToGrid ? 20 : 1;
            
            if (currentDraggingInfo.type === 'node') {
                const draggedNodeId = currentDraggingInfo.id;
                const draggedNode = nodesRef.current.find(n => n.id === draggedNodeId);

                // --- Docking UI Logic ---
                if (draggedNode && !draggedNode.dockState && draggedNode.type !== NodeType.REROUTE_DOT) {
                     const viewportWidth = window.innerWidth;
                     const TOP_THRESHOLD = 150;
                     const SIDE_THRESHOLD = 80;

                     // 1. Top Docking Menu Visibility (Independent Check)
                     const nearTop = point.clientY < TOP_THRESHOLD;
                     setIsDockingMenuVisible(nearTop);

                     // 2. Hit Test for Dock Buttons & Side Zones
                     // Because the dragged node has pointer capture, we must manually check elements under the cursor
                     const elementUnderCursor = document.elementFromPoint(point.clientX, point.clientY);
                     const dockTarget = elementUnderCursor?.closest('[data-dock-mode]');
                     const dockModeAttr = dockTarget?.getAttribute('data-dock-mode');
                     
                     if (dockModeAttr) {
                         // Hovering a specific button (Top menu or Side panels)
                         setDockHoverMode(dockModeAttr as DockMode);
                     } else {
                         // Not hovering a button, check edge proximity to trigger side panels
                         if (point.clientX < SIDE_THRESHOLD) {
                             setDockHoverMode('q1'); // Triggers Left Panel opening
                         } else if (point.clientX > viewportWidth - SIDE_THRESHOLD) {
                             setDockHoverMode('q4'); // Triggers Right Panel opening
                         } else {
                             // If not near edges and not hovering a specific button, clear mode
                             setDockHoverMode(null);
                         }
                     }
                }
                // ------------------------

                const draggedNodeIds = Array.from(currentDraggingInfo.offsets.keys());
                const primaryNodeId = currentDraggingInfo.id;
                const primaryOffset = currentDraggingInfo.offsets.get(primaryNodeId)!;
                const rawX = transformedClientX - primaryOffset.x;
                const rawY = transformedClientY - primaryOffset.y;
                const primaryNode = nodesRef.current.find(n => n.id === primaryNodeId)!;
                const currentHeight = primaryNode.isCollapsed ? COLLAPSED_NODE_HEIGHT : primaryNode.height;

                // Hit Detection Logic
                let foundGroupId: string | null = null;
                
                // Define the node's hit box, shrunk by 10% (5% margin on each side)
                const nodeWidth = primaryNode.width;
                const nodeHeight = currentHeight;
                const marginX = nodeWidth * 0.05;
                const marginY = nodeHeight * 0.05;
                
                // Calculated Hit Box Coordinates
                const hitLeft = rawX + marginX;
                const hitTop = rawY + marginY;
                const hitRight = rawX + nodeWidth - marginX;
                const hitBottom = rawY + nodeHeight - marginY;

                // Check intersection with groups (reverse order to prioritize top-most visual groups)
                for (let i = groupsRef.current.length - 1; i >= 0; i--) {
                    const group = groupsRef.current[i];
                    
                    const gLeft = group.position.x;
                    const gTop = group.position.y;
                    const gRight = group.position.x + group.width;
                    const gBottom = group.position.y + group.height;

                    // Axis-Aligned Bounding Box (AABB) Intersection Check
                    const intersects = !(
                        hitRight < gLeft || 
                        hitLeft > gRight || 
                        hitBottom < gTop || 
                        hitTop > gBottom
                    );

                    if (intersects) {
                        foundGroupId = group.id;
                        break; 
                    }
                }
                
                if (hoveredGroupIdForDropRef.current !== foundGroupId) {
                    hoveredGroupIdForDropRef.current = foundGroupId;
                    setHoveredGroupIdForDrop(foundGroupId);
                }

                let snapDeltaX = 0;
                let snapDeltaY = 0;
                let guides: SmartGuide[] = [];

                if ((isSmartGuidesEnabled || isShiftDown) && draggedNodeIds.length === 1) {
                    const SNAP_THRESHOLD = 10 / viewTransform.scale;
                    const otherNodes = nodesRef.current.filter(n => n.id !== primaryNodeId);
                    
                    let vSnapFound = false;
                    let hSnapFound = false;

                    for (const target of otherNodes) {
                        if (vSnapFound && hSnapFound) break;

                        const targetH = target.isCollapsed ? COLLAPSED_NODE_HEIGHT : target.height;
                        
                        // Vertical Alignment (Snap X)
                        if (!vSnapFound) {
                            const txs = [target.position.x, target.position.x + target.width / 2, target.position.x + target.width];
                            const mxs = [rawX, rawX + primaryNode.width / 2, rawX + primaryNode.width];
                            
                            for(let tx of txs) {
                                let match = false;
                                for(let mx of mxs) {
                                    if (Math.abs(mx - tx) < SNAP_THRESHOLD) {
                                        snapDeltaX = tx - mx;
                                        // Calculate guide span
                                        const startY = Math.min(rawY, target.position.y) - 50;
                                        const endY = Math.max(rawY + currentHeight, target.position.y + targetH) + 50;
                                        guides.push({ 
                                            type: 'vertical', 
                                            position: tx, 
                                            start: startY, 
                                            end: endY 
                                        });
                                        match = true;
                                        vSnapFound = true;
                                        break; 
                                    }
                                }
                                if (match) break;
                            }
                        }

                        // Horizontal Alignment (Snap Y)
                        if (!hSnapFound) {
                            const tys = [target.position.y, target.position.y + targetH / 2, target.position.y + targetH];
                            const mys = [rawY, rawY + currentHeight / 2, rawY + currentHeight];
                            
                            for(let ty of tys) {
                                let match = false;
                                for(let my of mys) {
                                    if (Math.abs(my - ty) < SNAP_THRESHOLD) {
                                        snapDeltaY = ty - my;
                                        // Calculate guide span
                                        const startX = Math.min(rawX, target.position.x) - 50;
                                        const endX = Math.max(rawX + primaryNode.width, target.position.x + target.width) + 50;
                                        guides.push({ 
                                            type: 'horizontal', 
                                            position: ty, 
                                            start: startX, 
                                            end: endX 
                                        });
                                        match = true;
                                        hSnapFound = true;
                                        break;
                                    }
                                }
                                if (match) break;
                            }
                        }
                    }
                }
                setSmartGuides(guides);

                const updatedNodes = nodesRef.current.map(n => {
                    const offset = currentDraggingInfo.offsets.get(n.id);
                    if (offset) {
                        let newX = transformedClientX - offset.x + snapDeltaX;
                        let newY = transformedClientY - offset.y + snapDeltaY;
                        if (isSnapToGrid) {
                            newX = Math.round(newX / gridSnap) * gridSnap;
                            newY = Math.round(newY / gridSnap) * gridSnap;
                        }
                        return { ...n, position: { x: newX, y: newY } };
                    }
                    return n;
                });
                
                nodesRef.current = updatedNodes;
                setNodes(updatedNodes);

                if (!isAltDown) {
                    const affectedGroups = groupsRef.current.filter(g => g.nodeIds.some(id => draggedNodeIds.includes(id)));
                    if (affectedGroups.length > 0) {
                        setGroups(prev => prev.map(g => {
                            if (affectedGroups.some(ag => ag.id === g.id)) {
                                const gNodes = updatedNodes.filter(n => g.nodeIds.includes(n.id));
                                const b = calculateGroupBounds(gNodes);
                                return b ? { ...g, ...b } : g;
                            }
                            return g;
                        }));
                    }
                }

            } else if (currentDraggingInfo.type === 'group') {
                const groupOffset = currentDraggingInfo.offsets.get(currentDraggingInfo.id)!;
                const newGroupX = Math.round((transformedClientX - groupOffset.x) / gridSnap) * gridSnap;
                const newGroupY = Math.round((transformedClientY - groupOffset.y) / gridSnap) * gridSnap;
                
                const group = groupsRef.current.find(g => g.id === currentDraggingInfo.id)!;
                
                // Update group position
                setGroups(grps => grps.map(g => g.id === currentDraggingInfo.id ? { ...g, position: { x: newGroupX, y: newGroupY } } : g));
                
                // Update nodes inside group using their saved world-space offsets
                setNodes(nds => nds.map(n => {
                    const nodeOffset = currentDraggingInfo.offsets.get(n.id);
                    if (nodeOffset) {
                         let newX = transformedClientX - nodeOffset.x;
                         let newY = transformedClientY - nodeOffset.y;
                         if (isSnapToGrid) {
                             newX = Math.round(newX / gridSnap) * gridSnap;
                             newY = Math.round(newY / gridSnap) * gridSnap;
                         }
                         return { ...n, position: { x: newX, y: newY } };
                    }
                    return n;
                }));
            }
        }
    };
    
    const processResize = (point: { clientX: number, clientY: number }) => {
        const currentResizeInfo = resizingInfoRef.current;
        if (currentResizeInfo) {
            const node = nodesRef.current.find(n => n.id === currentResizeInfo.nodeId);
            if (node) {
                const scale = node.dockState ? 1 : viewTransform.scale;
                const dx = (point.clientX - currentResizeInfo.startPosition.x) / scale;
                const dy = (point.clientY - currentResizeInfo.startPosition.y) / scale;
                const min = getMinNodeSize(node.type);
                
                let nw = node.width, nh = node.height, nx = node.position.x, ny = node.position.y;
                const dir = currentResizeInfo.direction || 'se';

                if (dir.includes('e')) nw = Math.max(min.minWidth, currentResizeInfo.startSize.width + dx);
                if (dir.includes('s')) nh = Math.max(min.minHeight, currentResizeInfo.startSize.height + dy);
                if (dir.includes('w')) {
                    const val = Math.max(min.minWidth, currentResizeInfo.startSize.width - dx);
                    nx = node.position.x + (node.width - val);
                    nw = val;
                }
                if (dir.includes('n')) {
                    const val = Math.max(min.minHeight, currentResizeInfo.startSize.height - dy);
                    ny = node.position.y + (node.height - val);
                    nh = val;
                }

                if (isSnapToGrid) { nw = Math.round(nw / 20) * 20; nh = Math.round(nh / 20) * 20; }

                setNodes(nds => nds.map(n => n.id === currentResizeInfo.nodeId ? { ...n, width: nw, height: nh, position: { x: nx, y: ny } } : n));
                
                const affected = groupsRef.current.filter(g => g.nodeIds.includes(currentResizeInfo.nodeId));
                if (affected.length > 0) {
                    setGroups(prev => prev.map(g => {
                        if (affected.some(a => a.id === g.id)) {
                             const gNodes = nodesRef.current.map(n => n.id === currentResizeInfo.nodeId ? {...n, width: nw, height: nh, position: {x: nx, y: ny}} : n).filter(n => g.nodeIds.includes(n.id));
                             const b = calculateGroupBounds(gNodes);
                             return b ? { ...g, ...b } : g;
                        }
                        return g;
                    }));
                }
            }
        }
    };

    const endDrag = () => {
        const currentDraggingInfo = draggingInfoRef.current;
        
        if (currentDraggingInfo && currentDraggingInfo.type === 'node' && dockHoverMode && handleDockNode) {
            // Retrieve initial grab position to pass to handleDockNode
            const initialPos = currentDraggingInfo.initialPositions?.get(currentDraggingInfo.id);
            handleDockNode(currentDraggingInfo.id, dockHoverMode, initialPos);
        }
        
        if (currentDraggingInfo && currentDraggingInfo.type === 'node' && connections && setConnections) {
             const node = nodesRef.current.find(n => n.id === currentDraggingInfo.id);
             if (node && node.type === NodeType.REROUTE_DOT) {
                const nodeCenter = { x: node.position.x + node.width / 2, y: node.position.y + node.height / 2 };
                const connectionToSplit = connections.find(conn => {
                    if (conn.fromNodeId === node.id || conn.toNodeId === node.id) return false;
                    const from = nodesRef.current.find(n => n.id === conn.fromNodeId);
                    const to = nodesRef.current.find(n => n.id === conn.toNodeId);
                    if (from && to) {
                        const { start, end } = getConnectionPoints(from, to, conn);
                        return isPointNearConnection(nodeCenter, start, end, 20);
                    }
                    return false;
                });

                if (connectionToSplit) {
                    const fromNode = nodesRef.current.find(n => n.id === connectionToSplit.fromNodeId);
                    const outputType = fromNode ? getOutputHandleType(fromNode, connectionToSplit.fromHandleId) : null;
                    if (outputType) setNodes(prev => prev.map(n => n.id === node.id ? { ...n, value: JSON.stringify({ type: outputType }) } : n));

                    const newConn1 = { id: `conn-${Date.now()}-1`, fromNodeId: connectionToSplit.fromNodeId, fromHandleId: connectionToSplit.fromHandleId, toNodeId: node.id, toHandleId: undefined };
                    const newConn2 = { id: `conn-${Date.now()}-2`, fromNodeId: node.id, fromHandleId: undefined, toNodeId: connectionToSplit.toNodeId, toHandleId: connectionToSplit.toHandleId };
                    setConnections(prev => [...prev.filter(c => c.id !== connectionToSplit.id), newConn1, newConn2]);
                }
             }
        }

        if (currentDraggingInfo && currentDraggingInfo.type === 'node') {
            const targetGroupId = hoveredGroupIdForDropRef.current;
            const draggedNodeIds = Array.from(currentDraggingInfo.offsets.keys());
            setGroups(prev => {
                let newGroups = [...prev];
                if (targetGroupId && !currentDraggingInfo.isDetaching) {
                    newGroups = newGroups.map(g => {
                        if (g.id === targetGroupId) return { ...g, nodeIds: Array.from(new Set([...g.nodeIds, ...draggedNodeIds])) };
                        if (g.nodeIds.some(id => draggedNodeIds.includes(id))) return { ...g, nodeIds: g.nodeIds.filter(id => !draggedNodeIds.includes(id)) };
                        return g;
                    });
                } else if (currentDraggingInfo.isDetaching) {
                    newGroups = newGroups.map(g => ({ ...g, nodeIds: g.nodeIds.filter(id => !draggedNodeIds.includes(id)) }));
                }
                return newGroups.filter(g => g.nodeIds.length > 0).map(g => {
                    const gn = nodesRef.current.filter(n => g.nodeIds.includes(n.id));
                    return { ...g, ...(calculateGroupBounds(gn) || {}) };
                });
            });
        }
        
        setDraggingInfo(null); draggingInfoRef.current = null;
        setResizingInfo(null); resizingInfoRef.current = null;
        setHoveredGroupIdForDrop(null); hoveredGroupIdForDropRef.current = null;
        setSmartGuides([]); setIsDockingMenuVisible(false); setDockHoverMode(null);
    };

    return {
        handleNodeMouseDown, handleNodeTouchStart, handleNodeResizeMouseDown, handleGroupMouseDown, handleGroupTouchStart,
        processDrag, processResize, endDrag, draggingInfo, resizingInfo, setResizingInfo, draggingInfoRef, resizingInfoRef, hoveredGroupIdForDrop
    };
};
