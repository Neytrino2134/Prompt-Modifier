
import React, { createContext, useContext, ReactNode, useMemo, useCallback, useRef, useEffect } from 'react';
import type { AppContextType } from './AppContextTypes';
import { useLanguage, LanguageCode } from '../localization';
import { NodeType } from '../types';
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
    calculateGroupBounds,
    CatalogItemType,
    ContentCatalogItemType,
} from '../hooks';
import { useGoogleDrive } from '../hooks/useGoogleDrive'; // Import new hook
import { useGlobalState } from '../hooks/useGlobalState';
import { useAppOrchestration } from '../hooks/useAppOrchestration';
import { useTutorial } from '../hooks/useTutorial';
import { addMetadataToPNG } from '../utils/pngMetadata';
import { getConnectionPoints, getOutputHandleType, getMinNodeSize, RATIO_INDICES } from '../utils/nodeUtils';
import { generateThumbnail } from '../utils/imageUtils';

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t, language, setLanguage } = useLanguage();
    const permissionsHook = usePermissions('clipboard-read');

    // Core Hooks
    const tabsHook = useTabs();
    const { tabs, setTabs, activeTabId, setActiveTabId, handleAddTab, handleSwitchTab, handleRenameTab, handleCloseTab, resetTabs, resetCurrentTab, getLocalizedCanvasState } = tabsHook;

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
        toasts, addToast, fullSizeImageCache, setFullSizeImageCache, setFullSizeImage, getFullSizeImage,
        clearImagesForNodeFromCache, clearUnusedFullSizeImages, registerOperation, unregisterOperation, activeOperations,
        selectedNodeIds, setSelectedNodeIds, draggingInfo, setDraggingInfo,
        showWelcome, setShowWelcome
    } = globalState;

    const nodesHook = useNodes(activeTab.state.nodes, activeTab.state.nodeIdCounter, addToast, t, setFullSizeImage, getFullSizeImage);
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

    // Helper for Sync
    const getCurrentCanvasState = useCallback(() => ({
        nodes: nodesHook.nodes,
        connections: connectionsHook.connections,
        groups: groupsHook.groups,
        viewTransform: canvasHook.viewTransform,
        nodeIdCounter: nodesHook.nodeIdCounter.current,
        fullSizeImageCache: fullSizeImageCache,
    }), [nodesHook.nodes, connectionsHook.connections, groupsHook.groups, canvasHook.viewTransform, nodesHook.nodeIdCounter, fullSizeImageCache]);

    const loadCanvasState = useCallback((state: any) => {
        nodesHook.setNodes(state.nodes);
        connectionsHook.setConnections(state.connections);
        groupsHook.setGroups(state.groups || []);
        canvasHook.setViewTransform(state.viewTransform);
        nodesHook.nodeIdCounter.current = state.nodeIdCounter;
        setFullSizeImageCache(state.fullSizeImageCache || {});
    }, [nodesHook, connectionsHook, groupsHook, canvasHook, setFullSizeImageCache]);

    // Sync Tabs Effect
    useEffect(() => {
        const newActiveTab = tabs.find(t => t.id === activeTabId);
        if (newActiveTab) {
            loadCanvasState(newActiveTab.state);
        }
    }, [activeTabId]);

    useEffect(() => {
        const stateToSave = getCurrentCanvasState();
        const currentTab = tabs.find(t => t.id === activeTabId);

        // Prevent infinite loops by checking reference equality
        if (currentTab) {
            const prevState = currentTab.state;
            const isIdentical =
                prevState.nodes === stateToSave.nodes &&
                prevState.connections === stateToSave.connections &&
                prevState.groups === stateToSave.groups &&
                prevState.viewTransform === stateToSave.viewTransform &&
                prevState.fullSizeImageCache === stateToSave.fullSizeImageCache &&
                prevState.nodeIdCounter === stateToSave.nodeIdCounter;

            if (isIdentical) return;
        }

        setTabs(prevTabs => prevTabs.map(tab => tab.id === activeTabId ? { ...tab, state: stateToSave } : tab));
    }, [getCurrentCanvasState, activeTabId, setTabs, tabs]);

    const resetCanvasToDefault = useCallback((lang: LanguageCode) => {
        resetTabs(lang);
    }, [resetTabs]);

    // Derived Action Hooks
    const activeTabIdRef = useRef(activeTabId);
    useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

    const entityActionsHook = useEntityActions({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, connections: connectionsHook.connections, setConnections: connectionsHook.setConnections, nodeIdCounter: nodesHook.nodeIdCounter, groups: groupsHook.groups, setGroups: groupsHook.setGroups, t, clearImagesForNodeFromCache, tabId: activeTabId, addToast, getFullSizeImage, setFullSizeImage, takeSnapshot: positionHistoryHook.takeSnapshot
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

    // Google Drive Hook (Initialized with access to current state)
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
        t
    });

    // Gemini Hooks
    const geminiAnalysisHook = useGeminiAnalysis({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, getUpstreamNodeValues, setError: globalState.setError, t, setFullSizeImage, getFullSizeImage, activeTabId, setTabs, activeTabName: activeTab.name, registerOperation, unregisterOperation, addToast
    });

    const geminiModificationHook = useGeminiModification({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, getUpstreamNodeValues, setError: globalState.setError, t, activeTabId, setTabs, activeTabName: activeTab.name, registerOperation, unregisterOperation, addToast
    });

    const geminiConversationHook = useGeminiConversation({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, setError: globalState.setError, t, getUpstreamNodeValues, activeTabId, setTabs
    });

    const geminiGenerationHook = useGeminiGeneration({
        nodes: nodesHook.nodes, connections: connectionsHook.connections, setNodes: nodesHook.setNodes, getUpstreamNodeValues, setError: globalState.setError, showApiKeyDialog: (cb) => dialogsHook.showApiKeyDialog(cb), t, setFullSizeImage, getFullSizeImage, connectedCharacterData: derivedMemoHook.connectedCharacterData, activeTabId, setTabs, activeTabName: activeTab.name, registerOperation, unregisterOperation, isGlobalProcessing: activeOperations.size > 0, addToast
    });

    const geminiChainExecutionHook = useGeminiChainExecution({
        nodes: nodesHook.nodes, setNodes: nodesHook.setNodes, connections: connectionsHook.connections, setError: globalState.setError, getUpstreamNodeValues, t, setFullSizeImage, getFullSizeImage, activeTabId, activeTabName: activeTab.name, registerOperation, unregisterOperation, isGlobalProcessing: activeOperations.size > 0, setTabs
    });

    const canvasIOHook = useCanvasIO({
        getCurrentCanvasState, loadCanvasState, setError: globalState.setError, nodes: nodesHook.nodes, getPromptForNode: entityActionsHook.getPromptForNode, handleValueChange: nodesHook.handleValueChange, addToast, t, activeTabName: activeTab.name, getFullSizeImage, handleRenameTab, activeTabId, setFullSizeImage, tabs: tabsHook.tabs, setTabs: tabsHook.setTabs, setActiveTabId: tabsHook.setActiveTabId, catalogItems: catalogHook.catalogItems, setCatalogItems: catalogHook.replaceAllItems, libraryItems: libraryHook.libraryItems, setLibraryItems: libraryHook.replaceAllItems, characterCatalog: characterCatalogHook, scriptCatalog: scriptCatalogHook, sequenceCatalog: sequenceCatalogHook, language, setLanguage, isSnapToGrid: globalState.isSnapToGrid, setIsSnapToGrid: globalState.setIsSnapToGrid, lineStyle: globalState.lineStyle, setLineStyle: globalState.setLineStyle, setConfirmInfo: (info) => dialogsHook.setConfirmInfo(info), handleRenameNode: nodesHook.handleRenameNode, onAddNode: entityActionsHook.onAddNode, pasteGroup: entityActionsHook.pasteGroup, viewTransform: canvasHook.viewTransform
    });

    const dialogsHook = useDialogsAndUI({
        setGroups: groupsHook.setGroups, renameCatalogItem: catalogHook.renameCatalogItem, updateLibraryItem: libraryHook.updateLibraryItem, handleRenameTab: handleRenameTab, handleCloseTab: handleCloseTab, handleRenameNode: nodesHook.handleRenameNode, getCurrentCanvasState: getCurrentCanvasState, loadCanvasState, tabs, activeTabId, t, characterCatalog: characterCatalogHook, scriptCatalog: scriptCatalogHook, sequenceCatalog: sequenceCatalogHook,
    });

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

    const handleDetachNodeFromGroup = useCallback((nodeId: string) => {
        const currentNodes = nodesHook.nodes;
        groupsHook.setGroups(currentGroups => {
            const groupContainingNode = currentGroups.find(g => g.nodeIds.includes(nodeId));
            if (!groupContainingNode) return currentGroups;
            const newNodeIds = groupContainingNode.nodeIds.filter(id => id !== nodeId);
            if (newNodeIds.length > 0) {
                const remainingNodes = currentNodes.filter(n => newNodeIds.includes(n.id));
                const newBounds = calculateGroupBounds(remainingNodes);
                if (newBounds) {
                    return currentGroups.map(g => g.id === groupContainingNode.id ? { ...g, nodeIds: newNodeIds, ...newBounds } : g);
                }
                return currentGroups.map(g => g.id === groupContainingNode.id ? { ...g, nodeIds: newNodeIds } : g);
            } else {
                return currentGroups.filter(g => g.id !== groupContainingNode.id);
            }
        });
    }, [groupsHook.setGroups, nodesHook.nodes]);

    // --- Missing Handlers Implementation ---
    
    const handleRemoveGroup = useCallback((groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.shiftKey) {
            const group = groupsHook.groups.find(g => g.id === groupId);
            if (group) {
                group.nodeIds.forEach(id => entityActionsHook.deleteNodeAndConnections(id));
            }
            groupsHook.removeGroup(groupId);
            addToast(t('toast.groupDeleted'), 'info');
        } else {
            groupsHook.removeGroup(groupId);
        }
    }, [groupsHook, entityActionsHook, addToast, t]);

    const handleSaveGroupToCatalog = useCallback((groupId: string) => {
        const group = groupsHook.groups.find(g => g.id === groupId);
        if (!group) return;
        catalogHook.saveGroupToCatalog(group, nodesHook.nodes, connectionsHook.connections, globalState.fullSizeImageCache);
        addToast(t('alert.groupSaved', { groupTitle: group.title }), 'success');
    }, [groupsHook, nodesHook, connectionsHook, globalState.fullSizeImageCache, catalogHook, addToast, t]);

    const handleSaveGroupToDisk = useCallback((groupId: string) => {
         const group = groupsHook.groups.find(g => g.id === groupId);
         if (!group) return;
         
         const groupNodes = nodesHook.nodes.filter(n => group.nodeIds.includes(n.id));
         const groupNodeIds = new Set(groupNodes.map(n => n.id));
         const groupConnections = connectionsHook.connections.filter(c => groupNodeIds.has(c.fromNodeId) && groupNodeIds.has(c.toNodeId));
         
         const images: Record<string, Record<number, string>> = {};
         groupNodes.forEach(n => {
             if (globalState.fullSizeImageCache[n.id]) {
                 images[n.id] = globalState.fullSizeImageCache[n.id];
             }
         });

         const data = {
             type: 'prompModifierGroup',
             name: group.title,
             nodes: groupNodes,
             connections: groupConnections,
             fullSizeImages: images
         };
         
         const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `${group.title.replace(/\s+/g, '_')}_Group.json`;
         a.click();
         URL.revokeObjectURL(url);
         addToast(t('toast.groupSavedToDisk', { groupTitle: group.title }), 'success');
    }, [groupsHook, nodesHook, connectionsHook, globalState.fullSizeImageCache, addToast, t]);

    const handleDetachAndPasteConcept = useCallback((sequenceNodeId: string, conceptToPaste: any) => {
        const sourceNode = nodesHook.nodes.find(n => n.id === sequenceNodeId);
        const position = sourceNode 
            ? { x: sourceNode.position.x + sourceNode.width + 50, y: sourceNode.position.y } 
            : { x: 0, y: 0 };
            
        const newNodeId = entityActionsHook.onAddNode(NodeType.CHARACTER_CARD, position, conceptToPaste.name);
        
        const cardData = [{
            id: `char-card-${Date.now()}`,
            name: conceptToPaste.name || 'New Entity',
            index: conceptToPaste.index || 'Entity-1',
            image: conceptToPaste.image,
            thumbnails: { '1:1': conceptToPaste.image, '16:9': null, '9:16': null },
            selectedRatio: '1:1',
            prompt: conceptToPaste.prompt || '',
            fullDescription: conceptToPaste.fullDescription || '',
            isOutput: true,
            isActive: true
        }];
        
        if (conceptToPaste._fullResImage) {
             setFullSizeImage(newNodeId, 0, conceptToPaste._fullResImage);
             setFullSizeImage(newNodeId, 1, conceptToPaste._fullResImage); 
        } else if (conceptToPaste.image && conceptToPaste.image.startsWith('data:')) {
             setFullSizeImage(newNodeId, 0, conceptToPaste.image);
             setFullSizeImage(newNodeId, 1, conceptToPaste.image);
        }

        nodesHook.handleValueChange(newNodeId, JSON.stringify(cardData));
        addToast(t('toast.pastedFromClipboard'), 'success');
    }, [nodesHook, entityActionsHook, setFullSizeImage, addToast, t]);

    const onDetachImageToNode = useCallback((imageDataUrl: string, sourceNodeId: string) => {
        const sourceNode = nodesHook.nodes.find(n => n.id === sourceNodeId);
        const position = sourceNode 
            ? { x: sourceNode.position.x + sourceNode.width + 50, y: sourceNode.position.y } 
            : { x: 0, y: 0 };
            
        const newNodeId = entityActionsHook.onAddNode(NodeType.IMAGE_INPUT, position);
        
        setFullSizeImage(newNodeId, 0, imageDataUrl);
        generateThumbnail(imageDataUrl, 256, 256).then(thumb => {
             nodesHook.handleValueChange(newNodeId, JSON.stringify({ image: thumb, prompt: '' }));
        });
        
        addToast(t('toast.pastedFromClipboard'), 'success');
    }, [nodesHook, entityActionsHook, setFullSizeImage, addToast, t]);

    const onSaveCharacterToCatalog = useCallback((nodeId: string, cardIndex?: number) => {
        const node = nodesHook.nodes.find(n => n.id === nodeId);
        if (!node || node.type !== NodeType.CHARACTER_CARD) return;

        try {
            let characters = JSON.parse(node.value || '[]');
            if (!Array.isArray(characters)) characters = [characters];
            
            if (cardIndex !== undefined) {
                 const char = characters[cardIndex];
                 if (!char) return;
                 
                 // Resolve images
                 const fullSources: Record<string, string | null> = { ...char.thumbnails };
                 Object.entries(RATIO_INDICES).forEach(([ratio, index]) => {
                    const fullRes = getFullSizeImage(nodeId, (cardIndex * 10) + index);
                    if (fullRes) fullSources[ratio] = fullRes;
                 });
                 const activeImg = getFullSizeImage(nodeId, cardIndex * 10) || char.image;

                 const dataToSave = {
                    type: 'character-card',
                    name: char.name,
                    index: char.index,
                    image: activeImg,
                    imageSources: fullSources,
                    prompt: char.prompt,
                    fullDescription: char.fullDescription,
                    selectedRatio: char.selectedRatio,
                    additionalPrompt: char.additionalPrompt
                 };
                 
                 characterCatalogHook.createItem(ContentCatalogItemType.ITEM, char.name || 'New Character', JSON.stringify(dataToSave));
                 addToast(t('toast.characterSavedCatalog'), 'success');

            } else {
                 // Fallback: Save primary or all?
                 // For now, let's just log or ignore if no index, as button passes index.
            }
        } catch (e) {
            console.error("Failed to save character to catalog", e);
             addToast("Failed to save to catalog", 'error');
        }
    }, [nodesHook.nodes, characterCatalogHook, getFullSizeImage, addToast, t]);

    const onSaveGeneratedCharacterToCatalog = useCallback((characterData: any) => {
        if (!characterData) return;
        
        const dataToSave = {
            type: 'character-card', 
            name: characterData.name,
            index: characterData.alias || characterData.index,
            image: characterData.imageBase64 ? `data:image/png;base64,${characterData.imageBase64}` : null,
            imageSources: characterData.imageBase64 ? { '1:1': `data:image/png;base64,${characterData.imageBase64}` } : {},
            prompt: characterData.prompt,
            fullDescription: characterData.fullDescription,
            selectedRatio: '1:1',
            additionalPrompt: characterData.additionalPrompt
        };

        characterCatalogHook.createItem(ContentCatalogItemType.ITEM, characterData.name || 'Generated Character', JSON.stringify(dataToSave));
        addToast(t('toast.characterSavedCatalog'), 'success');
    }, [characterCatalogHook, addToast, t]);

    const onSaveScriptToCatalog = useCallback((nodeId: string) => {
        const node = nodesHook.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        if (node.type === NodeType.SCRIPT_GENERATOR || node.type === NodeType.SCRIPT_VIEWER) {
             scriptCatalogHook.createItem(ContentCatalogItemType.ITEM, node.title || 'New Script', node.value);
             addToast("Script saved to catalog", 'success');
        }
    }, [nodesHook.nodes, scriptCatalogHook, addToast]);

    const onSaveSequenceToCatalog = useCallback((nodeId: string) => {
        const node = nodesHook.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
            try {
                const data = JSON.parse(node.value || '{}');
                const contentToSave = {
                    type: 'script-prompt-modifier-data', 
                    title: node.title,
                    usedCharacters: data.usedCharacters,
                    sceneContexts: data.sceneContexts,
                    finalPrompts: (data.prompts || []).map((p:any) => ({
                         frameNumber: p.frameNumber,
                         sceneNumber: p.sceneNumber,
                         sceneTitle: p.sceneTitle,
                         characters: p.characters,
                         duration: p.duration,
                         prompt: p.prompt,
                         shotType: p.shotType
                    })),
                    videoPrompts: (data.prompts || []).map((p:any) => ({
                         frameNumber: p.frameNumber,
                         videoPrompt: p.videoPrompt
                    })),
                    styleOverride: data.styleOverride
                };
                
                sequenceCatalogHook.createItem(ContentCatalogItemType.ITEM, node.title || 'New Sequence', JSON.stringify(contentToSave));
                addToast("Sequence saved to catalog", 'success');
            } catch(e) { console.error(e); }
        } else if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
            try {
                const data = JSON.parse(node.value || '{}');
                const contentToSave = {
                    type: 'script-prompt-modifier-data',
                    title: node.title,
                    usedCharacters: data.usedCharacters,
                    sceneContexts: data.sceneContexts,
                    finalPrompts: data.modifiedPrompts || data.sourcePrompts || [], 
                    styleOverride: data.styleOverride
                };
                 sequenceCatalogHook.createItem(ContentCatalogItemType.ITEM, node.title || 'New Sequence', JSON.stringify(contentToSave));
                 addToast("Sequence saved to catalog", 'success');
            } catch(e) { console.error(e); }
        }
    }, [nodesHook.nodes, sequenceCatalogHook, addToast]);

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
        handleToggleNodePin: nodesHook.handleToggleNodePin
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
        handleRemoveGroup // Provide this to useCanvasEvents if it consumes it, though it doesn't seem to based on my reading.
        // It's mainly used directly in CanvasLayer.
    });

    const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
        const target = e.target as Element;
        if (target.closest('.node-view') || target.closest('.group-view') || target.closest('.connection-view') || target.closest('input, textarea, button, a, select')) return;
        e.preventDefault();
        dialogsHook.handleOpenContextMenu({ x: e.clientX, y: e.clientY });
    }, [dialogsHook.handleOpenContextMenu]);

    const handleResetCanvas = useCallback((e?: React.MouseEvent) => {
        const performReset = () => {
            const defaultState = getLocalizedCanvasState(language);
            resetCurrentTab(language);
            loadCanvasState(defaultState); // Immediately update UI
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

    const onDownloadImageFromUrl = useCallback((imageUrl: string, frameNumber: number, prompt: string, filenameOverride?: string) => {
        let assetUrl = imageUrl;
        if (imageUrl.startsWith('data:image/png')) {
            assetUrl = addMetadataToPNG(imageUrl, 'prompt', prompt);
        }
        const link = document.createElement('a');
        link.href = assetUrl;

        if (filenameOverride) {
            link.download = filenameOverride;
        } else {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const padded = String(frameNumber).padStart(3, '0');
            link.download = `Image_${padded}_${date}_${time}.png`;
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const onCopyImageToClipboard = useCallback(async (imageUrl: string): Promise<void> => {
        try {
            if (imageUrl && imageUrl.startsWith('data:image')) {
                const response = await fetch(imageUrl);
                let blob = await response.blob();

                // Convert to PNG if not already PNG
                if (blob.type !== 'image/png') {
                    try {
                        const imageBitmap = await createImageBitmap(blob);
                        const canvas = document.createElement('canvas');
                        canvas.width = imageBitmap.width;
                        canvas.height = imageBitmap.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(imageBitmap, 0, 0);
                            const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
                            if (pngBlob) blob = pngBlob;
                        }
                    } catch (e) {
                        console.error('Failed to convert image to PNG:', e);
                    }
                }

                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                addToast(t('toast.copiedToClipboard'));
            } else {
                addToast(t('toast.pasteFailed'), 'error');
            }
        } catch (err) {
            console.error('Failed to copy image to clipboard:', err);
            addToast(t('toast.pasteFailed'), 'error');
        }
    }, [addToast, t]);

    // Refs to avoid frequent context updates when these change
    const nodesRef = useRef(nodesHook.nodes);
    nodesRef.current = nodesHook.nodes;

    const viewTransformRef = useRef(canvasHook.viewTransform);
    viewTransformRef.current = canvasHook.viewTransform;

    const onReadData = useCallback((nodeId: string) => {
        const currentNodes = nodesRef.current;
        const node = currentNodes.find(n => n.id === nodeId);
        if (!node) return;

        const values = getUpstreamNodeValues(nodeId, undefined, currentNodes, false);

        let text = '';
        let image: string | null = null;
        let mediaUrl: string | null = null;
        let mediaType: 'video' | 'audio' = 'video';

        values.forEach(val => {
            if (typeof val === 'string') {
                if (val.startsWith('data:image')) {
                    if (!image) image = val;
                } else if (val.startsWith('data:video') || val.startsWith('data:audio') || val.match(/^https?:\/\/.*\.(mp4|webm|ogg|mp3|wav)$/i)) {
                    if (!mediaUrl) {
                        mediaUrl = val;
                        mediaType = val.startsWith('data:audio') || val.match(/\.(mp3|wav)$/i) ? 'audio' : 'video';
                    }
                } else {
                    if (text) text += (text ? '\n\n' : '') + val;
                    else text = val;
                }
            } else if (typeof val === 'object' && val !== null) {
                if (val.base64ImageData) {
                    if (!image) image = `data:${val.mimeType};base64,${val.base64ImageData}`;
                } else {
                    const str = JSON.stringify(val, null, 2);
                    if (text) text += (text ? '\n\n' : '') + str;
                    else text = str;
                }
            }
        });

        try {
            const current = JSON.parse(node.value || '{}');
            const newData = { text, image, mediaUrl, mediaType };

            if (JSON.stringify(current) !== JSON.stringify(newData)) {
                nodesHook.handleValueChange(nodeId, JSON.stringify(newData));
            }
        } catch {
            nodesHook.handleValueChange(nodeId, JSON.stringify({ text, image, mediaUrl, mediaType }));
        }

    }, [getUpstreamNodeValues, nodesHook.handleValueChange]);

    const handleSplitConnection = useCallback((connectionId: string) => {
        const connection = connectionsHook.connections.find(c => c.id === connectionId);
        if (!connection) return;

        const fromNode = nodesHook.nodes.find(n => n.id === connection.fromNodeId);
        const toNode = nodesHook.nodes.find(n => n.id === connection.toNodeId);
        if (!fromNode || !toNode) return;

        // Calculate Midpoint
        const { start, end } = getConnectionPoints(fromNode, toNode, connection);

        const { minWidth, minHeight } = getMinNodeSize(NodeType.REROUTE_DOT);
        const midPoint = {
            x: (start.x + end.x) / 2 - (minWidth / 2),
            y: (start.y + end.y) / 2 - (minHeight / 2)
        };

        // Determine Connection Type
        const fromType = getOutputHandleType(fromNode, connection.fromHandleId);

        // Create Reroute Dot
        const newNodeId = entityActionsHook.onAddNode(NodeType.REROUTE_DOT, midPoint);

        // Apply Type for Color
        const newValue = JSON.stringify({ type: fromType, direction: 'LR' });
        nodesHook.handleValueChange(newNodeId, newValue);

        // Update Connections
        connectionsHook.setConnections(prev => {
            // Remove old connection
            const filtered = prev.filter(c => c.id !== connectionId);

            // Add two new connections
            const conn1 = {
                id: `conn-split-1-${Date.now()}`,
                fromNodeId: connection.fromNodeId,
                fromHandleId: connection.fromHandleId,
                toNodeId: newNodeId,
                toHandleId: undefined // Reroute input is generic
            };

            const conn2 = {
                id: `conn-split-2-${Date.now()}`,
                fromNodeId: newNodeId,
                fromHandleId: undefined, // Reroute output is generic
                toNodeId: connection.toNodeId,
                toHandleId: connection.toHandleId
            };

            return [...filtered, conn1, conn2];
        });

    }, [connectionsHook, nodesHook, entityActionsHook]);

    const handleNavigateToNodeFrame = useCallback((nodeId: string, frameNumber: number) => {
        const targetNode = nodesRef.current.find(n => n.id === nodeId);
        if (!targetNode) return;

        // 1. Select the node
        setSelectedNodeIds([nodeId]);

        // 2. Center Canvas on Node
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        // Target world position (center of node)
        // Assume centered relative to its width, and set a comfortable top margin
        const targetX = targetNode.position.x + (targetNode.width / 2);
        const targetY = targetNode.position.y + 300;

        // Current scale
        const scale = viewTransformRef.current.scale;

        // Calculate new translation
        const newTx = (screenW / 2) - (targetX * scale);
        const newTy = (screenH / 2) - (targetY * scale);

        canvasHook.setViewTransform(prev => ({
            scale: prev.scale, // Keep current zoom
            translate: { x: newTx, y: newTy }
        }));

        // 3. Trigger selection in the node (PromptSequenceEditor logic)
        try {
            const currentVal = JSON.parse(targetNode.value || '{}');
            // Only update if actually different to avoid unnecessary updates
            if (currentVal.selectedFrameNumber !== frameNumber) {
                nodesHook.handleValueChange(nodeId, JSON.stringify({ ...currentVal, selectedFrameNumber: frameNumber }));
            }
        } catch (e) {
            console.error("Failed to update node selection frame", e);
        }

    }, [nodesHook.handleValueChange, canvasHook.setViewTransform, setSelectedNodeIds]);

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
            ...positionHistoryHook, ...globalState, ...orchestrationHook, ...googleDriveHook,

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
            handleLoadFromExternal: canvasIOHook.handleLoadFromExternal, // Export new method

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
                isAlternativeMode // Pass the flag
            ),
            handleDownloadImage: (id: string) => orchestrationHook.handleDownloadImage(id, onDownloadImageFromUrl),
            setLibraryItems: libReplaceAll,
            activeTool: interactionHook.effectiveTool,
            setActiveTool: interactionHook.setActiveTool,
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
            resetCanvasToDefault: resetCanvasToDefault,
            
            handleNodeCutConnections: connectionsHook.removeConnectionsByNodeId,

            showWelcome: globalState.showWelcome,
            setShowWelcome: globalState.setShowWelcome,

            nextAutoSaveTime: tabsHook.nextAutoSaveTime,
            isAutoSaving: tabsHook.isAutoSaving,

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
            onDownloadImageFromUrl, // Export to context
            onCopyImageToClipboard, // Export to context
            
            // Missing handlers added here
            handleRemoveGroup,
            handleSaveGroupToCatalog,
            handleSaveGroupToDisk,
            handleDetachAndPasteConcept,
            onDetachImageToNode,
            onSaveCharacterToCatalog,
            onSaveGeneratedCharacterToCatalog,
            onSaveScriptToCatalog,
            onSaveSequenceToCatalog,
            onSavePromptToLibrary: libraryHook.saveProcessorPrompt, // Map correctly
            onSaveToLibrary: libraryHook.saveToLibrary, // Map correctly
            clearSelectionsSignal: globalState.clearSelectionsSignal,
            globalImageEditor: globalState.globalImageEditor,
            openGlobalImageEditor: globalState.openGlobalImageEditor,
            closeGlobalImageEditor: globalState.closeGlobalImageEditor,
        };
    }, [
        tabsHook, nodesHook, connectionsHook, groupsHook, canvasHook,
        dialogsHook, catalogHook, libraryHook, permissionsHook, canvasIOHook,
        entityActionsHook, interactionHook, derivedMemoHook, canvasEventsHook,
        geminiAnalysisHook, geminiConversationHook, geminiChainExecutionHook, geminiGenerationHook, geminiModificationHook,
        positionHistoryHook, globalState, orchestrationHook, tutorialHook, googleDriveHook,
        handleToggleNodeCollapse, handleNodeContextMenuLogic, handleCanvasContextMenu, activeOperations.size, selectedNodeIds,
        t, characterCatalogHook, scriptCatalogHook, sequenceCatalogHook,
        handleDetachNodeFromGroup, handleAddNodeAndConnectWrapper, handleRegenerateFrame, geminiAnalysisHook.handleImageToText,
        handleResetCanvas, resetCanvasToDefault, nodesHook.handleToggleNodeHandles, nodesHook.handleClearNodeNewFlag,
        geminiAnalysisHook.handleUpdateCharacterPromptFromImage, geminiAnalysisHook.isUpdatingCharacterPrompt,
        geminiModificationHook.handleUpdateCharacterPersonality, geminiModificationHook.isUpdatingPersonality,
        geminiModificationHook.handleUpdateCharacterAppearance, geminiModificationHook.isUpdatingAppearance,
        geminiModificationHook.handleUpdateCharacterClothing, geminiModificationHook.isUpdatingClothing,
        onDownloadImageFromUrl, onCopyImageToClipboard, handleNavigateToNodeFrame, handleSplitConnection,
        connectionsHook.removeConnectionsByNodeId,
        handleRemoveGroup, handleSaveGroupToCatalog, handleSaveGroupToDisk, handleDetachAndPasteConcept, onDetachImageToNode,
        onSaveCharacterToCatalog, onSaveGeneratedCharacterToCatalog, onSaveScriptToCatalog, onSaveSequenceToCatalog
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
