import { useCallback } from 'react';
import { NodeType } from '../../types';
import { calculateGroupBounds, ContentCatalogItemType } from '../../hooks';
import { RATIO_INDICES } from '../../utils/nodeUtils';
import { generateThumbnail } from '../../utils/imageUtils';

interface UseCatalogAndEntityDispatchParams {
    nodes: any[];
    setNodes: (nodes: any[] | ((prev: any[]) => any[])) => void;
    connections: any[];
    groups: any[];
    setGroups: React.Dispatch<React.SetStateAction<any[]>>;
    fullSizeImageCache: Record<string, Record<number, string>>;
    setFullSizeImage: (nodeId: string, frameIndex: number, dataUrl: string) => void;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
    handleValueChange: (nodeId: string, value: string) => void;
    onAddNode: (type: NodeType, position: { x: number; y: number }, title?: string, options?: any) => string;
    deleteNodeAndConnections: (nodeId: string) => void;
    characterCatalog: any;
    scriptCatalog: any;
    sequenceCatalog: any;
    catalogHook: any;
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    t: (key: string, options?: any) => string;
}

export const useCatalogAndEntityDispatch = ({
    nodes,
    connections,
    groups,
    setGroups,
    fullSizeImageCache,
    setFullSizeImage,
    getFullSizeImage,
    handleValueChange,
    onAddNode,
    deleteNodeAndConnections,
    characterCatalog,
    scriptCatalog,
    sequenceCatalog,
    catalogHook,
    addToast,
    t
}: UseCatalogAndEntityDispatchParams) => {
    const handleDetachNodeFromGroup = useCallback((nodeId: string) => {
        const currentNodes = nodes;
        setGroups(currentGroups => {
            const groupContainingNode = currentGroups.find(g => g.nodeIds.includes(nodeId));
            if (!groupContainingNode) return currentGroups;
            const newNodeIds = groupContainingNode.nodeIds.filter((id: string) => id !== nodeId);
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
    }, [setGroups, nodes]);

    const handleRemoveGroup = useCallback((groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.shiftKey) {
            const group = groups.find(g => g.id === groupId);
            if (group) {
                group.nodeIds.forEach((id: string) => deleteNodeAndConnections(id));
            }
            setGroups(prev => prev.filter(g => g.id !== groupId));
            addToast(t('toast.groupDeleted'), 'info');
        } else {
            setGroups(prev => prev.filter(g => g.id !== groupId));
        }
    }, [groups, deleteNodeAndConnections, setGroups, addToast, t]);

    const handleSaveGroupToCatalog = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        catalogHook.saveGroupToCatalog(group, nodes, connections, fullSizeImageCache);
        addToast(t('alert.groupSaved', { groupTitle: group.title }), 'success');
    }, [groups, nodes, connections, fullSizeImageCache, catalogHook, addToast, t]);

    const handleSaveGroupToDisk = useCallback((groupId: string) => {
         const group = groups.find(g => g.id === groupId);
         if (!group) return;

         const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
         const groupNodeIds = new Set(groupNodes.map(n => n.id));
         const groupConnections = connections.filter(c => groupNodeIds.has(c.fromNodeId) && groupNodeIds.has(c.toNodeId));

         const images: Record<string, Record<number, string>> = {};
         groupNodes.forEach(n => {
             if (fullSizeImageCache[n.id]) {
                 images[n.id] = fullSizeImageCache[n.id];
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
    }, [groups, nodes, connections, fullSizeImageCache, addToast, t]);

    const handleDetachAndPasteConcept = useCallback((sequenceNodeId: string, conceptToPaste: any) => {
        const sourceNode = nodes.find(n => n.id === sequenceNodeId);
        const position = sourceNode
            ? { x: sourceNode.position.x + sourceNode.width + 50, y: sourceNode.position.y }
            : { x: 0, y: 0 };

        const newNodeId = onAddNode(NodeType.CHARACTER_CARD, position, conceptToPaste.name);

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

        handleValueChange(newNodeId, JSON.stringify(cardData));
        addToast(t('toast.pastedFromClipboard'), 'success');
    }, [nodes, onAddNode, setFullSizeImage, handleValueChange, addToast, t]);

    const onDetachImageToNode = useCallback((imageDataUrl: string, sourceNodeId: string) => {
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        const position = sourceNode
            ? { x: sourceNode.position.x + sourceNode.width + 50, y: sourceNode.position.y }
            : { x: 0, y: 0 };

        const newNodeId = onAddNode(NodeType.IMAGE_INPUT, position);

        setFullSizeImage(newNodeId, 0, imageDataUrl);
        generateThumbnail(imageDataUrl, 256, 256).then(thumb => {
             handleValueChange(newNodeId, JSON.stringify({ image: thumb, prompt: '' }));
        });

        addToast(t('toast.pastedFromClipboard'), 'success');
    }, [nodes, onAddNode, setFullSizeImage, handleValueChange, addToast, t]);

    const onSaveCharacterToCatalog = useCallback((nodeId: string, cardIndex?: number) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type !== NodeType.CHARACTER_CARD) return;

        try {
            let characters = JSON.parse(node.value || '[]');
            if (!Array.isArray(characters)) characters = [characters];

            if (cardIndex !== undefined) {
                 const char = characters[cardIndex];
                 if (!char) return;

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

                 characterCatalog.createItem(ContentCatalogItemType.ITEM, char.name || 'New Character', JSON.stringify(dataToSave));
                 addToast(t('toast.characterSavedCatalog'), 'success');

            } else {
                 const allDataToSave = characters.map((char: any, i: number) => {
                     const fullSources: Record<string, string | null> = { ...(char.thumbnails || char.imageSources || {}) };
                     Object.entries(RATIO_INDICES).forEach(([ratio, index]) => {
                        const fullRes = getFullSizeImage(nodeId, (i * 10) + index);
                        if (fullRes) fullSources[ratio] = fullRes;
                     });

                     const activeImg = getFullSizeImage(nodeId, i * 10) || char.image;

                     return {
                        id: char.id || `char-${Date.now()}-${i}`,
                        type: 'character-card',
                        name: char.name,
                        index: char.index,
                        image: activeImg,
                        imageSources: fullSources,
                        prompt: char.prompt,
                        fullDescription: char.fullDescription,
                        selectedRatio: char.selectedRatio,
                        additionalPrompt: char.additionalPrompt,
                        isActive: char.isActive
                     };
                 });

                 const collectionName = node.title || 'Character Collection';

                 characterCatalog.createItem(
                     ContentCatalogItemType.ITEM,
                     collectionName,
                     JSON.stringify(allDataToSave)
                 );
                 addToast(t('toast.characterSavedCatalog') + " (All)", 'success');
            }
        } catch (e) {
            console.error("Failed to save character to catalog", e);
            addToast("Failed to save to catalog", 'error');
        }
    }, [nodes, characterCatalog, getFullSizeImage, addToast, t]);

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

        characterCatalog.createItem(ContentCatalogItemType.ITEM, characterData.name || 'Generated Character', JSON.stringify(dataToSave));
        addToast(t('toast.characterSavedCatalog'), 'success');
    }, [characterCatalog, addToast, t]);

    const onSaveScriptToCatalog = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (node.type === NodeType.SCRIPT_GENERATOR || node.type === NodeType.SCRIPT_VIEWER) {
             scriptCatalog.createItem(ContentCatalogItemType.ITEM, node.title || 'New Script', node.value);
             addToast("Script saved to catalog", 'success');
        }
    }, [nodes, scriptCatalog, addToast]);

    const onSaveSequenceToCatalog = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
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

                sequenceCatalog.createItem(ContentCatalogItemType.ITEM, node.title || 'New Sequence', JSON.stringify(contentToSave));
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
                 sequenceCatalog.createItem(ContentCatalogItemType.ITEM, node.title || 'New Sequence', JSON.stringify(contentToSave));
                 addToast("Sequence saved to catalog", 'success');
            } catch(e) { console.error(e); }
        }
    }, [nodes, sequenceCatalog, addToast]);

    return {
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
    };
};
