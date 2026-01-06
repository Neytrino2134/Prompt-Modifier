
import React, { useCallback } from 'react';
import { Node, DockMode, NodeType } from '../types';

interface UseNodeGesturesProps {
    node: Node;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string) => void;
    onResizeMouseDown: (e: React.PointerEvent<HTMLDivElement>, nodeId: string, direction?: string) => void;
    onNodeClick: (nodeId: string) => void;
    onDetachNodeFromGroup: (nodeId: string) => void;
    activeTool: string;
    connectingInfo?: any;
    isDockedWindow: boolean;
    isProxyMode: boolean;
}

export const useNodeGestures = ({
    node,
    onMouseDown,
    onTouchStart,
    onResizeMouseDown,
    onNodeClick,
    onDetachNodeFromGroup,
    activeTool,
    connectingInfo,
    isDockedWindow,
    isProxyMode
}: UseNodeGesturesProps) => {

    const handleDragMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Only stop propagation if we are actually starting a drag (not handled by children)
        if (!isDockedWindow) {
            onMouseDown(e, node.id);
        }
    }, [isDockedWindow, onMouseDown, node.id]);

    const handleDragTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!isDockedWindow) {
            onTouchStart(e, node.id);
        }
    }, [isDockedWindow, onTouchStart, node.id]);

    const handleResizeMouseDown = useCallback((e: React.PointerEvent<HTMLDivElement>, direction?: string) => {
        if (!isProxyMode) {
            onResizeMouseDown(e, node.id, direction);
        }
    }, [isProxyMode, onResizeMouseDown, node.id]);

    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Main body mouse up no longer handles tool actions to avoid conflicts with connection logic
    }, []);

    const handleHeaderMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool === 'cutter') {
            if (connectingInfo) return;
            
            e.stopPropagation();
            e.preventDefault();
            onNodeClick(node.id); 
        }
    }, [activeTool, connectingInfo, onNodeClick, node.id]);

    const handleHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isDockedWindow) return;
        if (e.altKey) { 
            // Trigger detach logic but DO NOT stop propagation or return.
            // This allows the node to be dragged out immediately.
            onDetachNodeFromGroup(node.id); 
        }
        handleDragMouseDown(e);
    }, [isDockedWindow, onDetachNodeFromGroup, handleDragMouseDown, node.id]);

    const handleHeaderDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>, onToggleCollapse: (id: string) => void) => {
         if (e.altKey) { 
             e.stopPropagation(); 
             onDetachNodeFromGroup(node.id); 
         } else if (!isDockedWindow) { 
             if (node.type !== NodeType.REROUTE_DOT) {
                 onToggleCollapse(node.id); 
             }
         }
    }, [isDockedWindow, onDetachNodeFromGroup, node.id, node.type]);

    return {
        handleDragMouseDown,
        handleDragTouchStart,
        handleResizeMouseDown,
        handleMouseUp,
        handleHeaderMouseUp,
        handleHeaderMouseDown,
        handleHeaderDoubleClick
    };
};
