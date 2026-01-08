

import React, { useCallback, useRef } from 'react';
import { Node, NodeType, CanvasState, Tab, LibraryItem } from '../types';
import { getEmptyValueForNodeType, RATIO_INDICES } from '../utils/nodeUtils';
import { generateThumbnail } from '../utils/imageUtils';

interface UseCanvasIOProps {
    getCurrentCanvasState: () => CanvasState;
    loadCanvasState: (state: CanvasState) => void;
    setError: (error: string | null) => void;
    nodes: Node[];
    getPromptForNode: (nodeId: string) => string;
    handleValueChange: (nodeId: string, value: string) => void;
    addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
    t: (key: string) => string;
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
    isSnapToGrid: boolean;
    setIsSnapToGrid: (val: boolean) => void;
    lineStyle: string;
    setLineStyle: (val: any) => void;
    setConfirmInfo: (info: any) => void;
    handleRenameNode: (nodeId: string, newName: string) => void;
    onAddNode: (type: NodeType, position: any) => string;
    pasteGroup: (data: any, position?: any) => void;
    viewTransform: { scale: number; translate: { x: number, y: number } };
}

export const useCanvasIO = (props: UseCanvasIOProps) => {
    const {
        getCurrentCanvasState, loadCanvasState, setError, nodes, handleValueChange, addToast, t,
        activeTabName, getFullSizeImage, handleRenameTab, activeTabId, setFullSizeImage, tabs, setTabs, setActiveTabId,
        catalogItems, setCatalogItems, libraryItems, setLibraryItems, characterCatalog, scriptCatalog, sequenceCatalog,
        language, setLanguage, isSnapToGrid, setIsSnapToGrid, lineStyle, setLineStyle, setConfirmInfo, handleRenameNode,
        onAddNode, pasteGroup, viewTransform
    } = props;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageSequenceFileInputRef = useRef<HTMLInputElement>(null);
    const promptSequenceEditorFileInputRef = useRef<HTMLInputElement>(null);
    const characterCardFileInputRef = useRef<HTMLInputElement>(null);
    const scriptFileInputRef = useRef<HTMLInputElement>(null);
    
    const nodeIdForLoad = useRef<string | null>(null);

    const getTimestamp = () => new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];

    // --- SAVE CANVAS / PROJECT ---

    const handleSaveCanvas = useCallback(() => {
        const state = getCurrentCanvasState();
        const data = {
            type: 'prompt-modifier-canvas',
            appName: 'Prompt_modifier',
            version: 1,
            ...state,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = activeTabName.trim().replace(/\s+/g, '_');
        a.download = `Prompt_Modifier_${sanitizedTitle}_${getTimestamp()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        addToast(t('toast.canvasSaved'), 'success');
    }, [getCurrentCanvasState, activeTabName, addToast, t]);

    const handleSaveProject = useCallback(() => {
        const currentActiveState = getCurrentCanvasState();
        const updatedTabs = tabs.map(tab => 
            tab.id === activeTabId ? { ...tab, state: currentActiveState } : tab
        );

        const projectData = {
            type: 'prompt-modifier-project',
            appName: 'Prompt_modifier',
            version: 1,
            timestamp: new Date().toISOString(),
            tabs: updatedTabs,
            activeTabId,
            settings: {
                language,
                isSnapToGrid,
                lineStyle,
            },
            catalogs: {
                groups: catalogItems,
                library: libraryItems,
                characters: characterCatalog.items,
                scripts: scriptCatalog.items,
                sequences: sequenceCatalog.items
            }
        };

        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Prompt_Modifier_Project_${getTimestamp()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        addToast(t('toast.projectSaved'), 'success');
    }, [getCurrentCanvasState, tabs, activeTabId, language, isSnapToGrid, lineStyle, catalogItems, libraryItems, characterCatalog.items, scriptCatalog.items, sequenceCatalog.items, addToast, t]);

    // --- LOAD CANVAS / PROJECT ---

    const handleLoadCanvasIntoCurrentTab = useCallback((text: string) => {
        try {
            const data = JSON.parse(text);
            
            // 1. Project Load
            if (data.type === 'prompt-modifier-project') {
                if (data.tabs && Array.isArray(data.tabs)) {
                    setTabs(data.tabs);
                    if (data.activeTabId) setActiveTabId(data.activeTabId);
                }
                if (data.settings) {
                    if (data.settings.language) setLanguage(data.settings.language);
                    if (data.settings.isSnapToGrid !== undefined) setIsSnapToGrid(data.settings.isSnapToGrid);
                    if (data.settings.lineStyle) setLineStyle(data.settings.lineStyle);
                }
                if (data.catalogs) {
                    if (data.catalogs.groups) setCatalogItems(data.catalogs.groups);
                    if (data.catalogs.library) setLibraryItems(data.catalogs.library);
                    if (data.catalogs.characters) characterCatalog.replaceAllItems(data.catalogs.characters);
                    if (data.catalogs.scripts) scriptCatalog.replaceAllItems(data.catalogs.scripts);
                    if (data.catalogs.sequences) sequenceCatalog.replaceAllItems(data.catalogs.sequences);
                }
                addToast(t('toast.downloadStarted'), 'success');
                return;
            }

            // 2. Single Canvas Load (Current Tab)
            let newState: CanvasState;
            if (data.nodes && data.connections) {
                newState = {
                    nodes: data.nodes || [],
                    connections: data.connections || [],
                    groups: data.groups || [],
                    viewTransform: data.viewTransform || { scale: 1, translate: { x: 0, y: 0 } },
                    nodeIdCounter: data.nodeIdCounter || 100,
                    fullSizeImageCache: data.fullSizeImageCache || {}
                };
            } else {
                throw new Error("Invalid file format");
            }

            loadCanvasState(newState);

        } catch (err: any) {
            console.error("Load error:", err);
            setError(`Failed to load file: ${err.message}`);
        }
    }, [setTabs, setActiveTabId, setLanguage, setIsSnapToGrid, setLineStyle, setCatalogItems, setLibraryItems, characterCatalog, scriptCatalog, sequenceCatalog, loadCanvasState, setError, addToast, t]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const filenameMatch = file.name.match(/^Prompt_Modifier_(.+?)_\d{4}-\d{2}-\d{2}/);
        const extractedTabName = filenameMatch && filenameMatch[1] ? filenameMatch[1].replace(/_/g, ' ') : null;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const peek = JSON.parse(text);

                if (peek.type === 'script-modifier-project' || peek.type === 'script-modifier-canvas') {
                    setError(t('error.scriptModifierCanvas'));
                    return;
                }

                const isProject = peek.type === 'prompt-modifier-project';
                
                const performLoad = () => {
                    handleLoadCanvasIntoCurrentTab(text);
                    if (!isProject && extractedTabName) {
                        handleRenameTab(activeTabId, extractedTabName);
                    }
                };

                setConfirmInfo({
                    title: t('dialog.confirmLoad.title'),
                    message: t('dialog.confirmLoad.message') + (isProject ? " (Loading Project)" : ""),
                    onConfirm: performLoad
                });

            } catch (e) {
                setError("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    }, [handleLoadCanvasIntoCurrentTab, setConfirmInfo, t, setError, handleRenameTab, activeTabId]);

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
                    
                    // Process each ratio from the file
                    for (const [ratio, src] of Object.entries(loadedSources)) {
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
                    const activeHighRes = (loadedSources as any)[ratio];
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
                        isDescriptionCollapsed: charData.isDescriptionCollapsed ?? false
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
            a.download = `${sanitizedTitle}_${timestamp}.json`;

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