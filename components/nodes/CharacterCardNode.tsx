
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { NodeContentProps, NodeType } from '../../types';
import { generateThumbnail, cropImageTo1x1 } from '../../utils/imageUtils';
import { RATIO_INDICES } from '../../utils/nodeUtils';
import { expandImageAspectRatio } from '../../services/imageActions';
import ImageEditorModal from '../ImageEditorModal';
import { useLanguage, languages } from '../../localization';
import { Tooltip } from '../Tooltip';
import { useAppContext } from '../../contexts/AppContext';
import { CharacterData } from './character-card/types';
import { CharacterCardItemMemoized } from './character-card/CharacterCardItem';

const NODE_WIDTH_STEP = 410;
const BASE_WIDTH_OFFSET = 90; // Reduced from 110 to fit tighter layout

// Extracted DropZone component to prevent re-renders of the entire node content
const DropZone: React.FC<{ 
    index: number; 
    activeDropZone: number | null; 
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragLeave: () => void;
}> = React.memo(({ index, activeDropZone, onDragOver, onDrop, onDragLeave }) => {
    return (
        <div
            className={`w-[24px] h-full flex items-center justify-center flex-shrink-0 transition-all cursor-copy ${activeDropZone === index ? 'bg-gray-800/30' : ''}`}
            onDragOver={(e) => onDragOver(e, index)}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div 
                className={`h-[90%] rounded-full transition-all duration-200 pointer-events-none ${
                    activeDropZone === index 
                        ? 'w-1 bg-accent shadow-[0_0_10px_var(--color-accent)] opacity-100 scale-y-100' 
                        : 'w-[1px] bg-gray-700/30 opacity-50 scale-y-90'
                }`} 
            />
        </div>
    );
});

export const CharacterCardNode: React.FC<NodeContentProps> = ({ 
    node, 
    onValueChange, 
    onSaveCharacterCard, 
    onLoadCharacterCard, 
    t, 
    deselectAllNodes, 
    onSaveCharacterToCatalog, 
    setFullSizeImage, 
    getFullSizeImage, 
    setImageViewer, 
    onCopyImageToClipboard, 
    onDownloadImage,
    addToast,
    onUpdateCharacterDescription,
    isUpdatingDescription,
    onModifyCharacter,
    isModifyingCharacter,
    getUpstreamNodeValues,
    connectedInputs,
    onDetachCharacter,
    onGenerateImage,
    isGeneratingImage,
    onAddNode,
    onDeleteNode
}) => {
    const context = useAppContext();
    const { setNodes, setSelectedNodeIds, handleUpdateCharacterPromptFromImage, isUpdatingCharacterPrompt } = context || {};
    const addNode = onAddNode || context?.onAddNode;
    const deleteNode = onDeleteNode || context?.deleteNodeAndConnections;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [transformingRatio, setTransformingRatio] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
    const [editingCardIndex, setEditingCardIndex] = useState<number>(0);
    const [modificationRequests, setModificationRequests] = useState<Record<number, string>>({});

    const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
    const [dropInsertionIndex, setDropInsertionIndex] = useState<number | null>(null);
    
    const [activeDropZone, setActiveDropZone] = useState<number | null>(null);
    const [isExternalDragOver, setIsExternalDragOver] = useState(false);

    const { secondaryLanguage } = useLanguage();
    const isInputConnected = connectedInputs?.has(undefined);

    const characters: CharacterData[] = useMemo(() => {
        try {
            let parsed = JSON.parse(node.value || '[]');
            if (!Array.isArray(parsed)) {
                if (typeof parsed === 'object' && parsed !== null) parsed = [parsed];
                else parsed = [];
            }
            if (parsed.length === 0) {
                parsed = [{ 
                    id: `char-card-${Date.now()}`,
                    name: 'New Entity 1',
                    index: 'Entity-1', image: null, 
                    thumbnails: { '1:1': null, '16:9': null, '9:16': null }, 
                    selectedRatio: '1:1', prompt: '', fullDescription: '',
                    targetLanguage: 'en',
                    isOutput: true,
                    isActive: true,
                    isDescriptionCollapsed: false,
                    isImageCollapsed: false,
                    isPromptCollapsed: false,
                    additionalPrompt: "Full body character concept on a gray background"
                }];
            }
            return parsed.map((char: any, i: number) => ({
                id: char.id || `char-card-${Date.now()}-${i}`,
                name: char.name || '',
                index: (char.index || char.alias || `Entity-${i + 1}`).replace(/^Character-/, 'Entity-'),
                image: char.image || null,
                thumbnails: char.thumbnails || char.imageSources || { '1:1': null, '16:9': null, '9:16': null },
                selectedRatio: char.selectedRatio || '1:1',
                prompt: char.prompt || '',
                additionalPrompt: char.additionalPrompt !== undefined ? char.additionalPrompt : "Full body character concept on a gray background",
                fullDescription: char.fullDescription || '',
                targetLanguage: char.targetLanguage || 'en',
                isOutput: char.isOutput || (i === 0 && !parsed.some((c: any) => c.isOutput)),
                isActive: char.isActive !== false, // Default true if undefined
                isDescriptionCollapsed: char.isDescriptionCollapsed ?? false,
                isImageCollapsed: char.isImageCollapsed ?? false,
                isPromptCollapsed: char.isPromptCollapsed ?? false
            }));
        } catch {
            return [{ 
                id: `char-card-${Date.now()}`,
                name: 'New Entity 1', 
                index: 'Entity-1', image: null, 
                thumbnails: { '1:1': null, '16:9': null, '9:16': null }, 
                selectedRatio: '1:1', prompt: '', fullDescription: '',
                targetLanguage: 'en',
                isOutput: true,
                isActive: true,
                isDescriptionCollapsed: false,
                isImageCollapsed: false,
                isPromptCollapsed: false,
                additionalPrompt: "Full body character concept on a gray background"
            }];
        }
    }, [node.value]);

    // Force migration persistence if indices changed in memo
    useEffect(() => {
        try {
            const rawParsed = JSON.parse(node.value || '[]');
            const rawArray = Array.isArray(rawParsed) ? rawParsed : [rawParsed];
            const hasCharacterPrefix = rawArray.some((c:any) => c.index && c.index.startsWith('Character-'));
            
            if (hasCharacterPrefix) {
                // If migration needed, trigger update
                onValueChange(node.id, JSON.stringify(characters));
            }
        } catch {}
    }, [node.value, characters, onValueChange, node.id]);

    // Reset drag state if characters array changes size (prevents visual glitches on remove/transfer)
    useEffect(() => {
        setDraggedCardIndex(null);
        setDropInsertionIndex(null);
        setActiveDropZone(null);
    }, [characters.length]);

    const duplicateIndices = useMemo(() => {
        const counts: Record<string, number> = {};
        const duplicates = new Set<string>();

        characters.forEach(char => {
            const idx = (char.index || '').trim();
            if (idx) {
                counts[idx] = (counts[idx] || 0) + 1;
            }
        });

        Object.entries(counts).forEach(([idx, count]) => {
            if (count > 1) {
                duplicates.add(idx);
            }
        });

        return duplicates;
    }, [characters]);

    const handleValueUpdate = useCallback((newCharacters: CharacterData[]) => {
        onValueChange(node.id, JSON.stringify(newCharacters));
    }, [node.id, onValueChange]);

    const handleUpdateCard = useCallback((index: number, updates: Partial<CharacterData>) => {
        // Use functional state update logic relative to current characters
        // BUT we need access to current characters. 
        // `characters` is a dependency, so this function is recreated when characters change.
        // This is fine for the update action itself.
        const newChars = [...characters];
        newChars[index] = { ...newChars[index], ...updates };
        handleValueUpdate(newChars);
    }, [characters, handleValueUpdate]);

    const handleSetAsOutput = (idx: number) => {
        const newChars = characters.map((c, i) => ({
            ...c,
            isOutput: i === idx
        }));
        handleValueUpdate(newChars);
        addToast?.("Character marked as output", "success");
    };

    const handleToggleActive = (idx: number) => {
        const newChars = [...characters];
        newChars[idx] = { ...newChars[idx], isActive: !newChars[idx].isActive };
        handleValueUpdate(newChars);
    };

    const handleCardDragStart = (e: React.DragEvent, index: number) => {
        setDraggedCardIndex(index);
        const char = characters[index];
        const fullSources: Record<string, string | null> = { ...char.thumbnails };
        Object.entries(RATIO_INDICES).forEach(([ratio, idx]) => {
            const fullRes = getFullSizeImage(node.id, (index * 10) + idx);
            if (fullRes) fullSources[ratio] = fullRes;
        });

        const dragData = {
            type: 'prompt-modifier-character-card-transfer',
            sourceNodeId: node.id,
            sourceIndex: index,
            character: {
                ...char,
                imageSources: fullSources,
                _fullResActive: getFullSizeImage(node.id, index * 10)
            }
        };

        e.dataTransfer.setData('application/prompt-modifier-card', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'move';
    };

    // --- Smart Dragging Logic ---
    const handleSmartCardDragOver = (e: React.DragEvent, cardIndex: number) => {
        if (!e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
        
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        // Mouse X relative to the card's left edge
        const offsetX = e.clientX - rect.left;
        
        // Determine if mouse is on left or right half
        const isRightHalf = offsetX > rect.width / 2;
        
        // If left half, insert before current card (index). 
        // If right half, insert after current card (index + 1).
        const insertionIndex = cardIndex + (isRightHalf ? 1 : 0);

        setActiveDropZone(insertionIndex);
        setDropInsertionIndex(insertionIndex);
    };

    const handleZoneDragOver = useCallback((e: React.DragEvent, index: number) => {
        if (!e.dataTransfer.types.includes('application/prompt-modifier-card')) return;
        e.preventDefault();
        e.stopPropagation();
        setActiveDropZone(index);
        setDropInsertionIndex(index);
    }, []);

    const handleZoneDragLeave = useCallback(() => {
        // We handle visual clearing mostly via the new target taking over or drop
        // But if leaving the whole area, we might want to clear.
        // For smart dragging, usually unnecessary to clear here if we have a container handler.
        // Keeping it for direct zone interaction compatibility.
    }, []);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveDropZone(null);
        setDraggedCardIndex(null);
        setIsExternalDragOver(false);
        
        const targetIndex = dropInsertionIndex;
        setDropInsertionIndex(null);

        const dataStr = e.dataTransfer.getData('application/prompt-modifier-card');
        if (!dataStr) return;

        try {
            const dragData = JSON.parse(dataStr);
            if (dragData.type !== 'prompt-modifier-character-card-transfer') return;

            const { sourceNodeId, sourceIndex, character } = dragData;
            const insertionIndex = targetIndex !== null ? targetIndex : characters.length;

            // --- INTERNAL REORDER ---
            if (sourceNodeId === node.id) {
                // If dropping adjacent to self, do nothing
                if (sourceIndex === insertionIndex || sourceIndex === insertionIndex - 1) return;
                
                const newChars = [...characters];
                const [moved] = newChars.splice(sourceIndex, 1);
                let adjustedTarget = insertionIndex;
                // If moving from a lower index to higher index, the target index shifts down by 1 after removal
                if (insertionIndex > sourceIndex) adjustedTarget -= 1;
                
                newChars.splice(adjustedTarget, 0, moved);
                
                // Re-map Cache Indices
                const tempCache: Record<number, string> = {};
                characters.forEach((_, i) => {
                    for(let j=0; j<10; j++) {
                        const img = getFullSizeImage(node.id, (i * 10) + j);
                        if (img) tempCache[(i * 10) + j] = img;
                    }
                });
                
                for(let i=0; i<characters.length * 10; i++) setFullSizeImage(node.id, i, null as any);
                
                newChars.forEach((char, newIdx) => {
                    const oldIdx = characters.findIndex(c => c.id === char.id);
                    if (oldIdx !== -1) {
                        for(let j=0; j<10; j++) {
                            const img = tempCache[(oldIdx * 10) + j];
                            if (img) setFullSizeImage(node.id, (newIdx * 10) + j, img);
                        }
                    }
                });
                
                handleValueUpdate(newChars);
            } 
            // --- EXTERNAL TRANSFER ---
            else {
                const newChars = [...characters];
                // Remove default empty card if it's the only one and has no data
                if (newChars.length === 1 && !newChars[0].name && !newChars[0].image && !newChars[0].prompt) {
                    newChars.splice(0, 1);
                }
                
                const isFirstCard = newChars.length === 0;

                const newCard = { 
                    ...character, 
                    id: `char-card-${Date.now()}`,
                    // Ensure only one card is marked as output. If it's the first card, make it output.
                    // Otherwise force false to prevent multiple primaries.
                    isOutput: isFirstCard,
                    isActive: true,
                    isDescriptionCollapsed: false,
                    isImageCollapsed: false,
                    isPromptCollapsed: false
                };
                
                // Insert at specific position or append
                const finalInsertion = Math.min(insertionIndex, newChars.length);
                newChars.splice(finalInsertion, 0, newCard);
                
                // Copy Images to this Node's Cache
                if (newCard.imageSources) {
                    Object.entries(newCard.imageSources).forEach(([ratio, src]) => {
                        const idx = RATIO_INDICES[ratio];
                        if (idx && typeof src === 'string') setFullSizeImage(node.id, (finalInsertion * 10) + idx, src);
                    });
                }
                if (newCard._fullResActive) {
                    setFullSizeImage(node.id, finalInsertion * 10, newCard._fullResActive);
                }
                
                // Expand Node Width if needed
                if (setNodes) {
                    setNodes(nds => nds.map(n => n.id === node.id ? { ...n, width: newChars.length * NODE_WIDTH_STEP + BASE_WIDTH_OFFSET } : n));
                }

                handleValueUpdate(newChars);
                
                // Remove from Source Node
                if (setNodes && context?.setFullSizeImage && context?.getFullSizeImage) {
                    setNodes(nds => nds.map(n => {
                        if (n.id === sourceNodeId) {
                            try {
                                const sourceChars = JSON.parse(n.value);
                                let nextSourceChars = sourceChars.filter((_: any, i: number) => i !== sourceIndex);
                                
                                // FIX: If source becomes empty, reset it to default empty card
                                if (nextSourceChars.length === 0) {
                                    nextSourceChars = [{
                                        id: `char-card-${Date.now()}-reset`,
                                        name: 'New Entity 1',
                                        index: 'Entity-1',
                                        image: null,
                                        thumbnails: { '1:1': null, '16:9': null, '9:16': null },
                                        selectedRatio: '1:1',
                                        prompt: '',
                                        fullDescription: '',
                                        targetLanguage: 'en',
                                        isOutput: true,
                                        isActive: true,
                                        isDescriptionCollapsed: false,
                                        isImageCollapsed: false,
                                        isPromptCollapsed: false,
                                        additionalPrompt: "Full body character concept on a gray background"
                                    }];
                                    // Clear cache for the now empty slot
                                    for (let j = 0; j < 10; j++) context.setFullSizeImage(sourceNodeId, j, null as any);
                                } else {
                                    // Logic: If we moved the primary card, assign primary to the new first card
                                    if (sourceChars[sourceIndex].isOutput && nextSourceChars.length > 0) {
                                        nextSourceChars[0].isOutput = true;
                                    }

                                    // Shift cache in source node
                                    for (let i = sourceIndex; i < sourceChars.length - 1; i++) {
                                        for (let j = 0; j < 10; j++) {
                                            const nextImg = context.getFullSizeImage(sourceNodeId, ((i + 1) * 10) + j);
                                            context.setFullSizeImage(sourceNodeId, (i * 10) + j, nextImg || (null as any));
                                        }
                                    }
                                    // Clear last slot cache
                                    const lastIdx = sourceChars.length - 1;
                                    for (let j = 0; j < 10; j++) context.setFullSizeImage(sourceNodeId, (lastIdx * 10) + j, null as any);
                                }
                                
                                const nextWidth = Math.max(NODE_WIDTH_STEP + BASE_WIDTH_OFFSET, nextSourceChars.length * NODE_WIDTH_STEP + BASE_WIDTH_OFFSET);
                                return { ...n, value: JSON.stringify(nextSourceChars), width: nextWidth };
                            } catch { return n; }
                        }
                        return n;
                    }));
                }
                addToast?.("Card transferred", "success");
            }
        } catch (err) { 
            console.error("Drop failed", err); 
            addToast?.("Drop failed: " + (err instanceof Error ? err.message : "Unknown error"), "error");
        }
    };

    const handleAddCard = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Calculate next "New Entity N" name
        let nextNameIndex = 1;
        const existingNames = new Set(characters.map(c => c.name));
        while (existingNames.has(`New Entity ${nextNameIndex}`)) {
            nextNameIndex++;
        }

        const newChars = [...characters, {
            id: `char-card-${Date.now()}`,
            name: `New Entity ${nextNameIndex}`,
            index: `Entity-${characters.length + 1}`, image: null,
            thumbnails: { '1:1': null, '16:9': null, '9:16': null },
            selectedRatio: '1:1', prompt: '', fullDescription: '',
            targetLanguage: 'en',
            isOutput: false,
            isActive: true,
            isDescriptionCollapsed: false,
            isImageCollapsed: false,
            isPromptCollapsed: false,
            additionalPrompt: "Full body character concept on a gray background"
        }];
        handleValueUpdate(newChars);
        if (setNodes) {
            setNodes(nds => nds.map(n => {
                if (n.id === node.id) {
                    return { ...n, width: newChars.length * NODE_WIDTH_STEP + BASE_WIDTH_OFFSET };
                }
                return n;
            }));
        }
    };

    const handleRemoveCard = (index: number) => {
        if (characters.length <= 1) {
            handleValueUpdate([{ 
                id: `char-card-${Date.now()}`,
                name: 'New Entity 1', index: 'Entity-1', image: null, 
                thumbnails: { '1:1': null, '16:9': null, '9:16': null }, 
                selectedRatio: '1:1', prompt: '', fullDescription: '',
                targetLanguage: 'en',
                isOutput: true,
                isActive: true,
                isDescriptionCollapsed: false,
                isImageCollapsed: false,
                isPromptCollapsed: false,
                additionalPrompt: "Full body character concept on a gray background"
            }]);
            return;
        }
        for (let i = index; i < characters.length - 1; i++) {
            for (let j = 0; j < 10; j++) {
                const nextImg = getFullSizeImage(node.id, ((i + 1) * 10) + j);
                setFullSizeImage(node.id, (i * 10) + j, nextImg || (null as any));
            }
        }
        const lastIdx = characters.length - 1;
        for (let j = 0; j < 10; j++) setFullSizeImage(node.id, (lastIdx * 10) + j, null as any);
        const newChars = characters.filter((_, i) => i !== index);
        
        if (!newChars.some(c => c.isOutput)) {
            newChars[0].isOutput = true;
        }

        handleValueUpdate(newChars);
        
        if (setNodes) {
            setNodes(nds => nds.map(n => {
                if (n.id === node.id) {
                    return { ...n, width: Math.max(NODE_WIDTH_STEP + BASE_WIDTH_OFFSET, newChars.length * NODE_WIDTH_STEP + BASE_WIDTH_OFFSET) };
                }
                return n;
            }));
        }
    };

    const handleCopySpecificCard = async (cardIdx: number) => {
        const char = characters[cardIdx];
        const fullSources: Record<string, string | null> = { ...char.thumbnails };
        Object.entries(RATIO_INDICES).forEach(([ratio, idx]) => {
            const fullRes = getFullSizeImage(node.id, (cardIdx * 10) + idx);
            if (fullRes) fullSources[ratio] = fullRes;
        });
        const dataToCopy = { type: 'character-card', ...char, imageSources: fullSources };
        delete (dataToCopy as any).id;
        delete (dataToCopy as any).thumbnails;
        try {
            await navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
            addToast?.(t('toast.copiedToClipboard'), 'success');
        } catch (err) { addToast?.(t('toast.copyFailed'), 'error'); }
    };

    const handlePasteToSpecificCard = async (cardIdx: number) => {
        try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            let cardData = Array.isArray(parsed) ? parsed[0] : parsed;
            if (cardData && (cardData.type === 'character-card' || cardData.name || cardData.prompt)) {
                const loadedSources = cardData.imageSources || { '1:1': null, '16:9': null, '9:16': null };
                const newThumbnails: Record<string, string | null> = { '1:1': null, '16:9': null, '9:16': null };
                if (cardData.image && !cardData.imageSources) loadedSources['1:1'] = cardData.image;
                for (const [ratio, src] of Object.entries(loadedSources)) {
                    if (typeof src === 'string' && src.startsWith('data:')) {
                        const idx = (cardIdx * 10) + (RATIO_INDICES[ratio] || 1);
                        setFullSizeImage(node.id, idx, src);
                        newThumbnails[ratio] = await generateThumbnail(src, 256, 256);
                    } else newThumbnails[ratio] = src as string | null;
                }
                const ratio = cardData.selectedRatio || '1:1';
                if (loadedSources[ratio] && typeof loadedSources[ratio] === 'string' && loadedSources[ratio].startsWith('data:')) {
                    setFullSizeImage(node.id, cardIdx * 10, loadedSources[ratio]);
                }
                const newChars = [...characters];
                newChars[cardIdx] = {
                    ...characters[cardIdx],
                    name: cardData.name || '',
                    index: cardData.index || cardData.alias || `Entity-${cardIdx + 1}`,
                    prompt: cardData.prompt || cardData.imagePrompt || '',
                    fullDescription: cardData.fullDescription || cardData.description || '',
                    selectedRatio: ratio,
                    image: newThumbnails[ratio],
                    thumbnails: newThumbnails,
                };
                handleValueUpdate(newChars);
                addToast?.(t('toast.pastedFromClipboard'), 'success');
            }
        } catch (e) { addToast?.(t('toast.pasteFailed'), 'error'); }
    };

    const handlePasteImageToSlot = async (cardIdx: number) => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        const dataUrl = ev.target?.result as string;
                        if (dataUrl) {
                            await processNewImage(cardIdx, dataUrl);
                            addToast?.(t('toast.pastedFromClipboard'), 'success');
                        }
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
            addToast?.(t('toast.pasteFailed'), 'error');
        } catch (err) {
            console.error("Paste image failed", err);
            addToast?.(t('toast.pasteFailed'), 'error');
        }
    };

    const handleRatioChange = (cardIdx: number, newRatio: string) => {
        const char = characters[cardIdx];
        if (newRatio === char.selectedRatio) return;
        const highRes = getFullSizeImage(node.id, (cardIdx * 10) + (RATIO_INDICES[newRatio] || 1));
        const displayThumb = char.thumbnails[newRatio] || null;
        if (highRes) setFullSizeImage(node.id, cardIdx * 10, highRes);
        else if (displayThumb) setFullSizeImage(node.id, cardIdx * 10, displayThumb);
        handleUpdateCard(cardIdx, { selectedRatio: newRatio, image: displayThumb });
    };

    const processNewImage = async (cardIdx: number, newImageData: string) => {
        const char = characters[cardIdx];
        setFullSizeImage(node.id, cardIdx * 10, newImageData);
        setFullSizeImage(node.id, (cardIdx * 10) + (RATIO_INDICES[char.selectedRatio] || 1), newImageData);
        const thumbnail = await generateThumbnail(newImageData, 256, 256);
        const newThumbnails = { ...char.thumbnails, [char.selectedRatio]: thumbnail };
        handleUpdateCard(cardIdx, { thumbnails: newThumbnails, image: thumbnail });
    };

    const handleSyncFromConnection = useCallback((cardIdx: number) => {
        if (!isInputConnected || !getUpstreamNodeValues) return;
        const upstreamValues = getUpstreamNodeValues(node.id);
        const textValue = upstreamValues.find((v: any) => typeof v === 'string' && !v.trim().startsWith('{') && !v.trim().startsWith('[')) as string || '';
        if (textValue) {
            handleUpdateCard(cardIdx, { prompt: textValue });
            addToast?.("Prompt synced from connection", "success");
        } else {
            addToast?.("No text found in connection", "info");
        }
    }, [isInputConnected, getUpstreamNodeValues, node.id, handleUpdateCard, addToast]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataUrl = ev.target?.result as string;
                if (dataUrl) await processNewImage(editingCardIndex, dataUrl);
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
    }, [editingCardIndex, processNewImage]);

    const handleModifyRequest = (cardIdx: number) => {
        const req = modificationRequests[cardIdx];
        if (!req?.trim() || !onModifyCharacter) return;
        onModifyCharacter(node.id, cardIdx, req);
        setModificationRequests(prev => ({ ...prev, [cardIdx]: '' }));
    };

    const handleUpdatePromptFromImage = (cardIdx: number) => {
        if (handleUpdateCharacterPromptFromImage) {
            handleUpdateCharacterPromptFromImage(node.id, cardIdx);
        }
    };

    const handleOpenInEditor = (cardIdx: number) => {
        const char = characters[cardIdx];
        const fullRes = getFullSizeImage(node.id, (cardIdx * 10) + (RATIO_INDICES[char.selectedRatio] || 1)) || char.image;
        if (!fullRes || !addNode) return;
        const pos = { x: node.position.x + node.width + 50, y: node.position.y };
        const newNodeId = addNode(NodeType.IMAGE_EDITOR, pos);
        const defaultEditorState = { 
            inputImages: [char.thumbnails[char.selectedRatio] || char.image], 
            prompt: char.prompt || '', 
            outputImage: null, 
            aspectRatio: char.selectedRatio, 
            enableAspectRatio: true, 
            enableOutpainting: false, 
            outpaintingPrompt: '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.', 
            model: 'gemini-2.5-flash-image',
            autoDownload: true, 
            autoCrop169: false, 
            leftPaneWidth: 360, 
            topPaneHeight: 330 
        };
        onValueChange(newNodeId, JSON.stringify(defaultEditorState));
        setFullSizeImage(newNodeId, 1, fullRes);
    };

    const handleOpenInRasterEditor = (cardIdx: number) => {
        const char = characters[cardIdx];
        const src = getFullSizeImage(node.id, (cardIdx * 10) + (RATIO_INDICES[char.selectedRatio] || 1)) || char.image;
        if (src) { setEditorImageSrc(src); setEditingCardIndex(cardIdx); setIsEditorOpen(true); }
    };

    const handleRatioExpandLocal = async (cardIdx: number, targetRatio: string) => {
        const char = characters[cardIdx];
        const fullSizeSrc = getFullSizeImage(node.id, cardIdx * 10) || char.image;
        if (!fullSizeSrc) return;
        setTransformingRatio(targetRatio);
        try {
            let expansionPrompt = "Fill the background with gray studio environment";
            if (targetRatio === '16:9') {
                expansionPrompt = "Fill the background with gray studio environment - fill in the white areas on the sides to naturally expand the image area of the gray scene.";
            } else if (targetRatio === '9:16') {
                expansionPrompt = "Fill the background with gray studio environment - fill in the white areas on top and bottom to naturally expand the image area of the gray scene.";
            }

            // We pass the expansion instruction as the main prompt, and an empty suffix
            const newImage = await expandImageAspectRatio(fullSizeSrc, targetRatio, expansionPrompt, 'gemini-2.5-flash-image', ""); 
            
            await processNewImage(cardIdx, newImage);
            if (addToast) addToast(`Converted to ${targetRatio} successfully`, 'success');
        } catch (error: any) { 
            console.error(error);
            if (addToast) addToast(`Failed to convert: ${error.message}`, 'error'); 
        } finally { setTransformingRatio(null); }
    };

    const handleCrop1x1Local = async (cardIdx: number) => {
        const char = characters[cardIdx];
        const fullSizeSrc = getFullSizeImage(node.id, cardIdx * 10) || char.image;
        if (!fullSizeSrc) return;
        setTransformingRatio('1:1');
        try {
            const newImage = await cropImageTo1x1(fullSizeSrc);
            await processNewImage(cardIdx, newImage);
            if (addToast) addToast(`Cropped to 1:1 successfully`, 'success');
        } catch (error: any) { 
            console.error(error);
            if (addToast) addToast(`Failed to crop: ${error.message}`, 'error'); 
        } finally { setTransformingRatio(null); }
    };

    const handleDetach = (cardIdx: number) => {
        const char = characters[cardIdx];
        if (onDetachCharacter) {
            const fullSources: Record<string, string | null> = { ...char.thumbnails };
            Object.entries(RATIO_INDICES).forEach(([ratio, idx]) => {
                const fullRes = getFullSizeImage(node.id, (cardIdx * 10) + idx);
                if (fullRes) fullSources[ratio] = fullRes;
            });
            const activeFull = getFullSizeImage(node.id, cardIdx * 10);
            const dataToDetach = { ...char, imageSources: fullSources, _fullResImage: activeFull };
            onDetachCharacter(dataToDetach, node);
            handleRemoveCard(cardIdx);
        }
    };

    const handleContainerDragOver = (e: React.DragEvent) => {
        if (
            e.dataTransfer.types.includes('application/prompt-modifier-card') ||
            e.dataTransfer.types.includes('Files') ||
            e.dataTransfer.types.includes('application/prompt-modifier-drag-image')
        ) {
            e.preventDefault();
            e.stopPropagation();
            setIsExternalDragOver(true);
        }
    };

    return (
        <div 
            className={`flex h-full w-full overflow-x-scroll custom-scrollbar p-0 gap-0 pb-2 transition-colors ${isExternalDragOver ? 'bg-accent-dim' : ''}`} 
            onWheel={e => e.stopPropagation()} 
            style={{ scrollbarGutter: 'stable', overscrollBehaviorY: 'contain' }}
            onDrop={handleDrop}
            onDragOver={handleContainerDragOver}
            onDragLeave={() => setIsExternalDragOver(false)}
        >
            <style>{`.custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 45, 0.5); border-radius: 4px; margin: 0 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-scrollbar); border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }`}</style>
            <ImageEditorModal isOpen={isEditorOpen} onClose={() => { setIsEditorOpen(false); }} onApply={img => processNewImage(editingCardIndex, img)} imageSrc={editorImageSrc} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            
            {characters.map((char, idx) => (
                <React.Fragment key={char.id}>
                    <DropZone 
                        index={idx} 
                        activeDropZone={activeDropZone} 
                        onDragOver={handleZoneDragOver} 
                        onDrop={handleDrop} 
                        onDragLeave={handleZoneDragLeave}
                    />
                    <CharacterCardItemMemoized
                        char={char}
                        index={idx}
                        nodeId={node.id}
                        isDragging={draggedCardIndex === idx}
                        
                        onUpdate={(updates) => handleUpdateCard(idx, updates)}
                        onRemove={() => handleRemoveCard(idx)}
                        onSetAsOutput={() => handleSetAsOutput(idx)}
                        onToggleActive={() => handleToggleActive(idx)} // Pass the toggle handler
                        onDragStart={(e) => handleCardDragStart(e, idx)}
                        onDragEnd={() => { setDraggedCardIndex(null); setDropInsertionIndex(null); setActiveDropZone(null); }}
                        onSmartDragOver={(e) => handleSmartCardDragOver(e, idx)}
                        
                        onRatioChange={(r) => handleRatioChange(idx, r)}
                        onPasteImage={() => handlePasteImageToSlot(idx)}
                        onClearImage={() => handleUpdateCard(idx, { thumbnails: { ...char.thumbnails, [char.selectedRatio]: null }, image: null })}
                        onCopyImage={() => { const src = getFullSizeImage(node.id, idx * 10) || char.image; if(src) onCopyImageToClipboard(src); }}
                        onGenerateImage={() => { setEditingCardIndex(idx); onGenerateImage(node.id, idx); }}
                        onEditRaster={() => handleOpenInRasterEditor(idx)}
                        onEditAI={() => handleOpenInEditor(idx)}
                        onCrop1x1={() => handleCrop1x1Local(idx)}
                        onExpandRatio={(r) => handleRatioExpandLocal(idx, r)}
                        onSetEditingIndex={() => { setEditingCardIndex(idx); fileInputRef.current?.click(); }}
                        
                        onSyncFromConnection={() => handleUpdatePromptFromImage(idx)} 
                        
                        onLoad={() => onLoadCharacterCard(node.id)}
                        onSave={() => onSaveCharacterCard(node.id, idx)} 
                        onSaveToCatalog={() => onSaveCharacterToCatalog(node.id, idx)} 
                        onCopySpecific={() => handleCopySpecificCard(idx)}
                        onPasteSpecific={() => handlePasteToSpecificCard(idx)}
                        onDetach={() => handleDetach(idx)}
                        onModify={() => handleModifyRequest(idx)}

                        getFullSizeImage={(i) => getFullSizeImage(node.id, i)}
                        setImageViewer={setImageViewer}
                        onCopyImageToClipboard={onCopyImageToClipboard}
                        processNewImage={(data) => processNewImage(idx, data)}
                        
                        t={t}
                        deselectAllNodes={deselectAllNodes}
                        languages={languages}
                        secondaryLanguage={secondaryLanguage}
                        isModifyingCharacter={isModifyingCharacter}
                        isUpdatingDescription={isUpdatingDescription}
                        onUpdateDescription={() => onUpdateCharacterDescription && onUpdateCharacterDescription(node.id, idx)}
                        
                        transformingRatio={transformingRatio}
                        isGeneratingImage={isGeneratingImage}
                        isUpdatingCharacterPrompt={isUpdatingCharacterPrompt}
                        
                        modificationRequest={modificationRequests[idx] || ''}
                        setModificationRequest={(val) => setModificationRequests(prev => ({...prev, [idx]: val}))}
                        hasDuplicateIndex={duplicateIndices.has((char.index || '').trim())}
                    />
                </React.Fragment>
            ))}
            
            <DropZone 
                index={characters.length} 
                activeDropZone={activeDropZone} 
                onDragOver={handleZoneDragOver} 
                onDrop={handleDrop} 
                onDragLeave={handleZoneDragLeave}
            />
            
            <div className="flex items-center justify-start pl-2 min-w-[60px] h-full"> 
                 <Tooltip content={t('node.action.addCard')}>
                    <button 
                        onClick={handleAddCard} 
                        className="w-12 h-12 flex items-center justify-center bg-gray-800 hover:bg-cyan-900 border border-gray-600 hover:border-cyan-500 text-gray-400 hover:text-cyan-400 rounded-full transition-all shadow-lg group relative"
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-6 w-6 transform transition-transform duration-200 group-hover:scale-110" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth={3}
                        >
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};
