
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import type { NodeContentProps } from '../../types';
import { useLanguage } from '../../localization';
import { useAppContext } from '../../contexts/AppContext';
import { generateThumbnail } from '../../utils/imageUtils';
import { NoteTab } from './note/NoteTab';
import { ReferencesTab } from './note/ReferencesTab';

interface ReferenceItem {
    id: string;
    image: string | null;
    caption: string;
}

export interface NoteStyle {
    fontSize: number;
    color: string;
    isBold: boolean;
    isItalic: boolean;
    textAlign: 'left' | 'center' | 'right';
}

interface NoteData {
    text: string;
    references: ReferenceItem[];
    activeTab: 'note' | 'reference';
    isMinimal?: boolean;
    style: NoteStyle;
}

const DEFAULT_STYLE: NoteStyle = {
    fontSize: 14,
    color: '#ffffff',
    isBold: false,
    isItalic: false,
    textAlign: 'left'
};

export const NoteNode: React.FC<NodeContentProps> = ({ node, onValueChange, t, deselectAllNodes, libraryItems, setImageViewer, addToast, setFullSizeImage, getFullSizeImage, connectedInputs, getUpstreamNodeValues }) => {
    const { setConnections } = useAppContext();
    const isPromptDataConnected = connectedInputs?.has('prompt_data');

    // Parse node value handles both legacy string and new JSON format
    const data: NoteData = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            if (typeof parsed === 'object' && parsed !== null && ('text' in parsed || 'references' in parsed)) {
                return {
                    text: parsed.text || '',
                    references: parsed.references || [],
                    activeTab: parsed.activeTab || 'note',
                    isMinimal: parsed.isMinimal || false,
                    style: { ...DEFAULT_STYLE, ...(parsed.style || {}) }
                };
            }
            // Migration for legacy string values
            return { text: node.value || '', references: [], activeTab: 'note', isMinimal: false, style: DEFAULT_STYLE };
        } catch {
            return { text: node.value || '', references: [], activeTab: 'note', isMinimal: false, style: DEFAULT_STYLE };
        }
    }, [node.value]);
    
    // State for undo shuffle
    const [previousReferencesState, setPreviousReferencesState] = useState<ReferenceItem[] | null>(null);

    const updateData = useCallback((updates: Partial<NoteData>) => {
        const newData = { ...data, ...updates };
        onValueChange(node.id, JSON.stringify(newData));
    }, [data, node.id, onValueChange]);

    const handleStyleChange = useCallback((styleUpdates: Partial<NoteStyle>) => {
        const newStyle = { ...data.style, ...styleUpdates };
        updateData({ style: newStyle });
    }, [data.style, updateData]);

    // --- Sync Logic from Sequence Editor (Incoming Prompts) ---
    useEffect(() => {
        if (isPromptDataConnected) {
            const upstreamValues = getUpstreamNodeValues(node.id, 'prompt_data');
            // Assuming one connection source
            const val = upstreamValues[0];
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    if (parsed.type === 'sequence-prompt-data' && Array.isArray(parsed.sourcePrompts)) {
                        const sourcePrompts = parsed.sourcePrompts;
                        const currentRefs = [...data.references];
                        const newRefs: ReferenceItem[] = [];
                        let hasChanges = false;
                        
                        const maxFrame = sourcePrompts.reduce((max: number, p: any) => Math.max(max, p.frameNumber || 0), 0);
                        const promptMap = new Map<number, string>(sourcePrompts.map((p: any) => [p.frameNumber, p.prompt]));

                        for (let i = 0; i < maxFrame; i++) {
                            const frameNum = i + 1;
                            const promptText = promptMap.get(frameNum) || '';
                            const existingRef = currentRefs[i];

                            if (existingRef) {
                                // Update existing
                                if (existingRef.caption !== promptText) {
                                    newRefs.push({ ...existingRef, caption: promptText });
                                    hasChanges = true;
                                } else {
                                    newRefs.push(existingRef);
                                }
                            } else {
                                // Create new placeholder
                                newRefs.push({
                                    id: `ref-${Date.now()}-${i}`,
                                    image: null,
                                    caption: promptText
                                });
                                hasChanges = true;
                            }
                        }

                        if (currentRefs.length > maxFrame) {
                             hasChanges = true; 
                        }
                        
                        if (hasChanges) {
                             updateData({ references: newRefs });
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse prompt data from sequence editor", e);
                }
            }
        }
    }, [isPromptDataConnected, getUpstreamNodeValues, node.id, updateData, data.references]);

    const handleDetach = () => {
        setConnections(prev => prev.filter(c => !(c.toNodeId === node.id && c.toHandleId === 'prompt_data')));
        if (addToast) addToast(t('toast.connectionsCut'));
    };

    // --- Data Manipulation Handlers for References ---
    
    const handleAddImages = async (imgDataList: (File | string | { image: string, caption: string })[], targetIndex?: number) => {
        if (isPromptDataConnected) return; 

        // Process mix of Files, Base64 strings, and objects with captions
        const processInput = async (item: File | string | { image: string, caption: string }): Promise<{ image: string, caption: string }> => {
            if (typeof item === 'object' && 'image' in item && 'caption' in item) {
                return item; // Already processed
            }
            if (typeof item === 'string') return { image: item, caption: '' };
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({ image: e.target?.result as string, caption: '' });
                reader.readAsDataURL(item);
            });
        };

        const resolvedInputs = await Promise.all(imgDataList.map(processInput));
        
        const currentRefs = [...data.references];
        const newRefs: ReferenceItem[] = [];

        for (let i = 0; i < resolvedInputs.length; i++) {
            const { image: fullRes, caption } = resolvedInputs[i];
            const thumbnail = await generateThumbnail(fullRes, 256, 256);
            newRefs.push({
                id: `ref-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                image: thumbnail, 
                caption: caption || ''
            });
        }
        
        const insertPos = (targetIndex !== undefined && targetIndex !== null) ? targetIndex : currentRefs.length;
        currentRefs.splice(insertPos, 0, ...newRefs);

        // Update full size cache
        // We need to shift existing cache indices if inserting in middle
        // Map current IDs to images to restore them at correct index
        const tempImageMap = new Map<string, string>();
        data.references.forEach((ref, idx) => {
            const cached = getFullSizeImage(node.id, idx);
            if (cached) tempImageMap.set(ref.id, cached);
            else if (ref.image) tempImageMap.set(ref.id, ref.image);
        });
        
        // Add new ones to map
        newRefs.forEach((ref, idx) => { tempImageMap.set(ref.id, resolvedInputs[idx].image); });

        updateData({ references: currentRefs, activeTab: 'reference' });
        
        // Restore cache with new indices
        currentRefs.forEach((ref, idx) => {
            const img = tempImageMap.get(ref.id);
            if (img) setFullSizeImage(node.id, idx, img);
        });
    };

    const handleReorder = (sourceIndex: number, targetIndex: number) => {
         if (sourceIndex === targetIndex || isPromptDataConnected) return;
         const newRefs = [...data.references];
         const [movedItem] = newRefs.splice(sourceIndex, 1);
         // If moving down, index shifts by -1 after splice
         const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
         newRefs.splice(adjustedTarget, 0, movedItem);

         // Sync Cache
         const currentCache: string[] = [];
         for (let i = 0; i < data.references.length; i++) {
              currentCache.push(getFullSizeImage(node.id, i) || data.references[i].image!);
         }
         const [movedImg] = currentCache.splice(sourceIndex, 1);
         currentCache.splice(adjustedTarget, 0, movedImg);

         currentCache.forEach((img, i) => { setFullSizeImage(node.id, i, img); });
         updateData({ references: newRefs });
    };

    const handleUpdateCaption = (id: string, newCaption: string) => {
        if (isPromptDataConnected) return;
        const newRefs = data.references.map(ref => ref.id === id ? { ...ref, caption: newCaption } : ref);
        updateData({ references: newRefs });
    };

    const handleRemoveReference = (idToRemove: string) => {
        if (isPromptDataConnected) return;
        const indexToRemove = data.references.findIndex(ref => ref.id === idToRemove);
        if (indexToRemove === -1) return;
        
        const newRefs = data.references.filter(ref => ref.id !== idToRemove);
        
        // Shift cache up
        for (let i = indexToRemove; i < newRefs.length; i++) {
             // We want cache[i] to become cache[i+1] from before
             const nextHighRes = getFullSizeImage(node.id, i + 1);
             if (nextHighRes) setFullSizeImage(node.id, i, nextHighRes);
             else { 
                 const nextRef = data.references[i + 1]; // from ORIGINAL data
                 if (nextRef && nextRef.image) setFullSizeImage(node.id, i, nextRef.image); 
             }
        }
        
        updateData({ references: newRefs });
    };

    const handleShuffle = () => {
        if (isPromptDataConnected) return;

        // 1. Save current state for undo
        setPreviousReferencesState([...data.references]);

        // 2. Prepare combined data map (ID -> Image) to restore cache after shuffle
        const idToImageMap = new Map<string, string>();
        data.references.forEach((ref, index) => {
             const img = getFullSizeImage(node.id, index) || ref.image;
             if (img) idToImageMap.set(ref.id, img);
        });

        // 3. Shuffle
        const items = [...data.references];
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }

        // 4. Update References Data
        updateData({ references: items });

        // 5. Update Cache based on new order
        items.forEach((item, index) => {
            const img = idToImageMap.get(item.id);
            if (img) {
                setFullSizeImage(node.id, index, img);
            }
        });
    };

    const handleUndoShuffle = () => {
        if (!previousReferencesState || isPromptDataConnected) return;

        // 1. Prepare map (ID -> Image) from current state (which was shuffled)
        const idToImageMap = new Map<string, string>();
        data.references.forEach((ref, index) => {
             const img = getFullSizeImage(node.id, index) || ref.image;
             if (img) idToImageMap.set(ref.id, img);
        });

        // 2. Restore cache for previous order
        previousReferencesState.forEach((ref, index) => {
            const img = idToImageMap.get(ref.id);
            if (img) setFullSizeImage(node.id, index, img);
        });

        // 3. Restore Data
        updateData({ references: previousReferencesState });
        setPreviousReferencesState(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tabs - Hidden in minimal mode */}
            {!data.isMinimal && (
                <div className="flex items-center space-x-1 bg-gray-900/50 p-1 rounded-t-md mb-1 flex-shrink-0">
                    <button onClick={() => updateData({ activeTab: 'note' })} className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${data.activeTab === 'note' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}>
                        {t('node.note.tab.note')}
                    </button>
                    <button onClick={() => updateData({ activeTab: 'reference' })} className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${data.activeTab === 'reference' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}>
                        {t('node.note.tab.references')}
                        {data.references.length > 0 && <span className="ml-1 opacity-75">({data.references.length})</span>}
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-grow min-h-0 relative">
                {data.activeTab === 'note' ? (
                    <NoteTab 
                        text={data.text}
                        style={data.style}
                        onTextChange={(val) => updateData({ text: val })}
                        onStyleChange={handleStyleChange}
                        libraryItems={libraryItems}
                        t={t}
                        deselectAllNodes={deselectAllNodes}
                        isMinimal={!!data.isMinimal}
                    />
                ) : (
                    <ReferencesTab 
                        references={data.references}
                        isLocked={!!isPromptDataConnected}
                        onAddImages={handleAddImages}
                        onReorder={handleReorder}
                        onUpdateCaption={handleUpdateCaption}
                        onRemoveReference={handleRemoveReference}
                        onDetach={handleDetach}
                        onShuffle={handleShuffle}
                        onUndoShuffle={handleUndoShuffle}
                        canUndoShuffle={!!previousReferencesState}
                        t={t}
                        deselectAllNodes={deselectAllNodes}
                        setImageViewer={setImageViewer}
                        addToast={addToast}
                        getFullSizeImage={(idx) => getFullSizeImage(node.id, idx)}
                        setFullSizeImage={(idx, url) => setFullSizeImage(node.id, idx, url)}
                        isMinimal={!!data.isMinimal}
                    />
                )}
            </div>
        </div>
    );
};
