
import React, { useCallback, useRef, useEffect } from 'react';
import { NodeType, Node, Connection, Point, ConnectingInfo } from '../types';
import { addMetadataToPNG } from '../utils/pngMetadata';
import { generateThumbnail } from '../utils/imageUtils';
import { getOutputHandleType, getEmptyValueForNodeType, RATIO_INDICES, calculateGroupBounds } from '../utils/nodeUtils';
import { CARD_NODE_WIDTH_STEP, CARD_NODE_BASE_WIDTH_OFFSET } from './useEntityActions';

export const useAppOrchestration = (
    nodes: Node[],
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    connections: Connection[],
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
    groups: any[],
    setGroups: React.Dispatch<React.SetStateAction<any[]>>,
    fullSizeImageCache: any,
    setFullSizeImage: any,
    getFullSizeImage: any,
    getUpstreamNodeValues: any,
    activeTabIdRef: React.MutableRefObject<string>,
    setSelectedNodeIds: (ids: string[]) => void, // NEW parameter
    
    // Dependent Hooks
    libraryHook: any,
    catalogHook: any,
    characterCatalogHook: any,
    scriptCatalogHook: any,
    sequenceCatalogHook: any,
    entityActionsHook: any,
    nodesHook: any,
    connectionsHook: any,
    canvasHook: any,
    geminiGenerationHook: any,
    
    // UI Helpers
    addToast: any,
    setError: any,
    t: any,
    clearImagesForNodeFromCache: any
) => {

    const redirectHandlerRef = useRef<(data: any) => void>(() => console.warn("Redirect handler not ready"));
    const onRedirectImport = useCallback((data: any) => { redirectHandlerRef.current(data); }, []);

    useEffect(() => {
        redirectHandlerRef.current = (data: any) => {
            const context = data.catalogContext;
            switch(context) {
                case 'groups': catalogHook.importItemsData(data); addToast(`Imported into Groups catalog.`, 'success'); break;
                case 'library': libraryHook.importItemsData(data); addToast(`Imported into Prompt Library.`, 'success'); break;
                case 'characters': characterCatalogHook.importItemsData(data); addToast(`Imported into Character catalog.`, 'success'); break;
                case 'scripts': scriptCatalogHook.importItemsData(data); addToast(`Imported into Script catalog.`, 'success'); break;
                case 'sequences': sequenceCatalogHook.importItemsData(data); addToast(`Imported into Sequence catalog.`, 'success'); break;
                default: setError(`Unknown catalog context: ${context}`);
            }
        };
    }, [catalogHook, libraryHook, characterCatalogHook, scriptCatalogHook, sequenceCatalogHook, addToast, setError]);

    const onSavePromptToLibrary = useCallback((content: string) => {
        if (!content) return;
        libraryHook.saveProcessorPrompt(content);
        addToast(t('toast.promptSaved', { promptName: content.substring(0, 20) }));
    }, [libraryHook, addToast, t]);

    const onSaveToLibrary = useCallback((content: string, folderName: string) => {
        if (!content) return;
        libraryHook.saveToLibrary(content, folderName);
        addToast(t('toast.promptSaved', { promptName: content.substring(0, 20) }));
    }, [libraryHook, addToast, t]);

    const onSaveCharacterToCatalog = useCallback((nodeId: string, cardIndex?: number) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type !== NodeType.CHARACTER_CARD) return;
        try {
            const data = node.value ? JSON.parse(node.value) : [];
            const characters = Array.isArray(data) ? data : [data];
            
            if (cardIndex !== undefined) {
                // Save Single Character Card
                const charToSave = characters[cardIndex];
                if (!charToSave) throw new Error("Character not found");

                const name = charToSave.name || `Entity ${cardIndex + 1}`;
                const contentToSave = {
                    type: 'character-card',
                    nodeTitle: node.title,
                    ...charToSave,
                    index: charToSave.index || charToSave.alias || `Entity-${cardIndex + 1}`
                };
                if (contentToSave.alias) delete contentToSave.alias;
                // Important: Ensure we have the image in the content
                // If the thumbnail is too small or just a ref, try to get full res
                // But for catalog, we usually just store the base64 if it's there.
                
                // Re-inject image sources from cache to ensure full quality is saved if available
                const sources = charToSave.thumbnails ? { ...(charToSave.thumbnails as object) } : (charToSave.imageSources || {});
                Object.entries(RATIO_INDICES).forEach(([ratio, idx]) => { 
                    const cached = getFullSizeImage(nodeId, (cardIndex * 10) + idx); 
                    if (cached) (sources as any)[ratio] = cached; 
                });
                
                // Also update the main image if available
                const activeFull = getFullSizeImage(nodeId, cardIndex * 10);
                if (activeFull) contentToSave.image = activeFull;
                
                contentToSave.imageSources = sources;
                
                characterCatalogHook.createItem('ITEM', name, JSON.stringify(contentToSave, null, 2));
                addToast(t('toast.characterSavedCatalog'));

            } else {
                // Save All Characters (Node State)
                // We save it as an array which is compatible with the drag-and-drop import logic
                const name = node.title || 'Character Collection';
                
                // Reconstruct full data for each character from cache
                const exportData = characters.map((char: any, i: number) => {
                    const fullSources: Record<string, string | null> = { ...char.thumbnails };
                    
                    Object.entries(RATIO_INDICES).forEach(([ratio, idx]) => {
                        const fullRes = getFullSizeImage(nodeId, (i * 10) + idx);
                        if (fullRes) {
                            fullSources[ratio] = fullRes;
                        }
                    });
                    
                    // Get active full res image
                    const activeImg = getFullSizeImage(nodeId, i * 10) || char.image;

                    const exportChar = {
                        type: 'character-card',
                        nodeTitle: node.title,
                        ...char,
                        image: activeImg,
                        imageSources: fullSources,
                        index: char.index || char.alias || `Entity-${i + 1}`
                    };
                    
                    if (exportChar.alias) delete exportChar.alias;
                    
                    return exportChar;
                });

                characterCatalogHook.createItem('ITEM', name, JSON.stringify(exportData, null, 2));
                addToast(t('toast.characterSavedCatalog') + ' (All)');
            }
        } catch (e) { setError("Failed to save character to catalog."); }
    }, [nodes, characterCatalogHook, setError, addToast, t, getFullSizeImage]);

    const onSaveGeneratedCharacterToCatalog = useCallback((characterData: any) => {
        try {
            const name = characterData.name || 'Unnamed Entity';
            const imageSources: Record<string, string | null> = {};
            if (characterData.imageBase64) {
                imageSources['1:1'] = `data:image/png;base64,${characterData.imageBase64}`;
            }
            const contentToSave = { 
                type: 'character-card', 
                id: `char-card-${Date.now()}`,
                name: characterData.name, 
                index: characterData.alias || 'Entity-1', // Map generated Alias to Index
                image: characterData.imageBase64 ? `data:image/png;base64,${characterData.imageBase64}` : null, 
                selectedRatio: '1:1', 
                prompt: characterData.prompt, 
                fullDescription: characterData.fullDescription, 
                imageSources: imageSources 
            };
            characterCatalogHook.createItem('ITEM', name, JSON.stringify(contentToSave, null, 2));
            addToast(t('toast.characterSavedCatalog'));
        } catch (e) { setError("Failed to save character to catalog."); }
    }, [characterCatalogHook, setError, addToast, t]);

    const onSaveScriptToCatalog = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type !== NodeType.SCRIPT_VIEWER) return;
        try {
            let content = node.value || '{}';
            const parsed = JSON.parse(content);
            if (!parsed.type) {
                 if (parsed.summary && parsed.detailedCharacters && parsed.scenes) parsed.type = 'script-generator-data';
                 else if (parsed.characters && (parsed.frames || (parsed.scenes && parsed.scenes[0]?.frames))) parsed.type = 'script-analyzer-data';
                 content = JSON.stringify(parsed, null, 2);
            }
            const name = `Script ${new Date().toLocaleDateString()}`;
            scriptCatalogHook.createItem('ITEM', name, content);
            addToast(t('toast.scriptSaved'));
        } catch (e) { setError("Failed to save script to catalog."); }
    }, [nodes, scriptCatalogHook, setError, addToast, t]);

    const onSaveSequenceToCatalog = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || (node.type !== NodeType.IMAGE_SEQUENCE_GENERATOR && node.type !== NodeType.PROMPT_SEQUENCE_EDITOR)) return;
        try {
            let contentToSave: any = {};
            const title = node.title || "Финалайзер промптов";
            const data = node.value ? JSON.parse(node.value) : {};

            if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
                const promptsToSave = (data.prompts || []).map(({ frameNumber, characters, duration, prompt, videoPrompt, sceneNumber, shotType }: any) => ({
                    frameNumber, characters, duration, prompt, videoPrompt, sceneNumber: sceneNumber || 1, shotType: shotType || 'WS'
                }));
                contentToSave = {
                    type: 'script-prompt-modifier-data',
                    title: title,
                    usedCharacters: data.usedCharacters || [],
                    finalPrompts: promptsToSave,
                };
            } else if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
                const sourcePrompts = data.sourcePrompts || [];
                const modifiedPrompts = data.modifiedPrompts || [];
                const modifiedMap = new Map(modifiedPrompts.map((p: any) => [p.frameNumber, p]));
                
                const mergedPrompts = sourcePrompts.map((p: any) => {
                    const mod = modifiedMap.get(p.frameNumber);
                    // Fix: Spread types may only be created from object types. Casting to any fixes this.
                    return mod ? { ...(p as any), ...(mod as any) } : p;
                });

                contentToSave = {
                    type: 'script-prompt-modifier-data',
                    title: title,
                    usedCharacters: data.usedCharacters || [],
                    finalPrompts: mergedPrompts.map((p: any) => ({
                        frameNumber: p.frameNumber,
                        sceneNumber: p.sceneNumber || 1,
                        characters: p.characters || [],
                        duration: p.duration || 3,
                        prompt: p.prompt || '',
                        shotType: p.shotType || 'WS'
                    })),
                };
            }
            
            const name = `Sequence ${new Date().toLocaleDateString()}`;
            sequenceCatalogHook.createItem('ITEM', name, JSON.stringify(contentToSave, null, 2));
            addToast(t('toast.characterSavedCatalog'));
        } catch (e) { setError("Failed to save sequence to catalog."); }
    }, [nodes, sequenceCatalogHook, setError, addToast, t]);

    const onSaveMediaToDisk = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type !== NodeType.MEDIA_VIEWER) return;
        
        try {
            const data = node.value || '{}';
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const timestamp = getTimestamp();
            // Fix: Create the anchor element and set its properties correctly.
            const a = document.createElement('a');
            a.href = url;
            a.download = `Media_Viewer_${timestamp}.json`;
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            addToast(t('toast.scriptSaved'));
        } catch(e) {
            setError("Failed to save media state.");
        }
    }, [nodes, setError, addToast, t]);

    const onReadData = useCallback(async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        setError(null);
        try {
            const upstreamValues = getUpstreamNodeValues(nodeId);
            
            let finalImage = null;
            let finalText = "";
            let finalMediaUrl = null;
            let finalMediaType = null;

            // 1. Check for specific Media Objects from Media Viewer or other specialized nodes
            const mediaObject = upstreamValues.find((v: any) => v && typeof v === 'object' && (v.type === 'video' || v.type === 'audio') && v.url);
            if (mediaObject) {
                finalMediaUrl = mediaObject.url;
                finalMediaType = mediaObject.type;
            }

            // 2. Check for Data Object (Arrays or Objects including Character Cards)
            const dataObject = upstreamValues.find((v: any) => {
                if (!v || typeof v !== 'object') return false;
                // Exclude internal image/media structures to avoid false positives
                if (v.base64ImageData && v.mimeType) return false;
                if (v.type && (v.type === 'video' || v.type === 'audio') && v.url) return false;
                return true;
            });

            if (dataObject) {
                // Pretty print the JSON for the text area
                finalText = JSON.stringify(dataObject, null, 2);
                
                // Try to extract an image to display from the data object if possible
                let imgCandidate = null;
                
                if (Array.isArray(dataObject)) {
                     // Find first item with an image property
                     const firstWithImg = dataObject.find((c: any) => c.image || c.imageBase64 || (c.imageSources && Object.values(c.imageSources).some(s => s)));
                     if (firstWithImg) imgCandidate = firstWithImg;
                } else {
                     imgCandidate = dataObject;
                }

                if (imgCandidate) {
                    if (imgCandidate.image && imgCandidate.image.startsWith('data:')) {
                        finalImage = imgCandidate.image;
                    } else if (imgCandidate.imageBase64) {
                        finalImage = `data:image/png;base64,${imgCandidate.imageBase64}`;
                    } else if (imgCandidate.imageSources && imgCandidate.imageSources['1:1']) {
                        finalImage = imgCandidate.imageSources['1:1'];
                    }
                }
            } 
            else {
                // 3. Fallback: Standard Text/Image Extraction
                const textValue = upstreamValues.find((v: any) => typeof v === 'string') as string || '';
                if (textValue) finalText = textValue;

                const imageObject = upstreamValues.find((v: any) => 
                    typeof v === 'object' && 
                    v.base64ImageData && 
                    (v.type === 'image' || !v.type)
                ) as { base64ImageData: string, mimeType: string } | undefined;
                
                if (imageObject) {
                    finalImage = `data:${imageObject.mimeType};base64,${imageObject.base64ImageData}`;
                }
            }

            const newValue = JSON.stringify({ 
                text: finalText, 
                image: finalImage,
                mediaUrl: finalMediaUrl,
                mediaType: finalMediaType || 'video'
            });

            // Prevent infinite loop: Only update if value actually changed
            if (node.value !== newValue) {
                nodesHook.handleValueChange(nodeId, newValue);
            }
        } catch (e: any) { setError(e.message); }
    }, [getUpstreamNodeValues, nodesHook, nodes, setError]);

    const onDownloadImageFromUrl = useCallback((imageUrl: string, frameNumber: number, prompt: string, filenameOverride?: string) => {
        if (!imageUrl) return;
        let assetUrl = imageUrl;
        if (imageUrl.startsWith('data:image/png')) {
            assetUrl = addMetadataToPNG(imageUrl, 'prompt', prompt);
        }
        const link = document.createElement('a');
        link.href = assetUrl;
        let filename;
        if (filenameOverride) {
            filename = filenameOverride.endsWith('.png') ? filenameOverride : `${filenameOverride}.png`;
        } else {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const timestamp = `${date}_${time}`;
            const promptPart = (prompt || 'image').substring(0, 30).replace(/[^a-z0-9\u0400-\u04FF]/gi, '_');
            filename = `frame_${frameNumber}_${promptPart}_${timestamp}.png`;
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const onCopyImageToClipboard = useCallback(async (imageUrl: string) => {
        if (!imageUrl) return;
        try {
            const response = await fetch(imageUrl);
            let blob = await response.blob();
            
            if (blob.type !== 'image/png') {
                 const imageBitmap = await createImageBitmap(blob);
                 const canvas = document.createElement('canvas');
                 canvas.width = imageBitmap.width;
                 canvas.height = imageBitmap.height;
                 const ctx = canvas.getContext('2d');
                 if (ctx) {
                     ctx.drawImage(imageBitmap, 0, 0);
                     const pngBlob = await new Promise<Blob | null>(resolve => 
                         canvas.toBlob(resolve, 'image/png')
                     );
                     if (pngBlob) blob = pngBlob;
                 }
            }

            const item = new ClipboardItem({ [blob.type]: blob });
            await navigator.clipboard.write([item]);
            addToast(t('toast.copiedToClipboard'));
        } catch (e) {
            console.error("Failed to copy image to clipboard", e);
            addToast(t('toast.pasteFailed'), 'error');
        }
    }, [addToast, t]);

    const handleDuplicateNode = useCallback((nodeId: string) => {
      const newNodeId = nodesHook.handleDuplicateNode(nodeId);
      return newNodeId;
    }, [nodesHook]);

    const handleDuplicateNodeWithContent = useCallback((nodeId: string): string | undefined => {
        const nodeToDup = nodes.find(n => n.id === nodeId);
        if (!nodeToDup) return;

        // 1. Create the new node with same value
        nodesHook.nodeIdCounter.current++;
        const newNodeId = `node-${nodesHook.nodeIdCounter.current}-${Date.now()}`;
        const newNode: Node = {
            ...nodeToDup,
            id: newNodeId,
            position: { x: nodeToDup.position.x + 30, y: nodeToDup.position.y + 30 },
            isNewlyCreated: true,
            value: nodeToDup.value,
        };

        // 2. Find and duplicate incoming connections
        const incomingConnections = connections.filter(c => c.toNodeId === nodeId);
        const newConnections = incomingConnections.map(c => ({
            ...c,
            id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            toNodeId: newNodeId
        }));

        // 3. Duplicate full-size image cache if exists
        // Increased loop limit to 100 to support character cards with 10 slots * 10 max chars
        for (let i = 0; i <= 100; i++) {
            const cachedImg = getFullSizeImage(nodeId, i);
            if (cachedImg) {
                setFullSizeImage(newNodeId, i, cachedImg);
            }
        }

        // 4. Batch update states
        setNodes(nds => [...nds, newNode]);
        setConnections(conns => [...conns, ...newConnections]);
        
        // 5. Select the newly created node
        if (setSelectedNodeIds) {
            setSelectedNodeIds([newNodeId]);
        }

        addToast(t('toast.nodeDuplicated'));
        return newNodeId;
    }, [nodes, connections, nodesHook, getFullSizeImage, setFullSizeImage, setNodes, setConnections, setSelectedNodeIds, addToast, t]);
    
    const copyNodeValue = useCallback(async (nodeId: string) => {
        const errorMsg = await nodesHook.handleCopyNodeValue(nodeId);
        if (errorMsg) setError(errorMsg);
    }, [nodesHook, setError]);

    const pasteNodeValue = useCallback(async (nodeId: string) => {
        const errorMsg = await nodesHook.handlePasteNodeValue(nodeId);
        if (errorMsg) setError(errorMsg);
    }, [nodesHook, setError]);

    const pasteImageToNode = useCallback(async (nodeId: string, imageFile?: File | null) => {
        const errorMsg = await nodesHook.handlePasteImageToNode(nodeId, imageFile);
        if (errorMsg) setError(errorMsg);
    }, [nodesHook, setError]);
    
    const handleDetachAndPasteConcept = useCallback((sequenceNodeId: string, conceptToPaste: any) => {
         const sequenceNode = nodes.find(n => n.id === sequenceNodeId);
         if (!sequenceNode) return;
         if (conceptToPaste._connectionId) {
            setConnections(prev => prev.filter(c => c.id !== conceptToPaste._connectionId));
         }
         try {
             const parsedValue = JSON.parse(sequenceNode.value || '{}');
             const currentConcepts = parsedValue.characterConcepts || [];
             let maxId = 0;
             currentConcepts.forEach((c: any) => {
                 const match = (c.id || '').match(/Entity-(\d+)/); // Check for new Entity- format
                 if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
             });
             const newId = `Entity-${maxId + 1}`;
             const newConcept = { 
                 id: newId, 
                 name: conceptToPaste.name || 'Converted Concept', 
                 prompt: conceptToPaste.prompt || '', 
                 // Fix: Ensure we use the high res image if available, else thumbnail
                 image: conceptToPaste._fullResImage || conceptToPaste.image || null, 
                 fullDescription: conceptToPaste.fullDescription || '' 
             };
             const newConcepts = [...currentConcepts, newConcept];
             const newValue = JSON.stringify({ ...parsedValue, characterConcepts: newConcepts });
             nodesHook.handleValueChange(sequenceNodeId, newValue);
             addToast(t('toast.pastedFromClipboard'), 'success'); 
         } catch (e) { console.error("Failed to detach and paste concept", e); setError("Failed to update node data."); }
    }, [setConnections, nodes, nodesHook, addToast, t, setError]);
    
    const onDetachImageToNode = useCallback((imageDataUrl: string, sourceNodeId: string) => {
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (!sourceNode) return;
        const position = canvasHook.getTransformedPoint({
            x: sourceNode.position.x * canvasHook.viewTransform.scale + canvasHook.viewTransform.translate.x + (sourceNode.width + 50) * canvasHook.viewTransform.scale,
            y: sourceNode.position.y * canvasHook.viewTransform.scale + canvasHook.viewTransform.translate.y
        });
        const newNodeId = entityActionsHook.onAddNode(NodeType.IMAGE_INPUT, position);
        setFullSizeImage(newNodeId, 0, imageDataUrl);
        generateThumbnail(imageDataUrl, 256, 256).then((thumb: string) => {
             const newValue = JSON.stringify({ image: thumb, prompt: '' });
             nodesHook.handleValueChange(newNodeId, newValue);
        });
    }, [nodes, entityActionsHook, nodesHook, canvasHook, setFullSizeImage]);
    
    const onDetachCharacter = useCallback((characterData: any, generatorNode: Node) => {
        const position = { x: generatorNode.position.x + generatorNode.width + 50, y: generatorNode.position.y };
        const newNodeId = entityActionsHook.onAddNode(NodeType.CHARACTER_CARD, position);
        const imageSources: Record<string, string | null> = characterData.imageSources || {};
        let activeImage = characterData.image;

        // If it's coming from generator and has base64
        if (characterData.imageBase64 && !activeImage) {
            const dataUrl = `data:image/png;base64,${characterData.imageBase64}`;
            imageSources['1:1'] = dataUrl;
            activeImage = dataUrl;
            setFullSizeImage(newNodeId, 0, dataUrl);
            setFullSizeImage(newNodeId, 1, dataUrl); // 1:1 slot
        } 
        // If it's coming from another card, copy images from its sources
        else if (characterData.imageSources) {
             Object.entries(characterData.imageSources).forEach(([ratio, src]) => {
                  if (typeof src === 'string' && src.startsWith('data:')) {
                       const idx = RATIO_INDICES[ratio];
                       if (idx) setFullSizeImage(newNodeId, idx, src);
                  }
             });
             const activeFull = characterData._fullResImage;
             if (activeFull) setFullSizeImage(newNodeId, 0, activeFull);
        }

        const finalize = async () => {
             let thumbnail = activeImage;
             if (activeImage && activeImage.length > 5000) {
                 thumbnail = await generateThumbnail(activeImage, 256, 256);
             }

             const cardValue = [{
                 type: 'character-card',
                 id: characterData.id || `char-card-${Date.now()}`,
                 name: characterData.name || '',
                 index: characterData.index || characterData.alias || 'Entity-1',
                 prompt: characterData.prompt || '',
                 fullDescription: characterData.fullDescription || '',
                 image: thumbnail,
                 thumbnails: characterData.thumbnails || imageSources,
                 selectedRatio: characterData.selectedRatio || '1:1',
                 targetLanguage: characterData.targetLanguage || 'en'
             }];
             nodesHook.handleValueChange(newNodeId, JSON.stringify(cardValue));
             
             // NEW: Make the detached node active and selected
             if (setSelectedNodeIds) setSelectedNodeIds([newNodeId]);
        };

        finalize();
    }, [entityActionsHook, nodesHook, setFullSizeImage, setSelectedNodeIds]);

    const getTimestamp = () => new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];

    const handleSaveGroupToDisk = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
        const nodeIds = new Set(groupNodes.map(n => n.id));
        const internalConnections = connections.filter(c => nodeIds.has(c.fromNodeId) && nodeIds.has(c.toNodeId));
        const imagesToSave: Record<string, Record<number, string>> = {};
        groupNodes.forEach(n => {
             if (fullSizeImageCache[n.id]) imagesToSave[n.id] = fullSizeImageCache[n.id];
        });
        const data = { type: 'prompModifierGroup', name: group.title, nodes: groupNodes, connections: internalConnections, fullSizeImages: imagesToSave };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = group.title.trim().replace(/\s+/g, '_');
        const timestamp = getTimestamp();
        a.download = `${sanitizedTitle}_Prompt_Modifier_Group_${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast(t('toast.groupSavedToDisk', { groupTitle: group.title }));
    }, [groups, nodes, connections, fullSizeImageCache, addToast, t]);

    const handleSaveGroupToCatalog = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        catalogHook.saveGroupToCatalog(group, nodes, connections, fullSizeImageCache);
        addToast(t('alert.groupSaved', { groupTitle: group.title }));
    }, [groups, nodes, connections, catalogHook, t, addToast, fullSizeImageCache]);

    const handleAddGroupFromCatalog = useCallback((itemId: string, position?: Point) => {
        const item = catalogHook.catalogItems.find((i: any) => i.id === itemId);
        if (!item || item.type !== 'GROUP' || !item.nodes || !item.connections) return;

        let minX = Infinity, minY = Infinity;
        item.nodes.forEach((n: Node) => {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
        });
        
        let targetX: number;
        let targetY: number;

        if (position) {
            targetX = position.x;
            targetY = position.y;
        } else {
            targetX = (window.innerWidth / 2 - canvasHook.viewTransform.translate.x) / canvasHook.viewTransform.scale;
            targetY = (window.innerHeight / 2 - canvasHook.viewTransform.translate.y) / canvasHook.viewTransform.scale;
        }
        
        const offsetX = targetX - minX;
        const offsetY = targetY - minY;

        const idMap = new Map<string, string>();
        const newNodes: Node[] = item.nodes.map((n: Node) => {
            nodesHook.nodeIdCounter.current++;
            const newId = `node-${nodesHook.nodeIdCounter.current}-${Date.now()}`;
            idMap.set(n.id, newId);
            return { ...n, id: newId, position: { x: n.position.x + offsetX, y: n.position.y + offsetY }, isNewlyCreated: true };
        });

        if (item.fullSizeImages) {
            Object.entries(item.fullSizeImages).forEach(([oldId, imgs]) => {
                const newId = idMap.get(oldId);
                if (newId && imgs) {
                    Object.entries(imgs as Record<string, string>).forEach(([frame, url]) => {
                        setFullSizeImage(newId, Number(frame), url);
                    });
                }
            });
        }

        const newConnections: Connection[] = item.connections.map((c: Connection) => ({
            ...c, id: `conn-${Date.now()}-${Math.random()}`, fromNodeId: idMap.get(c.fromNodeId)!, toNodeId: idMap.get(c.toNodeId)!
        }));

        setNodes(prev => [...prev, ...newNodes]);
        setConnections(prev => [...prev, ...newConnections]);
        
        const calculatedBounds = calculateGroupBounds(newNodes) || { position: { x: 0, y: 0 }, width: 0, height: 0 };
        const newGroup = { 
            id: `group-${Date.now()}`, 
            title: item.name, 
            nodeIds: newNodes.map(n => n.id), 
            ...calculatedBounds 
        };
        setGroups(prev => [...prev, newGroup]);
    }, [catalogHook, canvasHook, nodesHook, setNodes, setConnections, setGroups, setFullSizeImage]);

    const handleRemoveGroup = useCallback((groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.shiftKey) {
            const group = groups.find(g => g.id === groupId);
            if (group) {
                const nodesToDelete = new Set(group.nodeIds);
                setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)));
                setConnections(prev => prev.filter(c => !nodesToDelete.has(c.fromNodeId) && !nodesToDelete.has(c.toNodeId)));
                group.nodeIds.forEach((nid: any) => clearImagesForNodeFromCache(nid));
                addToast(t('toast.groupDeleted'));
            }
        }
        setGroups(prev => prev.filter(g => g.id !== groupId));
    }, [groups, setNodes, setConnections, clearImagesForNodeFromCache, t, addToast, setGroups]);
    
    const handleSplitConnection = useCallback((connectionId: string) => {
        const conn = connections.find(c => c.id === connectionId);
        if (!conn) return;
        const fromNode = nodes.find(n => n.id === conn.fromNodeId);
        if (!fromNode) return;
        
        const outputType = getOutputHandleType(fromNode, conn.fromHandleId);
        const initialValue = JSON.stringify({ type: outputType });
        
        const rerouteId = entityActionsHook.onAddNode(NodeType.REROUTE_DOT, canvasHook.pointerPosition, undefined, { centerNode: true, initialValue });
        
        const newConn1 = { id: `conn-${Date.now()}-1`, fromNodeId: conn.fromNodeId, fromHandleId: conn.fromHandleId, toNodeId: rerouteId, toHandleId: undefined };
        const newConn2 = { id: `conn-${Date.now()}-2`, fromNodeId: rerouteId, fromHandleId: undefined, toNodeId: conn.toNodeId, toHandleId: conn.toHandleId };
        setConnections(prev => [...prev.filter(c => c.id !== connectionId), newConn1, newConn2]);
    }, [connections, nodes, entityActionsHook, canvasHook, setConnections]);
    
    const handleAddNodeAndConnect = useCallback((nodeType: NodeType, connectionQuickAddInfo: { position: Point, connectingInfo: ConnectingInfo }, handleCloseConnectionQuickAdd: () => void) => {
        if (!connectionQuickAddInfo) return;
        const { position, connectingInfo } = connectionQuickAddInfo;
        const transformedPos = canvasHook.getTransformedPoint(position);
        
        let initialValue: string | undefined;
        if (nodeType === NodeType.REROUTE_DOT && connectingInfo.fromType) {
            initialValue = JSON.stringify({ type: connectingInfo.fromType });
        }

        const newNodeId = entityActionsHook.onAddNode(nodeType, transformedPos, undefined, { alignToInput: true, initialValue });
        
        let toHandleId: string | undefined = undefined;
        if (nodeType === NodeType.IMAGE_EDITOR) {
            if (connectingInfo.fromType === 'image') toHandleId = 'image';
            if (connectingInfo.fromType === 'text') toHandleId = 'text'; 
        } else if (nodeType === NodeType.IMAGE_SEQUENCE_GENERATOR) {
            if (connectingInfo.fromType === 'text') toHandleId = 'prompt_input';
            if (connectingInfo.fromType === 'character_data') toHandleId = 'character_data';
        } else if (nodeType === NodeType.PROMPT_SEQUENCE_EDITOR) {
            if (connectingInfo.fromType === 'text') toHandleId = 'prompts_sequence';
        } else if (nodeType === NodeType.NOTE) {
             if (connectingInfo.fromType === 'text') toHandleId = 'prompt_data';
        } else if (nodeType === NodeType.VIDEO_EDITOR) {
            // Updated connection logic for Video Editor handles
            if (connectingInfo.fromType === 'video') toHandleId = 'video';
            if (connectingInfo.fromType === 'audio') toHandleId = 'audio';
            if (connectingInfo.fromType === 'image') toHandleId = 'image';
            if (connectingInfo.fromType === 'text') toHandleId = 'text';
        }
        
        const newConnection: Connection = { id: `conn-${Date.now()}`, fromNodeId: connectingInfo.fromNodeId, fromHandleId: connectingInfo.fromHandleId, toNodeId: newNodeId, toHandleId: toHandleId };
        setConnections(prev => [...prev, newConnection]);
        handleCloseConnectionQuickAdd();
    }, [entityActionsHook, setConnections, canvasHook]);
    
    const handleNodeCutConnections = useCallback((nodeId: string) => {
        connectionsHook.removeConnectionsByNodeId(nodeId);
    }, [connectionsHook]);

    const handleRegenerateFrame = useCallback((nodeId: string, frameNumber: number) => {
        geminiGenerationHook.handleEditImage(nodeId, [frameNumber]);
    }, [geminiGenerationHook]);

    const handlePaste = useCallback(async (selectedNodeIds: string[], pasteNodeValue: any, pasteImageToNode: any, canvasHook: any, entityActionsHook: any, nodesHook: any) => {
        const mousePos = canvasHook.pointerPosition || { x: 0, y: 0 };
        const pastePosition = (mousePos.x === 0 && mousePos.y === 0) 
            ? canvasHook.getTransformedPoint({ x: window.innerWidth/2, y: window.innerHeight/2 })
            : mousePos;

        try {
             const items = await navigator.clipboard.read();
             for (const item of items) {
                 if (item.types.some(t => t.startsWith('image/'))) {
                     const blob = await item.getType(item.types.find(t => t.startsWith('image/'))!);
                     if (selectedNodeIds.length === 1) {
                         const targetNode = nodes.find(n => n.id === selectedNodeIds[0]);
                         if (targetNode && (targetNode.type === NodeType.IMAGE_INPUT || targetNode.type === NodeType.IMAGE_EDITOR || targetNode.type === NodeType.IMAGE_ANALYZER || targetNode.type === NodeType.CHARACTER_CARD)) {
                             await pasteImageToNode(selectedNodeIds[0]);
                             return;
                         }
                     }
                     const file = new File([blob], "pasted_image.png", { type: blob.type });
                     const newNodeId = entityActionsHook.onAddNode(NodeType.IMAGE_INPUT, pastePosition);
                     await pasteImageToNode(newNodeId, file);
                     return;
                 }
             }
        } catch (e) { }

        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;

            if (selectedNodeIds.length === 1) {
                const targetNode = nodes.find(n => n.id === selectedNodeIds[0]);
                if (targetNode && targetNode.type !== NodeType.IMAGE_OUTPUT && targetNode.type !== NodeType.VIDEO_OUTPUT && targetNode.type !== NodeType.IMAGE_INPUT) {
                     await pasteNodeValue(selectedNodeIds[0]);
                     return;
                }
            }

            try {
                let json = JSON.parse(text);
                
                // --- NEW LOGIC START ---
                // Handle Array of Character Cards (copied via new logic)
                // It can be a direct array of cards OR a single object (legacy)
                
                if (json.type === 'character-card' || (Array.isArray(json) && json.length > 0 && (json[0].type === 'character-card' || (json[0].name && json[0].imageSources)))) {
                    
                    // Normalize to array
                    const cardArray = Array.isArray(json) ? json : [json];
                    
                    // Determine Title from first card or default
                    const title = cardArray[0].nodeTitle || cardArray[0].title || "Character Card";

                    // Create the new node (with empty initial value for now)
                    const newNodeId = entityActionsHook.onAddNode(NodeType.CHARACTER_CARD, pastePosition, title, { centerNode: true });
                    
                    // Calculate and set width based on card count (380 width + margins/ui elements)
                    // We use exported constants to keep it consistent with CharacterCardNode logic if possible, or define here.
                    const targetWidth = (cardArray.length * CARD_NODE_WIDTH_STEP) + CARD_NODE_BASE_WIDTH_OFFSET;
                    setNodes(nds => nds.map(n => n.id === newNodeId ? { ...n, width: targetWidth } : n));
                    
                    // Process images and prepare data structure for node value
                    // We need to restore images to cache for EACH character in the array
                    const newCharactersState = await Promise.all(cardArray.map(async (charData: any, i: number) => {
                        const loadedSources = charData.imageSources || {};
                        const newThumbnails: Record<string, string | null> = { '1:1': null, '16:9': null, '9:16': null };
                        
                        // Legacy single image support
                        if (charData.image && !charData.imageSources) loadedSources['1:1'] = charData.image;

                        for (const [ratio, src] of Object.entries(loadedSources)) {
                           if (typeof src === 'string' && src.startsWith('data:')) {
                               const index = RATIO_INDICES[ratio];
                               if (index) {
                                   // Correct cache key: (cardIndex * 10) + ratioIndex
                                   setFullSizeImage(newNodeId, (i * 10) + index, src);
                               }
                               try {
                                   newThumbnails[ratio] = await generateThumbnail(src, 256, 256);
                               } catch (err) {
                                   newThumbnails[ratio] = src; // Fallback
                               }
                           } else {
                               newThumbnails[ratio] = src as string | null;
                           }
                        }

                        const ratio = charData.selectedRatio || '1:1';
                        // Restore active high res slot (index 0 for this char)
                        const activeHighRes = (loadedSources as any)[ratio];
                        if (activeHighRes && typeof activeHighRes === 'string' && activeHighRes.startsWith('data:')) {
                            setFullSizeImage(newNodeId, i * 10, activeHighRes);
                        }

                        return {
                            ...charData,
                            id: charData.id || `char-card-${Date.now()}-${i}`, // Updated ID Generation
                            image: newThumbnails[ratio],
                            thumbnails: newThumbnails,
                            index: charData.index || charData.alias || `Entity-${i+1}`
                        };
                    }));

                    // Update the node value with the full array
                    nodesHook.handleValueChange(newNodeId, JSON.stringify(newCharactersState));
                    
                    // Select new node
                    if (setSelectedNodeIds) setSelectedNodeIds([newNodeId]);
                    return;
                }
                // --- NEW LOGIC END ---

                if (json.type === 'prompModifierGroup' || (json.nodes && json.connections)) {
                    entityActionsHook.pasteGroup(json, pastePosition);
                    return;
                }
                
                if (json.type === 'script-prompt-modifier-data' || (json.finalPrompts && Array.isArray(json.finalPrompts))) {
                     const newNodeId = entityActionsHook.onAddNode(NodeType.PROMPT_SEQUENCE_EDITOR, pastePosition);
                     
                     const promptsToLoad = json.finalPrompts || json.prompts || [];
                     const videoPromptsToLoad = json.videoPrompts || [];
                     const videoMap = new Map(videoPromptsToLoad.map((vp: any) => [vp.frameNumber, vp]));

                     const sourcePrompts = promptsToLoad.map((p: any, i: number) => {
                         const frameNum = p.frameNumber !== undefined ? p.frameNumber : i + 1;
                         const vData: any = videoMap.get(frameNum);
                         return {
                             frameNumber: frameNum,
                             sceneNumber: p.sceneNumber || 1,
                             sceneTitle: p.sceneTitle || '',
                             prompt: p.prompt || '',
                             videoPrompt: vData?.videoPrompt || p.videoPrompt || '',
                             shotType: p.shotType || p.ShotType || vData?.shotType || 'WS',
                             characters: p.characters || [],
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
                         leftPaneRatio: 0.5
                     });
                     
                     nodesHook.handleValueChange(newNodeId, nodeValue);
                     return;
                }

                if (json.type === 'script-generator-data' || json.type === 'script-analyzer-data' || (json.characters && json.scenes)) {
                    const newNodeId = entityActionsHook.onAddNode(NodeType.SCRIPT_VIEWER, pastePosition);
                     if (!json.type) json.type = 'script-analyzer-data';
                     nodesHook.handleValueChange(newNodeId, JSON.stringify(json));
                     return;
                }

                const newNodeId = entityActionsHook.onAddNode(NodeType.TEXT_INPUT, pastePosition);
                nodesHook.handleValueChange(newNodeId, JSON.stringify(json, null, 2));

            } catch (err) {
                const newNodeId = entityActionsHook.onAddNode(NodeType.TEXT_INPUT, pastePosition);
                nodesHook.handleValueChange(newNodeId, text);
            }

        } catch (e) {
            console.error("Paste failed", e);
        }

    }, [nodes, setFullSizeImage, addToast, t, setSelectedNodeIds]);

    const handleDownloadImage = useCallback((nodeId: string, onDownloadImageFromUrl: any) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let imageUrl: string | undefined;
        let prompt = '';

        try {
            const parsed = JSON.parse(node.value || '{}');

            if (node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.VIDEO_OUTPUT) {
                 imageUrl = getFullSizeImage(nodeId, 0) || node.value;
                 prompt = entityActionsHook.getPromptForNode(nodeId);
            } else if (node.type === NodeType.IMAGE_INPUT) {
                 imageUrl = getFullSizeImage(nodeId, 0) || parsed.image;
                 prompt = parsed.prompt || '';
            } else if (node.type === NodeType.IMAGE_EDITOR) {
                 imageUrl = getFullSizeImage(nodeId, 0) || parsed.outputImage;
                 prompt = parsed.prompt || '';
            }
        } catch (e) {}

        if (imageUrl) {
            onDownloadImageFromUrl(imageUrl, 0, prompt);
        }
    }, [nodes, getFullSizeImage, entityActionsHook]);
    
    const handleNavigateToNodeFrame = useCallback((targetNodeId: string, frameNumber: number) => {
        setNodes(nds => nds.map(n => {
            if (n.id === targetNodeId) {
                try {
                    const val = JSON.parse(n.value || '{}');
                    if (n.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
                        const newChecked = [frameNumber];
                        
                        let newSourcePrompts = val.sourcePrompts || [];
                        let newCollapsedSourceScenes = val.collapsedSourceScenes || [];

                        // Find the target prompt
                        const targetPrompt = newSourcePrompts.find((p: any) => p.frameNumber === frameNumber);
                        
                        if (targetPrompt) {
                            // Expand the frame (card)
                            newSourcePrompts = newSourcePrompts.map((p: any) => {
                                if (p.frameNumber === frameNumber) {
                                    return { ...p, isCollapsed: false };
                                }
                                return p;
                            });

                            // Expand the scene
                            const sceneNum = targetPrompt.sceneNumber || 1;
                            if (newCollapsedSourceScenes.includes(sceneNum)) {
                                newCollapsedSourceScenes = newCollapsedSourceScenes.filter((s: number) => s !== sceneNum);
                            }
                        }

                        return {
                            ...n,
                            isCollapsed: false, // Ensure Node is expanded
                            value: JSON.stringify({
                                ...val,
                                sourcePrompts: newSourcePrompts,
                                collapsedSourceScenes: newCollapsedSourceScenes,
                                selectedFrameNumber: frameNumber,
                                checkedSourceFrameNumbers: newChecked,
                            })
                        };
                    }
                } catch (e) {}
            }
            return n;
        }));
        
        const targetNode = nodes.find(n => n.id === targetNodeId);
        if (targetNode) {
             const viewportW = window.innerWidth;
             const viewportH = window.innerHeight;
             const currentScale = Number.isFinite(canvasHook.viewTransform.scale) && canvasHook.viewTransform.scale > 0 
                ? canvasHook.viewTransform.scale 
                : 1;
                
             const nodeCX = targetNode.position.x + targetNode.width / 2;
             const nodeCY = targetNode.position.y + targetNode.height / 2;
             
             const newTx = (viewportW / 2) - (nodeCX * currentScale);
             const newTy = (viewportH / 2) - (nodeCY * currentScale);
             
             if (Number.isFinite(newTx) && Number.isFinite(newTy)) {
                 canvasHook.setViewTransform({ scale: currentScale, translate: { x: newTx, y: newTy } });
             }
        }
    }, [nodes, setNodes, canvasHook]);

    return {
        onRedirectImport,
        onSavePromptToLibrary,
        onSaveToLibrary,
        onSaveCharacterToCatalog,
        onSaveGeneratedCharacterToCatalog,
        onSaveScriptToCatalog,
        onSaveSequenceToCatalog,
        onSaveMediaToDisk,
        onReadData,
        onDownloadImageFromUrl,
        onCopyImageToClipboard,
        handleDuplicateNode,
        handleDuplicateNodeWithContent,
        copyNodeValue,
        pasteNodeValue,
        pasteImageToNode,
        handleDetachAndPasteConcept,
        onDetachImageToNode,
        onDetachCharacter,
        handleSaveGroupToDisk,
        handleSaveGroupToCatalog,
        handleAddGroupFromCatalog,
        handleRemoveGroup,
        handleSplitConnection,
        handleAddNodeAndConnect,
        handleNodeCutConnections,
        handleRegenerateFrame,
        handlePaste,
        handleDownloadImage,
        handleNavigateToNodeFrame
    };
};
