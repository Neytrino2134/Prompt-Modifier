
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
    EyeIcon, EyeOffIcon,
    ToolbarFullModeIcon, ToolbarSimpleModeIcon, ToolbarAnalysisModeIcon, ToolbarVideoModeIcon, ToolbarCharactersModeIcon
} from './icons/AppIcons';
import { useLanguage } from '../localization';
import { NodeType, ToolbarViewMode } from '../types';
import { Tooltip } from './Tooltip';
import { COLLAPSED_NODE_HEIGHT, PROXY_NODE_WIDTH, PROXY_NODE_HEIGHT, DETACHED_GHOST_WIDTH, DETACHED_GHOST_HEIGHT } from '../utils/nodeUtils';

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
    const [isVerticalViewControls, setIsVerticalViewControls] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1920 : true);
    const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
    const [isToolbarCompact, setIsToolbarCompact] = useState(false);
    const [toolbarViewMode, setToolbarViewMode] = useState<ToolbarViewMode>('simple');
    const [tongueHeight, setTongueHeight] = useState(28);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const tongueElementRef = useRef<HTMLDivElement | null>(null);
    
    const updateTongueHeight = useCallback(() => {
        if (tongueElementRef.current) {
            const rect = tongueElementRef.current.getBoundingClientRect();
            if (rect.height > 0) {
                setTongueHeight(rect.height);
            }
        }
    }, []);

    const tongueRef = useCallback((node: HTMLDivElement | null) => {
        tongueElementRef.current = node;
        if (node !== null) {
            const rect = node.getBoundingClientRect();
            if (rect.height > 0) {
                setTongueHeight(rect.height);
            }
        }
    }, []);

    useEffect(() => {
        updateTongueHeight();
    }, [isToolbarCompact, toolbarViewMode, updateTongueHeight]);

    useEffect(() => {
        const handleResize = () => {
          setWindowSize({ width: window.innerWidth, height: window.innerHeight });
          setIsVerticalViewControls(window.innerWidth <= 1920);
          updateTongueHeight();
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateTongueHeight]);

    if (!context) return null;

    const {
        nodes, connections, groups, viewTransform,
        handleCanvasMouseDown, handleCanvasContextMenu, handleCanvasTouchStart, handleCanvasTouchMove, handleCanvasTouchEnd,
        updatePointerPosition, handleWheel, handleCanvasDoubleClick,
        handleDrop, handleDragOver, handleDragEnter, handleDragLeave,
        getCanvasCursor,
        dockHoverMode, handleDockNode, handleUndockNode, focusedNodeId,
        selectedNodeIds, hoveredNodeId, setHoveredNodeId, dragOverNodeId,
        draggingInfo, connectingInfo, connectionTarget, spawnLine,
        activeTool, setActiveTool, effectiveTool,
        deleteNodeAndConnections, removeConnectionsByNodeId, copyNodeValue, pasteNodeValue,
        pasteImageToNode, handleDownloadImage, handleDuplicateNode, handleDuplicateNodeWithContent,
        handleToggleNodeCollapse, handleDetachNodeFromGroup, handleStartConnection, handleStartConnectionTouch,
        handleStartInputConnection, handleStartInputConnectionTouch,
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
        handleGenerateVideo, isGeneratingVideo, handleStopVideo, handleGenerateImageSequence, onGenerateSelectedFrames,
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
        onRefreshChat, handleRefreshImageEditor, handleAutoDownloadChange, handleDurationChange, handleUseBatchChange, handleVideoModeChange, handleModelChange, handleQualityChange, handleOutputFormatChange, handleSizeChange, handleCustomPromptChange, handleResolutionChange, handleAspectRatioChange,
        onRenameCharacter, onRenameScript, onRenameSequence, handleRenameNode, setRenameInfo, handleToggleNodePin,
        onAddNode, handleOpenQuickSearch, handleToggleCatalog, handleSaveCanvas, handleLoadCanvas, handleSaveProject,
        getTransformedPoint, setSpawnLine,
        tutorialStep, advanceTutorial,
        panelStyle, isPanelAutoHide
    } = context;

    const isModern = panelStyle === 'modern';
    const [isBottomToolbarHovered, setIsBottomToolbarHovered] = useState(false);
    const [isBottomToolbarPinned, setIsBottomToolbarPinned] = useState(false);
    const [isViewControlsHovered, setIsViewControlsHovered] = useState(false);

    const bottomToolbarTimerRef = useRef<NodeJS.Timeout | null>(null);
    const viewControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleBottomToolbarMouseEnter = () => {
        if (bottomToolbarTimerRef.current) {
            clearTimeout(bottomToolbarTimerRef.current);
            bottomToolbarTimerRef.current = null;
        }
        setIsBottomToolbarHovered(true);
    };

    const handleBottomToolbarMouseLeave = () => {
        if (bottomToolbarTimerRef.current) clearTimeout(bottomToolbarTimerRef.current);
        bottomToolbarTimerRef.current = setTimeout(() => {
            setIsBottomToolbarHovered(false);
        }, 350);
    };

    const handleViewControlsMouseEnter = () => {
        if (viewControlsTimerRef.current) {
            clearTimeout(viewControlsTimerRef.current);
            viewControlsTimerRef.current = null;
        }
        setIsViewControlsHovered(true);
    };

    const handleViewControlsMouseLeave = () => {
        if (viewControlsTimerRef.current) clearTimeout(viewControlsTimerRef.current);
        viewControlsTimerRef.current = setTimeout(() => {
            setIsViewControlsHovered(false);
        }, 350);
    };

    useEffect(() => {
        return () => {
            if (bottomToolbarTimerRef.current) clearTimeout(bottomToolbarTimerRef.current);
            if (viewControlsTimerRef.current) clearTimeout(viewControlsTimerRef.current);
        };
    }, []);

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

            const nodeWidth = node.isDetachedWindow ? DETACHED_GHOST_WIDTH : (node.dockState ? PROXY_NODE_WIDTH : node.width);
            const nodeHeight = node.isDetachedWindow ? DETACHED_GHOST_HEIGHT : (node.dockState ? PROXY_NODE_HEIGHT : (node.isCollapsed ? COLLAPSED_NODE_HEIGHT : node.height));
            return (
                node.position.x < viewport.right &&
                node.position.x + nodeWidth > viewport.left &&
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
            isAnalyzingImage: typeof isAnalyzingImage === 'function' ? isAnalyzingImage(node.id) : (isAnalyzingImage === node.id || isAnalyzingImage === true),
            onImageToText: onImageToText,
            onGenerateImage: handleGenerateImage,
            isGeneratingImage: typeof isGeneratingImage === 'function' ? isGeneratingImage(node.id) : (isGeneratingImage === node.id || isGeneratingImage === true),
            onExecuteChain: handleExecuteChain,
            isExecutingChain: isExecutingChain,
            isExecuting: executingNodeId === node.id,
            onStopChainExecution: stopChainExecution,
            onEditImage: handleEditImage,
            isEditingImage: typeof isEditingImage === 'function' ? isEditingImage(node.id) : (isEditingImage === node.id || isEditingImage === true),
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
            onStopVideo: handleStopVideo,
            isGeneratingVideo: typeof isGeneratingVideo === 'function' ? isGeneratingVideo(node.id) : isGeneratingVideo === node.id,
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
            isProcessingImage: typeof isProcessingImage === 'function' ? isProcessingImage(node.id) : (isProcessingImage === node.id || isProcessingImage === true),
            activeTool: effectiveTool,
            onOutputHandleMouseDown: handleStartConnection,
            onOutputHandleTouchStart: handleStartConnectionTouch,
            onInputHandleMouseDown: handleStartInputConnection,
            onInputHandleTouchStart: handleStartInputConnectionTouch,
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
            onQualityChange: handleQualityChange,
            onOutputFormatChange: handleOutputFormatChange,
            onSizeChange: handleSizeChange,
            onCustomPromptChange: handleCustomPromptChange,
            onAutoDownloadChange: handleAutoDownloadChange,
            onDurationChange: handleDurationChange,
            onUseBatchChange: handleUseBatchChange,
            onVideoModeChange: handleVideoModeChange,
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
            handleDetachNodeToMiniApp: context.handleDetachNodeToMiniApp,
            handleReattachNodeFromMiniApp: context.handleReattachNodeFromMiniApp,
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
            case 'character_data': return 'var(--color-connection-character)';
            case 'video': return 'var(--color-connection-video)';
            case 'audio': return 'var(--color-connection-audio)';
            default: return 'var(--color-border)';
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
            
            {/* Render Docked Nodes (On Top, outside transform layer) */}
            {!focusedNodeId && dockedNodes.map((node: any) => (
                <NodeView 
                    key={`${node.id}-docked`} 
                    node={node} 
                    {...getNodeViewProps(node)} 
                    // isDockedWindow implicitly handled by styles but passed via prop if needed for internal logic
                    // The style util sees node.dockState and applies position:fixed + high zIndex
                />
            ))}

            {!focusedNodeId && (
                <div id="canvas-transform-layer" style={{ width: '1px', height: '1px', transform: `translate(${viewTransform.translate.x}px, ${viewTransform.translate.y}px) scale(${viewTransform.scale})`, transformOrigin: '0 0' }}>
                    
                    <div className="absolute top-0 left-0 w-0 h-0 overflow-visible pointer-events-none z-0">
                        <div className="absolute top-0 left-[-50000px] w-[100000px] h-[1px] bg-cyan-900/30 -translate-y-1/2"></div>
                        <div className="absolute left-0 top-[-50000px] w-[1px] h-[100000px] bg-cyan-900/30 -translate-x-1/2"></div>
                        <div className="absolute top-0 left-0 w-4 h-4 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                             {/* Central Crosshair - Themed */}
                             <div className="absolute w-3 h-[2px] bg-accent shadow-[0_0_5px_var(--color-accent)]"></div>
                             <div className="absolute h-3 w-[2px] bg-accent shadow-[0_0_5px_var(--color-accent)]"></div>
                        </div>
                    </div>

                    {selectionRect && (
                        <div className="absolute border-2 border-dashed border-accent-text pointer-events-none" 
                             style={{ 
                                 left: Math.min(selectionRect.start.x, selectionRect.end.x), 
                                 top: Math.min(selectionRect.start.y, selectionRect.end.y), 
                                 width: Math.abs(selectionRect.start.x - selectionRect.end.x), 
                                 height: Math.abs(selectionRect.start.y - selectionRect.end.y), 
                                 zIndex: 100,
                                 backgroundColor: 'var(--color-selection)' 
                             }} />
                    )}

                    {groupButtonPosition && (
                      <div 
                          className="absolute z-20 flex items-center gap-2 -translate-x-1/2" 
                          style={{ left: groupButtonPosition.x, top: groupButtonPosition.y }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                      >
                          <Tooltip content={t('hotkeys.tools.group')} position="top">
                              <button onClick={handleGroupSelection} className="px-4 py-2 font-bold text-white bg-accent rounded-md hover:bg-accent-hover transition-all duration-200 shadow-lg flex items-center space-x-2 whitespace-nowrap shadow-accent/20">
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
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'left')} className="p-1.5 hover:bg-accent rounded text-gray-300 hover:text-white">
                                        <AlignLeftIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('contextMenu.align.centerX')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'center-x')} className="p-1.5 hover:bg-accent rounded text-gray-300 hover:text-white">
                                        <AlignCenterXIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('contextMenu.align.right')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'right')} className="p-1.5 hover:bg-accent rounded text-gray-300 hover:text-white">
                                        <AlignRightIcon />
                                    </button>
                                </Tooltip>
                                <div className="w-px bg-gray-600 mx-1"></div>
                                <Tooltip content={t('contextMenu.align.top')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'top')} className="p-1.5 hover:bg-accent rounded text-gray-300 hover:text-white">
                                        <AlignTopIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('contextMenu.align.centerY')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'center-y')} className="p-1.5 hover:bg-accent rounded text-gray-300 hover:text-white">
                                        <AlignCenterYIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip content={t('contextMenu.align.bottom')} position="top">
                                    <button onClick={() => handleAlignNodes(selectedNodeIds, 'bottom')} className="p-1.5 hover:bg-accent rounded text-gray-300 hover:text-white">
                                        <AlignBottomIcon />
                                    </button>
                                </Tooltip>
                                 {selectedNodeIds.length >= 3 && (
                                    <>
                                        <div className="w-px bg-gray-600 mx-1"></div>
                                        <Tooltip content={t('contextMenu.distribute.horizontal')} position="top">
                                            <button onClick={() => handleAlignNodes(selectedNodeIds, 'distribute-horizontal')} className="p-1.5 hover:bg-accent rounded text-gray-300 hover:text-white">
                                                <DistributeHorizontalIcon />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content={t('contextMenu.distribute.vertical')} position="top">
                                            <button onClick={() => handleAlignNodes(selectedNodeIds, 'distribute-vertical')} className="p-1.5 hover:bg-accent rounded text-gray-300 hover:text-white">
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
                        {connectingInfo && (() => {
                            let targetX = context.pointerPosition.x;
                            let targetY = context.pointerPosition.y;
                            if (connectionTarget) {
                                const targetNode = nodes.find((n: any) => n.id === connectionTarget.nodeId);
                                const sourceNode = nodes.find((n: any) => n.id === connectingInfo.fromNodeId);
                                if (targetNode && sourceNode) {
                                    const { end } = getConnectionPoints(sourceNode, targetNode, {
                                        id: '',
                                        fromNodeId: connectingInfo.fromNodeId,
                                        fromHandleId: connectingInfo.fromHandleId,
                                        toNodeId: connectionTarget.nodeId,
                                        toHandleId: connectionTarget.handleId
                                    });
                                    targetX = end.x;
                                    targetY = end.y;
                                }
                            }
                            return (
                                <path 
                                    d={`M ${connectingInfo.fromPoint.x} ${connectingInfo.fromPoint.y} C ${connectingInfo.fromPoint.x + 80} ${connectingInfo.fromPoint.y}, ${targetX - 80} ${targetY}, ${targetX} ${targetY}`} 
                                    stroke={getDragLineColor(connectingInfo.fromType)} 
                                    strokeWidth="3" 
                                    fill="none" 
                                    style={{ strokeDasharray: '8 4', pointerEvents: 'none' }} 
                                />
                            );
                        })()}
                        
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
                        <NodeView 
                            key={node.id} 
                            node={node} 
                            {...getNodeViewProps(node)} 
                            isProxy={!!node.dockState} // Classic proxy on canvas only if docked
                        />
                    ))}

                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-[15] overflow-visible">
                        {spawnLine && <path d={`M ${spawnLine.start.x} ${spawnLine.start.y} L ${spawnLine.end.x} ${spawnLine.end.y}`} stroke="var(--color-text-accent)" strokeWidth="2" fill="none" style={{ strokeDasharray: '6 4', transition: 'opacity 0.5s ease-out', opacity: spawnLine.fading ? 0 : 1 }} />}
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
                        bottom: isModern ? '0px' : '8px', 
                        transform: (isToolbarCollapsed || (isModern && isPanelAutoHide && !isBottomToolbarPinned && !isBottomToolbarHovered))
                            ? `translate(-50%, calc(100% - ${tongueHeight > 0 ? tongueHeight : (isModern ? 24 : 28)}px ${isModern ? '' : '+ 8px'}))` 
                            : 'translate(-50%, 0)', 
                        maxWidth: isModern ? 'calc(100% - 64px)' : 'calc(100% - 112px)',
                        width: 'max-content' 
                    }}
                    onMouseEnter={handleBottomToolbarMouseEnter}
                    onMouseLeave={handleBottomToolbarMouseLeave}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div 
                        ref={tongueRef}
                        className={isModern
                            ? "flex items-center justify-center bg-gray-900/70 backdrop-blur-md border border-gray-700/40 border-b-0 rounded-t-md shadow-sm overflow-hidden text-xs py-0.5 px-1"
                            : "flex items-center justify-center bg-gray-800/90 backdrop-blur-md border border-gray-600 border-b-0 rounded-t-lg shadow-sm overflow-hidden text-xs"
                        }
                    >
                        {!isToolbarCompact && (
                            <>
                                <div className="flex items-center px-1 py-0.5 space-x-0.5">
                                    {(['full', 'simple', 'analysis', 'video', 'characters'] as ToolbarViewMode[]).map((mode) => (
                                        <Tooltip key={mode} content={t(`toolbar.mode.${mode}.tooltip`)} position="top">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setToolbarViewMode(mode); }}
                                                className={`p-1 rounded transition-colors focus:outline-none flex items-center justify-center ${
                                                    toolbarViewMode === mode 
                                                        ? 'bg-accent text-white shadow-sm' 
                                                        : isModern 
                                                            ? 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/80'
                                                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/60'
                                                }`}
                                            >
                                                {mode === 'full' && <ToolbarFullModeIcon className="h-3.5 w-3.5" />}
                                                {mode === 'simple' && <ToolbarSimpleModeIcon className="h-3.5 w-3.5" />}
                                                {mode === 'analysis' && <ToolbarAnalysisModeIcon className="h-3.5 w-3.5" />}
                                                {mode === 'video' && <ToolbarVideoModeIcon className="h-3.5 w-3.5" />}
                                                {mode === 'characters' && <ToolbarCharactersModeIcon className="h-3.5 w-3.5" />}
                                            </button>
                                        </Tooltip>
                                    ))}
                                </div>

                                <div className={`w-px h-3.5 ${isModern ? 'bg-gray-750' : 'bg-gray-600'}`}></div>
                            </>
                        )}

                        <Tooltip content={isToolbarCompact ? t('toolbar.expandTitles') : t('toolbar.compactMode')} position="top">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsToolbarCompact(!isToolbarCompact); }}
                                className={`p-1.5 transition-colors flex items-center justify-center ${isModern ? 'hover:bg-gray-800/60' : 'hover:bg-gray-700'} focus:outline-none ${isToolbarCompact ? 'text-accent-text' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                {isToolbarCompact ? (
                                    <EyeOffIcon className="h-3.5 w-3.5" />
                                ) : (
                                    <EyeIcon className="h-3.5 w-3.5" />
                                )}
                            </button>
                        </Tooltip>

                        <div className={`w-px h-3.5 ${isModern ? 'bg-gray-750' : 'bg-gray-600'}`}></div>

                        {isModern ? (
                            <Tooltip content={isBottomToolbarPinned ? t('toolbar.unpinPanel') : t('toolbar.pinPanel')} position="top">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsBottomToolbarPinned(p => !p); }}
                                    className={`p-1.5 transition-colors flex items-center justify-center hover:bg-gray-800/60 rounded focus:outline-none ${
                                        isBottomToolbarPinned ? 'text-accent' : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                    title={isBottomToolbarPinned ? t('toolbar.unpinPanel') : t('toolbar.pinPanel')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </button>
                            </Tooltip>
                        ) : (
                            <Tooltip content={isToolbarCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')} position="top">
                                <button 
                                     onClick={(e) => { e.stopPropagation(); setIsToolbarCollapsed(!isToolbarCollapsed); }}
                                     className="p-1.5 transition-colors flex items-center justify-center hover:bg-gray-700 focus:outline-none text-gray-400 hover:text-gray-200"
                                >
                                    <div className={`transform transition-transform duration-300 ${isToolbarCollapsed ? 'rotate-180' : 'rotate-0'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    <div className={isModern
                        ? "bg-gray-900/60 backdrop-blur-md border border-gray-700/40 border-b-0 rounded-t-xl rounded-b-none p-1 shadow-xl w-full"
                        : "bg-gray-900/50 backdrop-blur-md border border-gray-700 rounded-lg p-1 shadow-2xl w-full"
                    }>
                        <Toolbar 
                            onAddNode={handleAddNodeFromToolbar}
                            onOpenSearch={() => handleOpenQuickSearch({ x: window.innerWidth / 2, y: window.innerHeight / 2 })}
                            onToggleCatalog={handleToggleCatalog}
                            onSaveCanvas={handleSaveCanvas}
                            onLoadCanvas={handleLoadCanvas}
                            onSaveProject={handleSaveProject}
                            isDetached={false}
                            isCompact={isToolbarCompact}
                            viewMode={toolbarViewMode}
                        />
                    </div>
                </div>
            )}

            {!focusedNodeId && (
                <div 
                    className={`absolute z-20 pointer-events-auto transition-all duration-300 ease-in-out ${
                        isModern ? 'bottom-0 left-0' : 'bottom-2 left-2'
                    }`}
                    style={isModern ? {
                        transform: (isViewControlsCollapsed || (isPanelAutoHide && !isViewControlsHovered))
                            ? (isVerticalViewControls ? 'translateY(calc(100% - 36px))' : 'translateX(calc(-100% + 36px))')
                            : 'translate(0, 0)'
                    } : undefined}
                    onMouseEnter={handleViewControlsMouseEnter}
                    onMouseLeave={handleViewControlsMouseLeave}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div className={isModern
                        ? "bg-gray-900/60 backdrop-blur-md p-1 rounded-none rounded-tr-xl border border-b-0 border-l-0 border-gray-700/40 shadow-xl"
                        : "bg-gray-900/50 backdrop-blur-md p-1 rounded-lg border border-gray-700 shadow-lg"
                    }>
                        <div className={`flex ${isVerticalViewControls ? 'flex-col-reverse items-start gap-1.5' : 'flex-row items-center space-x-1.5'}`}>
                            <TopTooltipWrapper title={isViewControlsCollapsed ? t('toolbar.expandPanel') : t('toolbar.collapsePanel')} align="left">
                                <button
                                    onClick={() => setIsViewControlsCollapsed(p => !p)}
                                    className={isModern
                                        ? "p-1.5 rounded-lg transition-all duration-200 focus:outline-none flex items-center justify-center h-8.5 w-8.5 bg-gray-800/60 hover:bg-accent hover:text-white text-gray-300 border border-gray-700/40"
                                        : "p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9 bg-gray-700 hover:bg-accent hover:text-white text-gray-300"
                                    }
                                >
                                    {isModern ? (
                                        isVerticalViewControls ? (
                                            (isViewControlsCollapsed || (isPanelAutoHide && !isViewControlsHovered)) ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                            )
                                        ) : (
                                            (isViewControlsCollapsed || (isPanelAutoHide && !isViewControlsHovered)) ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                            )
                                        )
                                    ) : (
                                        isViewControlsCollapsed ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                        )
                                    )}
                                </button>
                            </TopTooltipWrapper>
                            {(isModern || !isViewControlsCollapsed) && (
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
                                    isModern={isModern}
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
