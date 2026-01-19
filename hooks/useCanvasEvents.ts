
import React, { useCallback, useRef, useEffect } from 'react';
import { NodeType, Point, Connection } from '../types';
import { getEmptyValueForNodeType, RATIO_INDICES, getOutputHandleType } from '../utils/nodeUtils';
import { generateThumbnail } from '../utils/imageUtils';
import { readPromptFromPNG } from '../utils/pngMetadata';
import { CARD_NODE_WIDTH_STEP, CARD_NODE_BASE_WIDTH_OFFSET } from './useEntityActions';

export const useCanvasEvents = (props: any) => {
    const {
        onAddNode,
        handleValueChange,
        handleRenameNode,
        setFullSizeImage,
        getTransformedPoint,
        handleLoadCanvasIntoCurrentTab,
        setError,
        pasteGroup,
        t,
        handleAddGroupFromCatalog,
        libraryItems,
        setNodes, // Ensure setNodes is destructured from props
        setConfirmInfo, // Add this
        handleRenameTab,
        activeTabId
    } = props;

    const dragCounter = useRef(0);

    const toggleHighlight = (active: boolean) => {
        const el = document.getElementById('app-container');
        if (el) {
            if (active) el.classList.add('ring-2', 'ring-cyan-500', 'ring-inset');
            else el.classList.remove('ring-2', 'ring-cyan-500', 'ring-inset');
        }
    };

    useEffect(() => {
        const handleGlobalDragReset = (e: DragEvent) => {
            if (e.type === 'dragleave' && e.relatedTarget) return;
            dragCounter.current = 0;
            toggleHighlight(false);
        };
        window.addEventListener('dragend', handleGlobalDragReset);
        window.addEventListener('dragleave', handleGlobalDragReset);
        return () => {
            window.removeEventListener('dragend', handleGlobalDragReset);
            window.removeEventListener('dragleave', handleGlobalDragReset);
        };
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        // Проверяем типы данных в событии перетаскивания
        // Если это перемещение карточки персонажа, игнорируем подсветку холста
        if (e.dataTransfer.types.includes('application/prompt-modifier-card')) {
            return;
        }

        // Подсвечиваем холст только если мы реально над холстом, а не над нодой
        const target = e.target as HTMLElement;
        const isActuallyCanvas = target.id === 'app-container' || target.id === 'canvas-transform-layer';
        
        if (!isActuallyCanvas) {
            return;
        }

        e.preventDefault(); e.stopPropagation();
        dragCounter.current += 1;
        if (dragCounter.current === 1) toggleHighlight(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('application/prompt-modifier-card')) {
            return;
        }

        const target = e.target as HTMLElement;
        const isActuallyCanvas = target.id === 'app-container' || target.id === 'canvas-transform-layer';

        if (!isActuallyCanvas) {
            return;
        }

        e.preventDefault(); e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            toggleHighlight(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        // Если мы над нодой, не даем холсту перехватывать событие для подсветки
        const target = e.target as HTMLElement;
        if (target.closest('.node-view')) {
            return;
        }

        e.preventDefault(); e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('application/prompt-modifier-card')) {
            return;
        }

        e.preventDefault(); e.stopPropagation();
        dragCounter.current = 0;
        toggleHighlight(false);
        const dropPosition = getTransformedPoint({ x: e.clientX, y: e.clientY });

        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
             const newNodeId = onAddNode(NodeType.IMAGE_INPUT, dropPosition);
             setFullSizeImage(newNodeId, 0, dragImageData);
             readPromptFromPNG(dragImageData).then(prompt => {
                 generateThumbnail(dragImageData, 256, 256).then((thumb: string) => {
                     handleValueChange(newNodeId, JSON.stringify({ image: thumb, prompt: prompt || '' }));
                 });
             });
             return;
        }

        const dragDataString = e.dataTransfer.getData('application/prompt-modifier-drag-item');
        if (dragDataString) {
            try {
                const item = JSON.parse(dragDataString);
                if (item.type === 'catalog-group') {
                    if (handleAddGroupFromCatalog) handleAddGroupFromCatalog(item.itemId, dropPosition);
                    return;
                }
                if (item.type === 'library-prompt') {
                    const libraryItem = libraryItems.find((i: any) => i.id === item.itemId);
                    if (libraryItem) onAddNode(NodeType.TEXT_INPUT, dropPosition, undefined, { centerNode: true, initialValue: libraryItem.content || '' });
                    return;
                }

                if (item.type === 'content-catalog-item') {
                    const itemType = item.itemType;
                    let nodeType: NodeType | null = null;
                    let contentToSet: string = '';

                    switch (itemType) {
                        case 'CHARACTER':
                            nodeType = NodeType.CHARACTER_CARD;
                            let parsedContent: any;
                            try { parsedContent = JSON.parse(item.content || '{}'); } catch { parsedContent = {}; }

                            if (Array.isArray(parsedContent)) {
                                // It's a full array (Saved from Header)
                                contentToSet = JSON.stringify(parsedContent);
                            } else {
                                // It's a single item (Saved from Card) or malformed
                                // Ensure image format if singular
                                if (parsedContent.image && typeof parsedContent.image === 'string' && !parsedContent.image.startsWith('data:')) {
                                    parsedContent.image = `data:image/png;base64,${parsedContent.image}`;
                                }
                                const charIndex = parsedContent.index || parsedContent.alias || 'Entity-1'; // Default to Entity
                                const processedContent = { ...parsedContent, index: charIndex };
                                if (processedContent.alias) delete processedContent.alias;
                                contentToSet = JSON.stringify([processedContent]);
                            }
                            break;

                        case 'SCRIPT':
                            nodeType = NodeType.SCRIPT_VIEWER;
                            contentToSet = item.content || '{}';
                            break;

                        case 'PROMPT_SEQUENCE':
                            nodeType = NodeType.PROMPT_SEQUENCE_EDITOR;
                            const emptyNodeForValue = { id: '', type: NodeType.PROMPT_SEQUENCE_EDITOR, position: {x:0,y:0}, title: '', value: '', width: 0, height: 0 };
                            const emptyValue = getEmptyValueForNodeType(emptyNodeForValue as any);
                            const parsedEmptyValue = JSON.parse(emptyValue);
                            const parsedSeqContent = JSON.parse(item.content || '{}');
                            
                            let promptsToLoad: any[] = [];
                            let videoPromptsToLoad: any[] = [];
                            let loadedStyleOverride = '';
                            let usedCharsToLoad: any[] = [];

                            if (parsedSeqContent.type === 'script-prompt-modifier-data') {
                                promptsToLoad = parsedSeqContent.finalPrompts || parsedSeqContent.prompts || [];
                                videoPromptsToLoad = parsedSeqContent.videoPrompts || [];
                                loadedStyleOverride = parsedSeqContent.styleOverride || '';
                                usedCharsToLoad = parsedSeqContent.usedCharacters || [];
                            } else if (Array.isArray(parsedSeqContent)) {
                                promptsToLoad = parsedSeqContent;
                            } else if (parsedSeqContent.prompts) {
                                promptsToLoad = parsedSeqContent.prompts;
                            }
                            
                            const videoMap = new Map(videoPromptsToLoad.map((vp: any) => [vp.frameNumber, vp]));
                            const promptsWithStructure = promptsToLoad.map((p: any, i: number) => {
                                const frameNum = p.frameNumber !== undefined ? p.frameNumber : i + 1;
                                const vData: any = videoMap.get(frameNum);
                                
                                // Parse Characters Array from prompt if array is empty (fallback)
                                let characters = p.characters || [];
                                const promptText = p.prompt || (typeof p === 'string' ? p : '');
                                if (characters.length === 0 && promptText) {
                                    const foundTags = promptText.match(/(?:character|entity)-\d+/gi) || [];
                                    characters = [...new Set(foundTags.map((t: string) => t.toLowerCase().replace(/character-/i, 'Entity-').replace(/entity-/i, 'Entity-')))];
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
                            
                            contentToSet = JSON.stringify({ 
                                ...parsedEmptyValue, 
                                sourcePrompts: promptsWithStructure,
                                styleOverride: loadedStyleOverride,
                                usedCharacters: usedCharsToLoad
                            });
                            break;
                    }

                    if (nodeType) {
                        const newNodeId = onAddNode(nodeType, dropPosition, undefined, { centerNode: true, initialValue: contentToSet });
                        if (itemType === 'CHARACTER') {
                             try {
                                 let parsedContent = JSON.parse(item.content || '{}');
                                 
                                 // Handle Title
                                 const titleSource = Array.isArray(parsedContent) ? parsedContent[0] : parsedContent;
                                 if (titleSource?.nodeTitle) handleRenameNode(newNodeId, titleSource.nodeTitle);
                                 
                                 // Resize node if array
                                 if (Array.isArray(parsedContent) && setNodes) {
                                     const targetWidth = (parsedContent.length * CARD_NODE_WIDTH_STEP) + CARD_NODE_BASE_WIDTH_OFFSET;
                                     setNodes((nds: any[]) => nds.map((n: any) => n.id === newNodeId ? { ...n, width: targetWidth } : n));
                                 }

                                 // Restore images to cache
                                 const characters = Array.isArray(parsedContent) ? parsedContent : [parsedContent];
                                 
                                 characters.forEach((char: any, i: number) => {
                                     if (char.imageSources) {
                                         Object.entries(char.imageSources).forEach(([ratio, src]) => {
                                             const index = RATIO_INDICES[ratio];
                                             if (index && typeof src === 'string' && src.startsWith('data:')) {
                                                 setFullSizeImage(newNodeId, (i * 10) + index, src);
                                             }
                                         });
                                         const activeRatio = char.selectedRatio || '1:1';
                                         const activeSrc = char.imageSources[activeRatio];
                                         if (activeSrc && typeof activeSrc === 'string' && activeSrc.startsWith('data:')) {
                                             setFullSizeImage(newNodeId, i * 10, activeSrc);
                                         }
                                     }
                                 });

                             } catch (e) {
                                 console.error("Failed to restore character images", e);
                             }
                        }
                    }
                }
            } catch (err) { console.error("Error parsing drag data", err); }
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
             let offsetX = 0, offsetY = 0;
             files.forEach((file: File) => {
                 const pos = { x: dropPosition.x + offsetX, y: dropPosition.y + offsetY };
                 if (file.type.startsWith('image/')) {
                     const reader = new FileReader();
                     reader.onload = async (event) => {
                         const dataUrl = event.target?.result as string;
                         if (dataUrl) {
                             const newNodeId = onAddNode(NodeType.IMAGE_INPUT, pos);
                             setFullSizeImage(newNodeId, 0, dataUrl);
                             const prompt = await readPromptFromPNG(dataUrl);
                             generateThumbnail(dataUrl, 256, 256).then((thumb: string) => {
                                 handleValueChange(newNodeId, JSON.stringify({ image: thumb, prompt: prompt || '' }));
                             });
                         }
                     };
                     reader.readAsDataURL(file);
                     offsetX += 30; offsetY += 30;
                 } 
                 // Updated check for custom extensions
                 else if (file.type === 'application/json' || file.name.endsWith('.json') || file.name.endsWith('.PMC') || file.name.endsWith('.PMP') || file.name.endsWith('.CHAR')) {
                     const reader = new FileReader();
                     reader.onload = async (event) => {
                         const text = event.target?.result as string;
                         try {
                             const json: any = JSON.parse(text);
                             if (json.type === 'script-modifier-project' || json.type === 'script-modifier-canvas') {
                                 if (setError) setError(t('error.scriptModifierCanvas'));
                                 return;
                             }
                             
                             // Handle Chat History Drop
                             if (json.type === 'gemini-chat-history' || (json.messages && Array.isArray(json.messages) && !json.nodes)) {
                                 const newNodeId = onAddNode(NodeType.GEMINI_CHAT, pos);
                                 const content = JSON.stringify({
                                     messages: json.messages || [],
                                     currentInput: json.currentInput || '',
                                     style: json.style || 'general',
                                     attachment: json.attachment || null
                                 });
                                 handleValueChange(newNodeId, content);
                                 return;
                             }

                             if (json.type === 'prompModifierGroup' || (json.root && json.root.type === 'prompModifierGroup')) {
                                 if (pasteGroup) pasteGroup(json.root || json, pos);
                                 return;
                             }
                             
                             if (json.type === 'prompt-modifier-canvas' || json.type === 'prompt-modifier-project' || (Array.isArray(json.nodes) && Array.isArray(json.connections))) {
                                 if (handleLoadCanvasIntoCurrentTab) {
                                     // Logic to rename based on filename
                                     const filenameMatch = file.name.match(/^Prompt_Modifier_(.+?)_\d{4}-\d{2}-\d{2}/);
                                     const extractedTabName = filenameMatch && filenameMatch[1] ? filenameMatch[1].replace(/_/g, ' ') : null;
                                     const isProject = json.type === 'prompt-modifier-project';

                                     const performLoad = () => {
                                         handleLoadCanvasIntoCurrentTab(text);
                                         // If single canvas load and filename matches pattern, rename current tab
                                         if (!isProject && extractedTabName && handleRenameTab && activeTabId) {
                                             handleRenameTab(activeTabId, extractedTabName);
                                         }
                                     };
                                     
                                     if (setConfirmInfo) {
                                         setConfirmInfo({
                                             title: t('dialog.confirmLoad.title'),
                                             message: t('dialog.confirmLoad.message') + (isProject ? " (Loading Project)" : ""),
                                             onConfirm: performLoad
                                         });
                                     } else {
                                         performLoad();
                                     }
                                 }
                             } else {
                                 
                                 // Handle Character Cards (Single or Array)
                                 const isCharCard = (obj: any) => obj && (obj.type === 'character-card' || (obj.name && obj.imageSources));
                                 
                                 let charCardData = null;
                                 let isArray = false;

                                 if (Array.isArray(json)) {
                                     if (json.length > 0 && isCharCard(json[0])) {
                                         charCardData = json;
                                         isArray = true;
                                     }
                                 } else if (isCharCard(json)) {
                                     charCardData = [json];
                                     isArray = false;
                                 }

                                 if (charCardData) {
                                     const title = charCardData[0].nodeTitle || charCardData[0].title || (isArray ? "Character Cards" : "Character Card");
                                     const newNodeId = onAddNode(NodeType.CHARACTER_CARD, pos, title);
                                     
                                     if (isArray && setNodes) {
                                         const targetWidth = (charCardData.length * CARD_NODE_WIDTH_STEP) + CARD_NODE_BASE_WIDTH_OFFSET;
                                         setNodes((nds: any[]) => nds.map((n: any) => n.id === newNodeId ? { ...n, width: targetWidth } : n));
                                     }
                                     
                                     const newCharactersState = await Promise.all(charCardData.map(async (charData: any, i: number) => {
                                         const loadedSources = charData.imageSources || {};
                                         if (charData.image && !charData.imageSources) loadedSources['1:1'] = charData.image;
                                         
                                         const newThumbnails: Record<string, string | null> = { '1:1': null, '16:9': null, '9:16': null };
                                         
                                         for (const [ratio, src] of Object.entries(loadedSources)) {
                                            if (typeof src === 'string' && src.startsWith('data:')) {
                                                const index = RATIO_INDICES[ratio];
                                                if (index) setFullSizeImage(newNodeId, (i * 10) + index, src);
                                                newThumbnails[ratio] = await generateThumbnail(src, 256, 256);
                                            } else newThumbnails[ratio] = src as string | null;
                                         }
                                         
                                         const ratio = charData.selectedRatio || '1:1';
                                         const activeHighRes = (loadedSources as any)[ratio];
                                         if (activeHighRes && typeof activeHighRes === 'string' && activeHighRes.startsWith('data:')) {
                                             setFullSizeImage(newNodeId, i * 10, activeHighRes);
                                         }

                                         return {
                                             ...charData,
                                             image: newThumbnails[ratio],
                                             thumbnails: newThumbnails,
                                             index: charData.index || charData.alias || `Entity-${i+1}` // Default to Entity
                                         };
                                     }));
                                     
                                     handleValueChange(newNodeId, JSON.stringify(newCharactersState));
                                     return;
                                 }

                                 if (json.type === 'script-prompt-modifier-data' || (json.finalPrompts && Array.isArray(json.finalPrompts))) {
                                     const newNodeId = onAddNode(NodeType.PROMPT_SEQUENCE_EDITOR, pos);
                                     
                                     const promptsToLoad = json.finalPrompts || json.prompts || [];
                                     const videoPromptsToLoad = json.videoPrompts || [];
                                     const videoMap = new Map(videoPromptsToLoad.map((vp: any) => [vp.frameNumber, vp]));

                                     const sourcePrompts = promptsToLoad.map((p: any, i: number) => {
                                         const frameNum = p.frameNumber !== undefined ? p.frameNumber : i + 1;
                                         const vData: any = videoMap.get(frameNum);
                                         
                                         let characters = p.characters || [];
                                         const promptText = p.prompt || '';
                                         if (characters.length === 0 && promptText) {
                                            const foundTags = promptText.match(/(?:character|entity)-\d+/gi) || [];
                                            characters = [...new Set(foundTags.map((t: string) => t.toLowerCase().replace(/character-/i, 'Entity-').replace(/entity-/i, 'Entity-')))];
                                         }

                                         return {
                                             frameNumber: frameNum,
                                             sceneNumber: p.sceneNumber || 1,
                                             sceneTitle: p.sceneTitle || '',
                                             prompt: promptText,
                                             videoPrompt: vData?.videoPrompt || p.videoPrompt || '',
                                             shotType: p.shotType || p.ShotType || vData?.shotType || 'WS',
                                             characters: characters,
                                             duration: p.duration || 3,
                                             isCollapsed: true
                                         };
                                     });

                                     const nodeValue = JSON.stringify({
                                         instruction: '',
                                         sourcePrompts: sourcePrompts,
                                         modifiedPrompts: [],
                                         checkedSourceFrameNumbers: [],
                                         selectedFrameNumber: null,
                                         styleOverride: json.styleOverride || '',
                                         usedCharacters: json.usedCharacters || [],
                                         sceneContexts: json.sceneContexts || {}, // Ensure sceneContexts is handled
                                         leftPaneRatio: 0.5
                                     });
                                     
                                     handleValueChange(newNodeId, nodeValue);
                                     return;
                                 }

                                 if (json.type === 'script-generator-data' || json.type === 'script-analyzer-data' || (json.characters && json.scenes && Array.isArray(json.scenes) && (json.scenes[0]?.frames || json.type === 'script-analyzer-data'))) {
                                     const newNodeId = onAddNode(NodeType.SCRIPT_VIEWER, pos);
                                     // Ensure type is preserved or inferred
                                     if (!json.type) {
                                         // Heuristic: has frames = analyzer, else generator
                                         if (json.scenes && json.scenes[0] && json.scenes[0].frames) {
                                              json.type = 'script-analyzer-data';
                                         } else {
                                              json.type = 'script-generator-data';
                                         }
                                     }
                                     handleValueChange(newNodeId, JSON.stringify(json));
                                     return;
                                 }

                                 const newNodeId = onAddNode(NodeType.TEXT_INPUT, pos);
                                 handleValueChange(newNodeId, JSON.stringify(json, null, 2));
                             }
                         } catch (err) { if (setError) setError("Failed to parse JSON file."); }
                     };
                     reader.readAsText(file);
                     offsetX += 30; offsetY += 30;
                 }
                 else if (file.type.startsWith('text/')) {
                     const reader = new FileReader();
                     reader.onload = (event) => onAddNode(NodeType.TEXT_INPUT, pos, undefined, { centerNode: true, initialValue: event.target?.result as string });
                     reader.readAsText(file);
                     offsetX += 30; offsetY += 30;
                 }
             });
        }
    }, [onAddNode, handleValueChange, handleRenameNode, setFullSizeImage, getTransformedPoint, handleLoadCanvasIntoCurrentTab, setError, pasteGroup, t, handleAddGroupFromCatalog, libraryItems, setNodes, setConfirmInfo, activeTabId, handleRenameTab]);
    
    return { handleDrop, handleDragOver, handleDragLeave, handleDragEnter };
};
