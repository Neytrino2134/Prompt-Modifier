
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Node, Point, Connection, Group, NodeType, Tool, ConnectingInfo, DraggingInfo, SmartGuide, Alignment, DockMode } from '../types';
import { useCanvasGestures } from './interactions/useCanvasGestures';
import { useNodeDrag } from './interactions/useNodeDrag';
import { useConnectionHandling } from './interactions/useConnectionHandling';
import { useHotkeys } from './interactions/useHotkeys';
import { COLLAPSED_NODE_HEIGHT } from '../utils/nodeUtils';

interface UseInteractionProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    groups: Group[];
    setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
    addConnection: (connection: Omit<Connection, 'id'>) => void;
    connections: Connection[];
    viewTransform: { scale: number; translate: Point };
    setViewTransform: React.Dispatch<React.SetStateAction<{ scale: number; translate: Point }>>;
    updatePointerPosition: (e: { clientX: number, clientY: number }) => void;
    pan: (point: Point) => void;
    isPanning: boolean;
    startPanning: (point: Point) => void;
    stopPanning: () => void;
    isSnapToGrid: boolean;
    onAddNode: (type: NodeType, position: Point, title?: string, options?: { centerNode?: boolean }) => string;
    removeConnectionsByNodeId: (nodeId: string) => void;
    handleOpenQuickSearch: (pos: Point) => void;
    clientPointerPosition: Point;
    getTransformedPoint: (point: Point) => Point;
    getCanvasRelativePoint: (point: Point) => Point;
    setZoom: (newScale: number, pivot: Point) => void;
    t: (key: string) => string;
    handleDeleteNode: (nodeId: string) => void;
    handleValueChange: (nodeId: string, value: string) => void;
    handleDuplicateNode: (nodeId: string) => string | undefined;
    handleDuplicateNodeWithContent: (nodeId: string) => string | undefined;
    handleToggleNodeCollapse: (nodeId: string) => void;
    handleToggleNodePin: (nodeId: string) => void;
    copyNodeValue: (nodeId: string) => Promise<void>;
    pasteImageToNode: (nodeId: string, imageFile?: File | null) => Promise<void>;
    nodeIdCounter: React.MutableRefObject<number>;
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    addGroup: (nodesToGroup: Node[], title?: string) => void;
    handleCloseAddNodeMenus: () => void;
    activeTool: Tool;
    setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
    setSpawnLine: React.Dispatch<React.SetStateAction<{ start: Point; end: Point; fading: boolean; } | null>>;
    pointerPosition: Point;
    setError: (error: string | null) => void;
    handleLoadCanvasIntoCurrentTab: (text: string) => void;
    setIsSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
    setLineStyle: React.Dispatch<React.SetStateAction<"spaghetti" | "orthogonal">>;
    deleteNodeAndConnections: (nodeId: string) => void;
    handleToggleCatalog: () => void; 
    draggingInfo: DraggingInfo | null;
    setDraggingInfo: React.Dispatch<React.SetStateAction<DraggingInfo | null>>;
    handleDetachNodeFromGroup: (nodeId: string) => void;
    handleSaveCanvas: () => void;
    handleLoadCanvas: () => void;
    handleOpenConnectionQuickAdd: (position: Point, connectingInfo: ConnectingInfo, sourceNodeType?: NodeType) => void;
    handleOpenContextMenu: (position: Point) => void;
    quickSlots: (NodeType | null)[];
    isConnectionQuickAddOpen: boolean;
    pasteGroup: (clipboardData: any, position?: Point) => void;
    copyGroup: (groupId: string) => void;
    isSmartGuidesEnabled: boolean;
    setIsSmartGuidesEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setSmartGuides: React.Dispatch<React.SetStateAction<SmartGuide[]>>;
    selectedNodeIds: string[];
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    handleRenameNode: (nodeId: string, newTitle: string) => void;
    setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    handleOpenQuickAdd: (position: Point) => void;
    requestDeleteNodes: (nodeIds: string[], position: Point) => void;
    isInstantCloseEnabled: boolean;
    handleAlignNodes: (selectedNodeIds: string[], type: Alignment) => void;
    handleDockNode?: (nodeId: string, mode: DockMode) => void;
    handlePaste: () => void;
    selectNode: (nodeId: string) => void;
    dockHoverMode: DockMode | null;
    setDockHoverMode: (mode: DockMode | null) => void;
    isDockingMenuVisible: boolean;
    setIsDockingMenuVisible: (visible: boolean) => void;
    undoPosition: (nodes: Node[]) => void;
    redoPosition: (nodes: Node[]) => void;
}

export const useInteraction = (props: UseInteractionProps) => {
    const { 
        nodes, setNodes, groups, setGroups, addConnection, connections, viewTransform, setViewTransform, updatePointerPosition, pan, isPanning, startPanning, stopPanning, isSnapToGrid, onAddNode, removeConnectionsByNodeId, handleOpenQuickSearch, clientPointerPosition, getTransformedPoint, getCanvasRelativePoint, setZoom, t, handleDeleteNode, handleValueChange, handleDuplicateNode, handleDuplicateNodeWithContent, handleToggleNodeCollapse, handleToggleNodePin, copyNodeValue, pasteImageToNode, nodeIdCounter, setConnections, addGroup, handleCloseAddNodeMenus, activeTool, setActiveTool: _setActiveTool, setSpawnLine, pointerPosition, setError, handleLoadCanvasIntoCurrentTab, setIsSnapToGrid, setLineStyle,
        deleteNodeAndConnections, handleToggleCatalog,
        draggingInfo, setDraggingInfo, handleDetachNodeFromGroup,
        handleSaveCanvas, handleLoadCanvas, handleOpenConnectionQuickAdd,
        handleOpenContextMenu, quickSlots, isConnectionQuickAddOpen,
        pasteGroup, copyGroup, isSmartGuidesEnabled, setIsSmartGuidesEnabled, setSmartGuides,
        selectedNodeIds, setSelectedNodeIds, handleRenameNode, setFullSizeImage,
        handleOpenQuickAdd, requestDeleteNodes, isInstantCloseEnabled, handleAlignNodes, handleDockNode, handlePaste, selectNode,
        dockHoverMode, setDockHoverMode, isDockingMenuVisible, setIsDockingMenuVisible,
        undoPosition, redoPosition
    } = props;

    const nodesRef = useRef(nodes);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    const groupsRef = useRef(groups);
    useEffect(() => { groupsRef.current = groups; }, [groups]);
    const connectionsRef = useRef(connections);
    useEffect(() => { connectionsRef.current = connections; }, [connections]);
    const pointerPositionRef = useRef(pointerPosition);
    useEffect(() => { pointerPositionRef.current = pointerPosition; }, [pointerPosition]);
    const clientPointerPositionRef = useRef(clientPointerPosition);
    useEffect(() => { clientPointerPositionRef.current = clientPointerPosition; }, [clientPointerPosition]);

    const [zoomDragInfo, setZoomDragInfo] = useState<{ startClientX: number, startScale: number, pivot: Point } | null>(null);
    const [selectionRect, setSelectionRect] = useState<{ start: Point; end: Point } | null>(null);
    const [isShiftDown, setIsShiftDown] = useState(false);
    const [isCtrlDown, setIsCtrlDown] = useState(false);
    const [isAltDown, setIsAltDown] = useState(false);
    const [isZDown, setIsZDown] = useState(false);
    const [isRadialMenuOpen, setIsRadialMenuOpen] = useState(false);
    const [radialMenuSelectedItem, setRadialMenuSelectedItem] = useState<NodeType | null>(null);
    const [radialMenuPosition, setRadialMenuPosition] = useState({ x: 0, y: 0 });

    const setActiveTool = useCallback((tool: Tool) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        _setActiveTool(tool);
    }, [_setActiveTool]);

    const effectiveTool: Tool = isZDown ? 'zoom' : activeTool === 'edit' ? isCtrlDown && isAltDown ? 'reroute' : isCtrlDown ? 'cutter' : isShiftDown ? 'selection' : 'edit' : activeTool;

    const gestures = useCanvasGestures({
        viewTransform, setViewTransform, isPanning, pan, startPanning, stopPanning,
        getCanvasRelativePoint, setZoom, handleCloseAddNodeMenus, setSelectedNodeIds, effectiveTool,
        setZoomDragInfo, getTransformedPoint, setSelectionRect
    });

    const nodeDrag = useNodeDrag({
        nodesRef, setNodes, groupsRef, setGroups, viewTransform, isSnapToGrid, isSmartGuidesEnabled,
        setSmartGuides, handleCloseAddNodeMenus, setSelectedNodeIds, selectedNodeIds,
        getTransformedPoint, activeTool, handleDockNode, setIsDockingMenuVisible, setDockHoverMode, dockHoverMode,
        connections,
        setConnections
    });

    const connectionsHandler = useConnectionHandling({
        nodesRef, connectionsRef, getTransformedPoint, setConnections, addConnection, handleOpenConnectionQuickAdd, setNodes
    });

    useHotkeys({
        selectedNodeIds, setSelectedNodeIds, nodesRef, groupsRef, draggingInfoRef: nodeDrag.draggingInfoRef, isTyping: false,
        handleSaveCanvas, handleLoadCanvas, copyNodeValue, copyGroup, handlePaste, handleToggleCatalog,
        handleOpenQuickSearch, handleOpenQuickAdd, deselectAllNodes: () => setSelectedNodeIds([]), handleDuplicateNode,
        handleDuplicateNodeWithContent, deleteNodeAndConnections, requestDeleteNodes,
        handleGroupSelection: () => { if (selectedNodeIds.length > 1) { const n = nodesRef.current.filter(x => selectedNodeIds.includes(x.id)); addGroup(n); setSelectedNodeIds([]); } },
        handleToggleNodeCollapse, handleToggleNodePin, onAddNode, pointerPositionRef, clientPointerPositionRef, handleCloseAddNodeMenus,
        setIsSnapToGrid, setLineStyle, setIsSmartGuidesEnabled, setActiveTool, setIsShiftDown, setIsCtrlDown, setIsAltDown,
        setIsZDown, setSelectionRect, isRadialMenuOpen, setIsRadialMenuOpen, setRadialMenuPosition,
        radialMenuSelectedItem, setRadialMenuSelectedItem, getTransformedPoint, radialMenuPosition,
        quickSlots, isConnectionQuickAddOpen, isInstantCloseEnabled, handleAlignNodes,
        undoPosition, redoPosition, handleValueChange
    });

    const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('.node-view') || target.closest('.group-view') || target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('.ui-panel') || target.closest('[role="dialog"]')) return;
        if (target.id === 'app-container' || target.id === 'canvas-transform-layer' || target.tagName === 'svg' || target.classList.contains('connection-view')) {
            e.preventDefault();
            handleOpenQuickAdd({ x: e.clientX, y: e.clientY });
        }
    }, [handleOpenQuickAdd]);

    const getCanvasCursor = () => {
        if (zoomDragInfo) return 'ew-resize';
        if (nodeDrag.draggingInfo) return 'grabbing';
        if (effectiveTool === 'selection') return 'crosshair';
        if (effectiveTool === 'zoom') return 'ew-resize';
        if (effectiveTool === 'edit' || effectiveTool === 'cutter' || effectiveTool === 'reroute') return isPanning ? 'grabbing' : 'grab';
        return 'default';
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent | PointerEvent) => {
        const isTouch = 'touches' in e;
        const currentDraggingInfo = nodeDrag.draggingInfoRef.current;
        const currentResizingInfo = nodeDrag.resizingInfoRef.current;
        
        if ((currentDraggingInfo || currentResizingInfo || connectionsHandler.connectingInfo || selectionRect || isPanning)) {
            if (e.cancelable) e.preventDefault();
        }
        
        let point: { clientX: number, clientY: number } = e as MouseEvent;
        if (isTouch) {
             point = (e as TouchEvent).touches[0];
        } else if ('pointerId' in e) {
             point = e as PointerEvent;
        }
        
        if (!point) return;

        updatePointerPosition({ clientX: point.clientX, clientY: point.clientY });
        const currentPointerPosition = getTransformedPoint({ x: point.clientX, y: point.clientY });

        if (isPanning) {
             if (e.type === 'touchmove') {
                 gestures.handleCanvasTouchMove(e as TouchEvent);
             } else {
                 pan({ x: point.clientX, y: point.clientY });
             }
        }

        if (zoomDragInfo) {
            const deltaX = point.clientX - zoomDragInfo.startClientX;
            const sensitivity = 300;
            const zoomFactor = Math.pow(2, deltaX / sensitivity);
            const newScale = Math.max(0.2, Math.min(2.0, (zoomDragInfo.startScale || 1) * zoomFactor));
            setZoom(newScale, zoomDragInfo.pivot);
            return;
        }

        if (connectionsHandler.connectingInfo) {
            connectionsHandler.processConnectionDrag(currentPointerPosition, e as any);
        }

        if (currentDraggingInfo) {
            nodeDrag.processDrag(point, isAltDown, isShiftDown);
        } else if (currentResizingInfo) {
            nodeDrag.processResize(point);
        } else if (selectionRect) {
            setSelectionRect({
                start: selectionRect.start,
                end: getTransformedPoint({ x: point.clientX, y: point.clientY }),
            });
        }
    };

    const handleGlobalEnd = (e: MouseEvent | TouchEvent | PointerEvent) => {
        if (isPanning) stopPanning();
        if (zoomDragInfo) setZoomDragInfo(null);
        
        if (selectionRect) {
            const rect = selectionRect;
            const x = Math.min(rect.start.x, rect.end.x);
            const y = Math.min(rect.start.y, rect.end.y);
            const w = Math.abs(rect.start.x - rect.end.x);
            const h = Math.abs(rect.start.y - rect.end.y);
            if (w > 0 && h > 0) {
                const ids = nodesRef.current.filter(n => {
                    const nodeHeight = n.isCollapsed ? COLLAPSED_NODE_HEIGHT : n.height;
                    return n.position.x < x + w && n.position.x + n.width > x && n.position.y < y + h && n.position.y + nodeHeight > y;
                }).map(n => n.id);
                setSelectedNodeIds(ids);

                // Disable new node animation for selected nodes
                if (ids.length > 0) {
                    setNodes(prev => prev.map(n => {
                        if (ids.includes(n.id) && n.isNewlyCreated) {
                            return { ...n, isNewlyCreated: false };
                        }
                        return n;
                    }));
                }
            }
            setSelectionRect(null);
        }

        if (nodeDrag.draggingInfoRef.current || nodeDrag.resizingInfoRef.current) {
            nodeDrag.endDrag();
        }

        if (connectionsHandler.connectingInfo) {
            connectionsHandler.endConnection(e as any, isPanning, nodeDrag.draggingInfoRef.current);
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handleGlobalEnd);
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handleGlobalEnd);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handleGlobalEnd);

        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handleGlobalEnd);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handleGlobalEnd);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handleGlobalEnd);
        };
    }, [
        isPanning, 
        zoomDragInfo, 
        selectionRect, 
        connectionsHandler.connectingInfo, 
        connectionsHandler.connectionTarget,
        connectionsHandler.endConnection,
        nodeDrag.draggingInfoRef.current, 
        nodeDrag.resizingInfoRef.current, 
        isAltDown, 
        viewTransform, 
        isSnapToGrid, 
        isSmartGuidesEnabled, 
        isShiftDown
    ]);

    const groupButtonPosition = useMemo(() => {
        if (selectedNodeIds.length < 2) return null;
        const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
        if (selectedNodes.length < 2) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity;
        selectedNodes.forEach(node => {
             minX = Math.min(minX, node.position.x);
             minY = Math.min(minY, node.position.y);
             maxX = Math.max(maxX, node.position.x + node.width);
        });
        return { x: (minX + maxX) / 2, y: minY - 60 };
    }, [nodes, selectedNodeIds]);

    return {
        handleCanvasMouseDown: gestures.handleCanvasMouseDown,
        handleCanvasTouchStart: gestures.handleCanvasTouchStart,
        handleCanvasTouchMove: gestures.handleCanvasTouchMove,
        handleCanvasTouchEnd: gestures.handleCanvasTouchEnd,
        getCanvasCursor,
        selectedNodeIds, setSelectedNodeIds,
        connectingInfo: connectionsHandler.connectingInfo,
        setConnectingInfo: connectionsHandler.setConnectingInfo,
        zoomDragInfo, setZoomDragInfo,
        resizingInfo: nodeDrag.resizingInfo, setResizingInfo: nodeDrag.setResizingInfo,
        hoveredNodeId: connectionsHandler.hoveredNodeId, setHoveredNodeId: connectionsHandler.setHoveredNodeId,
        connectionTarget: connectionsHandler.connectionTarget, setConnectionTarget: connectionsHandler.setConnectionTarget,
        handleNodeResizeMouseDown: nodeDrag.handleNodeResizeMouseDown,
        handleNodeMouseDown: nodeDrag.handleNodeMouseDown,
        handleNodeTouchStart: nodeDrag.handleNodeTouchStart,
        handleGroupMouseDown: nodeDrag.handleGroupMouseDown,
        handleGroupTouchStart: nodeDrag.handleGroupTouchStart,
        handleStartConnection: connectionsHandler.handleStartConnection,
        handleStartConnectionTouch: connectionsHandler.handleStartConnectionTouch,
        isRadialMenuOpen, setIsRadialMenuOpen,
        radialMenuPosition, setRadialMenuPosition,
        radialMenuSelectedItem, setRadialMenuSelectedItem,
        deselectAllNodes: () => setSelectedNodeIds([]),
        setSelectionRect, selectionRect,
        effectiveTool, setActiveTool,
        hoveredGroupIdForDrop: nodeDrag.hoveredGroupIdForDrop,
        draggingInfo: nodeDrag.draggingInfo,
        handleGroupSelection: () => { if (selectedNodeIds.length > 1) { const n = nodesRef.current.filter(x => selectedNodeIds.includes(x.id)); addGroup(n); setSelectedNodeIds([]); } },
        handleCanvasDoubleClick,
        dockHoverMode, setDockHoverMode,
        isDockingMenuVisible, setIsDockingMenuVisible,
        clientPointerPositionRef,
        groupButtonPosition,
        handlePaste,
        selectNode,
    };
};
