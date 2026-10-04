import React, { createContext, useContext, ReactNode, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import type { AppContextType } from './AppContextTypes';
import { useLanguage, LanguageCode } from '../localization';
import { NodeType, Tool } from '../types';
import {
    useNodes,
    useConnections,
    useCanvas,
    useInteraction,
    useCanvasIO,
    useDialogsAndUI,
    useGroups,
    useCatalog,
    usePermissions,
    usePromptLibrary,
    useTabs,
    useEntityActions,
    useDerivedMemo,
    useCanvasEvents,
    useGeminiAnalysis,
    useGeminiConversation,
    useGeminiChainExecution,
    useGeminiGeneration,
    useGeminiModification,
    useNodePositionHistory,
    useContentCatalog,
    useGenerationHistory,
    calculateGroupBounds,
    saveSessionToDB,
    CatalogItemType,
    ContentCatalogItemType,
} from '../hooks';
import { useGoogleDrive } from '../hooks/useGoogleDrive'; 
import { useGlobalState } from '../hooks/useGlobalState';
import { useAppOrchestration } from '../hooks/useAppOrchestration';
import { useTaskQueue } from '../hooks/useTaskQueue';
import { useTutorial } from '../hooks/useTutorial';
import { useBatchManager } from '../hooks/useBatchManager';
import {
    useSessionSyncAndAutosave,
    useCacheCleanup,
    useCatalogAndEntityDispatch,
    useMediaAndImageActions
} from './app-context';
import type { Tab, CanvasState } from '../types';

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t, language, setLanguage, secondaryLanguage, setSecondaryLanguage } = useLanguage();
    const permissionsHook = usePermissions('clipboard-read');

    // Core Tab and History Hooks
    const tabsHook = useTabs();
    const generationHistoryHook = useGenerationHistory();
    const {
        tabs,
        setTabs,
        activeTabId,
        setActiveTabId,
        getLocalizedCanvasState,
        setNextAutoSaveTime,
        setIsAutoSaving
    } = tabsHook;

    const activeTab = useMemo(() => {
        const found = tabs.find(t => t.id === activeTabId);
        if (found) return found;
        if (tabs.length > 0) return tabs[0];
        return {
            id: 'fallback', name: 'Loading...',
            state: { nodes: [], connections: [], groups: [], viewTransform: { scale: 1, translate: { x: 0, y: 0 } }, nodeIdCounter: 0, fullSizeImageCache: {} }
        };
    }, [tabs, activeTabId]);

    // Global State Atoms
    const globalState = useGlobalState(activeTab.state.nodes);
    const {
        toasts, addToast, removeToast, fullSizeImageCache, setFullSizeImageCache, setFullSizeImage, getFullSizeImage,
        clearImagesForNodeFromCache, registerOperation, unregisterOperation, activeOperations,
        selectedNodeIds, setSelectedNodeIds, draggingInfo, setDraggingInfo,
        showWelcome, setShowWelcome
    } = globalState;

    const nodesHook = useNodes(activeTab.state.nodes, activeTab.state.nodeIdCounter, addToast, t, setFullSizeImage, getFullSizeImage, fullSizeImageCache);
    const connectionsHook = useConnections(activeTab.state.connections, addToast, t);
    const canvasHook = useCanvas(activeTab.state.viewTransform);
    const groupsHook = useGroups(activeTab.state.groups);
    const positionHistoryHook = useNodePositionHistory(nodesHook.setNodes);

    // Tutorial Hook
    const tutorialHook = useTutorial({ nodes: nodesHook.nodes });

    // Derived Memo
    const derivedMemoHook = useDerivedMemo({
        connections: connectionsHook.connections,
        nodes: nodesHook.nodes,
        selectedNodeIds: selectedNodeIds,
        getFullSizeImage,
    });
    const { getUpstreamNodeValues } = derivedMemoHook;

    // 1. Session Sync & Autosave Subsystem
    const sessionHook = useSessionSyncAndAutosave({
        tabs,
        setTabs,
        activeTabId,
        setActiveTabId,
        isTabsLoaded: tabsHook.isLoaded,
        getLocalizedCanvasState,
        setNextAutoSaveTime,
        setIsAutoSaving,
        autoSaveInterval: globalState.autoSaveInterval,
        nodes: nodesHook.nodes,
        setNodes: nodesHook.setNodes,
        connections: connectionsHook.connections,
        setConnections: connectionsHook.setConnections,
        groups: groupsHook.groups,
        setGroups: groupsHook.setGroups,
        viewTransform: canvasHook.viewTransform,
        setViewTransform: canvasHook.setViewTransform,
        nodeIdCounter: nodesHook.nodeIdCounter,
        fullSizeImageCache,
        setFullSizeImageCache,
        addToast,
        t
    });

    const {
        getCurrentCanvasState,
        loadCanvasState,
        restoreSession,
        forceSaveSession,
        handleSwitchTab,
        handleAddTab,
        handleRenameTab,
        handleReorderTabs,
        resetTabs,
        resetCurrentTab,
        resetCanvasToDefault,
        isCanvasLoading
    } = sessionHook;

    // Derived Action Hooks & Batch Job tracking
    const activeTabIdRef = useRef(activeTabId);
    useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);
    const batchJobsRef = useRef<any[]>([]);

    const entityActionsHook = useEntityActions({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, connections: connectionsHook.connections, setConnections: connectionsHook.setConnections, nodeIdCounter: nodesHook.nodeIdCounter, groups: groupsHook.groups, setGroups: groupsHook.setGroups, t, clearImagesForNodeFromCache, tabId: activeTabId, addToast, getFullSizeImage, setFullSizeImage, takeSnapshot: positionHistoryHook.takeSnapshot,
        fullSizeImageCache,
        getBatchJobs: () => batchJobsRef.current
    });

    // Catalogs & Library
    const orchestrationRef = useRef<any>(null);
    const onRedirectImportProxy = (d: any) => {
        if (orchestrationRef.current && orchestrationRef.current.onRedirectImport) {
            orchestrationRef.current.onRedirectImport(d);
        }
    };

    const catalogHook = useCatalog(t, onRedirectImportProxy);
    const libraryHook = usePromptLibrary(t, onRedirectImportProxy);
    const characterCatalogHook = useContentCatalog('character-catalog', t('catalog.tabs.characters'), t, 'characters', onRedirectImportProxy);
    const scriptCatalogHook = useContentCatalog('script-catalog', t('catalog.tabs.scripts'), t, 'scripts', onRedirectImportProxy);
    const sequenceCatalogHook = useContentCatalog('sequence-catalog', t('catalog.tabs.sequences'), t, 'sequences', onRedirectImportProxy);

    // Google Drive Hook
    const googleDriveHook = useGoogleDrive({
        addToast,
        getCurrentCanvasState,
        tabs,
        activeTabId,
        language,
        isSnapToGrid: globalState.isSnapToGrid,
        lineStyle: globalState.lineStyle,
        catalogItems: catalogHook.catalogItems,
        libraryItems: libraryHook.libraryItems,
        characterCatalog: characterCatalogHook,
        scriptCatalog: scriptCatalogHook,
        sequenceCatalog: sequenceCatalogHook,
        t,
    });

    // Task Queue & Generation Hooks
    const taskQueueHook = useTaskQueue();

    const geminiAnalysisHook = useGeminiAnalysis({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, getUpstreamNodeValues, setError: globalState.setError, t, setFullSizeImage, getFullSizeImage, activeTabId, setTabs, activeTabName: activeTab.name, registerOperation, unregisterOperation, addToast, taskQueue: taskQueueHook
    });

    const geminiModificationHook = useGeminiModification({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, getUpstreamNodeValues, setError: globalState.setError, t, activeTabId, setTabs, activeTabName: activeTab.name, registerOperation, unregisterOperation, addToast
    });

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
            nodesHook.setNodes(nds => nds.map(n => {
                if (n.id === nodeId) {
                    const currentVal = safeParse(n.value);
                    const newVal = valueUpdater(currentVal);
                    const finalValue = typeof newVal === 'string' ? newVal : JSON.stringify(newVal);
                    return { ...n, value: finalValue };
                }
                return n;
            }));
        } else {
            tabsHook.setTabs(prevTabs => prevTabs.map(tab => {
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
    }, [nodesHook.setNodes, tabsHook.setTabs, setFullSizeImage]);

    const batchTargetRef = useRef({ nodes: nodesHook.nodes, tabs: tabsHook.tabs, activeTabId });
    batchTargetRef.current = { nodes: nodesHook.nodes, tabs: tabsHook.tabs, activeTabId };
    const getBatchTargetNode = useCallback((tabId: string, nodeId: string) => {
        const current = batchTargetRef.current;
        const nodes = tabId === current.activeTabId ? current.nodes
            : current.tabs.find(tab => tab.id === tabId)?.state.nodes;
        return nodes?.find(node => node.id === nodeId);
    }, []);

    // 2. Cache Cleanup Subsystem
    const cacheCleanupHook = useCacheCleanup({
        isTabsLoaded: tabsHook.isLoaded,
        tabs,
        setTabs,
        activeTabId,
        nodes: nodesHook.nodes,
        fullSizeImageCache,
        setFullSizeImageCache,
        getCurrentCanvasState,
        tasks: taskQueueHook.tasks,
        historyItems: generationHistoryHook.historyItems,
        catalogs: [catalogHook.catalogItems, libraryHook.libraryItems, characterCatalogHook.items, scriptCatalogHook.items, sequenceCatalogHook.items],
        globalImageEditor: globalState.globalImageEditor,
        imageViewer: null, // Will be registered with dialogsHook
        getDeletedNodeCacheReferences: entityActionsHook.getDeletedNodeCacheReferences,
        clearUnusedBatchCache: () => batchManagerHook.clearUnusedBatchCache(),
        addToast,
        t
    });

    const { clearUnusedFullSizeImages, getCacheProtection } = cacheCleanupHook;

    const batchManagerHook = useBatchManager({
        getCacheProtection,
        getTargetNode: getBatchTargetNode,
        updateNodeInStorage,
        setFullSizeImage,
        addToHistory: generationHistoryHook.addToHistory,
        addToast,
        enqueueTask: taskQueueHook.enqueueTask,
        updateTaskByBatchJob: taskQueueHook.updateTaskByBatchJob,
        completeBatchTasksForNode: taskQueueHook.completeBatchTasksForNode,
        triggerAutoSave: () => forceSaveSession(undefined, undefined, false),
        t
    });
    batchJobsRef.current = batchManagerHook.batchJobs;

    const geminiConversationHook = useGeminiConversation({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, setError: globalState.setError, t, getUpstreamNodeValues, activeTabId, setTabs
    });

    const geminiGenerationHook = useGeminiGeneration({
        nodes: nodesHook.nodes, connections: connectionsHook.connections, setNodes: nodesHook.setNodes, getUpstreamNodeValues, setError: globalState.setError, showApiKeyDialog: (cb) => dialogsHook.showApiKeyDialog(cb), t, setFullSizeImage, getFullSizeImage, connectedCharacterData: derivedMemoHook.connectedCharacterData, activeTabId, setTabs, activeTabName: activeTab.name, registerOperation, unregisterOperation, isGlobalProcessing: activeOperations.size > 0, addToast, addToHistory: generationHistoryHook.addToHistory, taskQueue: taskQueueHook, batchManager: batchManagerHook
    });

    const geminiChainExecutionHook = useGeminiChainExecution({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, connections: connectionsHook.connections, setError: globalState.setError, getUpstreamNodeValues, t, setFullSizeImage, getFullSizeImage, activeTabId, activeTabName: activeTab.name, registerOperation, unregisterOperation, isGlobalProcessing: activeOperations.size > 0, setTabs, fullSizeImageCache
    });

    const canvasIOHook = useCanvasIO({
        getCurrentCanvasState,
        loadCanvasState,
        restoreSession,
        setError: globalState.setError,
        nodes: nodesHook.nodes,
        getPromptForNode: entityActionsHook.getPromptForNode,
        handleValueChange: nodesHook.handleValueChange,
        addToast,
        t,
        activeTabName: activeTab.name,
        getFullSizeImage,
        handleRenameTab,
        activeTabId,
        setFullSizeImage,
        tabs: tabsHook.tabs,
        setTabs: tabsHook.setTabs,
        setActiveTabId: tabsHook.setActiveTabId,
        catalogItems: catalogHook.catalogItems,
        setCatalogItems: catalogHook.replaceAllItems,
        libraryItems: libraryHook.libraryItems,
        setLibraryItems: libraryHook.replaceAllItems,
        characterCatalog: characterCatalogHook,
        scriptCatalog: scriptCatalogHook,
        sequenceCatalog: sequenceCatalogHook,
        language,
        setLanguage,
        secondaryLanguage,
        setSecondaryLanguage,
        isSnapToGrid: globalState.isSnapToGrid,
        setIsSnapToGrid: globalState.setIsSnapToGrid,
        lineStyle: globalState.lineStyle,
        setLineStyle: globalState.setLineStyle,
        currentTheme: globalState.currentTheme,
        setTheme: globalState.setTheme,
        canvasColorMode: globalState.canvasColorMode,
        setCanvasColorMode: globalState.setCanvasColorMode,
        inputColorMode: globalState.inputColorMode,
        setInputColorMode: globalState.setInputColorMode,
        panelStyle: globalState.panelStyle,
        setPanelStyle: globalState.setPanelStyle,
        isPanelAutoHide: globalState.isPanelAutoHide,
        setIsPanelAutoHide: globalState.setIsPanelAutoHide,
        panelAnimation: globalState.panelAnimation,
        setPanelAnimation: globalState.setPanelAnimation,
        isPanelAnimationAdaptive: globalState.isPanelAnimationAdaptive,
        setIsPanelAnimationAdaptive: globalState.setIsPanelAnimationAdaptive,
        panelAnimationConfig: globalState.panelAnimationConfig,
        setPanelAnimationConfig: globalState.setPanelAnimationConfig,
        cursorSkin: globalState.cursorSkin,
        setCursorSkin: globalState.setCursorSkin,
        isCursorEffectEnabled: globalState.isCursorEffectEnabled,
        setIsCursorEffectEnabled: globalState.setIsCursorEffectEnabled,
        autoSaveInterval: globalState.autoSaveInterval,
        setAutoSaveInterval: globalState.setAutoSaveInterval,
        autoSaveHistoryLimit: globalState.autoSaveHistoryLimit,
        setAutoSaveHistoryLimit: globalState.setAutoSaveHistoryLimit,
        autoSaveSessionLimit: globalState.autoSaveSessionLimit,
        setAutoSaveSessionLimit: globalState.setAutoSaveSessionLimit,
        isInstantCloseEnabled: globalState.isInstantCloseEnabled,
        setIsInstantCloseEnabled: globalState.setIsInstantCloseEnabled,
        isImageDropMenuEnabled: globalState.isImageDropMenuEnabled,
        setIsImageDropMenuEnabled: globalState.setIsImageDropMenuEnabled,
        isHoverHighlightEnabled: globalState.isHoverHighlightEnabled,
        setIsHoverHighlightEnabled: globalState.setIsHoverHighlightEnabled,
        isBringToFrontOnHoverEnabled: globalState.isBringToFrontOnHoverEnabled,
        setIsBringToFrontOnHoverEnabled: globalState.setIsBringToFrontOnHoverEnabled,
        nodeAnimationMode: globalState.nodeAnimationMode,
        setNodeAnimationMode: globalState.setNodeAnimationMode,
        isConnectionAnimationEnabled: globalState.isConnectionAnimationEnabled,
        setIsConnectionAnimationEnabled: globalState.setIsConnectionAnimationEnabled,
        connectionOpacity: globalState.connectionOpacity,
        setConnectionOpacity: globalState.setConnectionOpacity,
        connectionAnimationStyle: globalState.connectionAnimationStyle,
        setConnectionAnimationStyle: globalState.setConnectionAnimationStyle,
        connectionAnimationConfig: globalState.connectionAnimationConfig,
        setConnectionAnimationConfig: globalState.setConnectionAnimationConfig,
        isSmartGuidesEnabled: globalState.isSmartGuidesEnabled,
        setIsSmartGuidesEnabled: globalState.setIsSmartGuidesEnabled,
        setConfirmInfo: (info) => dialogsHook.setConfirmInfo(info),
        handleRenameNode: nodesHook.handleRenameNode,
        onAddNode: entityActionsHook.onAddNode,
        pasteGroup: entityActionsHook.pasteGroup,
        viewTransform: canvasHook.viewTransform
    });

    const dialogsHook = useDialogsAndUI({
        setGroups: groupsHook.setGroups, renameCatalogItem: catalogHook.renameCatalogItem, updateLibraryItem: libraryHook.updateLibraryItem, handleRenameTab: handleRenameTab, handleCloseTab: sessionHook.handleCloseTab, handleRenameNode: nodesHook.handleRenameNode, getCurrentCanvasState: getCurrentCanvasState, loadCanvasState, tabs, activeTabId, t, characterCatalog: characterCatalogHook, scriptCatalog: scriptCatalogHook, sequenceCatalog: sequenceCatalogHook,
    });

    // 3. Catalog and Entity Dispatch Subsystem
    const catalogDispatchHook = useCatalogAndEntityDispatch({
        nodes: nodesHook.nodes,
        setNodes: nodesHook.setNodes,
        connections: connectionsHook.connections,
        groups: groupsHook.groups,
        setGroups: groupsHook.setGroups,
        fullSizeImageCache,
        setFullSizeImage,
        getFullSizeImage,
        handleValueChange: nodesHook.handleValueChange,
        onAddNode: entityActionsHook.onAddNode,
        deleteNodeAndConnections: entityActionsHook.deleteNodeAndConnections,
        characterCatalog: characterCatalogHook,
        scriptCatalog: scriptCatalogHook,
        sequenceCatalog: sequenceCatalogHook,
        catalogHook,
        addToast,
        t
    });

    const {
        handleDetachNodeFromGroup,
        handleRemoveGroup,
        handleSaveGroupToCatalog,
        handleSaveGroupToDisk,
        handleDetachAndPasteConcept,
        onDetachImageToNode,
        onSaveCharacterToCatalog,
        onSaveGeneratedCharacterToCatalog,
        onSaveScriptToCatalog,
        onSaveSequenceToCatalog
    } = catalogDispatchHook;

    // 4. Media and Image Actions Subsystem
    const mediaActionsHook = useMediaAndImageActions({
        nodes: nodesHook.nodes,
        setNodes: nodesHook.setNodes,
        connections: connectionsHook.connections,
        setConnections: connectionsHook.setConnections,
        viewTransform: canvasHook.viewTransform,
        setViewTransform: canvasHook.setViewTransform,
        getUpstreamNodeValues,
        handleValueChange: nodesHook.handleValueChange,
        onAddNode: entityActionsHook.onAddNode,
        setSelectedNodeIds,
        addToast,
        t
    });

    const {
        onDownloadImageFromUrl,
        onCopyImageToClipboard,
        onReadData,
        handleSplitConnection,
        handleNavigateToNodeFrame
    } = mediaActionsHook;

    // Orchestration Hook
    const orchestrationHook = useAppOrchestration(
        nodesHook.nodes, nodesHook.setNodes, connectionsHook.connections, connectionsHook.setConnections, groupsHook.groups, groupsHook.setGroups, fullSizeImageCache, setFullSizeImage, getFullSizeImage, getUpstreamNodeValues, activeTabIdRef,
        setSelectedNodeIds,
        libraryHook, catalogHook, characterCatalogHook, scriptCatalogHook, sequenceCatalogHook, entityActionsHook, nodesHook, connectionsHook, canvasHook, geminiGenerationHook,
        addToast, globalState.setError, t, clearImagesForNodeFromCache
    );

    useEffect(() => {
        orchestrationRef.current = orchestrationHook;
    }, [orchestrationHook]);

    const handleAddNodeAndConnectWrapper = useCallback((nodeType: NodeType) => {
        if (dialogsHook.connectionQuickAddInfo) {
            orchestrationHook.handleAddNodeAndConnect(
                nodeType,
                dialogsHook.connectionQuickAddInfo,
                dialogsHook.handleCloseConnectionQuickAdd
            );
        }
    }, [dialogsHook.connectionQuickAddInfo, dialogsHook.handleCloseConnectionQuickAdd, orchestrationHook]);

    const setIsHistoryPanelOpen = useCallback((action: React.SetStateAction<boolean>) => {
        generationHistoryHook.setIsHistoryPanelOpen(prev => {
            const next = typeof action === 'function' ? action(prev) : action;
            if (next) {
                taskQueueHook.setIsTaskQueuePanelOpen(false);
            }
            return next;
        });
    }, [generationHistoryHook, taskQueueHook]);

    const setIsTaskQueuePanelOpen = useCallback((action: React.SetStateAction<boolean>) => {
        taskQueueHook.setIsTaskQueuePanelOpen(prev => {
            const next = typeof action === 'function' ? action(prev) : action;
            if (next) {
                generationHistoryHook.setIsHistoryPanelOpen(false);
            }
            return next;
        });
    }, [generationHistoryHook, taskQueueHook]);

    // Header & Status Bar Safe Zone State
    const [isStatusBarOpen, setIsStatusBarOpen] = useState<boolean>(() => {
        const saved = localStorage.getItem('settings_isStatusBarOpen');
        return saved !== null ? saved === 'true' : true;
    });

    useEffect(() => {
        localStorage.setItem('settings_isStatusBarOpen', String(isStatusBarOpen));
    }, [isStatusBarOpen]);

    const [headerHeight, setHeaderHeight] = useState<number>(76);

    const interactionHook = useInteraction({
        ...nodesHook, ...connectionsHook, ...groupsHook, ...canvasHook,
        ...dialogsHook, handleToggleCatalog: dialogsHook.handleToggleCatalog,
        deleteNodeAndConnections: entityActionsHook.deleteNodeAndConnections,
        onAddNode: entityActionsHook.onAddNode,
        handleDuplicateNode: orchestrationHook.handleDuplicateNode,
        handleDuplicateNodeWithContent: orchestrationHook.handleDuplicateNodeWithContent,
        copyNodeValue: orchestrationHook.copyNodeValue,
        pasteImageToNode: orchestrationHook.pasteImageToNode,
        addConnection: connectionsHook.addConnection,
        isSnapToGrid: globalState.isSnapToGrid, setIsSnapToGrid: globalState.setIsSnapToGrid, setLineStyle: globalState.setLineStyle, activeTool: globalState.activeTool, setActiveTool: globalState.setActiveTool, setSpawnLine: globalState.setSpawnLine,
        setError: globalState.setError,
        handleLoadCanvasIntoCurrentTab: canvasIOHook.handleLoadCanvasIntoCurrentTab,
        t,
        draggingInfo, setDraggingInfo,
        handleDetachNodeFromGroup,
        handleSaveCanvas: canvasIOHook.handleSaveCanvas,
        handleLoadCanvas: canvasIOHook.handleLoadCanvas,
        handleOpenConnectionQuickAdd: dialogsHook.handleOpenConnectionQuickAdd,
        handleOpenContextMenu: dialogsHook.handleOpenContextMenu,
        quickSlots: dialogsHook.quickSlots,
        isConnectionQuickAddOpen: dialogsHook.isConnectionQuickAddOpen,
        pasteGroup: entityActionsHook.pasteGroup,
        copyGroup: entityActionsHook.copyGroup,
        isSmartGuidesEnabled: globalState.isSmartGuidesEnabled, setIsSmartGuidesEnabled: globalState.setIsSmartGuidesEnabled, setSmartGuides: globalState.setSmartGuides,
        selectedNodeIds, setSelectedNodeIds,
        handleRenameNode: nodesHook.handleRenameNode,
        setFullSizeImage,
        handleOpenQuickAdd: dialogsHook.handleOpenQuickAdd,
        requestDeleteNodes: dialogsHook.requestDeleteNodes,
        isInstantCloseEnabled: globalState.isInstantCloseEnabled,
        handleAlignNodes: entityActionsHook.handleAlignNodes,
        handleDockNode: entityActionsHook.handleDockNode,
        handlePaste: (isAlternativeMode?: boolean) => orchestrationHook.handlePaste(selectedNodeIds, orchestrationHook.pasteNodeValue, orchestrationHook.pasteImageToNode, canvasHook, entityActionsHook, nodesHook, isAlternativeMode),
        selectNode: (nodeId: string) => setSelectedNodeIds([nodeId]),
        dockHoverMode: globalState.dockHoverMode,
        setDockHoverMode: globalState.setDockHoverMode,
        isDockingMenuVisible: globalState.isDockingMenuVisible,
        setIsDockingMenuVisible: globalState.setIsDockingMenuVisible,
        undoPosition: positionHistoryHook.undoPosition,
        redoPosition: positionHistoryHook.redoPosition,
        handleToggleNodePin: nodesHook.handleToggleNodePin,
        setIsHistoryPanelOpen,
        setIsTaskQueuePanelOpen,
        handleCloseActiveTab: () => dialogsHook.handleCloseTab(activeTabId)
    });

    const handleNodeContextMenuLogic = useCallback((e: React.MouseEvent, nodeId: string) => {
        const node = nodesHook.nodes.find(n => n.id === nodeId);
        if (!node) return;
        if (!selectedNodeIds.includes(nodeId)) {
            setSelectedNodeIds([nodeId]);
        }
        dialogsHook.handleOpenNodeContextMenu(e, nodeId);
    }, [nodesHook.nodes, selectedNodeIds, setSelectedNodeIds, dialogsHook.handleOpenNodeContextMenu]);

    const handleToggleNodeCollapse = useCallback((nodeId: string) => {
        nodesHook.handleToggleNodeCollapse(nodeId);

        const node = nodesHook.nodes.find(n => n.id === nodeId);
        if (node) {
            const parentGroup = groupsHook.groups.find(g => g.nodeIds.includes(nodeId));
            if (parentGroup) {
                const updatedNodes = nodesHook.nodes.map(n => n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n);
                const groupNodes = updatedNodes.filter(n => parentGroup.nodeIds.includes(n.id));
                const newBounds = calculateGroupBounds(groupNodes);

                if (newBounds) {
                    groupsHook.setGroups(prev => prev.map(g => g.id === parentGroup.id ? { ...g, ...newBounds } : g));
                }
            }
        }
    }, [nodesHook.handleToggleNodeCollapse, nodesHook.nodes, groupsHook.groups, groupsHook.setGroups]);

    const handleRegenerateFrame = useCallback((nodeId: string, frameNumber: number) => {
        const node = nodesHook.nodes.find(n => n.id === nodeId);
        if (node?.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
            geminiGenerationHook.handleGenerateSelectedFrames(nodeId, [frameNumber]);
        } else {
            geminiGenerationHook.handleEditImage(nodeId, [frameNumber]);
        }
    }, [geminiGenerationHook, nodesHook.nodes]);

    const canvasEventsHook = useCanvasEvents({
        ...interactionHook, ...dialogsHook, ...canvasHook, ...entityActionsHook, ...canvasIOHook,
        ...nodesHook, ...connectionsHook, ...groupsHook,
        catalogItems: catalogHook.currentCatalogItems, libraryItems: libraryHook.currentLibraryItems,
        handleLoadCanvasIntoCurrentTab: canvasIOHook.handleLoadCanvasIntoCurrentTab,
        setError: globalState.setError, pasteImageToNode: orchestrationHook.pasteImageToNode,
        isPanning: canvasHook.isPanning, addGroup: groupsHook.addGroup, onAddNode: entityActionsHook.onAddNode,
        draggingInfo, zoomDragInfo: interactionHook.zoomDragInfo,
        characterCatalogItems: characterCatalogHook.items,
        scriptCatalogItems: scriptCatalogHook.items,
        sequenceCatalogItems: sequenceCatalogHook.items,
        connectingInfo: interactionHook.connectingInfo,
        setFullSizeImage,
        t,
        handleAddGroupFromCatalog: orchestrationHook.handleAddGroupFromCatalog,
        activeTabId: activeTabId,
        handleRenameTab: handleRenameTab,
        handleRemoveGroup,
        isImageDropMenuEnabled: globalState.isImageDropMenuEnabled 
    });

    const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
        const target = e.target as Element;
        if (target.closest('.node-view') || target.closest('.group-view') || target.closest('.connection-view') || target.closest('input, textarea, button, a, select')) return;
        
        if (interactionHook.wasRightClickPan && interactionHook.wasRightClickPan()) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        dialogsHook.handleOpenContextMenu({ x: e.clientX, y: e.clientY });
    }, [dialogsHook.handleOpenContextMenu, interactionHook]);

    const handleResetCanvas = useCallback((e?: React.MouseEvent) => {
        const performReset = () => {
            const defaultState = getLocalizedCanvasState(language);
            resetCurrentTab(language);
            loadCanvasState(defaultState);
        };

        if (e?.shiftKey) {
            performReset();
        } else {
            dialogsHook.setConfirmInfo({
                title: t('dialog.confirmReset.title'),
                message: t('dialog.confirmReset.message'),
                onConfirm: performReset
            });
        }
    }, [resetCurrentTab, language, t, dialogsHook, getLocalizedCanvasState, loadCanvasState]);

    const handleClearCanvas = useCallback((e?: React.MouseEvent) => {
        const performClear = () => {
            nodesHook.setNodes([]);
            connectionsHook.setConnections([]);
            groupsHook.setGroups([]);
            setFullSizeImageCache({});
            addToast(t('toast.canvasCleared') || 'Холст очищен', 'info');
        };

        if (e?.shiftKey) {
            performClear();
        } else {
            dialogsHook.setConfirmInfo({
                title: t('dialog.confirmClear.title') || 'Очистить холст',
                message: t('dialog.confirmClear.message') || 'Вы уверены, что хотите удалить все ноды на текущей вкладке?',
                onConfirm: performClear
            });
        }
    }, [nodesHook, connectionsHook, groupsHook, setFullSizeImageCache, addToast, dialogsHook, t]);

    const value = useMemo(() => {
        const { replaceAllItems: libReplaceAll, importItemsData: libImport, ...restLibrary } = libraryHook;
        const { replaceAllItems: catReplaceAll, importItemsData: catImport, ...restCatalog } = catalogHook;

        return {
            ...tabsHook, ...nodesHook, ...connectionsHook, ...groupsHook, ...canvasHook,
            ...dialogsHook,
            ...restCatalog,
            ...restLibrary,
            ...permissionsHook, ...canvasIOHook,
            ...entityActionsHook, ...interactionHook, ...derivedMemoHook, ...canvasEventsHook,
            ...geminiAnalysisHook, ...geminiConversationHook, ...geminiChainExecutionHook, ...geminiGenerationHook, ...geminiModificationHook,
            ...positionHistoryHook, ...globalState, ...orchestrationHook, ...googleDriveHook, ...generationHistoryHook,

            // Synchronized tab management
            tabs,
            setTabs,
            activeTabId,
            setActiveTabId,
            handleSwitchTab,
            handleAddTab,
            handleCloseTab: dialogsHook.handleCloseTab,
            handleRenameTab,
            handleReorderTabs,
            resetTabs,
            resetCurrentTab,
            restoreSession,
            getCurrentCanvasState,

            tutorialStep: tutorialHook.tutorialStep,
            advanceTutorial: tutorialHook.advanceTutorial,
            setTutorialStep: tutorialHook.setTutorialStep,
            tutorialTargetId: tutorialHook.tutorialTargetId,
            startTutorial: tutorialHook.startTutorial,
            skipTutorial: tutorialHook.skipTutorial,

            t,
            onSanitize: geminiModificationHook.handleSanitizePrompt,
            characterCatalog: characterCatalogHook,
            scriptCatalog: scriptCatalogHook,
            sequenceCatalog: sequenceCatalogHook,

            onRenameCharacter: (id: string, name: string) => dialogsHook.setRenameInfo({ type: 'character', id, currentTitle: name }),
            onRenameScript: (id: string, name: string) => dialogsHook.setRenameInfo({ type: 'script', id, currentTitle: name }),
            onRenameSequence: (id: string, name: string) => dialogsHook.setRenameInfo({ type: 'sequence', id, currentTitle: name }),
            onGenerateSelectedFrames: geminiGenerationHook.handleGenerateSelectedFrames,
            onTranslateScript: geminiModificationHook.handleTranslateScript,
            onReadData,
            onRefreshUpstreamData: (nodeId: string, handleId?: string) => { },

            handleDetachNodeFromGroup,
            onDetachCharacter: orchestrationHook.handleDetachCharacterFromGenerator,
            onSaveScriptToDisk: canvasIOHook.handleSaveScriptFile,
            onSaveMediaToDisk: orchestrationHook.onSaveMediaToDisk,
            onGenerateCharacterImage: geminiGenerationHook.handleGenerateCharacterImage,
            onStopGeneration: geminiModificationHook.handleStopGeneration,
            onEditImage: geminiGenerationHook.handleEditImage,
            onImageToText: geminiAnalysisHook.handleImageToText,
            handleRegenerateFrame,
            handleLoadFromExternal: canvasIOHook.handleLoadFromExternal,

            handleNavigateToNodeFrame,
            handleSplitConnection,

            replaceAllItems: libReplaceAll,
            importItemsData: libImport,

            handleToggleNodeCollapse,
            handleNodeContextMenuLogic,
            handleCanvasContextMenu,
            isGlobalProcessing: activeOperations.size > 0,
            handlePaste: (isAlternativeMode = false) => orchestrationHook.handlePaste(
                selectedNodeIds,
                orchestrationHook.pasteNodeValue,
                orchestrationHook.pasteImageToNode,
                canvasHook,
                entityActionsHook,
                nodesHook,
                isAlternativeMode
            ),
            handleDownloadImage: (id: string) => orchestrationHook.handleDownloadImage(id, onDownloadImageFromUrl),
            setLibraryItems: libReplaceAll,
            activeTool: interactionHook.effectiveTool,
            setActiveTool: interactionHook.setActiveTool as React.Dispatch<React.SetStateAction<Tool>>,
            dragOverNodeId: interactionHook.hoveredNodeId,
            isDraggingOverCanvas: false,
            handleOpenNodeContextMenu: handleNodeContextMenuLogic,
            onRefreshChat: geminiConversationHook.handleRefreshChat,
            isStopping: geminiModificationHook.isStopping || geminiGenerationHook.isStoppingEdit,
            isStoppingSequence: geminiGenerationHook.isStoppingEdit,
            selectNode: (nodeId: string) => setSelectedNodeIds([nodeId]),
            handleAddNodeAndConnect: handleAddNodeAndConnectWrapper,
            handleToggleNodePin: nodesHook.handleToggleNodePin,
            handleToggleNodeHandles: nodesHook.handleToggleNodeHandles,
            handleClearNodeNewFlag: nodesHook.handleClearNodeNewFlag,
            handleResetCanvas: handleResetCanvas,
            handleClearCanvas: handleClearCanvas,
            resetCanvasToDefault: resetCanvasToDefault,
            
            handleNodeCutConnections: connectionsHook.removeConnectionsByNodeId,

            showWelcome: globalState.showWelcome,
            setShowWelcome: globalState.setShowWelcome,

            nextAutoSaveTime: tabsHook.nextAutoSaveTime,
            isAutoSaving: tabsHook.isAutoSaving,
            autoSaveInterval: globalState.autoSaveInterval,
            setAutoSaveInterval: globalState.setAutoSaveInterval,
            panelStyle: globalState.panelStyle,
            setPanelStyle: globalState.setPanelStyle,
            isPanelAutoHide: globalState.isPanelAutoHide,
            setIsPanelAutoHide: globalState.setIsPanelAutoHide,
            panelAnimation: globalState.panelAnimation,
            setPanelAnimation: globalState.setPanelAnimation,
            isPanelAnimationAdaptive: globalState.isPanelAnimationAdaptive,
            setIsPanelAnimationAdaptive: globalState.setIsPanelAnimationAdaptive,
            panelAnimationConfig: globalState.panelAnimationConfig,
            setPanelAnimationConfig: globalState.setPanelAnimationConfig,
            updatePanelAnimationConfig: globalState.updatePanelAnimationConfig,
            resetPanelAnimationConfig: globalState.resetPanelAnimationConfig,
            isPanelAnimationConfigOpen: globalState.isPanelAnimationConfigOpen,
            setIsPanelAnimationConfigOpen: globalState.setIsPanelAnimationConfigOpen,
            panelAnimationConfigActiveTab: globalState.panelAnimationConfigActiveTab,
            setPanelAnimationConfigActiveTab: globalState.setPanelAnimationConfigActiveTab,
            openPanelAnimationConfig: globalState.openPanelAnimationConfig,

            connectionAnimationStyle: globalState.connectionAnimationStyle,
            setConnectionAnimationStyle: globalState.setConnectionAnimationStyle,
            connectionAnimationConfig: globalState.connectionAnimationConfig,
            setConnectionAnimationConfig: globalState.setConnectionAnimationConfig,
            updateConnectionAnimationConfig: globalState.updateConnectionAnimationConfig,
            resetConnectionAnimationConfig: globalState.resetConnectionAnimationConfig,
            isConnectionConfigOpen: globalState.isConnectionConfigOpen,
            setIsConnectionConfigOpen: globalState.setIsConnectionConfigOpen,

            onUpdateCharacterDescription: geminiModificationHook.handleUpdateCharacterDescription,
            handleUpdateCharacterDescription: geminiModificationHook.handleUpdateCharacterDescription,
            isUpdatingDescription: geminiModificationHook.isUpdatingDescription,
            onUpdateCharacterPersonality: geminiModificationHook.handleUpdateCharacterPersonality,
            handleUpdateCharacterPersonality: geminiModificationHook.handleUpdateCharacterPersonality,
            isUpdatingPersonality: geminiModificationHook.isUpdatingPersonality,
            onUpdateCharacterAppearance: geminiModificationHook.handleUpdateCharacterAppearance,
            handleUpdateCharacterAppearance: geminiModificationHook.handleUpdateCharacterAppearance,
            isUpdatingAppearance: geminiModificationHook.isUpdatingAppearance,
            onUpdateCharacterClothing: geminiModificationHook.handleUpdateCharacterClothing,
            handleUpdateCharacterClothing: geminiModificationHook.handleUpdateCharacterClothing,
            isUpdatingClothing: geminiModificationHook.isUpdatingClothing,
            onModifyCharacter: geminiModificationHook.handleModifyCharacter,
            handleModifyCharacter: geminiModificationHook.handleModifyCharacter,
            isModifyingCharacter: geminiModificationHook.isModifyingCharacter,
            onGenerateImage: geminiGenerationHook.handleGenerateImage,
            handleUpdateCharacterPromptFromImage: geminiAnalysisHook.handleUpdateCharacterPromptFromImage,
            isUpdatingCharacterPrompt: geminiAnalysisHook.isUpdatingCharacterPrompt,
            onDownloadImageFromUrl,
            onCopyImageToClipboard,
            
            handleRemoveGroup,
            handleSaveGroupToCatalog,
            handleSaveGroupToDisk,
            handleDetachAndPasteConcept,
            onDetachImageToNode,
            onSaveCharacterToCatalog,
            onSaveGeneratedCharacterToCatalog,
            onSaveScriptToCatalog,
            onSaveSequenceToCatalog,
            onSavePromptToLibrary: libraryHook.saveProcessorPrompt,
            onSaveToLibrary: libraryHook.saveToLibrary,
            clearSelectionsSignal: globalState.clearSelectionsSignal,
            globalImageEditor: globalState.globalImageEditor,
            openGlobalImageEditor: globalState.openGlobalImageEditor,
            closeGlobalImageEditor: globalState.closeGlobalImageEditor,
            handleDeleteFromDrive: googleDriveHook.handleDeleteFromDrive,
            handleClearCloudFolder: googleDriveHook.handleClearCloudFolder,
            handleCleanupDuplicates: googleDriveHook.handleCleanupDuplicates,
            ...taskQueueHook,
            ...batchManagerHook,
            clearUnusedFullSizeImages,
            updateNodeInStorage,
            forceSaveSession,
            setIsHistoryPanelOpen,
            setIsTaskQueuePanelOpen,
            isStatusBarOpen,
            setIsStatusBarOpen,
            headerHeight,
            setHeaderHeight,
            isCanvasLoading
        };
    }, [
        tabsHook, nodesHook, connectionsHook, groupsHook, canvasHook,
        dialogsHook, catalogHook, libraryHook, permissionsHook, canvasIOHook,
        entityActionsHook, interactionHook, derivedMemoHook, canvasEventsHook,
        geminiAnalysisHook, geminiConversationHook, geminiChainExecutionHook, geminiGenerationHook, geminiModificationHook,
        positionHistoryHook, globalState, orchestrationHook, tutorialHook, googleDriveHook, generationHistoryHook, taskQueueHook, batchManagerHook,
        updateNodeInStorage, forceSaveSession, clearUnusedFullSizeImages,
        tabs, activeTabId, handleSwitchTab, handleAddTab, dialogsHook.handleCloseTab, handleRenameTab, handleReorderTabs, resetTabs, resetCurrentTab, restoreSession, getCurrentCanvasState,
        handleToggleNodeCollapse, handleNodeContextMenuLogic, handleCanvasContextMenu, activeOperations.size, selectedNodeIds,
        t, characterCatalogHook, scriptCatalogHook, sequenceCatalogHook,
        handleDetachNodeFromGroup, handleAddNodeAndConnectWrapper, handleRegenerateFrame, geminiAnalysisHook.handleImageToText,
        handleResetCanvas, handleClearCanvas, resetCanvasToDefault, nodesHook.handleToggleNodeHandles, nodesHook.handleClearNodeNewFlag,
        geminiAnalysisHook.handleUpdateCharacterPromptFromImage, geminiAnalysisHook.isUpdatingCharacterPrompt,
        geminiModificationHook.handleUpdateCharacterPersonality, geminiModificationHook.isUpdatingPersonality,
        geminiModificationHook.handleUpdateCharacterAppearance, geminiModificationHook.isUpdatingAppearance,
        geminiModificationHook.handleUpdateCharacterClothing, geminiModificationHook.isUpdatingClothing,
        onDownloadImageFromUrl, onCopyImageToClipboard, handleNavigateToNodeFrame, handleSplitConnection,
        connectionsHook.removeConnectionsByNodeId,
        handleRemoveGroup, handleSaveGroupToCatalog, handleSaveGroupToDisk, handleDetachAndPasteConcept, onDetachImageToNode,
        onSaveCharacterToCatalog, onSaveGeneratedCharacterToCatalog, onSaveScriptToCatalog, onSaveSequenceToCatalog,
        isStatusBarOpen, setIsStatusBarOpen, headerHeight, setHeaderHeight, isCanvasLoading
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within a AppProvider');
    }
    return context;
};
