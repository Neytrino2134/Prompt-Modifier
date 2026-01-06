
import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { NodeView } from './NodeView';
import ConnectionView from './ConnectionView';
import GroupView from './GroupView';
import ViewControlsToolbar from './ViewControlsToolbar';
import ControlsToolbar from './ControlsToolbar';
import Toolbar from './Toolbar';
import { 
    UndoIcon, RedoIcon, AlignLeftIcon, AlignCenterXIcon, AlignRightIcon, 
    AlignTopIcon, AlignCenterYIcon, AlignBottomIcon, 
    DistributeHorizontalIcon, DistributeVerticalIcon, GroupIcon,
    EyeIcon, EyeOffIcon
} from './icons/AppIcons';
import { useLanguage } from '../localization';
import { NodeType } from '../types';
import { Tooltip } from './Tooltip';
import { COLLAPSED_NODE_HEIGHT } from '../utils/nodeUtils';

// Helper wrapper for tooltips
const TopTooltipWrapper: React.FC<{ title: string; children: React.ReactNode; align?: 'center' | 'left' | 'right' }> = ({ title, children, align = 'center' }) => {
  const positionClasses = align === 'left'
    ? 'left-0 bottom-full mb-2 origin-bottom-left'
    : 'left-1/2 -translate-x-1/2 bottom-full mb-2 origin-bottom';

  return (
      <div className="relative group flex items-center justify-center">
          {children}
          <div
            className={`absolute px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 transition-opacity duration-200 ease-in-out transform ${positionClasses} opacity-0 pointer-events-none group-hover:opacity-100`}
            role="tooltip"
          >
            {title}
          </div>
      </div>
  );
};

const CanvasLayer: React.FC = () => {
    const context = useAppContext();
    const { t } = useLanguage();
    const [isViewControlsCollapsed, setIsViewControlsCollapsed] = useState(false);
    const [isVerticalViewControls, setIsVerticalViewControls] = useState(false);
    const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
    const [isToolbarCompact, setIsToolbarCompact] = useState(false);
    const [tongueHeight, setTongueHeight] = useState(0);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    
    const tongueRef = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            setTongueHeight(node.getBoundingClientRect().height);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
          setWindowSize({ width: window.innerWidth, height: window.innerHeight });
          const TOOLBAR_ESTIMATED_WIDTH = 800;
          const SIDE_MARGIN_THRESHOLD = 450;
          const threshold = TOOLBAR_ESTIMATED_WIDTH + (SIDE_MARGIN_THRESHOLD * 2);
          setIsVerticalViewControls(window.innerWidth < threshold);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!context) return null;

    const {
        nodes, connections, groups, viewTransform,
        handleCanvasMouseDown, handleCanvasContextMenu, handleCanvasTouchStart, handleCanvasTouchMove, handleCanvasTouchEnd,
        updatePointerPosition, handleWheel, handleCanvasDoubleClick,
        handleDrop, handleDragOver, handleDragEnter, handleDragLeave,
        getCanvasCursor, setCanvasRef,
        dockHoverMode, handleDockNode, handleUndockNode, focusedNodeId,
        selectedNodeIds, hoveredNodeId, setHoveredNodeId, dragOverNodeId,
        draggingInfo, connectingInfo, connectionTarget, spawnLine,
        activeTool, setActiveTool, effectiveTool,
        deleteNodeAndConnections, removeConnectionsByNodeId, copyNodeValue, pasteNodeValue,
        pasteImageToNode, handleDownloadImage, handleDuplicateNode, handleDuplicateNodeWithContent,
        handleToggleNodeCollapse, handleDetachNodeFromGroup, handleStartConnection, handleStartConnectionTouch,
        handleNodeCutConnections, handleNodeTouchStart, handleGroupMouseDown, handleGroupTouchStart,
        handleRemoveGroup, handleSaveGroupToCatalog, handleSaveGroupToDisk, copyGroup, duplicateGroup,
        hoveredGroupIdForDrop, handleGroupSelection, handleAlignNodes,
        undoPosition, redoPosition, canUndo, canRedo,
        handleValueChange, handleEnhance, isEnhancing, handleEnhanceVideo, isEnhancingVideo,
        onSanitize, isSanitizing, handleAnalyzePrompt, isAnalyzing, handleAnalyzeCharacter, isAnalyzingCharacter,
        handleAnalyzeImage, isAnalyzingImage, handleGenerateImage, isGeneratingImage,
        handleExecuteChain, isExecutingChain, stopChainExecution, executingNodeId,
        handleEditImage, isEditingImage, handleSendMessage, isChatting, handleTranslate, isTranslating,
        handleGenerateScript, isGeneratingScript, triggerLoadScriptFile, handleGenerateCharacters, isGeneratingCharacters,
        handleGenerateVideo, isGeneratingVideo, handleGenerateImageSequence, onGenerateSelectedFrames,
        isGeneratingSequence, handleStopImageSequence, isStoppingSequence, handleRegenerateFrame,
        onDownloadImageFromUrl, onCopyImageToClipboard, triggerLoadImageSequenceFile, triggerLoadPromptSequenceFile,
        handleProcessImage, isProcessingImage, handleSetImageEditorOutputToInput, connectedInputs, connectedImageSources,
        connectedCharacterData, libraryItems, handleProcessChainForward, handleSaveCharacterCard, triggerLoadCharacterCard,
        handleDetachAndPasteConcept, onDetachImageToNode, onSaveCharacterToCatalog, onSaveScriptToCatalog,
        onSaveSequenceToCatalog, setError, setImageViewer, addToast, getFullSizeImage, setFullSizeImage,
        clearImagesForNodeFromCache, onTranslateScript, isTranslatingScript, onReadData, getUpstreamNodeValues,
        onRefreshUpstreamData, onModifyPromptSequence, isModifyingPromptSequence, onSavePromptToLibrary, onSaveToLibrary,
        onGenerateCharacterImage, isGeneratingCharacterImage, onDetachCharacter, onStopGeneration, isStopping,
        clearSelectionsSignal, onSaveScriptToDisk, onSaveMediaToDisk, onSaveGeneratedCharacterToCatalog, isGlobalProcessing,
        isInstantCloseEnabled, onImageToText,
        onUpdateCharacterDescription, isUpdatingDescription,
        isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle, handleZoomChange, scaleToSliderValue, sliderValueToScale,
        handleClearCanvas, isSmartGuidesEnabled, setIsSmartGuidesEnabled, resetView, smartGuides, selectionRect, groupButtonPosition,
        getConnectionPoints, removeConnectionById, handleSplitConnection,
        onRefreshChat, handleRefreshImageEditor, handleAutoDownloadChange, handleModelChange, handleResolutionChange, handleAspectRatioChange,
        onRenameCharacter, onRenameScript, onRenameSequence, handleRenameNode, setRenameInfo, handleToggleNodePin,
        onAddNode, handleOpenQuickSearch, handleToggleCatalog, handleSaveCanvas, handleLoadCanvas, handleSaveProject,
        getTransformedPoint, setSpawnLine,
        tutorialStep, advanceTutorial
    } = context;

    // --- Node Group Map for Layering ---
    // Pre-calculate which group each node belongs to for O(1) lookup during rendering
    const nodeGroupMap = useMemo(() => {
        const map = new Map<string, string>();
        groups.forEach(group => {
            group.nodeIds.forEach(nodeId => {
                map.set(nodeId, group.id);
            });
        });
        return map;
    }, [groups]);

    const activeGroupId = draggingInfo?.type === 'group' ? draggingInfo.id : null;

    // --- Virtualization Logic ---
    const visibleEntities = useMemo(() => {
        const { scale, translate } = viewTransform;
        const buffer = 300 / scale; // Buffer depends on zoom to keep consistent margin

        // Current visible area in World coordinates
        const viewport = {
            left: -translate.x / scale - buffer,
            top: -translate.y / scale - buffer,
            right: (windowSize.width - translate.x) / scale + buffer,
            bottom: (windowSize.height - translate.y) / scale + buffer
        };

        const isNodeVisible = (node: any) => {
            if (node.dockState) return true; // Docked nodes are fixed UI
            if (node.isPinned) return true; // Pinned nodes are usually critical
            if (draggingInfo?.type === 'node' && draggingInfo.offsets.has(node.id)) return true;

            const nodeHeight = node.isCollapsed ? COLLAPSED_NODE_HEIGHT : node.height;
            return (
                node.position.x < viewport.right &&
                node.position.x + node.width > viewport.left &&
                node.position.y < viewport.bottom &&
                node.position.y + nodeHeight > viewport.top
            );
        };

        const visibleNodes = nodes.filter(isNodeVisible);
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

        // Filter connections: visible if at least one end is in the visible node set
        const visibleConnections = connections.filter(conn => 
            visibleNodeIds.has(conn.fromNodeId) || visibleNodeIds.has(conn.toNodeId)
        );

        // Filter groups: visible if they intersect viewport
        const visibleGroups = groups.filter(group => (
            group.position.x < viewport.right &&
            group.position.x + group.width > viewport.left &&
            group.position.y < viewport.bottom &&
            group.position.y + group.height > viewport.top
        ));

        return { visibleNodes, visibleConnections, visibleGroups };
    }, [nodes, connections, groups, viewTransform, windowSize, draggingInfo]);

    // Common props for NodeView
    const getNodeViewProps = (node: any) => {
        const groupId = nodeGroupMap.get(node.id);
        const isGrouped = !!groupId;
        const isGroupDragging = !!activeGroupId && groupId === activeGroupId;

        return {
            key: node.id,
            node: node,
            isGrouped: isGrouped,
            isGroupDragging: isGroupDragging,
            onMouseDown: (e: any) => context.handleNodeMouseDown(e, node.id),
            onTouchStart: handleNodeTouchStart,
            onResizeMouseDown: context.handleNodeResizeMouseDown,
            onValueChange: handleValueChange,
            onEnhance: handleEnhance,
            isEnhancing: isEnhancing === node.id,
            onEnhanceVideo: handleEnhanceVideo,
            isEnhancingVideo: isEnhancingVideo === node.id,
            onSanitize: onSanitize,
            isSanitizing: isSanitizing === node.id,
            onAnalyze: handleAnalyzePrompt,
            isAnalyzing: isAnalyzing === node.id,
            onAnalyzeCharacter: handleAnalyzeCharacter,
            isAnalyzingCharacter: isAnalyzingCharacter === node.id,
            onAnalyzeImage: handleAnalyzeImage,
            isAnalyzingImage: isAnalyzingImage === node.id,
            onImageToText: onImageToText,
            onGenerateImage: handleGenerateImage,
            isGeneratingImage: isGeneratingImage === node.id,
            onExecuteChain: handleExecuteChain,
            isExecutingChain: isExecutingChain,
            isExecuting: executingNodeId === node.id,
            onStopChainExecution: stopChainExecution,
            onEditImage: handleEditImage,
            isEditingImage: isEditingImage,
            onSendMessage: handleSendMessage,
            isChatting: isChatting === node.id,
            onTranslate: handleTranslate,
            isTranslating: isTranslating === node.id,
            onGenerateScript: handleGenerateScript,
            isGeneratingScript: isGeneratingScript === node.id,
            onLoadScriptFile: triggerLoadScriptFile,
            onGenerateCharacters: handleGenerateCharacters,
            isGeneratingCharacters: isGeneratingCharacters === node.id,
            onGenerateVideo: handleGenerateVideo,
            isGeneratingVideo: isGeneratingVideo === node.id,
            onGenerateImageSequence: handleGenerateImageSequence,
            onGenerateSelectedFrames: onGenerateSelectedFrames,
            isGeneratingSequence: isGeneratingSequence === node.id,
            onStopImageSequence: handleStopImageSequence,
            isStoppingSequence: isStoppingSequence,
            onRegenerateFrame: handleRegenerateFrame,
            onDownloadImageFromUrl: onDownloadImageFromUrl,
            onCopyImageToClipboard: onCopyImageToClipboard,
            onLoadImageSequenceFile: triggerLoadImageSequenceFile,
            onLoadPromptSequenceFile: triggerLoadPromptSequenceFile,
            onProcessImage: handleProcessImage,
            isProcessingImage: isProcessingImage === node.id,
            activeTool: effectiveTool,
            onOutputHandleMouseDown: handleStartConnection,
            onOutputHandleTouchStart: handleStartConnectionTouch,
            onNodeClick: handleNodeCutConnections,
            isHovered: hoveredNodeId === node.id,
            isSelected: selectedNodeIds.includes(node.id),
            onNodeMouseEnter: () => setHoveredNodeId(node.id),
            onNodeMouseLeave: () => setHoveredNodeId(null),
            onDeleteNode: deleteNodeAndConnections,
            onCutConnections: removeConnectionsByNodeId,
            onCopyNodeValue: copyNodeValue,
            onPasteNodeValue: pasteNodeValue,
            onPasteImage: pasteImageToNode,
            onDownloadImage: handleDownloadImage,
            onDuplicateNode: handleDuplicateNode,
            onDuplicateNodeWithContent: handleDuplicateNodeWithContent,
            onAspectRatioChange: handleAspectRatioChange,
            onResolutionChange: handleResolutionChange,
            onModelChange: handleModelChange,
            onAutoDownloadChange: handleAutoDownloadChange,
            onRefreshChat: onRefreshChat,
            onRefreshImageEditor: handleRefreshImageEditor,
            connectedInputs: connectedInputs.get(node.id),
            onSetImageEditorOutputToInput: handleSetImageEditorOutputToInput,
            connectingInfo: connectingInfo,
            connectionTarget: connectionTarget,
            connectedImageSources: connectedImageSources.get(node.id),
            connectedCharacterData: connectedCharacterData.get(node.id),
            libraryItems: libraryItems,
            onToggleCollapse: handleToggleNodeCollapse,
            deselectAllNodes: context.deselectAllNodes,
            isDragOverTarget: dragOverNodeId === node.id,
            onProcessChainForward: handleProcessChainForward,
            onSaveCharacterCard: handleSaveCharacterCard,
            onLoadCharacterCard: triggerLoadCharacterCard,
            onDetachAndPasteConcept: handleDetachAndPasteConcept,
            onDetachImageToNode: onDetachImageToNode,
            onSaveCharacterToCatalog: onSaveCharacterToCatalog,
            onSaveScriptToCatalog: onSaveScriptToCatalog,
            onSaveSequenceToCatalog: onSaveSequenceToCatalog,
            setError: setError,
            setImageViewer: setImageViewer,
            addToast: addToast,
            getFullSizeImage: getFullSizeImage,
            setFullSizeImage: setFullSizeImage,
            clearImagesForNodeFromCache: clearImagesForNodeFromCache,
            onTranslateScript: onTranslateScript,
            isTranslatingScript: isTranslatingScript,
            onReadData: onReadData,
            getUpstreamNodeValues: getUpstreamNodeValues,
            onRefreshUpstreamData: onRefreshUpstreamData,
            onModifyPromptSequence: onModifyPromptSequence,
            isModifyingPromptSequence: isModifyingPromptSequence === node.id,
            onDetachNodeFromGroup: handleDetachNodeFromGroup,
            viewTransform: (node.type === NodeType.IMAGE_EDITOR || node.type === NodeType.PROMPT_SEQUENCE_EDITOR || node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) ? viewTransform : undefined,
            onSavePromptToLibrary: onSavePromptToLibrary,
            onSaveToLibrary: onSaveToLibrary,
            onRenameNode: (id: string, title: string) => setRenameInfo({ type: 'node', id, currentTitle: title }),
            onGenerateCharacterImage: onGenerateCharacterImage,
            isGeneratingCharacterImage: isGeneratingCharacterImage,
            onDetachCharacter: onDetachCharacter,
            onStopGeneration: onStopGeneration,
            isStopping: isStopping,
            clearSelectionsSignal: clearSelectionsSignal,
            onSaveScriptToDisk: onSaveScriptToDisk,
            onSaveMediaToDisk: onSaveMediaToDisk,
            onSaveGeneratedCharacterToCatalog: onSaveGeneratedCharacterToCatalog,
            isDragging: draggingInfo?.type === 'node' && draggingInfo.offsets.has(node.id),
            isGlobalProcessing: isGlobalProcessing,
            isInstantCloseEnabled: isInstantCloseEnabled,
            handleDockNode: handleDockNode,
            handleUndockNode: handleUndockNode,
            onToggleNodePin: handleToggleNodePin,
            onUpdateCharacterDescription: onUpdateCharacterDescription,
            isUpdatingDescription: isUpdatingDescription
        };
    };
    
    // Layering
    const { dockedNodes } = useMemo(() => {
        const docked = nodes.filter(n => n.dockState);
        return { dockedNodes: docked };
    }, [nodes]);
    
    const focusedNode = focusedNodeId ? nodes.find(n => n.id === focusedNodeId) : null;

    const handleAddNodeFromToolbar = (type: NodeType, e: React.MouseEvent) => {
        const targetScreenPos = { x: window.innerWidth / 2, y: window.innerHeight * 0.25 };
        const targetWorldPos = getTransformedPoint(targetScreenPos);
        onAddNode(type, targetWorldPos);

        const startScreen = e ? { x: e.clientX, y: e.clientY } : { x: window.innerWidth / 2, y: window.innerHeight - 80 };
        const startWorld = getTransformedPoint(startScreen);
        
        setSpawnLine({ start: startWorld, end: targetWorldPos, fading: false });
        setTimeout(() => {
            setSpawnLine(prev => prev ? { ...prev, fading: true } : null);
            setTimeout(() => setSpawnLine(null), 500);
        }, 100);
    };

    const getDragLineColor = (type: string | null | undefined) => {
        switch (type) {
            case 'text': return 'var(--color-connection-text)';
            case 'image': return 'var(--color-connection-image)';
            case 'character_data': return '#ec4899';
            case 'video': return '#6366f1';
            case 'audio': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    return (
        <div 
            id="app-container" 
            className={`relative w-full h-full overflow-hidden select-none ${focusedNodeId ? 'bg-gray-700' : ''}`}
            onMouseDown={handleCanvasMouseDown}
            onContextMenu={handleCanvasContextMenu}
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            onMouseMove={updatePointerPosition}
            onWheel={handleWheel}
            onDoubleClick={handleCanvasDoubleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            style={{ cursor: getCanvasCursor() }}
        >
            {!focusedNodeId && <ControlsToolbar activeTool={effectiveTool} onToolChange={setActiveTool} />}
            
            {!focusedNodeId && dockedNodes.map((node: any) => (
                <NodeView key={`${node.id}-docked`} node={node} {...getNodeViewProps(node)} />
            ))}

            {!focusedNodeId && (
                <div id="canvas-transform-layer" style={{ width: '1px', height: '1px', transform: `translate(${viewTransform.translate.x}px, ${viewTransform.translate.y}px) scale(${viewTransform.scale})`, transformOrigin: '0 0' }}>
                    
                    <div className="absolute top-0 left-0 w-0 h-0 overflow-visible pointer-events-none z-0">
                        <div className="absolute top-0 left-[-50000px] w-[100000px] h-[1px] bg-cyan-900/30 -translate-y-1/2"></div>
                        <div className="absolute left-0 top-[-50000px] w-[1px] h-[100000px] bg-cyan-900/30 -translate-x-1/2"></div>
                        <div className="absolute top-0 left-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                             <div className="absolute w-3 h-[2px] bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]"></div>
                             <div className="absolute h-3 w-[2px] bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]"></div>
                        </div>
                    </div>

                    {selectionRect && (
                        <div className="absolute border-2 border-dashed border-cyan-400 bg-cyan-400/20 pointer-events-none" 
                             style={{ left: Math.min(selectionRect.start.x, selectionRect.end.x), top: Math.min(selectionRect.start.y, selectionRect.end.y), width: Math.abs(selectionRect.start.x - selectionRect.end.x), height: Math.abs(selectionRect.start.y - selectionRect.end.y), zIndex: 100 }} />
                    )}

                    {groupButtonPosition && (
                      <div 
                          className="absolute z-20 flex items-center gap-2 -translate-x-1/2" 
                          style={{ left: groupButtonPosition.x, top: groupButtonPosition.y }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                      >
                          <Tooltip content={t('hotkeys.tools.group')} position="top">
                              <button onClick={handleGroupSelection} className="px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-all duration-200 shadow-lg flex items-center space-x-2 whitespace-nowrap">
                                  <GroupIcon />
                                  <span>{t('group.button.create', { count: selectedNodeIds.length })}</span>
                              </button>
                          </Tooltip>
                          
                           <div className="flex bg-gray-800/90 backdrop-blur-md rounded-lg shadow-lg p-1 space-x-1 border border-gray-700">
                                <div className="flex items-center space-x-1 pr-1 border-r border-gray-600 mr-1">
                                    <Tooltip content={t('contextMenu.undoPosition')} position="top">
                                        <button onClick={() => undoPosition && undoPosition(nodes)} disabled={!canUndo} className={`p-1.5 rounded transition-colors ${!canUndo ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                                            <UndoIcon />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={t('contextMenu.redoPosition')} position="top">
                                        <button onClick={() => redoPosition && redoPosition(nodes)} disabled={!canRedo} className={`p-1.5 rounded transition-colors ${!canRedo ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                                            <RedoIcon />
                                        </button>
                                    </Tooltip>
                                </div>
                                <Tooltip content={t('contextMenu.align.left')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'left')} className="p-1.5 hover:bg-cyan-600 rounded text-gray-300 hover:text-white">
                                        <AlignLeftIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('contextMenu.align.centerX')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'center-x')} className="p-1.5 hover:bg-cyan-600 rounded text-gray-300 hover:text-white">
                                        <AlignCenterXIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('contextMenu.align.right')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'right')} className="p-1.5 hover:bg-cyan-600 rounded text-gray-300 hover:text-white">
                                        <AlignRightIcon />
                                    </button>
                                </Tooltip>
                                <div className="w-px bg-gray-600 mx-1"></div>
                                <Tooltip content={t('contextMenu.align.top')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'top')} className="p-1.5 hover:bg-cyan-600 rounded text-gray-300 hover:text-white">
                                        <AlignTopIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('contextMenu.align.centerY')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'center-y')} className="p-1.5 hover:bg-cyan-600 rounded text-gray-300 hover:text-white">
                                        <AlignCenterYIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('contextMenu.align.bottom')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'bottom')} className="p-1.5 hover:bg-cyan-600 rounded text-gray-300 hover:text-white">
                                        <AlignBottomIcon />
                                    </button>
                                </Tooltip>
                                 {selectedNodeIds.length >= 3 && (
                                    <>
                                        <div className="w-px bg-gray-600 mx-1"></div>
                                        <Tooltip content={t('contextMenu.distribute.horizontal')} position="top">
                                            <button onClick={() => handleAlignNodes(selectedNodeIds, 'distribute-horizontal')} className="p-1.5 hover:bg-cyan-600 rounded text-gray-300 hover:text-white">
                                                <DistributeHorizontalIcon />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content={t('contextMenu.distribute.vertical')} position="top">
                                            <button onClick={() => handleAlignNodes(selectedNodeIds, 'distribute-vertical')} className="p-1.5 hover:bg-cyan-600 rounded text-gray-300 hover:text-white">
                                                <DistributeVerticalIcon />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                          </div>
                      </div>
                    )}

                    {/* VIRTUALIZED CONNECTIONS */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
                        {visibleEntities.visibleConnections.map(conn => {
                            const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                            const toNode = nodes.find(n => n.id === conn.toNodeId);
                            if (!fromNode || !toNode) return null;
                            const { start, end } = getConnectionPoints(fromNode, toNode, conn);
                            return (
                                <ConnectionView 
                                    key={conn.id} 
                                    connection={conn} 
                                    fromNode={fromNode} 
                                    toNode={toNode} 
                                    start={start} 
                                    end={end} 
                                    isNodeHovered={effectiveTool === 'cutter' && (hoveredNodeId === conn.fromNodeId || hoveredNodeId === conn.toNodeId)} 
                                    activeTool={effectiveTool} 
                                    onDelete={removeConnectionById} 
                                    onSplit={handleSplitConnection} 
                                    lineStyle={lineStyle} 
                                />
                            );
                        })}
                        {connectingInfo && <path d={`M ${connectingInfo.fromPoint.x} ${connectingInfo.fromPoint.y} C ${connectingInfo.fromPoint.x + 80} ${connectingInfo.fromPoint.y}, ${context.pointerPosition.x - 80} ${context.pointerPosition.y}, ${context.pointerPosition.x} ${context.pointerPosition.y}`} stroke={getDragLineColor(connectingInfo.fromType)} strokeWidth="3" fill="none" style={{ strokeDasharray: '8 4', pointerEvents: 'none' }} />}
                        
                        {smartGuides.map((guide, index) => {
                            const isVertical = guide.type === 'vertical';
                            const x1 = isVertical ? guide.position : guide.start;
                            const y1 = isVertical ? guide.start : guide.position;
                            const x2 = isVertical ? guide.position : guide.end;
                            const y2 = isVertical ? guide.end : guide.position;
                            return <line key={`guide-${index}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ec4899" strokeWidth="1" strokeDasharray="4 2" />;
                        })}
                    </svg>

                    {/* VIRTUALIZED GROUPS */}
                    {visibleEntities.visibleGroups.map(group => (
                        <GroupView
                            key={group.id}
                            group={group}
                            onMouseDown={(e) => context.handleGroupMouseDown(e, group.id)}
                            onTouchStart={(e) => context.handleGroupTouchStart(e, group.id)}
                            onClose={handleRemoveGroup}
                            onRename={(id, title) => context.setRenameInfo({type: 'group', id, currentTitle: title})}
                            onSaveToCatalog={() => handleSaveGroupToCatalog(group.id)}
                            onSaveToDisk={() => handleSaveGroupToDisk(group.id)}
                            onCopy={copyGroup}
                            onDuplicate={duplicateGroup}
                            isHoveredForDrop={hoveredGroupIdForDrop === group.id}
                            isDragging={draggingInfo?.type === 'group' && draggingInfo.id === group.id}
                        />
                    ))}

                    {/* VIRTUALIZED NODES */}
                    {visibleEntities.visibleNodes.map((node: any) => (
                        <NodeView key={node.id} node={node} {...getNodeViewProps(node)} isProxy={!!node.dockState} />
                    ))}

                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-[15] overflow-visible">
                        {spawnLine && <path d={`M ${spawnLine.start.x} ${spawnLine.start.y} L ${spawnLine.end.x} ${spawnLine.end.y}`} stroke="#22d3ee" strokeWidth="2" fill="none" style={{ strokeDasharray: '6 4', transition: 'opacity 0.5s ease-out', opacity: spawnLine.fading ? 0 : 1 }} />}
                    </svg>
                </div>
            )}
            
            {focusedNode && (
                 <NodeView key={`${focusedNode.id}-focused`} node={focusedNode} {...getNodeViewProps(focusedNode)} isFocused={true} />
            )}

            {!focusedNodeId && (
                <div 
                    className="absolute left-1/2 z-20 flex flex-col items-center transition-transform duration-300 ease-in-out"
                    style={{ 
                        bottom: '8px', 
                        transform: isToolbarCollapsed 
                            ? `translate(-50%, calc(100% - ${tongueHeight > 0 ? tongueHeight : 32}px))` 
                            : 'translate(-50%, 0)', 
                        maxWidth: 'calc(100% - 112px)',
                        width: 'max-content' 
                    }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div 
                        ref={tongueRef}
                        className="flex items-center justify-center bg-gray-800/90 backdrop-blur-md border border-gray-600 border-b-0 rounded-t-lg shadow-sm overflow-hidden"
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsToolbarCompact(!isToolbarCompact); }}
                            className={`px-3 py-1 transition-colors flex items-center justify-center hover:bg-gray-700 focus:outline-none ${isToolbarCompact ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
                            title={isToolbarCompact ? "Expand Titles" : "Compact Mode (Hide Titles)"}
                        >
                            {isToolbarCompact ? (
                                <EyeOffIcon className="h-3.5 w-3.5" />
                            ) : (
                                <EyeIcon className="h-3.5 w-3.5" />
                            )}
                        </button>

                        <div className="w-px h-3 bg-gray-600"></div>

                        <button 
                             onClick={(e) => { e.stopPropagation(); setIsToolbarCollapsed(!isToolbarCollapsed); }}
                             className="px-3 py-1 transition-colors flex items-center justify-center hover:bg-gray-700 focus:outline-none text-gray-400 hover:text-gray-200"
                             title={isToolbarCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')}
                        >
                            <div className={`transform transition-transform duration-300 ${isToolbarCollapsed ? 'rotate-180' : 'rotate-0'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </button>
                    </div>

                    <div className="bg-gray-900/50 backdrop-blur-md border border-gray-700 rounded-lg p-1 shadow-2xl w-full">
                        <Toolbar 
                            onAddNode={handleAddNodeFromToolbar}
                            onOpenSearch={() => handleOpenQuickSearch({ x: window.innerWidth / 2, y: window.innerHeight / 2 })}
                            onToggleCatalog={handleToggleCatalog}
                            onSaveCanvas={handleSaveCanvas}
                            onLoadCanvas={handleLoadCanvas}
                            onSaveProject={handleSaveProject}
                            isDetached={false}
                            isCompact={isToolbarCompact}
                        />
                    </div>
                </div>
            )}

            {!focusedNodeId && (
                <div className="absolute bottom-2 left-2 z-20 pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
                    <div className="bg-gray-900/50 backdrop-blur-md p-1 rounded-lg border border-gray-700 shadow-lg">
                        <div className={`flex ${isVerticalViewControls ? 'flex-col-reverse items-start gap-2' : 'flex-row items-center space-x-2'}`}>
                            <TopTooltipWrapper title={isViewControlsCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')} align="left">
                                <button
                                    onClick={() => setIsViewControlsCollapsed(p => !p)}
                                    className="p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-cyan-600 hover:text-white text-gray-300"
                                >
                                    {isViewControlsCollapsed ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>}
                                </button>
                            </TopTooltipWrapper>
                            {!isViewControlsCollapsed && (
                                <ViewControlsToolbar
                                    isSnapToGrid={isSnapToGrid}
                                    onSnapToGridChange={() => setIsSnapToGrid(p => !p)}
                                    lineStyle={lineStyle}
                                    onLineStyleChange={setLineStyle}
                                    zoom={viewTransform.scale}
                                    onZoomChange={handleZoomChange}
                                    scaleToSliderValue={scaleToSliderValue}
                                    sliderValueToScale={sliderValueToScale}
                                    onClearCanvas={handleClearCanvas}
                                    onSaveCanvas={handleSaveCanvas}
                                    onLoadCanvas={handleLoadCanvas}
                                    activeTool={effectiveTool}
                                    onToolChange={setActiveTool}
                                    isSmartGuidesEnabled={isSmartGuidesEnabled}
                                    onSmartGuidesChange={() => setIsSmartGuidesEnabled(p => !p)}
                                    onResetView={resetView}
                                    vertical={isVerticalViewControls}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {tutorialStep === 'tutorial_success_message' && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl border-2 border-cyan-500 p-8 max-w-md text-center transform scale-100 transition-all">
                        <div className="w-20 h-20 bg-cyan-900/50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-cyan-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">{t('tutorial.success.title')}</h2>
                        <p className="text-gray-300 mb-8 text-lg leading-relaxed">{t('tutorial.success.message')}</p>
                        <button 
                            onClick={advanceTutorial}
                            className="w-full py-4 text-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all transform hover:scale-105 shadow-lg shadow-cyan-900/50"
                        >
                            {t('tutorial.success.button')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasLayer;
