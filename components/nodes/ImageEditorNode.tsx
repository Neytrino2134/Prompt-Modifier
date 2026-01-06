
import React, { useMemo, useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { NodeContentProps, NodeType } from '../../types';
import { formatImageForAspectRatio, generateThumbnail, cropImageTo169 } from '../../utils/imageUtils';
import ImageEditorModal from '../ImageEditorModal';
import { useAppContext } from '../../contexts/AppContext';
import { HEADER_HEIGHT, CONTENT_PADDING } from '../../utils/nodeUtils';
import JSZip from 'jszip'; // Added import
import { ActionButton } from '../ActionButton';
import { CopyIcon } from '../icons/AppIcons';

// Sub-Components
import { OutputPanel } from './image-editor/OutputPanel';
import { DEFAULT_EDITOR_STATE, ImageEditorState, ImageSlot, MIN_LEFT_PANE_WIDTH, MIN_RIGHT_PANE_WIDTH, MIN_TOP_PANE_HEIGHT, MIN_BOTTOM_PANE_HEIGHT, MIN_BOTTOM_PANE_HEIGHT_WITH_PREVIEW } from './image-editor/types';
import { ImageEditorLeftPane } from './image-editor/ImageEditorLeftPane';
import { SequencedPromptListRef } from './image-editor/SequencedPromptList';

export const ImageEditorNode: React.FC<NodeContentProps> = ({ node, onValueChange, onEditImage, onStopEdit, isEditingImage, onPasteImage, onSetImageEditorOutputToInput, connectedImageSources, t, deselectAllNodes, connectedInputs, onCopyImageToClipboard, onDownloadImage, libraryItems, onDetachImageToNode, getUpstreamNodeValues, viewTransform, setImageViewer, getFullSizeImage, setFullSizeImage, onDownloadImageFromUrl, onRefreshUpstreamData, isStopping, onCutConnections, addToast }) => {
    const { setConnections, handleNavigateToNodeFrame, nodes: allNodes, connections } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputBRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const sequencedListRef = useRef<SequencedPromptListRef>(null);

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const previewHighResRef = useRef<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
    const editingFrameRef = useRef<number | null>(null);
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

    const parsedValue = useMemo(() => {
        try {
            return { ...DEFAULT_EDITOR_STATE, ...JSON.parse(node.value || '{}') };
        } catch {
            return DEFAULT_EDITOR_STATE;
        }
    }, [node.value]);

    const parsedValueRef = useRef(parsedValue);
    parsedValueRef.current = parsedValue;

    const { inputImages, inputImagesB, prompt, outputImage, model, aspectRatio, enableAspectRatio, leftPaneWidth, topPaneHeight, resolution, isSequenceMode, isSequentialCombinationMode, isSequentialEditingWithPrompts, framePrompts, sequenceOutputs, checkedSequenceOutputIndices, checkedInputIndices, enableOutpainting, outpaintingPrompt, autoDownload, autoCrop169, isSequentialPromptMode, createZip, selectedSourceFrameIndex } = parsedValue;
    
    const isNanoBanana = model === 'gemini-3-pro-image-preview';
    const isTextConnected = connectedInputs?.has('text');
    
    const viewScale = viewTransform?.scale || 1;

    const handleValueUpdate = useCallback((updates: Partial<ImageEditorState>) => {
        const newValue = { ...parsedValueRef.current, ...updates };
        // Sync update ref immediately to prevent race conditions
        parsedValueRef.current = newValue;
        onValueChange(node.id, JSON.stringify(newValue));
    }, [onValueChange, node.id]);

    // Resizing Constraint Logic
    useEffect(() => {
        if (!node.width || !node.height) return;

        const containerChromeH = HEADER_HEIGHT + (CONTENT_PADDING * 2); // Header + Padding
        
        // 1. Horizontal Constraint (Left Pane Width)
        // Ensure Right Pane maintains minimum width
        const maxLeftWidth = node.width - MIN_RIGHT_PANE_WIDTH - 8; // -8 for splitter/gap safety
        
        let newLeftPaneWidth = leftPaneWidth;
        if (leftPaneWidth > maxLeftWidth) {
            newLeftPaneWidth = Math.max(MIN_LEFT_PANE_WIDTH, maxLeftWidth);
        } else if (leftPaneWidth < MIN_LEFT_PANE_WIDTH) {
             newLeftPaneWidth = MIN_LEFT_PANE_WIDTH;
        }
        
        // 2. Vertical Constraint (Top Pane Height)
        // Ensure Bottom Pane maintains minimum height
        const availableHeight = node.height - containerChromeH;
        const minBottom = enableAspectRatio ? MIN_BOTTOM_PANE_HEIGHT_WITH_PREVIEW : MIN_BOTTOM_PANE_HEIGHT;
        const maxTopHeight = availableHeight - minBottom - 8; // -8 for splitter/gap
        
        let newTopPaneHeight = topPaneHeight;
        if (topPaneHeight > maxTopHeight) {
             newTopPaneHeight = Math.max(MIN_TOP_PANE_HEIGHT, maxTopHeight);
        } else if (topPaneHeight < MIN_TOP_PANE_HEIGHT) {
             newTopPaneHeight = MIN_TOP_PANE_HEIGHT;
        }

        if (newLeftPaneWidth !== leftPaneWidth || newTopPaneHeight !== topPaneHeight) {
            handleValueUpdate({ leftPaneWidth: newLeftPaneWidth, topPaneHeight: newTopPaneHeight });
        }

    }, [node.width, node.height, leftPaneWidth, topPaneHeight, enableAspectRatio, handleValueUpdate]);

    const cleanupInputB = useCallback(() => {
        handleValueUpdate({ 
            inputImagesB: [], 
            isSequentialCombinationMode: false, 
            isSequentialEditingWithPrompts: false, 
            isSequentialPromptMode: false
        });
    }, [handleValueUpdate]);

    const handleStartEdit = useCallback(() => {
        if (isSequenceMode) {
            const indices = checkedSequenceOutputIndices ? [...checkedSequenceOutputIndices].sort((a, b) => a - b) : [];
            onEditImage(node.id, indices);
        } else {
            onEditImage(node.id);
        }
    }, [isSequenceMode, node.id, checkedSequenceOutputIndices, onEditImage]);

    const handleStop = useCallback(() => {
        if (onStopEdit) onStopEdit();
    }, [onStopEdit]);

    const handleManualRefresh = useCallback(() => {
        const currentOutputs = parsedValueRef.current.sequenceOutputs || [];
        const resetOutputs = currentOutputs.map(o => {
            if (!o) return { status: 'idle', thumbnail: null };
            if (o.status === 'done') return o; 
            return { ...o, status: 'idle' };
        });
        
        handleValueUpdate({ sequenceOutputs: resetOutputs });
        if (onRefreshUpstreamData) onRefreshUpstreamData(node.id);
        forceUpdate();
    }, [handleValueUpdate, onRefreshUpstreamData, node.id]);

    // Resizing logic for LEFT/RIGHT split
    const handleHorizontalResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX;
        const startWidth = leftPaneWidth;
        if (!contentRef.current) return;
        const nodeWidth = contentRef.current.offsetWidth;
        const scale = viewTransform?.scale || 1;

        const handleDrag = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / scale;
            // Respect MIN_LEFT and MIN_RIGHT
            const newWidth = Math.max(MIN_LEFT_PANE_WIDTH, Math.min(startWidth + dx, nodeWidth - MIN_RIGHT_PANE_WIDTH));
            handleValueUpdate({ leftPaneWidth: newWidth });
        };
        const handleDragEnd = () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
        };
        window.addEventListener('mousemove', handleDrag);
        window.addEventListener('mouseup', handleDragEnd);
    }, [leftPaneWidth, handleValueUpdate, viewTransform?.scale]);

    // Upstream parsing
    const upstreamPromptsMap = useMemo(() => {
        if (!isTextConnected) return undefined;
        const texts = getUpstreamNodeValues(node.id, 'text', undefined, true).filter(v => typeof v === 'string') as string[];
        const map = new Map<number, string>();
        let hasJson = false;
        texts.forEach(text => {
            const trimmed = text.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    const json = JSON.parse(text);
                    let prompts = [];
                    if (json.sourcePrompts || json.modifiedPrompts) {
                        const source = json.sourcePrompts || [];
                        const mod = json.modifiedPrompts || [];
                        const mergedPromptsMap = new Map();
                        source.forEach((p: any) => mergedPromptsMap.set(p.frameNumber, p));
                        mod.forEach((p: any) => mergedPromptsMap.set(p.frameNumber, { ...mergedPromptsMap.get(p.frameNumber), ...p }));
                        prompts = Array.from(mergedPromptsMap.values());
                        hasJson = true;
                    } 
                    else if (json.type === 'script-prompt-modifier-data') {
                        prompts = json.finalPrompts || json.prompts || [];
                        hasJson = true;
                    } else if (Array.isArray(json)) {
                        prompts = json;
                        hasJson = true;
                    }
                    if (prompts.length > 0) {
                        prompts.forEach((p: any, i: number) => {
                             const frameNum = (p.frameNumber !== undefined ? p.frameNumber : i + 1);
                             if (p.prompt) map.set(frameNum, p.prompt);
                        });
                    }
                } catch {}
            }
        });
        return hasJson ? map : undefined;
    }, [isTextConnected, getUpstreamNodeValues, node.id, ignored]);

    const upstreamPrompt = useMemo(() => {
        if (isTextConnected && !upstreamPromptsMap) {
            return (getUpstreamNodeValues(node.id, 'text', undefined, true).filter(v => typeof v === 'string') as string[]).join('\n\n');
        }
        return '';
    }, [isTextConnected, getUpstreamNodeValues, node.id, upstreamPromptsMap]);

    const upstreamImagesRaw = useMemo(() => getUpstreamNodeValues(node.id, 'image', undefined, true), [getUpstreamNodeValues, node.id, ignored]);
    const upstreamImagesRawB = useMemo(() => getUpstreamNodeValues(node.id, 'image_b', undefined, true), [getUpstreamNodeValues, node.id, ignored]);

    const processImageInput = async (fileOrData: File | string): Promise<string | null> => {
        if (fileOrData instanceof File) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(fileOrData);
            });
        } else if (typeof fileOrData === 'string') {
            if (fileOrData.startsWith('data:')) return fileOrData;
            try {
                const res = await fetch(fileOrData);
                const blob = await res.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(blob);
                });
            } catch (e) { return null; }
        }
        return null;
    };
    
    const handleAddImagesToInput = async (filesOrData: (File | string)[], isB: boolean) => {
        const processed = await Promise.all(filesOrData.map(f => processImageInput(f)));
        const validDataUrls = processed.filter(Boolean) as string[];
        if (validDataUrls.length === 0) return;
        const currentList = isB ? (parsedValueRef.current.inputImagesB || []) : (parsedValueRef.current.inputImages || []);
        const offset = isB ? 2000 : 0;
        const newThumbnails: string[] = [];
        for (let i = 0; i < validDataUrls.length; i++) {
            const url = validDataUrls[i];
            const index = currentList.length + i;
            setFullSizeImage(node.id, offset + index + 1, url);
            const thumb = await generateThumbnail(url, 256, 256);
            newThumbnails.push(thumb);
        }
        const finalList = [...currentList, ...newThumbnails];
        if (isB) handleValueUpdate({ inputImagesB: finalList });
        else handleValueUpdate({ inputImages: finalList });
    };

    const removeImage = useCallback((index: number, isB: boolean) => {
        const listKey = isB ? 'inputImagesB' : 'inputImages';
        const list = isB ? inputImagesB : inputImages;
        const newImages = [...list];
        newImages.splice(index, 1);
        const offset = isB ? 2000 : 0;
        for (let i = index; i < newImages.length; i++) {
            const nextImg = getFullSizeImage(node.id, offset + i + 2);
            if (nextImg) setFullSizeImage(node.id, offset + i + 1, nextImg);
        }
        const updates: Partial<ImageEditorState> = { [listKey]: newImages };
        if (!isB && checkedInputIndices) {
             updates.checkedInputIndices = checkedInputIndices.filter(idx => idx !== index).map(idx => idx > index ? idx - 1 : idx);
        }
        handleValueUpdate(updates);
    }, [inputImages, inputImagesB, checkedInputIndices, handleValueUpdate, node.id, getFullSizeImage, setFullSizeImage]);

    // Arbitrary Reorder (supports Drag & Drop and Jump)
    const handleReorderInput = useCallback((fromIndex: number, toIndex: number, isB: boolean) => {
        const list = isB ? inputImagesB : inputImages;
        if (fromIndex === toIndex) return;
        if (toIndex < 0 || toIndex >= list.length) return;

        const offset = isB ? 2000 : 0;
        
        // 1. Snapshot all full-res images in order
        const snapshot = list.map((thumb, i) => ({
            thumb,
            full: getFullSizeImage(node.id, offset + i + 1)
        }));
        
        // 2. Move item in snapshot
        const [movedItem] = snapshot.splice(fromIndex, 1);
        snapshot.splice(toIndex, 0, movedItem);
        
        // 3. Write back to cache based on new order
        snapshot.forEach((item, i) => {
            if (item.full) {
                setFullSizeImage(node.id, offset + i + 1, item.full);
            }
        });
        
        // 4. Update State
        const newThumbList = snapshot.map(x => x.thumb);
        const updates: any = { [isB ? 'inputImagesB' : 'inputImages']: newThumbList };

        // Handle checked indices if List A
        if (!isB && checkedInputIndices) {
             const wasSelected = checkedInputIndices.includes(fromIndex);
             let newChecked = checkedInputIndices.map(i => {
                 if (i === fromIndex) return -1; // Mark the moving item
                 if (fromIndex < toIndex) {
                     // Moving down: Items between from and to shift up (-1)
                     if (i > fromIndex && i <= toIndex) return i - 1;
                 } else {
                     // Moving up: Items between to and from shift down (+1)
                     if (i >= toIndex && i < fromIndex) return i + 1;
                 }
                 return i;
             });
             
             if (wasSelected) {
                 const markerIndex = newChecked.indexOf(-1);
                 if (markerIndex !== -1) newChecked[markerIndex] = toIndex;
             }
             // Filter any invalid and sort
             newChecked = newChecked.filter(i => i !== -1).sort((a, b) => a - b);
             updates.checkedInputIndices = newChecked;
        }
        
        handleValueUpdate(updates);
    }, [inputImages, inputImagesB, checkedInputIndices, handleValueUpdate, node.id, getFullSizeImage, setFullSizeImage]);

    const handleMoveToB = useCallback((index: number) => {
        const thumb = inputImages[index];
        const highRes = getFullSizeImage(node.id, index + 1) || thumb;
        const newImagesA = [...inputImages];
        newImagesA.splice(index, 1);
        for (let i = index; i < newImagesA.length; i++) {
            const nextImg = getFullSizeImage(node.id, i + 2);
            setFullSizeImage(node.id, i + 1, nextImg || newImagesA[i]);
        }
        const newImagesB = [...inputImagesB, thumb];
        if (highRes) setFullSizeImage(node.id, 2000 + newImagesB.length, highRes);
        let newChecked = checkedInputIndices || [];
        if (newChecked.length > 0) {
            newChecked = newChecked.filter(idx => idx !== index).map(idx => idx > index ? idx - 1 : idx);
        }
        handleValueUpdate({ inputImages: newImagesA, inputImagesB: newImagesB, checkedInputIndices: newChecked });
    }, [inputImages, inputImagesB, getFullSizeImage, setFullSizeImage, node.id, handleValueUpdate, checkedInputIndices]);

    const handleReplaceImage = async (index: number, fileOrData: File | string, isB: boolean = false) => {
        const dataUrl = await processImageInput(fileOrData);
        if (!dataUrl) return;
        const offset = isB ? 2000 : 0;
        setFullSizeImage(node.id, offset + index + 1, dataUrl);
        const thumbnail = await generateThumbnail(dataUrl, 256, 256);
        const list = isB ? [...inputImagesB] : [...inputImages];
        list[index] = thumbnail;
        handleValueUpdate({ [isB ? 'inputImagesB' : 'inputImages']: list });
    };

    const buildSlots = (local: string[], upstream: any[], isB: boolean): ImageSlot[] => {
        const slots: ImageSlot[] = [];
        upstream.forEach((imgData, index) => {
            let src: string | null = null;
            if (typeof imgData === 'string') src = imgData;
            else if (imgData && typeof imgData === 'object') src = `data:${imgData.mimeType};base64,${imgData.base64ImageData}`;
            slots.push({ type: 'connected', src, index });
        });
        local.forEach((src, index) => slots.push({ type: 'local', src, index }));
        return slots;
    };

    const imageSlots = useMemo(() => buildSlots(inputImages, upstreamImagesRaw, false), [inputImages, upstreamImagesRaw]);
    const imageSlotsB = useMemo(() => buildSlots(inputImagesB, upstreamImagesRawB, true), [inputImagesB, upstreamImagesRawB]);
    const isInputConnected = connectedInputs?.has('image') || (parsedValue.isSequentialEditingWithPrompts && connectedInputs?.has('image_b'));

    const seqTotalFrames = useMemo(() => {
        if (isSequentialEditingWithPrompts) {
            const localCount = Object.keys(framePrompts || {}).length;
            const upstreamCount = upstreamPromptsMap?.size || 0;
            return Math.max(localCount, upstreamCount, 1);
        }
        return imageSlots.length;
    }, [isSequentialEditingWithPrompts, framePrompts, upstreamPromptsMap, imageSlots.length]);

    // Handle initial selection for new mode
    useEffect(() => {
         if (isSequentialEditingWithPrompts) {
             if (!checkedSequenceOutputIndices || checkedSequenceOutputIndices.length !== seqTotalFrames) {
                  handleValueUpdate({ checkedSequenceOutputIndices: Array.from({length: seqTotalFrames}, (_, i) => i) });
             }
         } else {
             const currentLength = checkedInputIndices ? checkedInputIndices.length : 0;
             if (imageSlots.length > currentLength || checkedInputIndices === undefined) {
                 handleValueUpdate({ checkedInputIndices: imageSlots.map((_, i) => i) });
             }
         }
    }, [imageSlots.length, isSequentialEditingWithPrompts, seqTotalFrames]);

    const hasInputImages = isSequentialEditingWithPrompts ? imageSlotsB.length > 0 : imageSlots.length > 0;
    
    // Preview Generation Logic
    const lastImageSource = useMemo(() => {
        if (isSequentialEditingWithPrompts) {
            // New logic: Use last available image from B for preview
            if (imageSlotsB.length > 0) {
                 const lastSlot = imageSlotsB[imageSlotsB.length - 1];
                 return lastSlot.type === 'local' ? (getFullSizeImage(node.id, 2000 + lastSlot.index + 1) || lastSlot.src) : lastSlot.src;
            }
        } else {
            const activeSlots = imageSlots.filter((_, i) => !checkedInputIndices || checkedInputIndices.includes(i));
            if (activeSlots.length > 0) {
                const lastSlot = activeSlots[activeSlots.length - 1];
                return lastSlot.type === 'local' ? (getFullSizeImage(node.id, lastSlot.index + 1) || lastSlot.src) : lastSlot.src;
            }
        }
        return null;
    }, [imageSlots, imageSlotsB, getFullSizeImage, node.id, checkedInputIndices, isSequentialEditingWithPrompts]);

    useEffect(() => {
        const updatePreview = async () => {
            if (enableAspectRatio && lastImageSource && aspectRatio && aspectRatio !== 'Auto') {
                 try {
                     const { formattedImage } = await formatImageForAspectRatio(lastImageSource, aspectRatio);
                     previewHighResRef.current = formattedImage;
                     setPreviewImage(await generateThumbnail(formattedImage, 256, 256));
                 } catch { setPreviewImage(null); }
            } else if (enableAspectRatio && lastImageSource) {
                 previewHighResRef.current = lastImageSource;
                 setPreviewImage(lastImageSource.length > 100000 ? await generateThumbnail(lastImageSource, 256, 256) : lastImageSource);
            } else {
                setPreviewImage(null); previewHighResRef.current = null;
            }
        };
        updatePreview();
    }, [lastImageSource, aspectRatio, enableAspectRatio]);

    const handleUseAsInput = async () => {
        if (previewHighResRef.current) {
            handleAddImagesToInput([previewHighResRef.current], false);
        }
    };
    
    const handleInputClick = (clickedIndex: number, isB: boolean) => {
        const slotsToUse = isB ? imageSlotsB : imageSlots;
        const offset = isB ? 2000 : 0;
        const upstreamFull = isB ? [] : getUpstreamNodeValues(node.id, 'image', undefined, false);
        const upstreamFullB = isB ? getUpstreamNodeValues(node.id, 'image_b', undefined, false) : [];
        const upstreamToUse = isB ? upstreamFullB : upstreamFull;

        const sources = slotsToUse.map((slot, index) => {
            let src: string | undefined | null = null;
            if (slot.type === 'local') {
                src = getFullSizeImage(node.id, offset + slot.index + 1) || slot.src;
            } else {
                const raw = upstreamToUse[slot.index];
                if (typeof raw === 'object' && raw.base64ImageData) {
                     src = `data:${raw.mimeType};base64,${raw.base64ImageData}`;
                } else if (typeof raw === 'string') {
                    src = raw;
                } else {
                    src = slot.src; 
                }
            }
            return src ? { src, frameNumber: index + 1, prompt: `Input ${isB ? 'B ' : ''}Image ${index + 1}` } : null;
        }).filter(Boolean) as any[];
        
        if (sources.length > 0) setImageViewer({ sources, initialIndex: clickedIndex });
    };

    const handleDetachAndPasteInput = useCallback(() => {
        let handleIdToDetach = 'image';
        let isB = false;
        
        if (parsedValueRef.current.isSequentialEditingWithPrompts) {
            handleIdToDetach = 'image_b';
            isB = true;
        }
        
        const rawImages = getUpstreamNodeValues(node.id, handleIdToDetach, undefined, false);
        const sources: string[] = [];
        
        rawImages.forEach(img => {
            if (typeof img === 'string') sources.push(img);
            else if (img && typeof img === 'object') sources.push(`data:${img.mimeType};base64,${img.base64ImageData}`);
        });

        if (sources.length > 0) {
            handleAddImagesToInput(sources, isB);
            if (onCutConnections) {
                setConnections(prev => prev.filter(c => !(c.toNodeId === node.id && (c.toHandleId === handleIdToDetach || (handleIdToDetach === 'image' && c.toHandleId === undefined)))));
            }
        }
    }, [getUpstreamNodeValues, handleAddImagesToInput, onCutConnections, node.id, setConnections]);

    const handleApplyEditor = (imageDataUrl: string) => {
        setFullSizeImage(node.id, 0, imageDataUrl);
        generateThumbnail(imageDataUrl, 256, 256).then(t => handleValueUpdate({ outputImage: t }));
    };

    // Pack Actions for Left Pane
    const inputListActions = {
        getFullSizeImage: (idx: number) => getFullSizeImage(node.id, idx),
        onCheck: (idx: number, isB: boolean) => {
            if (!isB) {
                const currentChecked = parsedValueRef.current.checkedInputIndices || [];
                const newChecked = currentChecked.includes(idx) ? currentChecked.filter((x: number) => x !== idx) : [...currentChecked, idx];
                handleValueUpdate({ checkedInputIndices: newChecked });
            }
        },
        onSelectAll: (isB: boolean) => {
            if (!isB) handleValueUpdate({ checkedInputIndices: imageSlots.map((_, i) => i) });
        },
        onSelectNone: (isB: boolean) => {
            if (!isB) handleValueUpdate({ checkedInputIndices: [] });
        },
        onClear: (isB: boolean) => {
             if (isB) handleValueUpdate({ inputImagesB: [] });
             else handleValueUpdate({ inputImages: [], checkedInputIndices: [] });
        },
        onClick: handleInputClick,
        onMove: handleReorderInput,
        onRemove: removeImage,
        onMoveToB: isSequentialCombinationMode ? handleMoveToB : undefined,
        onFileClick: (isB: boolean) => isB ? fileInputBRef.current?.click() : fileInputRef.current?.click(),
        onDropFiles: handleAddImagesToInput,
        onDropData: (data: string, isB: boolean) => handleAddImagesToInput([data], isB),
        onSlotDrop: handleReplaceImage
    };
    
    // --- Frame Manipulation Handlers for SequencedPromptList ---
    
    const handleDeleteFramePrompt = useCallback((index: number) => {
        const currentPrompts = { ...parsedValueRef.current.framePrompts };
        const currentOutputs = [...(parsedValueRef.current.sequenceOutputs || [])];
        
        // We need to shift everything down from index + 1
        const maxIndex = Math.max(...Object.keys(currentPrompts).map(Number));
        const newPrompts: Record<number, string> = {};
        
        for (let i = 0; i <= maxIndex; i++) {
             if (i < index) {
                 if (currentPrompts[i]) newPrompts[i] = currentPrompts[i];
             } else if (i > index) {
                 if (currentPrompts[i]) newPrompts[i - 1] = currentPrompts[i];
             }
        }
        
        if (index < currentOutputs.length) {
            currentOutputs.splice(index, 1);
        }
        
        let newSelection = selectedSourceFrameIndex;
        if (newSelection === index) newSelection = null;
        else if (newSelection !== null && newSelection > index) newSelection--;

        handleValueUpdate({ 
            framePrompts: newPrompts, 
            sequenceOutputs: currentOutputs,
            selectedSourceFrameIndex: newSelection
        });
    }, [handleValueUpdate, selectedSourceFrameIndex]);

    const handleClearAllFramePrompts = useCallback(() => {
        handleValueUpdate({ 
            framePrompts: {}, 
            sequenceOutputs: [], 
            selectedSourceFrameIndex: null 
        });
    }, [handleValueUpdate]);

    const handleMoveFramePrompt = useCallback((from: number, to: number) => {
        const currentPrompts = { ...parsedValueRef.current.framePrompts };
        const currentOutputs = [...(parsedValueRef.current.sequenceOutputs || [])];
        
        const maxIndex = Math.max(...Object.keys(currentPrompts).map(Number), from, to);
        const promptArray = [];
        for (let i = 0; i <= maxIndex; i++) promptArray.push(currentPrompts[i] || '');
        
        const [movedItem] = promptArray.splice(from, 1);
        promptArray.splice(to, 0, movedItem);
        
        const newPrompts: Record<number, string> = {};
        promptArray.forEach((p, i) => { if (p) newPrompts[i] = p; });

        while (currentOutputs.length <= Math.max(from, to)) currentOutputs.push({ status: 'idle', thumbnail: null });
        
        const [movedOutput] = currentOutputs.splice(from, 1);
        currentOutputs.splice(to, 0, movedOutput);
        
        let newSelection = selectedSourceFrameIndex;
        if (newSelection === from) newSelection = to;
        else if (newSelection !== null) {
            if (from < to) {
                 if (newSelection > from && newSelection <= to) newSelection--;
            } else {
                 if (newSelection >= to && newSelection < from) newSelection++;
            }
        }
        
        handleValueUpdate({ 
            framePrompts: newPrompts, 
            sequenceOutputs: currentOutputs,
            selectedSourceFrameIndex: newSelection
        });
    }, [handleValueUpdate, selectedSourceFrameIndex]);

    const handleSelectFramePrompt = useCallback((index: number) => {
        handleValueUpdate({ selectedSourceFrameIndex: index });
    }, [handleValueUpdate]);

    const previewElement = useMemo(() => (
         enableAspectRatio && (
             <div className="relative group flex-shrink-0 mt-2 h-40 bg-gray-900/50 rounded-md flex items-center justify-center">
                {previewImage ? (
                    <>
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain" draggable={true} onDragStart={(e) => { if(previewHighResRef.current || previewImage) { e.dataTransfer.setData('application/prompt-modifier-drag-image', previewHighResRef.current || previewImage); e.dataTransfer.effectAllowed = 'copy'; e.stopPropagation(); }}} />
                        <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ActionButton title="Copy" onClick={(e) => { e.stopPropagation(); onCopyImageToClipboard(previewHighResRef.current || previewImage!); }}>
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton title="Use as Input" onClick={handleUseAsInput}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg></ActionButton>
                            <ActionButton title="Detach" onClick={() => { if (previewHighResRef.current) onDetachImageToNode(previewHighResRef.current, node.id); }}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></ActionButton>
                        </div>
                    </>
                ) : (
                    <p className="text-gray-500 text-sm text-center px-2">{t('node.content.previewPlaceholder')}</p>
                )}
            </div>
        )
    ), [enableAspectRatio, previewImage, handleUseAsInput, onDetachImageToNode, onCopyImageToClipboard, t]);

    const handleEditPrompt = useCallback((index: number) => {
        if (sequencedListRef.current) {
            sequencedListRef.current.scrollToIndex(index);
        }
    }, []);

    const handleEditInSource = useCallback((index: number) => {
         const findSourceNodeId = (targetNodeId: string, targetHandleId: string | undefined, visited = new Set<string>()): string | undefined => {
             if (!connections || !allNodes) return undefined;
             if (visited.has(targetNodeId)) return undefined;
             visited.add(targetNodeId);
             const conn = connections.find(c => c.toNodeId === targetNodeId && (c.toHandleId === targetHandleId || targetHandleId === undefined));
             if (!conn) return undefined;
             const sourceNode = allNodes.find(n => n.id === conn.fromNodeId);
             if (!sourceNode) return undefined;
             if (sourceNode.type === NodeType.REROUTE_DOT) return findSourceNodeId(sourceNode.id, undefined, visited);
             return sourceNode.id;
         };
         
         const sourceId = findSourceNodeId(node.id, 'text');
         if (sourceId && handleNavigateToNodeFrame) {
             handleNavigateToNodeFrame(sourceId, index + 1);
         }
    }, [connections, allNodes, handleNavigateToNodeFrame, node.id]);

    const handleSyncPrompts = useCallback(() => {
        if (!upstreamPromptsMap || upstreamPromptsMap.size === 0) return;
        const newFramePrompts = { ...framePrompts };
        upstreamPromptsMap.forEach((val, key) => { 
            newFramePrompts[key] = val; 
        }); 
        handleValueUpdate({ framePrompts: newFramePrompts });
    }, [upstreamPromptsMap, framePrompts, handleValueUpdate]);

    return (
        <div ref={contentRef} className="flex w-full h-full">
            <ImageEditorModal isOpen={isEditorOpen} onClose={() => { setIsEditorOpen(false); editingFrameRef.current = null; }} onApply={handleApplyEditor} imageSrc={editorImageSrc} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.length) handleAddImagesToInput(Array.from(e.target.files), false); }} multiple />
            <input ref={fileInputBRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files?.length) handleAddImagesToInput(Array.from(e.target.files), true); }} multiple />
            
            <ImageEditorLeftPane 
                ref={sequencedListRef}
                nodeId={node.id}
                state={parsedValue}
                leftPaneWidth={leftPaneWidth}
                viewScale={viewScale}
                imageSlots={imageSlots}
                imageSlotsB={imageSlotsB}
                onUpdateState={handleValueUpdate}
                onCleanupInputB={cleanupInputB}
                onEditImage={() => {}} 
                inputListActions={inputListActions}
                previewElement={previewElement}
                libraryItems={libraryItems}
                upstreamPrompt={upstreamPrompt}
                upstreamPromptsMap={upstreamPromptsMap}
                isTextConnected={isTextConnected}
                isInputConnected={isInputConnected}
                isEditing={isEditingImage}
                seqTotalFrames={isSequenceMode && isSequentialEditingWithPrompts ? seqTotalFrames : imageSlots.length}
                handleDetachAndPasteInput={handleDetachAndPasteInput}
                handleManualRefresh={handleManualRefresh}
                t={t}
                deselectAllNodes={deselectAllNodes}
                onCopyImageToClipboard={onCopyImageToClipboard}
                onDetachImageToNode={onDetachImageToNode}
                onSyncPrompts={handleSyncPrompts}
                onDeleteFrame={handleDeleteFramePrompt}
                onMoveFrame={handleMoveFramePrompt}
                onSelectFrame={handleSelectFramePrompt}
                onClearFrames={handleClearAllFramePrompts}
                selectedFrameIndex={selectedSourceFrameIndex}
            />

            <div onMouseDown={handleHorizontalResize} className="w-2 h-full bg-gray-700/50 hover:bg-cyan-600 cursor-col-resize rounded transition-colors flex-shrink-0"></div>

            <OutputPanel
                state={parsedValue}
                imageSlots={isSequentialEditingWithPrompts ? imageSlotsB : imageSlots}
                hasInputImages={isSequentialEditingWithPrompts ? imageSlotsB.length > 0 : imageSlots.length > 0}
                isEditing={isEditingImage}
                isStopping={isStopping}
                isGlobalProcessing={false} 
                totalFrames={isSequentialEditingWithPrompts ? seqTotalFrames : checkedInputIndices.length}
                doneCount={sequenceOutputs.filter((o, i) => (isSequentialEditingWithPrompts || checkedInputIndices.includes(i)) && o?.status === 'done').length}
                currentGeneratingDisplay={(sequenceOutputs.findIndex(o => o?.status === 'generating') + 1) || '-'}
                fullSizeOutputForCopy={getFullSizeImage(node.id, 0) || outputImage}
                imageForEditor={getFullSizeImage(node.id, 0) || outputImage}
                modelOptions={[]}
                isNanoBanana={isNanoBanana}
                onUpdateState={handleValueUpdate}
                onRunSelected={handleStartEdit} 
                onDownloadSelected={async () => {
                     const sorted = [...checkedSequenceOutputIndices].sort((a, b) => a - b);
                     const now = new Date();
                     const date = now.toISOString().split('T')[0];

                     if (createZip) {
                         try {
                             const zip = new JSZip();
                             
                             for (const idx of sorted) {
                                 const src = getFullSizeImage(node.id, 1000 + idx) || sequenceOutputs[idx]?.thumbnail;
                                 if (src && src.startsWith('data:image')) {
                                     const paddedFrame = String(idx + 1).padStart(3, '0');
                                     const filename = `Image_Editor_Frame_${paddedFrame}.png`;
                                     const base64Data = src.split(',')[1];
                                     zip.file(filename, base64Data, { base64: true });
                                 }
                             }
                             
                             const content = await zip.generateAsync({ type: 'blob' });
                             const link = document.createElement('a');
                             link.href = URL.createObjectURL(content);
                             link.download = `Image_Editor_${date}.zip`;
                             link.click();
                             URL.revokeObjectURL(link.href);
                             if(addToast) addToast("ZIP Downloaded", 'success');
                         } catch (e) {
                             console.error("ZIP Error", e);
                             if(addToast) addToast("Failed to create ZIP", 'error');
                         }
                     } else {
                         for (const idx of sorted) {
                             const src = getFullSizeImage(node.id, 1000 + idx) || sequenceOutputs[idx]?.thumbnail;
                             const paddedFrame = String(idx + 1).padStart(3, '0');
                             const filename = `Image_Editor_Frame_${paddedFrame}_${date}.png`;
                             
                             if (src) { 
                                 onDownloadImageFromUrl(src, idx + 1, prompt || 'Sequence', filename); 
                                 await new Promise(r => setTimeout(r, 300)); 
                             }
                         }
                     }
                }}
                onStartQueue={() => { }}
                onStop={handleStop}
                onEdit={handleStartEdit}
                onOpenEditor={() => {
                     const outputSrc = getFullSizeImage(node.id, 0) || outputImage;
                     if(outputSrc) {
                         setEditorImageSrc(outputSrc);
                         editingFrameRef.current = 0; 
                         setIsEditorOpen(true);
                     }
                }}
                onSetOutputToInput={() => onSetImageEditorOutputToInput(node.id)}
                onDownload={() => onDownloadImage(node.id)}
                onCopy={() => { const img = getFullSizeImage(node.id, 0) || outputImage; if (img) onCopyImageToClipboard(img); }}
                
                onSelectAll={() => handleValueUpdate({ checkedSequenceOutputIndices: Array.from({length: isSequentialEditingWithPrompts ? seqTotalFrames : imageSlots.length}, (_, i) => i) })}
                onSelectNone={() => handleValueUpdate({ checkedSequenceOutputIndices: [] })}
                
                onInvertSelection={() => {
                     const total = isSequentialEditingWithPrompts ? seqTotalFrames : imageSlots.length;
                     const current = parsedValueRef.current.checkedSequenceOutputIndices || [];
                     const inverted = Array.from({length: total}, (_, i) => i).filter(i => !current.includes(i));
                     handleValueUpdate({ checkedSequenceOutputIndices: inverted });
                }}
                
                onManualRefresh={handleManualRefresh}
                onOutputClick={() => { const src = getFullSizeImage(node.id, 0) || outputImage; if (src) setImageViewer({ sources: [{ src, frameNumber: 0, prompt }], initialIndex: 0 }); }}
                
                onSequenceOutputClick={(i, clickedSrc) => {
                    if (!clickedSrc) return;
                    const validSources = sequenceOutputs.map((output, idx) => {
                         const s = getFullSizeImage(node.id, 1000 + idx) || output?.thumbnail;
                         if (s) {
                             return {
                                 src: s,
                                 frameNumber: idx + 1,
                                 prompt: `Output ${idx + 1}`
                             };
                         }
                         return null;
                    }).filter((s): s is { src: string; frameNumber: number; prompt: string } => s !== null);

                    const internalIndex = validSources.findIndex(s => s.frameNumber === (i + 1));
                    if (internalIndex !== -1) {
                         setImageViewer({ sources: validSources, initialIndex: internalIndex });
                    }
                }}

                onCheckOutput={(i) => {
                    const current = parsedValueRef.current.checkedSequenceOutputIndices || [];
                    const newChecked = current.includes(i) ? current.filter((x: number) => x !== i) : [...current, i];
                    handleValueUpdate({ checkedSequenceOutputIndices: newChecked });
                }}
                
                onCopyFrame={(e, i) => { e.stopPropagation(); const src = getFullSizeImage(node.id, 1000+i) || sequenceOutputs[i]?.thumbnail; if(src) onCopyImageToClipboard(src); }}
                onDownloadFrame={(e, i) => { 
                    e.stopPropagation(); 
                    const src = getFullSizeImage(node.id, 1000+i) || sequenceOutputs[i]?.thumbnail; 
                    if(src) {
                         const now = new Date();
                         const date = now.toISOString().split('T')[0];
                         const paddedFrame = String(i + 1).padStart(3, '0');
                         const filename = `Image_Editor_Frame_${paddedFrame}_${date}.png`;
                         onDownloadImageFromUrl(src, i+1, prompt, filename); 
                    }
                }}
                onRegenerateFrame={(e, i) => { e.stopPropagation(); onEditImage(node.id, [i]); }}
                onStopFrame={(e, i) => { e.stopPropagation(); if(onStopEdit) onStopEdit(); }}
                getFullSizeImage={(idx) => getFullSizeImage(node.id, idx)}
                t={t}
                upstreamPrompt={upstreamPrompt}
                isTextConnected={isTextConnected}
                onEditPrompt={handleEditPrompt}
                onEditInSource={handleEditInSource}
            />
        </div>
    );
};
