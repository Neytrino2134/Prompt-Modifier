
import React, { useCallback, useRef } from 'react';
import { Node, NodeType, CanvasState, Tab, LibraryItem } from '../types';
import { getEmptyValueForNodeType, RATIO_INDICES } from '../utils/nodeUtils';
import { generateThumbnail } from '../utils/imageUtils';
import { inlineStoredOriginals } from '../services/originalImageStore';

interface UseCanvasIOProps {
    getCurrentCanvasState: () => CanvasState;
    loadCanvasState: (state: CanvasState, tabName?: string) => void;
    restoreSession: (tabs: Tab[], targetActiveTabId?: string) => void;
    setError: (error: string | null) => void;
    nodes: Node[];
    getPromptForNode: (nodeId: string) => string;
    handleValueChange: (nodeId: string, value: string) => void;
    addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
    t: (key: string, options?: { [key: string]: string | number }) => string;
    activeTabName: string;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
    handleRenameTab: (tabId: string, newName: string) => void;
    activeTabId: string;
    setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    tabs: Tab[];
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
    catalogItems: any[];
    setCatalogItems: (items: any[]) => void;
    libraryItems: LibraryItem[];
    setLibraryItems: (items: LibraryItem[]) => void;
    characterCatalog: any;
    scriptCatalog: any;
    sequenceCatalog: any;
    language: string;
    setLanguage: (lang: any) => void;
    secondaryLanguage?: string;
    setSecondaryLanguage?: (lang: any) => void;
    isSnapToGrid: boolean;
    setIsSnapToGrid: (val: boolean) => void;
    lineStyle: string;
    setLineStyle: (val: any) => void;
    currentTheme?: string;
    setTheme?: (val: any) => void;
    canvasColorMode?: string;
    setCanvasColorMode?: (val: any) => void;
    inputColorMode?: string;
    setInputColorMode?: (val: any) => void;
    panelStyle?: string;
    setPanelStyle?: (val: any) => void;
    isPanelAutoHide?: boolean;
    setIsPanelAutoHide?: (val: boolean) => void;
    panelAnimation?: string;
    setPanelAnimation?: (val: any) => void;
    isPanelAnimationAdaptive?: boolean;
    setIsPanelAnimationAdaptive?: (val: boolean) => void;
    panelAnimationConfig?: any;
    setPanelAnimationConfig?: (val: any) => void;
    cursorSkin?: string;
    setCursorSkin?: (val: any) => void;
    isCursorEffectEnabled?: boolean;
    setIsCursorEffectEnabled?: (val: boolean) => void;
    autoSaveInterval?: number;
    setAutoSaveInterval?: (val: number) => void;
    autoSaveHistoryLimit?: number;
    setAutoSaveHistoryLimit?: (val: number) => void;
    autoSaveSessionLimit?: number;
    setAutoSaveSessionLimit?: (val: number) => void;
    isInstantCloseEnabled?: boolean;
    setIsInstantCloseEnabled?: (val: boolean) => void;
    isImageDropMenuEnabled?: boolean;
    setIsImageDropMenuEnabled?: (val: boolean) => void;
    isHoverHighlightEnabled?: boolean;
    setIsHoverHighlightEnabled?: (val: boolean) => void;
    isBringToFrontOnHoverEnabled?: boolean;
    setIsBringToFrontOnHoverEnabled?: (val: boolean) => void;
    nodeAnimationMode?: string;
    setNodeAnimationMode?: (val: any) => void;
    isConnectionAnimationEnabled?: boolean;
    setIsConnectionAnimationEnabled?: (val: boolean) => void;
    connectionOpacity?: number;
    setConnectionOpacity?: (val: number) => void;
    connectionAnimationStyle?: string;
    setConnectionAnimationStyle?: (val: any) => void;
    connectionAnimationConfig?: any;
    setConnectionAnimationConfig?: (val: any) => void;
    isSmartGuidesEnabled?: boolean;
    setIsSmartGuidesEnabled?: (val: boolean) => void;
    setConfirmInfo: (info: any) => void;
    handleRenameNode: (nodeId: string, newName: string) => void;
    onAddNode: (type: NodeType, position: any) => string;
    pasteGroup: (data: any, position?: any) => void;
    viewTransform: { scale: number; translate: { x: number, y: number } };
}

export const useCanvasIO = (props: UseCanvasIOProps) => {
    const {
        getCurrentCanvasState, loadCanvasState, restoreSession, setError, nodes, handleValueChange, addToast, t,
        activeTabName, getFullSizeImage, handleRenameTab, activeTabId, setFullSizeImage, tabs, setTabs, setActiveTabId,
        catalogItems, setCatalogItems, libraryItems, setLibraryItems, characterCatalog, scriptCatalog, sequenceCatalog,
        language, setLanguage, secondaryLanguage, setSecondaryLanguage, isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle,
        currentTheme, setTheme, canvasColorMode, setCanvasColorMode, inputColorMode, setInputColorMode,
        panelStyle, setPanelStyle, isPanelAutoHide, setIsPanelAutoHide, panelAnimation, setPanelAnimation,
        isPanelAnimationAdaptive, setIsPanelAnimationAdaptive, panelAnimationConfig, setPanelAnimationConfig,
        cursorSkin, setCursorSkin, isCursorEffectEnabled, setIsCursorEffectEnabled, autoSaveInterval, setAutoSaveInterval,
        autoSaveHistoryLimit, setAutoSaveHistoryLimit, autoSaveSessionLimit, setAutoSaveSessionLimit,
        isInstantCloseEnabled, setIsInstantCloseEnabled, isImageDropMenuEnabled, setIsImageDropMenuEnabled,
        isHoverHighlightEnabled, setIsHoverHighlightEnabled, isBringToFrontOnHoverEnabled, setIsBringToFrontOnHoverEnabled,
        nodeAnimationMode, setNodeAnimationMode, isConnectionAnimationEnabled, setIsConnectionAnimationEnabled,
        connectionOpacity, setConnectionOpacity, connectionAnimationStyle, setConnectionAnimationStyle,
        connectionAnimationConfig, setConnectionAnimationConfig, isSmartGuidesEnabled, setIsSmartGuidesEnabled,
        setConfirmInfo, handleRenameNode, onAddNode, pasteGroup, viewTransform
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageSequenceFileInputRef = useRef<HTMLInputElement>(null);
    const promptSequenceEditorFileInputRef = useRef<HTMLInputElement>(null);
    const characterCardFileInputRef = useRef<HTMLInputElement>(null);
    const scriptFileInputRef = useRef<HTMLInputElement>(null);
    
    const nodeIdForLoad = useRef<string | null>(null);

    const getTimestamp = () => new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];

    // --- SAVE CANVAS / PROJECT ---

    const handleSaveCanvas = useCallback(async () => {
        const state = getCurrentCanvasState();
        const data = {
            type: 'prompt-modifier-canvas',
            appName: 'Prompt_modifier',
            version: 1,
            tabName: activeTabName,
            name: activeTabName,
            nodes: state.nodes || [],
            connections: state.connections || [],
            groups: state.groups || [],
            viewTransform: state.viewTransform || { scale: 1, translate: { x: 0, y: 0 } },
            nodeIdCounter: state.nodeIdCounter || 0,
            fullSizeImageCache: state.fullSizeImageCache || {},
            timestamp: new Date().toISOString()
        };
        
        let portableData;
        try { portableData = await inlineStoredOriginals(data); }
        catch (error) { addToast(`Не удалось загрузить оригиналы для экспорта: ${String(error)}`, 'error'); return; }
        const blob = new Blob([JSON.stringify(portableData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = (activeTabName || 'Canvas').trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
        a.download = `Prompt_Modifier_${sanitizedTitle}_${getTimestamp()}.PMC`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast(t('toast.canvasSaved') || 'Холст сохранен', 'success');
    }, [getCurrentCanvasState, activeTabName, addToast, t]);

    const handleSaveProject = useCallback(async () => {
        const currentActiveState = getCurrentCanvasState();
        const updatedTabs = tabs.map(tab => 
            tab.id === activeTabId ? { ...tab, name: tab.name, state: currentActiveState } : tab
        );

        const projectData = {
            type: 'prompt-modifier-project',
            appName: 'Prompt_modifier',
            version: 1,
            timestamp: new Date().toISOString(),
            activeTabId,
            tabs: updatedTabs,
            settings: {
                language,
                secondaryLanguage,
                isSnapToGrid,
                lineStyle,
                currentTheme,
                canvasColorMode,
                inputColorMode,
                panelStyle,
                isPanelAutoHide,
                panelAnimation,
                isPanelAnimationAdaptive,
                panelAnimationConfig,
                cursorSkin,
                isCursorEffectEnabled,
                autoSaveInterval,
                autoSaveHistoryLimit,
                autoSaveSessionLimit,
                isInstantCloseEnabled,
                isImageDropMenuEnabled,
                isHoverHighlightEnabled,
                isBringToFrontOnHoverEnabled,
                nodeAnimationMode,
                isConnectionAnimationEnabled,
                connectionOpacity,
                connectionAnimationStyle,
                connectionAnimationConfig,
                isSmartGuidesEnabled,
            },
            catalogs: {
                groups: catalogItems,
                library: libraryItems,
                characters: characterCatalog?.items || [],
                scripts: scriptCatalog?.items || [],
                sequences: sequenceCatalog?.items || []
            }
        };

        let portableData;
        try { portableData = await inlineStoredOriginals(projectData); }
        catch (error) { addToast(`Не удалось загрузить оригиналы для экспорта: ${String(error)}`, 'error'); return; }
        const blob = new Blob([JSON.stringify(portableData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Prompt_Modifier_Project_${getTimestamp()}.PMP`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast(t('toast.projectSaved') || 'Проект сохранен', 'success');
    }, [
        getCurrentCanvasState, tabs, activeTabId, language, secondaryLanguage, isSnapToGrid, lineStyle,
        currentTheme, canvasColorMode, inputColorMode, panelStyle, isPanelAutoHide, panelAnimation,
        isPanelAnimationAdaptive, panelAnimationConfig, cursorSkin, isCursorEffectEnabled, autoSaveInterval,
        autoSaveHistoryLimit, autoSaveSessionLimit, isInstantCloseEnabled, isImageDropMenuEnabled,
        isHoverHighlightEnabled, isBringToFrontOnHoverEnabled, nodeAnimationMode, isConnectionAnimationEnabled,
        connectionOpacity, connectionAnimationStyle, connectionAnimationConfig, isSmartGuidesEnabled,
        catalogItems, libraryItems, characterCatalog, scriptCatalog, sequenceCatalog, addToast, t
    ]);

    // --- LOAD CANVAS / PROJECT ---

    const handleLoadCanvasIntoCurrentTab = useCallback((text: string, extractedName?: string | null) => {
        try {
            const data = JSON.parse(text);

            if (data.type === 'script-modifier-project' || data.type === 'script-modifier-canvas') {
                setError(t('error.scriptModifierCanvas') || 'Incompatible script modifier format');
                return;
            }
            
            // 1. Project Load
            if (data.type === 'prompt-modifier-project' || (data.tabs && Array.isArray(data.tabs) && data.tabs.length > 0)) {
                // Restore tabs and active canvas state atomically
                restoreSession(data.tabs, data.activeTabId);

                // Restore Settings if present in project file
                if (data.settings) {
                    if (data.settings.language && setLanguage) setLanguage(data.settings.language);
                    if (data.settings.secondaryLanguage && setSecondaryLanguage) setSecondaryLanguage(data.settings.secondaryLanguage);
                    if (data.settings.isSnapToGrid !== undefined && setIsSnapToGrid) setIsSnapToGrid(data.settings.isSnapToGrid);
                    if (data.settings.lineStyle && setLineStyle) setLineStyle(data.settings.lineStyle);
                    if ((data.settings.currentTheme || data.settings.theme) && setTheme) setTheme(data.settings.currentTheme || data.settings.theme);
                    if (data.settings.canvasColorMode && setCanvasColorMode) setCanvasColorMode(data.settings.canvasColorMode);
                    if (data.settings.inputColorMode && setInputColorMode) setInputColorMode(data.settings.inputColorMode);
                    if (data.settings.panelStyle && setPanelStyle) setPanelStyle(data.settings.panelStyle);
                    if (data.settings.isPanelAutoHide !== undefined && setIsPanelAutoHide) setIsPanelAutoHide(data.settings.isPanelAutoHide);
                    if (data.settings.panelAnimation && setPanelAnimation) setPanelAnimation(data.settings.panelAnimation);
                    if (data.settings.isPanelAnimationAdaptive !== undefined && setIsPanelAnimationAdaptive) setIsPanelAnimationAdaptive(data.settings.isPanelAnimationAdaptive);
                    if (data.settings.panelAnimationConfig && setPanelAnimationConfig) setPanelAnimationConfig(data.settings.panelAnimationConfig);
                    if (data.settings.cursorSkin && setCursorSkin) setCursorSkin(data.settings.cursorSkin);
                    if (data.settings.isCursorEffectEnabled !== undefined && setIsCursorEffectEnabled) setIsCursorEffectEnabled(data.settings.isCursorEffectEnabled);
                    if (data.settings.autoSaveInterval !== undefined && setAutoSaveInterval) setAutoSaveInterval(data.settings.autoSaveInterval);
                    if (data.settings.autoSaveHistoryLimit !== undefined && setAutoSaveHistoryLimit) setAutoSaveHistoryLimit(data.settings.autoSaveHistoryLimit);
                    if (data.settings.autoSaveSessionLimit !== undefined && setAutoSaveSessionLimit) setAutoSaveSessionLimit(data.settings.autoSaveSessionLimit);
                    if (data.settings.isInstantCloseEnabled !== undefined && setIsInstantCloseEnabled) setIsInstantCloseEnabled(data.settings.isInstantCloseEnabled);
                    if (data.settings.isImageDropMenuEnabled !== undefined && setIsImageDropMenuEnabled) setIsImageDropMenuEnabled(data.settings.isImageDropMenuEnabled);
                    if (data.settings.isHoverHighlightEnabled !== undefined && setIsHoverHighlightEnabled) setIsHoverHighlightEnabled(data.settings.isHoverHighlightEnabled);
                    if (data.settings.isBringToFrontOnHoverEnabled !== undefined && setIsBringToFrontOnHoverEnabled) setIsBringToFrontOnHoverEnabled(data.settings.isBringToFrontOnHoverEnabled);
                    if (data.settings.nodeAnimationMode && setNodeAnimationMode) setNodeAnimationMode(data.settings.nodeAnimationMode);
                    if (data.settings.isConnectionAnimationEnabled !== undefined && setIsConnectionAnimationEnabled) setIsConnectionAnimationEnabled(data.settings.isConnectionAnimationEnabled);
                    if (data.settings.connectionOpacity !== undefined && setConnectionOpacity) setConnectionOpacity(data.settings.connectionOpacity);
                    if (data.settings.connectionAnimationStyle && setConnectionAnimationStyle) setConnectionAnimationStyle(data.settings.connectionAnimationStyle);
                    if (data.settings.connectionAnimationConfig && setConnectionAnimationConfig) setConnectionAnimationConfig(data.settings.connectionAnimationConfig);
                    if (data.settings.isSmartGuidesEnabled !== undefined && setIsSmartGuidesEnabled) setIsSmartGuidesEnabled(data.settings.isSmartGuidesEnabled);
                }

                // Restore Catalogs & Library
                const catalogs = data.catalogs || {};
                if (catalogs.groups || data.catalogItems) {
                    setCatalogItems(catalogs.groups || data.catalogItems);
                }
                if (catalogs.library || data.libraryItems) {
                    setLibraryItems(catalogs.library || data.libraryItems);
                }
                if (catalogs.characters || data.characters) {
                    characterCatalog?.replaceAllItems?.(catalogs.characters || data.characters);
                }
                if (catalogs.scripts || data.scripts) {
                    scriptCatalog?.replaceAllItems?.(catalogs.scripts || data.scripts);
                }
                if (catalogs.sequences || data.sequences) {
                    sequenceCatalog?.replaceAllItems?.(catalogs.sequences || data.sequences);
                }

                addToast(t('toast.projectLoaded') || t('toast.downloadStarted') || 'Проект успешно загружен', 'success');
                return;
            }

            // 2. Single Canvas Load (Current Tab)
            if (data.nodes || data.connections || data.type === 'prompt-modifier-canvas') {
                const targetTabName = extractedName || data.tabName || data.name || activeTabName;
                const newState: CanvasState = {
                    nodes: Array.isArray(data.nodes) ? data.nodes : [],
                    connections: Array.isArray(data.connections) ? data.connections : [],
                    groups: Array.isArray(data.groups) ? data.groups : [],
                    viewTransform: (data.viewTransform && typeof data.viewTransform.scale === 'number')
                        ? data.viewTransform
                        : { scale: 1, translate: { x: 0, y: 0 } },
                    nodeIdCounter: typeof data.nodeIdCounter === 'number'
                        ? data.nodeIdCounter
                        : (Math.max(0, ...(data.nodes || []).map((n: any) => {
                            const m = String(n.id).match(/\d+/g);
                            return m ? Math.max(...m.map(Number)) : 0;
                        })) + 100),
                    fullSizeImageCache: (data.fullSizeImageCache && typeof data.fullSizeImageCache === 'object') ? data.fullSizeImageCache : {}
                };

                loadCanvasState(newState, targetTabName);
                addToast(t('toast.canvasLoaded') || t('toast.downloadStarted') || 'Холст успешно загружен', 'success');
            } else {
                throw new Error("Invalid file format. Neither a project nor a canvas file.");
            }

        } catch (err: any) {
            console.error("Load error:", err);
            setError(`Failed to load file: ${err.message}`);
        }
    }, [
        restoreSession, loadCanvasState, activeTabName, setLanguage, setSecondaryLanguage,
        setIsSnapToGrid, setLineStyle, setTheme, setCanvasColorMode, setInputColorMode,
        setPanelStyle, setIsPanelAutoHide, setPanelAnimation, setIsPanelAnimationAdaptive,
        setPanelAnimationConfig, setCursorSkin, setIsCursorEffectEnabled, setAutoSaveInterval,
        setAutoSaveHistoryLimit, setAutoSaveSessionLimit, setIsInstantCloseEnabled,
        setIsImageDropMenuEnabled, setIsHoverHighlightEnabled, setIsBringToFrontOnHoverEnabled,
        setNodeAnimationMode, setIsConnectionAnimationEnabled, setConnectionOpacity,
        setConnectionAnimationStyle, setConnectionAnimationConfig, setIsSmartGuidesEnabled,
        setCatalogItems, setLibraryItems, characterCatalog, scriptCatalog, sequenceCatalog,
        setError, addToast, t
    ]);

    // Handles loading from external sources (OS file association or drag & drop)
    // Canvas files (.PMC) open in a NEW tab to prevent accidental data loss
    // Project files (.PMP) prompt for overwrite
    const handleLoadFromExternal = useCallback((text: string) => {
        try {
            const data = JSON.parse(text);

            if (data.type === 'script-modifier-project' || data.type === 'script-modifier-canvas') {
                setError(t('error.scriptModifierCanvas') || 'Incompatible script modifier format');
                return;
            }

            if (data.type === 'prompt-modifier-project' || (data.tabs && Array.isArray(data.tabs))) {
                setConfirmInfo({
                    title: t('dialog.confirmLoad.title') || 'Confirm Project Load',
                    message: (t('dialog.confirmLoad.message') || 'Are you sure you want to load this project? Current unsaved work will be replaced.') + " (Project)",
                    onConfirm: () => handleLoadCanvasIntoCurrentTab(text)
                });
            } else if (data.nodes || data.connections || data.type === 'prompt-modifier-canvas') {
                const tabName = data.tabName || data.name || `Ext ${getTimestamp()}`;
                const newTabId = `tab-${Date.now()}`;
                const newState: CanvasState = {
                    nodes: Array.isArray(data.nodes) ? data.nodes : [],
                    connections: Array.isArray(data.connections) ? data.connections : [],
                    groups: Array.isArray(data.groups) ? data.groups : [],
                    viewTransform: (data.viewTransform && typeof data.viewTransform.scale === 'number')
                        ? data.viewTransform
                        : { scale: 1, translate: { x: 0, y: 0 } },
                    nodeIdCounter: typeof data.nodeIdCounter === 'number'
                        ? data.nodeIdCounter
                        : (Math.max(0, ...(data.nodes || []).map((n: any) => {
                            const m = String(n.id).match(/\d+/g);
                            return m ? Math.max(...m.map(Number)) : 0;
                        })) + 100),
                    fullSizeImageCache: (data.fullSizeImageCache && typeof data.fullSizeImageCache === 'object') ? data.fullSizeImageCache : {}
                };
                
                const newTab: Tab = {
                    id: newTabId,
                    name: tabName,
                    state: newState
                };
                
                // Snapshot live active tab first, then append new tab
                const currentLiveState = getCurrentCanvasState();
                const updatedTabs = tabs.map(tab => 
                    tab.id === activeTabId ? { ...tab, state: currentLiveState } : tab
                ).concat(newTab);

                restoreSession(updatedTabs, newTabId);
                addToast(t('toast.canvasLoaded') || t('toast.downloadStarted') || 'Холст открыт в новой вкладке', 'success');
            } else {
                 throw new Error("Unknown file format");
            }

        } catch (err: any) {
            setError(`Failed to open external file: ${err.message}`);
        }
    }, [getCurrentCanvasState, tabs, activeTabId, restoreSession, handleLoadCanvasIntoCurrentTab, setConfirmInfo, t, setError, addToast]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const filenameMatch = file.name.match(/^Prompt_Modifier_(.+?)_\d{4}-\d{2}-\d{2}/);
        const extractedTabName = filenameMatch && filenameMatch[1] ? filenameMatch[1].replace(/_/g, ' ') : file.name.replace(/\.(json|PMC|PMP)$/i, '');

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const peek = JSON.parse(text);

                if (peek.type === 'script-modifier-project' || peek.type === 'script-modifier-canvas') {
                    setError(t('error.scriptModifierCanvas') || 'Incompatible script modifier format');
                    return;
                }

                const isProject = peek.type === 'prompt-modifier-project' || (peek.tabs && Array.isArray(peek.tabs));
                
                const performLoad = () => {
                    handleLoadCanvasIntoCurrentTab(text, isProject ? null : extractedTabName);
                };

                setConfirmInfo({
                    title: t('dialog.confirmLoad.title') || 'Confirm Load',
                    message: (t('dialog.confirmLoad.message') || 'Are you sure you want to load this file? Unsaved changes will be overwritten.') + (isProject ? " (Project)" : " (Canvas)"),
                    onConfirm: performLoad
                });

            } catch (e) {
                setError("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    }, [handleLoadCanvasIntoCurrentTab, setConfirmInfo, t, setError]);

    const handleLoadCanvas = useCallback(() => {
        fileInputRef.current?.click();
    }, []);


    // --- NODE SPECIFIC IO ---

    // 1. Image Sequence Generator
    const triggerLoadImageSequenceFile = useCallback((nodeId: string) => {
        nodeIdForLoad.current = nodeId;
        imageSequenceFileInputRef.current?.click();
    }, []);

    const handleImageSequenceFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !nodeIdForLoad.current) return;
        const nodeId = nodeIdForLoad.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const parsedJson = JSON.parse(text);
                
                let promptsToLoad: any[] = [];
                let videoPromptsToLoad: any[] = [];
                let incomingStyle = '';
                let usedCharactersToLoad: any[] = [];
                let incomingSceneContexts: Record<string, string> = {};
                
                if (parsedJson.type === 'script-prompt-modifier-data') {
                    promptsToLoad = parsedJson.finalPrompts || parsedJson.prompts || [];
                    videoPromptsToLoad = parsedJson.videoPrompts || [];
                    incomingStyle = parsedJson.styleOverride || '';
                    usedCharactersToLoad = parsedJson.usedCharacters || [];
                    incomingSceneContexts = parsedJson.sceneContexts || {};
                } else if (Array.isArray(parsedJson)) {
                    promptsToLoad = parsedJson;
                } else if (parsedJson.prompts) {
                    promptsToLoad = parsedJson.prompts;
                }

                if (Array.isArray(promptsToLoad)) {
                    const videoMap = new Map(videoPromptsToLoad.map((vp: any) => [vp.frameNumber, vp]));

                    const newPrompts = promptsToLoad.map((p: any, i: number) => {
                        const frameNum = p.frameNumber !== undefined ? p.frameNumber : i + 1;
                        const vData = videoMap.get(frameNum);
                        
                        // Robust character extraction for missing data
                        let characters = p.characters || [];
                        const promptText = p.prompt || '';
                        if (characters.length === 0 && promptText) {
                            // Find both Character-N and Entity-N
                            const foundTags = promptText.match(/(?:character|entity)-\d+/gi) || [];
                            characters = [...new Set(foundTags.map((t: string) => {
                                // Normalize to Entity-N
                                return t.toLowerCase().replace(/character-/i, 'Entity-').replace(/entity-/i, 'Entity-');
                            }))];
                        }

                        return {
                            frameNumber: frameNum,
                            sceneNumber: p.sceneNumber || 1,
                            sceneTitle: p.sceneTitle || '',
                            prompt: promptText,
                            videoPrompt: vData?.videoPrompt || p.videoPrompt || '',
                            shotType: p.shotType || p.ShotType || vData?.shotType || 'WS',
                            characters: characters,
                            isCollapsed: true,
                            duration: p.duration || 3
                        };
                    });

                    const currentVal = JSON.parse(node.value || '{}');
                    const frameStatuses = newPrompts.reduce((acc, p) => ({...acc, [p.frameNumber]: 'idle'}), {});
                    
                    const updates: any = { 
                        prompts: newPrompts, 
                        frameStatuses,
                        selectedFrameNumber: null,
                        checkedFrameNumbers: []
                    };
                    if (incomingStyle) updates.styleOverride = incomingStyle;
                    if (usedCharactersToLoad.length > 0) updates.usedCharacters = usedCharactersToLoad;
                    if (Object.keys(incomingSceneContexts).length > 0) updates.sceneContexts = incomingSceneContexts;

                    handleValueChange(nodeId, JSON.stringify({ ...currentVal, ...updates }));
                } else {
                    setError("Invalid Image Sequence format.");
                }
            } catch (err: any) {
                setError(`Error loading sequence file: ${err.message}`);
            }
        };
        reader.readAsText(file);
        nodeIdForLoad.current = null;
        if (e.target) e.target.value = '';
    }, [nodes, handleValueChange, setError]);


    // 2. Prompt Sequence Editor
    const triggerLoadPromptSequenceFile = useCallback((nodeId: string) => {
        nodeIdForLoad.current = nodeId;
        promptSequenceEditorFileInputRef.current?.click();
    }, []);

    const handlePromptSequenceFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !nodeIdForLoad.current) return;
        const nodeId = nodeIdForLoad.current;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const parsedJson = JSON.parse(text);
                let prompts: any[] | null = null;
                let videoPrompts: any[] | null = null;
                let loadedStyleOverride = '';
                let usedChars: any[] = [];
                let loadedSceneContexts: Record<string, string> = {};

                if (parsedJson && parsedJson.type === 'script-prompt-modifier-data') {
                    prompts = parsedJson.finalPrompts || parsedJson.prompts;
                    videoPrompts = parsedJson.videoPrompts;
                    loadedStyleOverride = parsedJson.styleOverride || '';
                    usedChars = parsedJson.usedCharacters || [];
                    loadedSceneContexts = parsedJson.sceneContexts || {};
                } else if (Array.isArray(parsedJson)) {
                    prompts = parsedJson;
                } else if (parsedJson && Array.isArray(parsedJson.prompts)) {
                    prompts = parsedJson.prompts;
                } else if (parsedJson && Array.isArray(parsedJson.finalPrompts)) {
                    prompts = parsedJson.finalPrompts;
                }

                if (prompts && Array.isArray(prompts)) {
                    const videoMap = new Map((videoPrompts || []).map((vp: any) => [vp.frameNumber, vp]));

                    const promptsWithFrameNumbers = prompts.map((p, i) => {
                        const frameNum = p.frameNumber !== undefined ? p.frameNumber : i + 1;
                        const vData = videoMap.get(frameNum);
                        let promptText = p.prompt || (typeof p === 'string' ? p : '');
                        
                        let characters = p.characters || [];
                        if (characters.length === 0 && promptText) {
                            // Find both Character-N and Entity-N
                            const foundTags = promptText.match(/(?:character|entity)-\d+/gi) || [];
                            characters = [...new Set(foundTags.map((t: string) => {
                                // Normalize to Entity-N
                                return t.toLowerCase().replace(/character-/i, 'Entity-').replace(/entity-/i, 'Entity-');
                            }))];
                        }
                        
                        return {
                            frameNumber: frameNum,
                            sceneNumber: p.sceneNumber || 1,
                            sceneTitle: p.sceneTitle || '',
                            prompt: promptText,
                            videoPrompt: vData?.videoPrompt || p.videoPrompt || '',
                            shotType: p.shotType || p.ShotType || vData?.shotType || 'WS',
                            characters: characters,
                            isCollapsed: true,
                            duration: p.duration || 3,
                        };
                    });
                    
                    const currentParsedValue = JSON.parse(node.value || '{}');

                    if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
                        const updates: any = {
                            sourcePrompts: promptsWithFrameNumbers,
                            modifiedPrompts: [],
                            checkedSourceFrameNumbers: [],
                            isStyleCollapsed: true,
                        };
                        if (loadedStyleOverride) updates.styleOverride = loadedStyleOverride;
                        if (usedChars.length > 0) updates.usedCharacters = usedChars;
                        if (Object.keys(loadedSceneContexts).length > 0) updates.sceneContexts = loadedSceneContexts;
                        
                        const newValue = JSON.stringify({ ...currentParsedValue, ...updates });
                        handleValueChange(nodeId, newValue);
                    }

                } else {
                    throw new Error("JSON is not an array of prompts or does not contain a 'prompts' or 'finalPrompts' array.");
                }
            } catch (err: any) {
                setError(`Error loading prompts file: ${err.message}`);
            }
        };
        reader.readAsText(file);
        nodeIdForLoad.current = null;
        if (e.target) e.target.value = '';
    }, [nodes, handleValueChange, setError]);


    // 3. Character Card
    const triggerLoadCharacterCard = useCallback((nodeId: string) => {
        nodeIdForLoad.current = nodeId;
        characterCardFileInputRef.current?.click();
    }, []);

    const handleCharacterCardFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !nodeIdForLoad.current) return;
        const nodeId = nodeIdForLoad.current;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            try {
                let data = JSON.parse(text);
                
                // Normalize data to an array
                if (!Array.isArray(data)) {
                    data = [data];
                }

                // If loading into a card, update value properly
                // We process ALL items in the array
                const newCharacters = await Promise.all(data.map(async (charData: any, i: number) => {
                    const loadedSources = charData.imageSources || { '1:1': null, '16:9': null, '9:16': null };
                    const newThumbnails: Record<string, string | null> = { '1:1': null, '16:9': null, '9:16': null };
                    
                    if (charData.image && !charData.imageSources) {
                         loadedSources['1:1'] = charData.image;
                    }
                    
                    // Pre-process sources to fix raw base64
                    const processedSources: Record<string, string | null> = {};
                    for (const [ratio, rawSrc] of Object.entries(loadedSources)) {
                        let src = rawSrc as string | null;
                        if (typeof src === 'string' && !src.startsWith('data:') && src.length > 100) {
                             src = `data:image/png;base64,${src}`;
                        }
                        processedSources[ratio] = src;
                    }

                    // Process each ratio from the file
                    for (const [ratio, src] of Object.entries(processedSources)) {
                        if (typeof src === 'string' && src.startsWith('data:')) {
                            // Cache High Res - using index mapping (cardIndex * 10 + ratioIndex)
                            const ratioIndex = RATIO_INDICES[ratio];
                            if (ratioIndex) setFullSizeImage(nodeId, (i * 10) + ratioIndex, src);

                            // Generate Thumbnail for UI
                            const thumbnail = await generateThumbnail(src, 256, 256);
                            newThumbnails[ratio] = thumbnail;
                        } else {
                            newThumbnails[ratio] = src as string | null;
                        }
                    }

                    const ratio = charData.selectedRatio || '1:1';
                    
                    // Set Active Output (cardIndex * 10) to High Res of selected ratio
                    const activeHighRes = processedSources[ratio];
                    if (activeHighRes && typeof activeHighRes === 'string' && activeHighRes.startsWith('data:')) {
                        setFullSizeImage(nodeId, i * 10, activeHighRes);
                    }

                    // Return processed UI structure
                    return {
                        id: charData.id || `char-card-${Date.now()}-${i}`,
                        name: charData.name || '',
                        index: charData.index || charData.alias || `Entity-${i + 1}`, // Default to Entity
                        image: newThumbnails[ratio], // Active display thumbnail
                        thumbnails: newThumbnails,
                        selectedRatio: ratio,
                        prompt: charData.prompt || charData.imagePrompt || '',
                        fullDescription: charData.fullDescription || charData.description || '',
                        targetLanguage: charData.targetLanguage || 'en',
                        isOutput: charData.isOutput || (i === 0), // Default first to output if not specified
                        isDescriptionCollapsed: charData.isDescriptionCollapsed ?? false // Fixed variable name
                    };
                }));
                
                // If single card loaded had a node title, update it
                if (data.length === 1 && (data[0].nodeTitle || data[0].title)) {
                    handleRenameNode(nodeId, data[0].nodeTitle || data[0].title);
                }

                handleValueChange(nodeId, JSON.stringify(newCharacters));
                addToast(t('toast.characterLoaded'));

            } catch (err: any) {
                setError(`Error loading character card: ${err.message}`);
            }
        };
        reader.readAsText(file);
        nodeIdForLoad.current = null;
        if (e.target) e.target.value = '';
    }, [handleRenameNode, handleValueChange, setFullSizeImage, addToast, t, setError]);

    const handleSaveCharacterCard = useCallback((nodeId: string, cardIndex?: number) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type !== NodeType.CHARACTER_CARD) return;

        try {
            // Parse current UI state (array of characters)
            let characters = JSON.parse(node.value || '[]');
            if (!Array.isArray(characters)) characters = [characters];
            
            let exportData = [];
            
            if (cardIndex !== undefined) {
                 // Save specific card
                 const char = characters[cardIndex];
                 if (!char) return;
                 const exportChar = {
                    type: 'character-card',
                    nodeTitle: node.title,
                    ...char,
                    image: getFullSizeImage(nodeId, cardIndex * 10) || char.image,
                    imageSources: { ...char.thumbnails },
                    index: char.index || char.alias || `Entity-${cardIndex + 1}`
                 };
                 // Rehydrate full res
                 Object.entries(RATIO_INDICES).forEach(([ratio, index]) => {
                    const fullRes = getFullSizeImage(nodeId, (cardIndex * 10) + index);
                    if (fullRes) exportChar.imageSources[ratio] = fullRes;
                 });
                 
                 delete exportChar.thumbnails;
                 delete exportChar.alias;
                 exportData = exportChar; // Save as single object
            } else {
                 // Save All
                 exportData = characters.map((char: any, i: number) => {
                    const fullSources: Record<string, string | null> = { ...char.thumbnails };
                    Object.entries(RATIO_INDICES).forEach(([ratio, index]) => {
                        const fullRes = getFullSizeImage(nodeId, (i * 10) + index);
                        if (fullRes) fullSources[ratio] = fullRes;
                    });
                    const activeImg = getFullSizeImage(nodeId, i * 10) || char.image;
                    const exportChar = {
                        type: 'character-card',
                        nodeTitle: node.title,
                        ...char,
                        image: activeImg,
                        imageSources: fullSources,
                        index: char.index || char.alias || `Entity-${i + 1}`
                    };
                    delete exportChar.thumbnails;
                    delete exportChar.alias;
                    return exportChar;
                });
            }

            const json = JSON.stringify(exportData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            let filenameBase = node.title || 'Character_Card';
            if (cardIndex !== undefined) {
                 const charName = characters[cardIndex]?.name || `Character_${cardIndex+1}`;
                 filenameBase = charName;
            }
            
            const sanitizedTitle = filenameBase.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
            const timestamp = getTimestamp();
            // Changed extension to .CHAR
            a.download = `${sanitizedTitle}_${timestamp}.CHAR`;

            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            addToast(t('toast.characterSavedDisk'));
        } catch (err) {
            setError("Failed to save character card.");
        }
    }, [nodes, getFullSizeImage, addToast, t, setError]);


    // 4. Script Files
    const triggerLoadScriptFile = useCallback((nodeId: string) => {
        nodeIdForLoad.current = nodeId;
        scriptFileInputRef.current?.click();
    }, []);

    const handleScriptFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
        if (!file || !nodeIdForLoad.current) return;
        const nodeId = nodeIdForLoad.current;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                JSON.parse(text);
                handleValueChange(nodeId, text);
            } catch (err: any) {
                setError(`Error loading script file: ${err.message}`);
            }
        };
        reader.readAsText(file);
        nodeIdForLoad.current = null;
        if (e.target) e.target.value = '';
    }, [handleValueChange, setError]);

    const handleSaveScriptFile = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let blobData = '';
        let filename = `file_${getTimestamp()}.json`;

        if (node.type === NodeType.SCRIPT_GENERATOR || node.type === NodeType.SCRIPT_VIEWER) {
             blobData = node.value;
             filename = `script_${getTimestamp()}.json`;
        } else if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
             try {
                const data = node.value ? JSON.parse(node.value) : {};
                const sourcePrompts = data.sourcePrompts || [];
                const modifiedPrompts = data.modifiedPrompts || [];
                const modifiedMap = new Map(modifiedPrompts.map((p: any) => [p.frameNumber, p]));
                
                const mergedPrompts = sourcePrompts.map((p: any) => {
                    const mod = modifiedMap.get(p.frameNumber);
                    // Fix: Spread types may only be created from object types. Using any cast fixes this.
                    return mod ? { ...(p as any), ...(mod as any) } : p;
                });

                const contentToSave = {
                    type: 'script-prompt-modifier-data',
                    title: node.title || "Финалайзер промптов",
                    usedCharacters: data.usedCharacters || [],
                    sceneContexts: data.sceneContexts || {}, // Save scene contexts
                    finalPrompts: mergedPrompts.map((p: any) => ({
                        frameNumber: p.frameNumber,
                        sceneNumber: p.sceneNumber || 1,
                        sceneTitle: p.sceneTitle || '',
                        characters: p.characters || [],
                        duration: p.duration || 3,
                        prompt: p.prompt || '',
                        shotType: p.shotType || 'WS'
                    })),
                    videoPrompts: mergedPrompts.map((p: any) => ({
                        sceneNumber: p.sceneNumber || 1,
                        sceneTitle: p.sceneTitle || '',
                        frameNumber: p.frameNumber,
                        videoPrompt: p.videoPrompt || '',
                        shotType: p.shotType || 'WS'
                    })),
                    targetLanguage: "en",
                    startFrameNumber: 1,
                    endFrameNumber: mergedPrompts.length,
                    startSceneNumber: null,
                    endSceneNumber: null,
                    styleOverride: data.styleOverride || '',
                    breakIntoParagraphs: false,
                    copyVideoPrompt: true,
                    characterPaneHeight: 160,
                    isAdvancedMode: true,
                    model: "gemini-3-pro-preview",
                    processWholeScene: false,
                    uiState: {
                        isSettingsCollapsed: false
                    }
                };
                blobData = JSON.stringify(contentToSave, null, 2);
                const sanitizedTitle = (node.title || 'sequence').trim().replace(/\s+/g, '_');
                filename = `${sanitizedTitle}_${getTimestamp()}.json`;
             } catch (e) {
                 setError("Failed to parse sequence editor data for saving to disk.");
                 return;
             }
        } else if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
            try {
                const data = node.value ? JSON.parse(node.value) : {};
                const promptsToSave = (data.prompts || []).map(({ frameNumber, characters, duration, prompt, videoPrompt, sceneNumber, sceneTitle, shotType }: any) => ({
                    frameNumber, characters, duration, prompt, videoPrompt, sceneNumber: sceneNumber || 1, sceneTitle: sceneTitle || '', shotType: shotType || 'WS'
                }));
                const contentToSave = {
                    type: 'script-prompt-modifier-data',
                    title: node.title || "Sequence Generator",
                    usedCharacters: data.usedCharacters || [],
                    sceneContexts: data.sceneContexts || {}, // Save scene contexts
                    finalPrompts: promptsToSave.map((p: any) => ({
                        frameNumber: p.frameNumber,
                        sceneNumber: p.sceneNumber,
                        sceneTitle: p.sceneTitle,
                        characters: p.characters,
                        duration: p.duration,
                        prompt: p.prompt,
                        shotType: p.shotType
                    })),
                    videoPrompts: promptsToSave.map((p: any) => ({
                        sceneNumber: p.sceneNumber,
                        sceneTitle: p.sceneTitle,
                        frameNumber: p.frameNumber,
                        videoPrompt: p.videoPrompt || '',
                        shotType: p.shotType
                    })),
                    styleOverride: data.styleOverride || '',
                };
                blobData = JSON.stringify(contentToSave, null, 2);
                const sanitizedTitle = (node.title || 'seq_gen').trim().replace(/\s+/g, '_');
                filename = `${sanitizedTitle}_${getTimestamp()}.json`;
            } catch (e) {
                 setError("Failed to parse sequence generator data for saving to disk.");
                 return;
            }
        } else {
            return;
        }

        const blob = new Blob([blobData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        addToast(t('toast.scriptSaved'));
    }, [nodes, addToast, t, setError]);


    return {
        fileInputRef,
        handleFileChange,
        handleLoadCanvas,
        handleSaveCanvas,
        handleSaveProject,
        handleLoadCanvasIntoCurrentTab,
        handleLoadFromExternal, // EXPORTED THIS NEW FUNCTION
        
        imageSequenceFileInputRef,
        handleImageSequenceFileChange,
        triggerLoadImageSequenceFile,
        
        promptSequenceEditorFileInputRef,
        handlePromptSequenceFileChange,
        triggerLoadPromptSequenceFile,
        
        characterCardFileInputRef,
        handleCharacterCardFileChange,
        triggerLoadCharacterCard,
        handleSaveCharacterCard,

        scriptFileInputRef,
        handleScriptFileChange,
        triggerLoadScriptFile,
        handleSaveScriptFile,
    };
};
