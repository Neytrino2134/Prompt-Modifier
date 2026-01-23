
import React, { useCallback } from 'react';
import { Node, NodeType, Connection, Group, LibraryItem, Point, ToastType } from '../types';
import { getEmptyValueForNodeType, getDuplicatedValueForNodeType, RATIO_INDICES, getOutputHandleType, getInputHandleType } from '../utils/nodeUtils';
import { generateThumbnail } from '../utils/imageUtils';
import { readPromptFromPNG } from '../utils/pngMetadata';
import { CARD_NODE_WIDTH_STEP, CARD_NODE_BASE_WIDTH_OFFSET } from './useEntityActions';

const getTimestamp = () => new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];

export const useAppOrchestration = (
    nodes: Node[],
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    connections: Connection[],
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
    groups: Group[],
    setGroups: React.Dispatch<React.SetStateAction<Group[]>>,
    fullSizeImageCache: Record<string, Record<number, string>>,
    setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void,
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined,
    getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => any[],
    activeTabIdRef: React.MutableRefObject<string>,
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>,
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
    addToast: (message: string, type?: ToastType) => void,
    setError: (error: string | null) => void,
    t: (key: string) => string,
    clearImagesForNodeFromCache: (nodeId: string) => void
) => {

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
            } else if (node.type === NodeType.GEMINI_CHAT) {
                // EXPORT CHAT HISTORY
                const dataToSave = {
                    type: 'gemini-chat-history',
                    messages: parsed.messages || [],
                    currentInput: parsed.currentInput || '',
                    style: parsed.style || 'general',
                    attachment: parsed.attachment || null
                };

                const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const timestamp = getTimestamp();
                a.download = `Gemini_Chat_History_${timestamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                addToast(t('toast.scriptSaved'), 'success');
                return;
            }
        } catch (e) { }

        if (imageUrl) {
            onDownloadImageFromUrl(imageUrl, 0, prompt);
            addToast(t('toast.downloadStarted'), 'success');
        }
    }, [nodes, getFullSizeImage, entityActionsHook, addToast, t]);

    const handleDuplicateNode = useCallback((nodeId: string): string | undefined => {
        const nodeToDup = nodes.find(n => n.id === nodeId);
        if (!nodeToDup) return;

        // Increment counter via the ref from nodesHook
        if (nodesHook.nodeIdCounter) nodesHook.nodeIdCounter.current++;

        const newNodeId = `node-${nodesHook.nodeIdCounter.current}-${Date.now()}`;
        const newNode: Node = {
            ...nodeToDup,
            id: newNodeId,
            position: { x: nodeToDup.position.x + 30, y: nodeToDup.position.y + 30 },
            isNewlyCreated: true,
            value: getDuplicatedValueForNodeType(nodeToDup),
        };
        setNodes(nds => [...nds, newNode]);
        addToast(t('toast.nodeDuplicated'));
        return newNodeId;
    }, [nodes, nodesHook.nodeIdCounter, setNodes, addToast, t]);

    const handleDuplicateNodeWithContent = useCallback((nodeId: string): string | undefined => {
        const nodeToDup = nodes.find(n => n.id === nodeId);
        if (!nodeToDup) return;

        if (nodesHook.nodeIdCounter) nodesHook.nodeIdCounter.current++;
        const newNodeId = `node-${nodesHook.nodeIdCounter.current}-${Date.now()}`;
        const newNode: Node = {
            ...nodeToDup,
            id: newNodeId,
            position: { x: nodeToDup.position.x + 30, y: nodeToDup.position.y + 30 },
            isNewlyCreated: true,
            value: nodeToDup.value,
        };

        // Copy cache
        for (let i = 0; i <= 100; i++) {
            const cachedImg = getFullSizeImage(nodeId, i);
            if (cachedImg) {
                setFullSizeImage(newNodeId, i, cachedImg);
            }
        }

        setNodes(nds => [...nds, newNode]);
        addToast(t('toast.nodeDuplicated'));
        return newNodeId;
    }, [nodes, nodesHook.nodeIdCounter, setNodes, addToast, t, getFullSizeImage, setFullSizeImage]);

    const copyNodeValue = useCallback((nodeId: string) => {
        return nodesHook.handleCopyNodeValue(nodeId);
    }, [nodesHook]);

    const pasteNodeValue = useCallback((nodeId: string) => {
        return nodesHook.handlePasteNodeValue(nodeId);
    }, [nodesHook]);

    const pasteImageToNode = useCallback((nodeId: string, imageFile?: File | null) => {
        return nodesHook.handlePasteImageToNode(nodeId, imageFile);
    }, [nodesHook]);

    const handlePaste = useCallback(async (selectedNodeIds: string[], pasteNodeValueFn: any, pasteImageToNodeFn: any, canvasHook: any, entityActionsHook: any, nodesHook: any, isAlternativeMode?: boolean) => {
        // Priority 1: Paste into Selected Node (if compatible)
        if (selectedNodeIds.length === 1 && !isAlternativeMode) {
            const result = await pasteNodeValueFn(selectedNodeIds[0]);
            if (!result) return; // Paste handled successfully
            // If result is string (error), fall through to global paste
        }

        // Priority 2: Paste as new Node/Group/Image
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {

                // Case A: Image -> Create Image Input
                if (item.types.some(t => t.startsWith('image/'))) {
                    const blob = await item.getType(item.types.find(t => t.startsWith('image/'))!);
                    const file = new File([blob], "pasted_image.png", { type: blob.type });

                    // Create new node at pointer center (or center of screen if pointer unavailable)
                    const pos = canvasHook.pointerPosition || { x: 0, y: 0 };
                    const newNodeId = entityActionsHook.onAddNode(NodeType.IMAGE_INPUT, pos);

                    // Populate
                    pasteImageToNodeFn(newNodeId, file);
                    return;
                }

                // Case B: Text/JSON -> Try to parse as Group/Node/Data
                if (item.types.includes('text/plain')) {
                    const text = await navigator.clipboard.readText();
                    try {
                        const json = JSON.parse(text);
                        const pos = canvasHook.pointerPosition || { x: 0, y: 0 };

                        // Paste Group/Nodes
                        if (json.type === 'prompModifierGroup' || (json.nodes && json.connections)) {
                            entityActionsHook.pasteGroup(json, pos);
                            return;
                        }

                        // Paste Script Analyzer Data (Script Viewer Node)
                        if (json.type === 'script-analyzer-data' || (json.scenes && Array.isArray(json.scenes) && json.scenes[0]?.frames)) {
                            const newNodeId = entityActionsHook.onAddNode(NodeType.SCRIPT_VIEWER, pos);
                            nodesHook.handleValueChange(newNodeId, text);
                            addToast(t('toast.pastedFromClipboard'));
                            return;
                        }

                        // Paste Script Prompt Modifier Data (Finalizer format)
                        if (json.type === 'script-prompt-modifier-data' || (json.finalPrompts && Array.isArray(json.finalPrompts))) {

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

                            const emptyNodeForValue = { id: '', type: NodeType.PROMPT_SEQUENCE_EDITOR, position: { x: 0, y: 0 }, title: '', value: '', width: 0, height: 0 };
                            const emptyValue = getEmptyValueForNodeType(emptyNodeForValue as any);
                            const parsedEmptyValue = JSON.parse(emptyValue);

                            const nodeValue = JSON.stringify({
                                ...parsedEmptyValue,
                                instruction: '',
                                sourcePrompts: sourcePrompts,
                                modifiedPrompts: [],
                                checkedSourceFrameNumbers: [],
                                selectedFrameNumber: null,
                                styleOverride: json.visualStyle || json.styleOverride || '',
                                usedCharacters: json.usedCharacters || [],
                                sceneContexts: json.sceneContexts || {},
                                leftPaneRatio: 0.5
                            });

                            const newNodeId = entityActionsHook.onAddNode(NodeType.PROMPT_SEQUENCE_EDITOR, pos);
                            nodesHook.handleValueChange(newNodeId, nodeValue);
                            addToast(t('toast.pastedFromClipboard'));
                            return;
                        }

                        // Paste Character Card (Array or Single)
                        let charCards = null;
                        if (json.type === 'character-card') {
                            charCards = [json];
                        } else if (Array.isArray(json) && (json[0]?.imageSources || json[0]?.type === 'character-card')) {
                            charCards = json;
                        }

                        if (charCards) {
                            const newNodeId = entityActionsHook.onAddNode(NodeType.CHARACTER_CARD, pos, charCards[0].name || 'Character Card');

                            // Restore images to cache
                            charCards.forEach((char: any, i: number) => {
                                if (char.imageSources) {
                                    Object.entries(char.imageSources).forEach(([ratio, src]) => {
                                        const index = RATIO_INDICES[ratio];
                                        if (index !== undefined && typeof src === 'string' && src.startsWith('data:')) {
                                            setFullSizeImage(newNodeId, (i * 10) + index, src);
                                        }
                                    });
                                    const activeRatio = char.selectedRatio || '1:1';
                                    const activeSrc = (char.imageSources as any)[activeRatio];
                                    if (activeSrc && typeof activeSrc === 'string' && activeSrc.startsWith('data:')) {
                                        setFullSizeImage(newNodeId, i * 10, activeSrc);
                                    }
                                }
                            });

                            // Set Node Value
                            nodesHook.handleValueChange(newNodeId, JSON.stringify(charCards));

                            // Resize if needed
                            if (setNodes) {
                                const targetWidth = (charCards.length * CARD_NODE_WIDTH_STEP) + CARD_NODE_BASE_WIDTH_OFFSET;
                                setNodes((nds: Node[]) => nds.map(n => n.id === newNodeId ? { ...n, width: targetWidth } : n));
                            }
                            return;
                        }

                    } catch {
                        // Not JSON, just text -> New Note or Text Input
                        // If in alternative mode (e.g. Ctrl+Shift+V), maybe do something else?
                        // Default: Create Text Input
                        const pos = canvasHook.pointerPosition || { x: 0, y: 0 };
                        const newNodeId = entityActionsHook.onAddNode(NodeType.TEXT_INPUT, pos);
                        nodesHook.handleValueChange(newNodeId, text);
                        addToast(t('toast.pastedFromClipboard'));
                        return;
                    }
                }
            }
        } catch (e) {
            // Clipboard read failed or denied
            console.warn("Paste failed or permission denied", e);
        }
    }, [addToast, t, setFullSizeImage, setNodes]);

    const handleAddGroupFromCatalog = useCallback((itemId: string, position?: Point) => {
        const item = catalogHook.catalogItems.find((i: any) => i.id === itemId);
        if (!item || !item.nodes) return;

        const pos = position || canvasHook.pointerPosition || { x: 0, y: 0 };
        const data = {
            type: 'prompModifierGroup',
            name: item.name,
            nodes: item.nodes,
            connections: item.connections || [],
            fullSizeImages: item.fullSizeImages
        };

        entityActionsHook.pasteGroup(data, pos);
    }, [catalogHook.catalogItems, canvasHook.pointerPosition, entityActionsHook]);

    const handleAddNodeAndConnect = useCallback((nodeType: NodeType, info: any, onClose: () => void) => {
        const { position, connectingInfo } = info;
        const { scale, translate } = canvasHook.viewTransform;

        const worldPos = {
            x: (position.x - translate.x) / scale,
            y: (position.y - translate.y) / scale
        };

        // Use alignToInput: true to place node to the right of cursor (x = cursor.x) and vertically centered
        const newNodeId = entityActionsHook.onAddNode(nodeType, worldPos, undefined, { alignToInput: true });

        // Auto-connect
        const targetNode = nodes.find(n => n.id === newNodeId); // It won't be in 'nodes' yet due to closure, but we know its ID
        // Note: entityActionsHook.onAddNode triggers state update, but we are in the same cycle. 
        // We can construct the connection blindly, but handleId matching requires node instance.
        // Actually, we can assume standard handles or use a helper that doesn't need the node object immediately if possible,
        // OR rely on the fact that we know the type.

        // Simulating the target node for handle lookup
        const mockTargetNode = { id: newNodeId, type: nodeType } as Node;

        let targetHandleId: string | undefined = undefined;
        // Logic similar to useConnectionHandling but streamlined for creation
        if (connectingInfo.fromType === 'image') {
            if (nodeType === NodeType.IMAGE_EDITOR) targetHandleId = 'image';
            if (nodeType === NodeType.IMAGE_ANALYZER) targetHandleId = 'image';
            if (nodeType === NodeType.VIDEO_EDITOR) targetHandleId = 'image';
        } else if (connectingInfo.fromType === 'text') {
            if (nodeType === NodeType.IMAGE_INPUT) targetHandleId = 'text';
            if (nodeType === NodeType.IMAGE_EDITOR) targetHandleId = 'text';
            if (nodeType === NodeType.GEMINI_CHAT) targetHandleId = undefined; // Chat accepts text on main
            if (nodeType === NodeType.PROMPT_PROCESSOR) targetHandleId = undefined;
            if (nodeType === NodeType.PROMPT_ANALYZER) targetHandleId = undefined;
            if (nodeType === NodeType.IMAGE_SEQUENCE_GENERATOR) targetHandleId = 'prompt_input';
            if (nodeType === NodeType.PROMPT_SEQUENCE_EDITOR) targetHandleId = 'prompts_sequence';
            if (nodeType === NodeType.NOTE) targetHandleId = 'prompt_data';
        } else if (connectingInfo.fromType === 'character_data') {
            if (nodeType === NodeType.IMAGE_SEQUENCE_GENERATOR) targetHandleId = 'character_data';
        } else if (connectingInfo.fromType === 'video') {
            if (nodeType === NodeType.VIDEO_EDITOR) targetHandleId = 'video';
        } else if (connectingInfo.fromType === 'audio') {
            if (nodeType === NodeType.VIDEO_EDITOR) targetHandleId = 'audio';
        }

        // Generic fallback for Data Reader / Reroute
        if (nodeType === NodeType.DATA_READER || nodeType === NodeType.REROUTE_DOT) targetHandleId = undefined;

        // Apply coloring for Reroute Dot
        if (nodeType === NodeType.REROUTE_DOT) {
            nodesHook.handleValueChange(newNodeId, JSON.stringify({ type: connectingInfo.fromType, direction: 'LR' }));
        }

        connectionsHook.addConnection({
            fromNodeId: connectingInfo.fromNodeId,
            fromHandleId: connectingInfo.fromHandleId,
            toNodeId: newNodeId,
            toHandleId: targetHandleId
        });

        onClose();
    }, [entityActionsHook, connectionsHook, nodes]);

    const onSaveMediaToDisk = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        try {
            const parsed = JSON.parse(node.value || '{}');
            if (parsed.src) {
                // If it's a blob/data URL, try to download
                const link = document.createElement('a');
                link.href = parsed.src;
                // Try to infer name/ext
                let name = parsed.name || 'media_file';
                if (!name.includes('.')) {
                    if (parsed.type === 'video') name += '.mp4';
                    else name += '.mp3';
                }
                link.download = name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                addToast(t('toast.downloadStarted'), 'success');
            }
        } catch {
            setError("Failed to save media.");
        }
    }, [nodes, addToast, t, setError]);

    const handleDetachAndPasteConcept = useCallback((sequenceNodeId: string, conceptToPaste: any) => {
        const sourceNode = nodes.find(n => n.id === sequenceNodeId);
        const position = sourceNode 
            ? { x: sourceNode.position.x + sourceNode.width + 50, y: sourceNode.position.y } 
            : { x: 0, y: 0 };
            
        const newNodeId = entityActionsHook.onAddNode(NodeType.CHARACTER_CARD, position, conceptToPaste.name);
        
        // Prioritize full resolution image from cache if available (attached in useDerivedMemo/useSequenceNode)
        const imageToUse = conceptToPaste._fullResImage || conceptToPaste.image;

        const cardData = [{
            id: `char-card-${Date.now()}`,
            name: conceptToPaste.name || 'New Entity',
            index: conceptToPaste.index || 'Entity-1',
            image: imageToUse,
            thumbnails: { '1:1': imageToUse, '16:9': null, '9:16': null },
            selectedRatio: '1:1',
            prompt: conceptToPaste.prompt || '',
            fullDescription: conceptToPaste.fullDescription || '',
            isOutput: true,
            isActive: true
        }];
        
        // Set Full Resolution Cache for new node
        if (imageToUse && imageToUse.startsWith('data:')) {
             setFullSizeImage(newNodeId, 0, imageToUse);
             setFullSizeImage(newNodeId, 1, imageToUse); 
        }

        nodesHook.handleValueChange(newNodeId, JSON.stringify(cardData));
        addToast(t('toast.pastedFromClipboard'), 'success');
    }, [nodes, entityActionsHook, setFullSizeImage, addToast, t, nodesHook]);

    const onDetachImageToNode = useCallback((imageDataUrl: string, sourceNodeId: string) => {
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        const position = sourceNode 
            ? { x: sourceNode.position.x + sourceNode.width + 50, y: sourceNode.position.y } 
            : { x: 0, y: 0 };
            
        const newNodeId = entityActionsHook.onAddNode(NodeType.IMAGE_INPUT, position);
        
        setFullSizeImage(newNodeId, 0, imageDataUrl);
        generateThumbnail(imageDataUrl, 256, 256).then(thumb => {
             nodesHook.handleValueChange(newNodeId, JSON.stringify({ image: thumb, prompt: '' }));
        });
        
        addToast(t('toast.pastedFromClipboard'), 'success');
    }, [nodes, entityActionsHook, setFullSizeImage, addToast, t, nodesHook]);

    const handleDetachCharacterFromGenerator = useCallback((characterData: any, generatorNode: Node) => {
        const pos = { x: generatorNode.position.x + generatorNode.width + 400, y: generatorNode.position.y };

        const newNodeId = entityActionsHook.onAddNode(NodeType.CHARACTER_CARD, pos, characterData.name || t('node.title.character_card'));

        const normalizedIndex = (characterData.index || characterData.alias || 'Entity-1').replace(/^Character-/, 'Entity-');

        const imageSources: Record<string, string | null> = {};
        if (characterData.imageBase64 && !characterData.imageBase64.startsWith('data:')) {
            const dataUrl = `data:image/png;base64,${characterData.imageBase64}`;
            imageSources['1:1'] = dataUrl;
            if (setFullSizeImage) {
                setFullSizeImage(newNodeId, 0, dataUrl);
            }
        } else if (characterData.imageBase64 && characterData.imageBase64.startsWith('data:')) {
            imageSources['1:1'] = characterData.imageBase64;
            if (setFullSizeImage) {
                setFullSizeImage(newNodeId, 0, characterData.imageBase64);
            }
        }

        const cardPayload = [{
            type: 'character-card',
            id: `char-card-${Date.now()}`,
            name: characterData.name || 'New Entity',
            index: normalizedIndex,
            imageSources: imageSources,
            selectedRatio: '1:1',
            prompt: characterData.prompt || '',
            fullDescription: characterData.fullDescription || '',
            additionalPrompt: characterData.additionalPrompt,
            isOutput: true,
            isActive: true,
            isPromptCollapsed: true
        }];

        nodesHook.handleValueChange(newNodeId, JSON.stringify(cardPayload));

        if (nodesHook.handleRenameNode && characterData.name) {
            nodesHook.handleRenameNode(newNodeId, characterData.name);
        }

        addToast(t('toast.characterDetached') || "Character detached", 'success');
    }, [entityActionsHook, nodesHook, setFullSizeImage, addToast, t]);

    return {
        handleDownloadImage,
        handleDuplicateNode,
        handleDuplicateNodeWithContent,
        copyNodeValue,
        pasteNodeValue,
        pasteImageToNode,
        handlePaste,
        handleAddGroupFromCatalog,
        handleAddNodeAndConnect,
        onSaveMediaToDisk,
        handleDetachCharacterFromGenerator,
        handleDetachAndPasteConcept,
        onDetachImageToNode
    };
};
