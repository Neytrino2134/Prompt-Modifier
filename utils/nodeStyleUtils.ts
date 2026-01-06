
import React from 'react';
import { Node, NodeType, Point } from '../types';
import { COLLAPSED_NODE_HEIGHT } from './nodeUtils';

export const getNodeStyles = (
    node: Node,
    isDockedWindow: boolean,
    isProxyMode: boolean,
    isRerouteDot: boolean,
    isSelected: boolean,
    isHovered: boolean,
    minSize: { minWidth: number, minHeight: number },
    isFocused?: boolean,
    isGrouped?: boolean,
    isGroupDragging?: boolean
): React.CSSProperties => {
    
    // Full Screen Focus Override
    if (isFocused) {
        return {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1000,
            borderRadius: 0,
            border: 'none',
        };
    }

    // Base styles for canvas positioning
    // Using translate() instead of translate3d() to allow browser to re-rasterize content on scale changes
    const x = Number.isFinite(node.position.x) ? node.position.x : 0;
    const y = Number.isFinite(node.position.y) ? node.position.y : 0;

    // --- Z-Index Hierarchy ---
    // 1000: Fullscreen / Focused (Handled above)
    // 500: Nodes inside a Group that is currently being Dragged (Active Group)
    // 100: Pinned Nodes
    // 90: Selected / Dragging Nodes (Individual)
    // 80: Hovered Nodes
    // 10: Loose Nodes (Resting)
    // 6: Nodes inside a Group (Resting)
    
    let zIndex = 10; // Default loose node

    if (isGroupDragging) {
        zIndex = 500; // Active Group Layer (Must be > Group Container which is 490)
    } else if (node.isPinned) {
        zIndex = 100;
    } else if (isSelected) {
        zIndex = 90;
    } else if (isHovered) {
        zIndex = 80;
    } else if (isGrouped) {
        zIndex = 6; // Resting Group Layer (Below loose nodes)
    }

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${x}px, ${y}px)`,
        width: isProxyMode ? 160 : (Number.isFinite(node.width) ? node.width : minSize.minWidth), 
        height: isProxyMode ? 48 : (node.isCollapsed ? `${COLLAPSED_NODE_HEIGHT}px` : (Number.isFinite(node.height) ? node.height : minSize.minHeight)),
        minWidth: (isRerouteDot || isProxyMode) ? undefined : `${minSize.minWidth}px`, 
        minHeight: (node.isCollapsed || isProxyMode) ? undefined : (isRerouteDot ? undefined : `${minSize.minHeight}px`),
        zIndex: zIndex,
        // Remove contain to allow proper rendering scaling
        contain: 'none'
    };

    // Docking overrides
    if (isDockedWindow && node.dockState) {
        const margin = 56;
        const m = `${margin}px`;
        const width = node.width && Number.isFinite(node.width) ? `${node.width}px` : 'auto';
        const height = node.height && Number.isFinite(node.height) ? `${node.height}px` : 'auto';
        
        // Calculate available width for quarters: 100vw - (margin * 2)
        const availW = `(100vw - ${margin * 2}px)`;
        
        // Min Size constraints for docked mode
        const minW = `${minSize.minWidth}px`;
        const minH = `${minSize.minHeight}px`;

        const dockedBase = { 
            position: 'fixed' as const, 
            transform: 'none', 
            zIndex: 100, 
            minWidth: minW, 
            minHeight: minH,
            contain: 'none' as const
        };

        switch (node.dockState.mode) {
            case 'full': return { ...dockedBase, top: m, left: m, right: m, bottom: m, width: 'auto', height: 'auto' };
            case 'left': return { ...dockedBase, top: m, left: m, width: width, bottom: m, height: 'auto' };
            case 'right': return { ...dockedBase, top: m, right: m, width: width, bottom: m, height: 'auto' };
            case 'tl': return { ...dockedBase, top: m, left: m, width: width, height: height };
            case 'tr': return { ...dockedBase, top: m, right: m, width: width, height: height };
            case 'bl': return { ...dockedBase, bottom: m, left: m, width: width, height: height };
            case 'br': return { ...dockedBase, bottom: m, right: m, width: width, height: height };
            case 'q1': return { ...dockedBase, top: m, bottom: m, left: m, width: width, height: 'auto' };
            case 'q2': return { ...dockedBase, top: m, bottom: m, left: `calc(${m} + ${availW} * 0.25)`, width: width, height: 'auto' };
            case 'q3': return { ...dockedBase, top: m, bottom: m, right: `calc(${m} + ${availW} * 0.25)`, width: width, height: 'auto' };
            case 'q4': return { ...dockedBase, top: m, bottom: m, right: m, width: width, height: 'auto' };
        }
    }

    return baseStyle;
};

export const getNodeClasses = (
    node: Node,
    isDockedWindow: boolean,
    isProxyMode: boolean,
    isRerouteDot: boolean,
    isSelected: boolean,
    isHovered: boolean,
    isDragging: boolean,
    isDragOverTarget: boolean,
    isConnectionTarget: boolean,
    isExecuting: boolean,
    rerouteType: string | null,
    isFocused?: boolean
) => {
    let borderClass = 'border-gray-700';

    if (isDragging) borderClass = 'border-node-selected'; 
    else if (isDragOverTarget) borderClass = 'border-node-selected';
    else if (isConnectionTarget) borderClass = 'border-teal-600'; 
    else if (isExecuting) borderClass = 'border-yellow-500';
    else if (isSelected) borderClass = 'border-node-selected';
    else if (isHovered && !isRerouteDot && !isProxyMode) borderClass = 'border-node-hover ring-1 ring-node-hover/50 shadow-[0_0_15px_var(--color-border-hover)]';
    else if (node.isPinned) borderClass = 'border-node-hover'; 
    else if (isRerouteDot) {
        if (rerouteType === 'text') borderClass = 'border-[var(--color-connection-text)]';
        else if (rerouteType === 'image') borderClass = 'border-[var(--color-connection-image)]';
        else if (rerouteType === 'character_data') borderClass = 'border-pink-500';
        else if (rerouteType === 'video') borderClass = 'border-indigo-500';
        else if (rerouteType === 'audio') borderClass = 'border-blue-500';
    }
  
    if (isDockedWindow) {
        borderClass = 'border-gray-600 shadow-2xl hover:border-cyan-500'; 
    }
    if (isProxyMode) borderClass = 'border-gray-600 border-dashed opacity-80';

    let bgClass = isRerouteDot 
        ? 'bg-gray-600'
        : (node.type === NodeType.NOTE ? 'bg-gray-900/70 backdrop-blur-sm' : 'bg-gray-800');
        
    if (isProxyMode) bgClass = 'bg-gray-800/80 backdrop-blur-sm';
    
    if (isFocused) {
        bgClass = 'bg-gray-900'; 
        borderClass = 'border-none';
    }

    const headerBgClass = isRerouteDot ? 'bg-transparent' : (node.type === NodeType.NOTE ? 'bg-transparent border-b border-gray-700/50' : 'bg-gray-700');
    
    const shapeClass = isFocused ? "" : (isRerouteDot || isProxyMode ? "rounded-lg" : "rounded-lg shadow-2xl");
    
    // Pass pointer-events-none if dragging to allow hover detection of underlying elements (like dock panels)
    const interactionClass = isDragging ? 'pointer-events-none' : '';

    return {
        container: `node-view absolute flex flex-col transition-[border-color,background-color,box-shadow] duration-200 ease-out ${bgClass} border-2 ${shapeClass} ${borderClass} ${interactionClass}`,
        header: headerBgClass,
        dockResizer: (mode: string) => {
            if (mode === 'left') return "cursor-ew-resize right-0 top-0 w-2 h-full";
            if (mode === 'right') return "cursor-ew-resize left-0 top-0 w-2 h-full";
            if (mode === 'tl') return "cursor-nwse-resize bottom-0 right-0 w-4 h-4";
            if (mode === 'tr') return "cursor-nesw-resize bottom-0 left-0 w-4 h-4";
            if (mode === 'bl') return "cursor-nesw-resize top-0 right-0 w-4 h-4";
            if (mode === 'br') return "cursor-nwse-resize top-0 left-0 w-4 h-4";
            return "";
        }
    };
};

export const getHandleColorClass = (
    type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null, 
    handleId: string | undefined, 
    node: Node, 
    isRerouteDot: boolean, 
    rerouteType: string | null,
    isHovered: boolean,
    connectingInfo: any,
    connectionTarget: any
): string => {
    let finalType = type;
    if (node.type === NodeType.IMAGE_EDITOR && !type) finalType = (handleId === 'image' || handleId === 'image_b') ? 'image' : 'text';
    if (isRerouteDot) finalType = rerouteType as any;
    
    let color = 'bg-gray-400';
    switch(finalType) {
        case 'text': color = 'bg-[var(--color-connection-text)]'; break;
        case 'image': color = 'bg-connection-image'; break;
        case 'character_data': color = 'bg-pink-500'; break;
        case 'video': color = 'bg-indigo-500'; break;
        case 'audio': color = 'bg-blue-500'; break;
    }

    if (!connectingInfo || (!isHovered && !isRerouteDot)) return color;
    
    if (connectionTarget?.nodeId === node.id) {
        if (node.type === NodeType.REROUTE_DOT) return 'bg-teal-600 ring-2 ring-white'; 
        if (node.type === NodeType.DATA_READER) return 'bg-teal-600 ring-2 ring-white';
        
        if (connectionTarget.handleId === handleId) return 'bg-teal-600 ring-2 ring-white';
    }
    
    if (isHovered) return 'bg-red-500 cursor-not-allowed';
    return color;
};
