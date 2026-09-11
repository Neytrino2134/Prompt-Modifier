

import React, { useMemo, useCallback } from 'react';
import type { NodeContentProps, ConnectingInfo } from '../types';
import { NodeType } from '../types';
import { useLanguage } from '../localization';
import { getMinNodeSize, getEmptyValueForNodeType, getInputHandleType } from '../utils/nodeUtils';
import { useAppContext } from '../contexts/AppContext';
import { NodeHeader } from './node-ui/NodeHeader';
import { InputHandles, OutputHandles } from './node-ui/NodeHandles';
import { NodeContent } from './node-ui/NodeContent';
import { useNodeGestures } from '../hooks/useNodeGestures';
import { getNodeStyles, getNodeClasses, getHandleColorClass } from '../utils/nodeStyleUtils';

interface NodeViewProps extends Omit<NodeContentProps, 'onOutputHandleTouchStart' | 't' | 'getHandleColor' | 'handleCursor' | 'onSelectNode'> {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string) => void;
    onResizeMouseDown: (e: React.PointerEvent<HTMLDivElement>, nodeId: string, direction?: string) => void;
    onNodeClick: (nodeId: string) => void;
    isHovered: boolean;
    isSelected: boolean;
    onNodeMouseEnter: (nodeId: string) => void;
    onNodeMouseLeave: () => void;
    onDeleteNode: (nodeId: string) => void;
    onCutConnections: (nodeId: string) => void;
    onPasteNodeValue: (nodeId: string) => Promise<void>;
    onDuplicateNode: (nodeId: string) => void;
    onDuplicateNodeWithContent: (nodeId: string) => void;
    onToggleCollapse: (nodeId: string) => void;
    isDragOverTarget?: boolean;
    onOutputHandleTouchStart: (e: React.TouchEvent<HTMLDivElement>, nodeId: string, handleId?: string) => void;
    onInputHandleMouseDown?: (e: React.MouseEvent<HTMLDivElement>, nodeId: string, handleId?: string) => void;
    onInputHandleTouchStart?: (e: React.TouchEvent<HTMLDivElement>, nodeId: string, handleId?: string) => void;
    isExecuting?: boolean;
    isDragging?: boolean;
    isGlobalProcessing: boolean;
    isInstantCloseEnabled?: boolean;
    isProxy?: boolean;
    activeTool: string;
    connectingInfo?: ConnectingInfo | null;
    connectionTarget?: { nodeId: string; handleId?: string } | null;
    isFocused?: boolean;
    onToggleNodePin?: (nodeId: string) => void;
    // Group Layering Props
    isGrouped?: boolean;
    isGroupDragging?: boolean;
}

const NodeViewComponent: React.FC<NodeViewProps> = (props) => {
    const { node, activeTool, onOutputHandleMouseDown, onOutputHandleTouchStart, onInputHandleMouseDown, onInputHandleTouchStart, isHovered, isSelected, onNodeMouseEnter, onNodeMouseLeave, onDeleteNode, connectingInfo, connectionTarget, onDetachNodeFromGroup, isGlobalProcessing, isProxy, isFocused, isGrouped, isGroupDragging } = props;

    const context = useAppContext();
    // Default isHoverHighlightEnabled and isBringToFrontOnHoverEnabled to true if context is not yet available, but prefer context value
    const { handleOpenNodeContextMenu, requestDeleteNodes, handleUndockNode, selectNode, nodeAnimationMode, connectedInputTypes, handleClearNodeNewFlag, isHoverHighlightEnabled: contextHoverHighlightEnabled, isBringToFrontOnHoverEnabled: contextBringToFrontOnHoverEnabled } = context || {};
    const isHoverHighlightEnabled = contextHoverHighlightEnabled === undefined ? true : contextHoverHighlightEnabled;
    const isBringToFrontOnHoverEnabled = contextBringToFrontOnHoverEnabled === undefined ? true : contextBringToFrontOnHoverEnabled;
    const { t } = useLanguage();

    const isRerouteDot = node.type === NodeType.REROUTE_DOT;
    const isMediaViewer = node.type === NodeType.MEDIA_VIEWER;

    const { rerouteType, rerouteDirection } = React.useMemo(() => {
        if (!isRerouteDot) return { rerouteType: null, rerouteDirection: 'LR' };
        try {
            const parsed = JSON.parse(node.value || '{}');
            return {
                rerouteType: parsed.type || null,
                rerouteDirection: parsed.direction || 'LR'
            };
        } catch {
            return { rerouteType: null, rerouteDirection: 'LR' };
        }
    }, [isRerouteDot, node.value]);

    const minSize = useMemo(() => getMinNodeSize(node.type), [node.type]);
    const isDockedWindow = !!node.dockState && !isProxy;
    const isProxyMode = !!node.dockState && !!isProxy;
    const isDetachedGhost = Boolean(node.isDetachedWindow);

    // Get override type for generic inputs like DataReader
    const connectedInputType = connectedInputTypes?.get(node.id);

    // --- Interaction Logic Hook ---
    const gestures = useNodeGestures({
        node,
        onMouseDown: props.onMouseDown,
        onTouchStart: props.onTouchStart,
        onResizeMouseDown: props.onResizeMouseDown,
        onNodeClick: props.onNodeClick,
        onDetachNodeFromGroup,
        activeTool,
        connectingInfo,
        isDockedWindow,
        isProxyMode,
        isDetachedGhost
    });

    // --- Styles & Classes ---
    // Pass group context to style generator
    const styles = getNodeStyles(node, isDockedWindow, isProxyMode, isRerouteDot, isSelected, isHovered, minSize, !!isFocused, isGrouped, isGroupDragging, isBringToFrontOnHoverEnabled, isDetachedGhost);
    const classes = getNodeClasses(
        node,
        isDockedWindow,
        isProxyMode,
        isRerouteDot,
        isSelected,
        isHovered,
        !!props.isDragging,
        !!props.isDragOverTarget,
        connectionTarget?.nodeId === node.id,
        !!props.isExecuting,
        rerouteType,
        !!isFocused,
        isHoverHighlightEnabled // Pass current setting
    );
    const handleCursor = activeTool === 'edit' ? (isDockedWindow ? 'default' : 'crosshair') : 'inherit';
    const nodeCursor = activeTool === 'cutter' ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>') 12 12, auto` : (isDockedWindow ? 'default' : 'default');

    const handleRequestDelete = (e: React.MouseEvent<any>) => {
        e.stopPropagation();
        if (e.shiftKey || props.isInstantCloseEnabled) {
            onDeleteNode(node.id);
            return;
        }
        if (requestDeleteNodes) {
            requestDeleteNodes([node.id], { x: e.clientX, y: e.clientY });
        } else {
            onDeleteNode(node.id);
        }
    };

    const handleRerouteDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRerouteDot && props.onValueChange) {
            try {
                const parsed = JSON.parse(node.value || '{}');
                const newDir = parsed.direction === 'RL' ? 'LR' : 'RL';
                props.onValueChange(node.id, JSON.stringify({ ...parsed, direction: newDir }));
            } catch { }
        }
    };

    // Handler to clear the "New Node" animation flag on any interaction
    const handleInteraction = useCallback(() => {
        if (node.isNewlyCreated && handleClearNodeNewFlag) {
            handleClearNodeNewFlag(node.id);
        }
    }, [node.isNewlyCreated, node.id, handleClearNodeNewFlag]);

    const getHandleColor = React.useCallback((type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null, handleId?: string): string => {
        // Logic moved to utility, but wrapper kept for context closure
        return getHandleColorClass(type, handleId, node, isRerouteDot, rerouteType, isHovered, connectingInfo, connectionTarget);
    }, [node, isRerouteDot, rerouteType, connectingInfo, isHovered, connectionTarget]);

    const contentProps: NodeContentProps = useMemo(() => ({
        ...props,
        onOutputHandleTouchStart: onOutputHandleTouchStart,
        onSaveGeneratedCharacterToCatalog: props.onSaveGeneratedCharacterToCatalog,
        t,
        getHandleColor,
        handleCursor,
        isGlobalProcessing,
        onSelectNode: () => selectNode && selectNode(node.id)
    }), [props, onOutputHandleTouchStart, t, getHandleColor, handleCursor, isGlobalProcessing, selectNode, node.id]);

    // --- Character Card Image Toggle Logic ---
    const allImagesCollapsed = useMemo(() => {
        if (node.type !== NodeType.CHARACTER_CARD) return false;
        try {
            // Parse value safely
            const val = JSON.parse(node.value || '[]');
            const chars = Array.isArray(val) ? val : [val];
            if (chars.length === 0) return false;
            // Return true only if ALL are collapsed
            return chars.every((c: any) => c.isImageCollapsed);
        } catch { return false; }
    }, [node.value, node.type]);

    const handleToggleCharacterImages = useCallback(() => {
        if (node.type !== NodeType.CHARACTER_CARD) return;
        try {
            const val = JSON.parse(node.value || '[]');
            const chars = Array.isArray(val) ? val : [val];

            // Determine target state:
            // If all are collapsed -> Expand All (false)
            // If any is expanded -> Collapse All (true)
            const targetState = !allImagesCollapsed;

            const newChars = chars.map((c: any) => ({
                ...c,
                isImageCollapsed: targetState
            }));

            props.onValueChange(node.id, JSON.stringify(newChars));
        } catch (e) {
            console.error("Failed to toggle images", e);
        }
    }, [node.value, node.type, node.id, props.onValueChange, allImagesCollapsed]);


    // --- Render Detached Mini-App Ghost ---
    if (isDetachedGhost) {
        return (
            <div
                className={`node-view absolute flex items-center justify-between rounded-xl border-2 border-dashed border-cyan-500/90 bg-gray-950/85 backdrop-blur-md text-gray-200 px-3 py-2 shadow-[0_0_18px_rgba(6,182,212,0.35)] select-none cursor-move transition-[border-color,box-shadow] duration-200 ${
                    isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/50 text-white shadow-[0_0_22px_rgba(6,182,212,0.55)]' : 'hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.45)]'
                }`}
                style={{ ...styles, zIndex: isSelected ? 15 : 11 }}
                onMouseUp={gestures.handleMouseUp}
                onMouseEnter={() => onNodeMouseEnter(node.id)}
                onMouseLeave={onNodeMouseLeave}
                onMouseDown={gestures.handleDragMouseDown}
                onTouchStart={gestures.handleDragTouchStart}
                onContextMenu={(e) => { if (handleOpenNodeContextMenu) handleOpenNodeContextMenu(e, node.id); }}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* Left: Pulse indicator and node title */}
                <div className="flex items-center space-x-2 truncate max-w-[130px] pointer-events-none">
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.9)]"></span>
                    </span>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-gray-100 truncate leading-tight">{node.title}</span>
                        <span className="text-[9px] font-semibold text-cyan-400 tracking-wider uppercase">
                            {t('node.miniAppBadge') || 'Mini App'}
                        </span>
                    </div>
                </div>

                {/* Right: Return to Canvas Action */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (props.handleReattachNodeFromMiniApp) {
                            props.handleReattachNodeFromMiniApp(node.id);
                        }
                    }}
                    className="ml-2 text-xs text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-900 px-2 py-1 rounded-md transition-all flex items-center gap-1 border border-cyan-700/80 hover:border-cyan-400 shadow-sm z-10 flex-shrink-0 cursor-pointer"
                    title={t('node.action.reattachToCanvas') || 'Вернуть ноду обратно на холст'}
                >
                    <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span className="text-[10px] font-semibold whitespace-nowrap">{t('node.action.reattachShort') || 'Вернуть'}</span>
                </button>

                <InputHandles node={node} getHandleColor={getHandleColor} handleCursor={handleCursor} t={t} isHovered={isHovered} isCollapsed={true} isProxy={true} connectedInputType={connectedInputType} onInputHandleMouseDown={onInputHandleMouseDown} onInputHandleTouchStart={onInputHandleTouchStart} />
                <OutputHandles node={node} getHandleColor={getHandleColor} handleCursor={handleCursor} onOutputHandleMouseDown={onOutputHandleMouseDown} onOutputHandleTouchStart={onOutputHandleTouchStart} t={t} isHovered={isHovered} isCollapsed={true} isProxy={true} />
            </div>
        );
    }

    // --- Render Classic Dock Proxy ---
    if (isProxyMode) {
        return (
            <div
                className={`node-view absolute flex items-center justify-center rounded-lg border-2 border-gray-600 bg-gray-800 text-gray-400 px-4 py-2 shadow-lg select-none cursor-move ${isSelected ? 'border-node-selected text-accent-text' : ''}`}
                style={{ ...styles, zIndex: isSelected ? 12 : 10 }}
                onMouseUp={gestures.handleMouseUp}
                onMouseEnter={() => onNodeMouseEnter(node.id)}
                onMouseLeave={onNodeMouseLeave}
                onMouseDown={gestures.handleDragMouseDown}
                onTouchStart={gestures.handleDragTouchStart}
                onContextMenu={(e) => { if (handleOpenNodeContextMenu) handleOpenNodeContextMenu(e, node.id); }}
                onWheel={(e) => e.stopPropagation()}
            >
                <span className="font-bold text-xs truncate max-w-[140px] pointer-events-none">{node.title}</span>
                <InputHandles node={node} getHandleColor={getHandleColor} handleCursor={handleCursor} t={t} isHovered={isHovered} isCollapsed={true} isProxy={true} connectedInputType={connectedInputType} onInputHandleMouseDown={onInputHandleMouseDown} onInputHandleTouchStart={onInputHandleTouchStart} />
                <OutputHandles node={node} getHandleColor={getHandleColor} handleCursor={handleCursor} onOutputHandleMouseDown={onOutputHandleMouseDown} onOutputHandleTouchStart={onOutputHandleTouchStart} t={t} isHovered={isHovered} isCollapsed={true} isProxy={true} />
            </div>
        );
    }

    // --- Render Main Node ---
    const dockMode = node.dockState?.mode;

    // Pulse Animation Class
    const animationClass = node.isNewlyCreated && nodeAnimationMode === 'pulse' ? 'node-pulse-animation' : '';

    return (
        <div
            className={`${classes.container} ${animationClass}`}
            style={{ ...styles, cursor: isRerouteDot && !isDockedWindow ? 'move' : nodeCursor }}
            onMouseUp={gestures.handleMouseUp}
            onMouseEnter={() => onNodeMouseEnter(node.id)}
            onMouseLeave={onNodeMouseLeave}
            onMouseDown={isRerouteDot ? gestures.handleDragMouseDown : undefined}
            // Attach interaction handler to clear animation flag
            onMouseDownCapture={handleInteraction}
            onTouchStartCapture={handleInteraction}
            onTouchStart={isRerouteDot ? gestures.handleDragTouchStart : undefined}
            // Prevent canvas zoom when scrolling inside node
            onWheel={(e) => e.stopPropagation()}
        >
            {/* Blade Runner Animation Ring */}
            {node.isNewlyCreated && nodeAnimationMode === 'blade-runner' && !isDockedWindow && !isProxyMode && <div className="new-node-ring" />}

            {/* Reroute Dot Content Overlay for Rotation */}
            {isRerouteDot && (
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300"
                    style={{ transform: rerouteDirection === 'RL' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </div>
            )}

            <NodeHeader
                node={node}
                isDockedWindow={isDockedWindow}
                isRerouteDot={isRerouteDot}
                headerBgClass={classes.header}
                onMouseDown={gestures.handleHeaderMouseDown}
                onTouchStart={!isRerouteDot && !isDockedWindow ? gestures.handleDragTouchStart : undefined}
                onMouseUp={gestures.handleHeaderMouseUp}
                onDoubleClick={isRerouteDot ? handleRerouteDoubleClick : (e) => gestures.handleHeaderDoubleClick(e, props.onToggleCollapse)}
                onToggleCollapse={props.onToggleCollapse}
                onRenameNode={props.onRenameNode}
                onDeleteNode={onDeleteNode}
                onCutConnections={props.onCutConnections}
                onDuplicateNode={props.onDuplicateNode}
                onDuplicateNodeWithContent={props.onDuplicateNodeWithContent}
                onCopyNodeValue={props.onCopyNodeValue}
                onPasteNodeValue={props.onPasteNodeValue}
                onPasteImage={props.onPasteImage}
                onDownloadImage={props.onDownloadImage}
                onRefreshImageEditor={props.onRefreshImageEditor}
                onRefreshChat={props.onRefreshChat}
                onValueChange={props.onValueChange}
                clearImagesForNodeFromCache={props.clearImagesForNodeFromCache}
                addToast={props.addToast}
                getEmptyValueForNodeType={getEmptyValueForNodeType}
                onSaveSequenceToCatalog={props.onSaveSequenceToCatalog}
                onSaveScriptToDisk={props.onSaveScriptToDisk}
                onSaveCharacterToCatalog={props.onSaveCharacterToCatalog}
                onSaveCharacterCard={props.onSaveCharacterCard}
                handleUndockNode={handleUndockNode}
                handleOpenNodeContextMenu={handleOpenNodeContextMenu}
                handleRequestDelete={handleRequestDelete}
                handleDetachNodeFromGroup={onDetachNodeFromGroup}
                handleDetachNodeToMiniApp={props.handleDetachNodeToMiniApp}
                handleReattachNodeFromMiniApp={props.handleReattachNodeFromMiniApp}
                isInstantCloseEnabled={props.isInstantCloseEnabled}
                onToggleCharacterImages={handleToggleCharacterImages}
                allImagesCollapsed={allImagesCollapsed}
            />

            {/* Render Node Content */}
            {/* For Media Viewer, we maintain mount but hide it to preserve playback state */}
            {isMediaViewer ? (
                <div
                    className={`p-3 flex-grow min-h-0 flex flex-col h-full ${node.isCollapsed && !isDockedWindow ? 'hidden' : 'flex'}`}
                    onMouseDown={(e) => { e.stopPropagation(); if (selectNode) selectNode(node.id); }}
                >
                    <NodeContent node={node} contentProps={contentProps} />
                </div>
            ) : (
                !isRerouteDot && (!node.isCollapsed || isDockedWindow) && (
                    <div className="p-3 flex-grow min-h-0 flex flex-col h-full" onMouseDown={(e) => { e.stopPropagation(); if (selectNode) selectNode(node.id); }}>
                        <NodeContent node={node} contentProps={contentProps} />
                    </div>
                )
            )}

            {!isDockedWindow && !isFocused && <InputHandles node={node} getHandleColor={getHandleColor} handleCursor={handleCursor} onInputHandleMouseDown={onInputHandleMouseDown} onInputHandleTouchStart={onInputHandleTouchStart} t={t} isHovered={isHovered} isCollapsed={node.isCollapsed} isProxy={isProxyMode} connectedInputType={connectedInputType} />}
            {!isDockedWindow && !isFocused && <OutputHandles node={node} getHandleColor={getHandleColor} handleCursor={handleCursor} onOutputHandleMouseDown={onOutputHandleMouseDown} onOutputHandleTouchStart={onOutputHandleTouchStart} t={t} isHovered={isHovered} isCollapsed={node.isCollapsed} isProxy={isProxyMode} />}

            {/* Resizer Logic - Switched to onPointerDown */}
            {!isRerouteDot && !node.isCollapsed && (
                !isDockedWindow && !isFocused ? (
                    <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group" onPointerDown={(e) => gestures.handleResizeMouseDown(e, undefined)}><svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-gray-700 group-hover:text-accent-text transition-colors"><path d="M12 6L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M14 10L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div>
                ) : (
                    isDockedWindow && !isFocused && (
                        <>
                            {/* Edges */}
                            <div onPointerDown={(e) => gestures.handleResizeMouseDown(e, 'n')} className="absolute top-0 left-0 w-full h-2 cursor-ns-resize z-20" />
                            <div onPointerDown={(e) => gestures.handleResizeMouseDown(e, 's')} className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize z-20" />
                            <div onPointerDown={(e) => gestures.handleResizeMouseDown(e, 'w')} className="absolute top-0 left-0 w-2 h-full cursor-ew-resize z-20" />
                            <div onPointerDown={(e) => gestures.handleResizeMouseDown(e, 'e')} className="absolute top-0 right-0 w-2 h-full cursor-ew-resize z-20" />

                            {/* Corners */}
                            <div onPointerDown={(e) => gestures.handleResizeMouseDown(e, 'nw')} className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-30" />
                            <div onPointerDown={(e) => gestures.handleResizeMouseDown(e, 'ne')} className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-30" />
                            <div onPointerDown={(e) => gestures.handleResizeMouseDown(e, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-30" />
                            <div onPointerDown={(e) => gestures.handleResizeMouseDown(e, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30" />
                        </>
                    )
                )
            )}
        </div>
    );
};
export const NodeView = React.memo(NodeViewComponent);