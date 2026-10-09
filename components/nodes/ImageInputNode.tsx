import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { NodeContentProps } from '../../types';
import ImageEditorModal from '../ImageEditorModal';
import { generateThumbnail, cropImageNormalized, sliceImageGrid } from '../../utils/imageUtils';
import { useAppContext } from '../../contexts/AppContext';
import { ImageSlicesPreview } from './image-input/ImageSlicesPreview';
import { SingleCropPreview } from './image-input/SingleCropPreview';
import { ImageFramesPreview } from './image-input/ImageFramesPreview';
import { BatchProcessingPanel } from './image-input/BatchProcessingPanel';
import { ImageBatchThumbnailsBar } from './image-input/ImageBatchThumbnailsBar';
import { ArchiveFolderModal } from './image-input/ArchiveFolderModal';
import { ModeSelectorBar } from './image-input/ModeSelectorBar';
import { BatchSubModeSelector } from './image-input/BatchSubModeSelector';
import { CropPresetsBar } from './image-input/CropPresetsBar';
import { FramesToolbar } from './image-input/FramesToolbar';
import { GridToolbar } from './image-input/GridToolbar';
import { ImageControlsSection } from './image-input/ImageControlsSection';
import { ImageCanvasContainer } from './image-input/ImageCanvasContainer';
import {
    ImageInputCropRect,
    ImageInputMode,
    ImageInputValue,
    ImageInputFramesConfig
} from './image-input/types';
import {
    useImageInputImport,
    useImageInputDimensions,
    useImageInputCropAndGrid,
    useImageInputFrames,
    useImageInputBatch,
    useImageInputExportAndDispatch
} from './image-input/hooks';

export const ImageInputNode: React.FC<NodeContentProps> = ({
    node,
    onValueChange,
    onProcessImage,
    isProcessingImage,
    onPasteImage,
    t,
    deselectAllNodes,
    getFullSizeImage,
    setImageViewer,
    setFullSizeImage,
    onCopyImageToClipboard,
    onDownloadImage,
    addToast,
    onAddNode,
    onDeleteNode,
    onImageToText,
    isAnalyzingImage,
    getUpstreamNodeValues
}) => {
    const context = useAppContext();
    const addNode = onAddNode || context?.onAddNode;
    const deleteNode = onDeleteNode || context?.deleteNodeAndConnections;
    const setSelectedNodeIds = context?.setSelectedNodeIds;
    const { isBatchMode, setIsBatchMode } = context || {};

    const nodeContainerRef = useRef<HTMLDivElement>(null);
    const [isNodeHovered, setIsNodeHovered] = useState<boolean>(false);

    const parsedValue: ImageInputValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { image: node.value.startsWith('data:image') ? node.value : null, prompt: '' };
        }
    }, [node.value]);

    const {
        image,
        prompt,
        mode = 'full',
        cropRect = null,
        croppedImage = null,
        grid = { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } },
        framesConfig = { frames: [{ id: 'frame-1', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, name: 'Frame 1' }], selectedFrameIndex: 0 },
        frameImages = [],
        batchConfig,
        batchFiles: initialBatchFiles = [],
        extractedImages = [],
        showControls = false
    } = parsedValue;

    const parsedValueRef = useRef<ImageInputValue>(parsedValue);
    useEffect(() => {
        parsedValueRef.current = {
            ...parsedValueRef.current,
            ...parsedValue
        };
    }, [parsedValue]);

    const handleValueUpdate = useCallback((updates: Partial<ImageInputValue>) => {
        const updated: ImageInputValue = {
            ...parsedValueRef.current,
            ...updates
        };
        parsedValueRef.current = updated;
        onValueChange(node.id, JSON.stringify(updated));
    }, [onValueChange, node.id]);

    const originalDimensions = useImageInputDimensions(getFullSizeImage(node.id, 0) || image);

    // 1. Hook for Batch processing
    const batchHook = useImageInputBatch({
        nodeId: node.id,
        image,
        mode,
        initialBatchFiles,
        batchConfig,
        cropRect,
        grid,
        getFullSizeImage,
        setFullSizeImage,
        handleValueUpdate,
        parsedValueRef,
        updateSingleCropSlice: async (rect, expMode, overrideSrc, targetRefIdx, overrideThumb) => {
            await cropGridHook.updateSingleCropSlice(rect, expMode, overrideSrc, targetRefIdx, overrideThumb);
        },
        updateGridSlices: async (gridCfg, expMode, overrideSrc, targetRefIdx, overrideThumb) => {
            await cropGridHook.updateGridSlices(gridCfg, expMode, overrideSrc, targetRefIdx, overrideThumb);
        },
        addToast,
        selectedNodeIds: context?.selectedNodeIds,
        isNodeHovered,
        nodeContainerRef
    });

    // Synchronize batchFiles from node value if changed externally (e.g. sent from TaskQueue Batch Job)
    useEffect(() => {
        if (parsedValue.batchFiles && Array.isArray(parsedValue.batchFiles) && parsedValue.batchFiles.length > 0) {
            batchHook.setBatchFiles(parsedValue.batchFiles);
            batchHook.batchFilesRef.current = parsedValue.batchFiles;
        }
    }, [parsedValue.batchFiles, batchHook.setBatchFiles, batchHook.batchFilesRef]);

    // 2. Hook for Crop and Grid operations
    const cropGridHook = useImageInputCropAndGrid({
        nodeId: node.id,
        image,
        mode,
        cropRect,
        grid,
        getFullSizeImage,
        setFullSizeImage,
        handleValueUpdate,
        parsedValueRef,
        batchFiles: batchHook.batchFiles,
        setBatchFiles: batchHook.setBatchFiles,
        batchFilesRef: batchHook.batchFilesRef,
        selectedRefIndex: batchHook.selectedRefIndex,
        selectedRefIndexRef: batchHook.selectedRefIndexRef,
        individualGridSettings: batchHook.individualGridSettings,
        individualGridSettingsRef: batchHook.individualGridSettingsRef,
        originalDimensions
    });

    // 3. Hook for Multiple Frames operations
    const framesHook = useImageInputFrames({
        nodeId: node.id,
        image,
        mode,
        framesConfig,
        getFullSizeImage,
        setFullSizeImage,
        handleValueUpdate,
        parsedValueRef,
        operationIdRef: cropGridHook.operationIdRef,
        setIsSlicing: cropGridHook.setIsSlicing,
        originalDimensions
    });

    // Slices refresher when master image changes
    const refreshSlicesOnImageChange = useCallback(async (dataUrl: string) => {
        const thumbnail = await generateThumbnail(dataUrl, 512, 512);
        if (mode === 'single') {
            const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            const highResCrop = await cropImageNormalized(dataUrl, activeCrop);
            setFullSizeImage(node.id, 1, highResCrop);
            const cropThumb = await generateThumbnail(highResCrop, 512, 512);
            handleValueUpdate({ image: thumbnail, croppedImage: cropThumb });
        } else if (mode === 'grid') {
            const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
            const { slices, thumbs } = await sliceImageGrid(
                dataUrl,
                activeGrid.cols,
                activeGrid.rows,
                activeGrid.bounds,
                {
                    enableBorder: activeGrid.enableBorder,
                    borderWidth: activeGrid.borderWidth,
                    borderMode: activeGrid.borderMode,
                    customDividers: activeGrid.customDividers,
                    colDividers: activeGrid.colDividers,
                    rowDividers: activeGrid.rowDividers
                }
            );
            slices.forEach((slice, idx) => setFullSizeImage(node.id, idx + 1, slice));
            handleValueUpdate({ image: thumbnail, extractedImages: thumbs });
        } else if (mode === 'frames') {
            const activeFrames = framesConfig || { frames: [{ id: 'frame-1', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, name: 'Frame 1' }], selectedFrameIndex: 0 };
            await framesHook.updateMultipleFramesSlices(activeFrames, mode, dataUrl, thumbnail);
        } else {
            handleValueUpdate({ image: thumbnail });
        }
    }, [mode, cropRect, setFullSizeImage, node.id, handleValueUpdate, grid, framesConfig, framesHook]);

    // 4. Hook for Import, Drag-and-Drop, Clipboard and Ratio Expansion
    const importHook = useImageInputImport({
        nodeId: node.id,
        nodeValue: node.value,
        image,
        prompt,
        mode,
        getFullSizeImage,
        setFullSizeImage,
        onValueChange,
        onPasteImage,
        onCopyImageToClipboard,
        onDownloadImage,
        setImageViewer,
        addToast,
        t,
        getUpstreamNodeValues,
        parsedValueRef,
        handleValueUpdate,
        loadMultipleFiles: batchHook.loadMultipleFiles,
        batchFilesRef: batchHook.batchFilesRef,
        refreshSlicesOnImageChange,
        croppedImage
    });

    // 5. Hook for Export and Dispatch to other nodes
    const exportHook = useImageInputExportAndDispatch({
        nodeId: node.id,
        nodePosition: node.position,
        nodeWidth: node.width,
        image,
        prompt,
        mode,
        cropRect,
        croppedImage,
        grid,
        gridAssetName: cropGridHook.gridAssetName,
        extractedImages,
        framesConfig,
        framesAssetName: framesHook.framesAssetName,
        frameImages,
        getFullSizeImage,
        setFullSizeImage,
        onValueChange,
        addNode,
        deleteNode,
        setSelectedNodeIds,
        addToast,
        t
    });

    // Upstream stream change sync
    const prevUpstreamSigRef = useRef<string>('');
    useEffect(() => {
        const sig = importHook.upstreamImages.map(img => img.slice(0, 40) + img.length).join('|');
        if (sig === prevUpstreamSigRef.current) return;

        prevUpstreamSigRef.current = sig;

        if (importHook.upstreamImages.length > 0) {
            if (mode === 'batch' || importHook.upstreamImages.length > 1) {
                batchHook.syncFromUpstream(importHook.upstreamImages);
            } else if (importHook.upstreamImages.length === 1) {
                importHook.handleImageChange(importHook.upstreamImages[0]);
            }
        }
    }, [importHook.upstreamImages, mode, batchHook, importHook]);

    // Initial slice loading and automatic update when master image changes
    const prevMasterSrcRef = useRef<string | null>(null);
    useEffect(() => {
        const masterSrc = getFullSizeImage(node.id, 0) || image;
        if (!masterSrc) {
            prevMasterSrcRef.current = null;
            return;
        }

        const isNewImage = prevMasterSrcRef.current !== null && prevMasterSrcRef.current !== masterSrc;
        const isFirstLoad = prevMasterSrcRef.current === null;
        prevMasterSrcRef.current = masterSrc;

        if (mode === 'batch') {
            return;
        }

        if (isNewImage) {
            if (mode === 'single') {
                const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                cropGridHook.updateSingleCropSlice(activeCrop, undefined, masterSrc);
            } else if (mode === 'grid') {
                const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                cropGridHook.updateGridSlices(activeGrid, undefined, masterSrc);
            } else if (mode === 'frames') {
                const activeFrames = framesConfig || { frames: [{ id: 'frame-1', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, name: 'Frame 1' }], selectedFrameIndex: 0 };
                framesHook.updateMultipleFramesSlices(activeFrames, undefined, masterSrc);
            }
        } else if (isFirstLoad) {
            if (mode === 'single' && !croppedImage) {
                const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                cropGridHook.updateSingleCropSlice(activeCrop, undefined, masterSrc);
            } else if (mode === 'grid' && (!extractedImages || extractedImages.length === 0)) {
                const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                cropGridHook.updateGridSlices(activeGrid, undefined, masterSrc);
            } else if (mode === 'frames' && (!frameImages || frameImages.length === 0)) {
                const activeFrames = framesConfig || { frames: [{ id: 'frame-1', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, name: 'Frame 1' }], selectedFrameIndex: 0 };
                framesHook.updateMultipleFramesSlices(activeFrames, undefined, masterSrc);
            }
        }
    }, [getFullSizeImage, image, mode, cropRect, grid, framesConfig, croppedImage, extractedImages, frameImages, node.id, cropGridHook, framesHook]);

    // Mode changer with robust cancellation of pending tasks
    const setMode = (newMode: ImageInputMode) => {
        cropGridHook.operationIdRef.current++;
        cropGridHook.setIsSlicing(false);

        handleValueUpdate({ mode: newMode });

        if (newMode === 'full') {
            if (batchHook.batchFiles.length > 0) {
                const activeItem = batchHook.batchFiles[batchHook.selectedRefIndex] || batchHook.batchFiles[0];
                if (activeItem) {
                    setFullSizeImage(node.id, 0, activeItem.dataUrl);
                    handleValueUpdate({
                        mode: 'full',
                        image: activeItem.thumbnailUrl || activeItem.dataUrl,
                        batchFiles: batchHook.batchFiles
                    });
                }
            }
        } else if (newMode === 'single') {
            const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            cropGridHook.updateSingleCropSlice(activeCrop, 'single');
        } else if (newMode === 'grid') {
            const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
            const expectedTotal = (activeGrid.cols || 2) * (activeGrid.rows || 1);
            if (!extractedImages || extractedImages.length !== expectedTotal) {
                cropGridHook.updateGridSlices(activeGrid, 'grid');
            }
        } else if (newMode === 'frames') {
            const activeFrames = parsedValueRef.current.framesConfig || framesConfig || {
                frames: [{ id: 'frame-1', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, name: 'Frame 1' }],
                selectedFrameIndex: 0
            };
            framesHook.updateMultipleFramesSlices(activeFrames, 'frames');
        } else if (newMode === 'batch') {
            const masterSrc = batchHook.batchFiles[batchHook.selectedRefIndex]?.dataUrl || getFullSizeImage(node.id, 0) || image;
            if (masterSrc) {
                if (batchHook.batchSubMode === 'crop') {
                    const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                    cropGridHook.updateSingleCropSlice(activeCrop, 'batch', masterSrc);
                } else {
                    const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                    cropGridHook.updateGridSlices(activeGrid, 'batch', masterSrc);
                }
            }
        }
    };

    const handleToggleControls = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleValueUpdate({ showControls: !showControls });
    };

    // Effective batch files for thumbnail strip: either full batch list or synthesized active image
    const effectiveBatchFiles = useMemo(() => {
        if (batchHook.batchFiles && batchHook.batchFiles.length > 0) {
            return batchHook.batchFiles;
        }
        const masterSrc = getFullSizeImage(node.id, 0) || image;
        if (masterSrc) {
            return [{
                id: 'single-input-master',
                name: 'Image 1',
                dataUrl: masterSrc,
                thumbnailUrl: image || masterSrc,
                size: 0
            }];
        }
        return [];
    }, [batchHook.batchFiles, image, getFullSizeImage, node.id]);

    return (
        <div
            ref={nodeContainerRef}
            onMouseEnter={() => setIsNodeHovered(true)}
            onMouseLeave={() => setIsNodeHovered(false)}
            className="flex flex-col h-full space-y-2 select-none"
            data-node-id={node.id}
            tabIndex={0}
            onPaste={async (e) => {
                const target = e.target as HTMLElement;
                const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
                if (isTextInput && target.getAttribute('type') !== 'file') return;
                const items = e.clipboardData?.items;
                if (items) {
                    const imageFiles: File[] = [];
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.startsWith('image/')) {
                            const file = items[i].getAsFile();
                            if (file) imageFiles.push(file);
                        }
                    }
                    if (imageFiles.length > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (mode === 'batch') {
                            await batchHook.loadMultipleFiles(imageFiles);
                        } else {
                            onPasteImage(node.id, imageFiles[0]);
                        }
                    }
                }
            }}
        >
            <ImageEditorModal
                isOpen={importHook.isEditorOpen}
                onClose={() => importHook.setIsEditorOpen(false)}
                onApply={(imageDataUrl) => importHook.handleImageChange(imageDataUrl)}
                imageSrc={getFullSizeImage(node.id, 0) || image}
            />
            <input ref={importHook.fileInputRef} type="file" accept="image/*" className="hidden" onChange={importHook.handleFileChange} />
            <input ref={importHook.batchFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={importHook.handleBatchFileInputChange} />

            {/* Top Mode Selector Bar */}
            <ModeSelectorBar
                mode={mode}
                onSetMode={setMode}
                batchFiles={batchHook.batchFiles}
                batchSubMode={batchHook.batchSubMode}
                grid={grid}
                framesConfig={framesConfig}
            />

            {/* Batch Sub-Mode Selector */}
            {mode === 'batch' && (
                <BatchSubModeSelector
                    batchSubMode={batchHook.batchSubMode}
                    onChangeSubMode={batchHook.handleBatchSubModeChange}
                    batchFiles={batchHook.batchFiles}
                    grid={grid}
                />
            )}

            {/* Mode-Specific Quick Sub-Toolbar: Crop Presets */}
            {image && (mode === 'single' || (mode === 'batch' && batchHook.batchSubMode === 'crop')) && (
                <CropPresetsBar
                    mode={mode}
                    onApplyAspectCrop={(ratio) => cropGridHook.applyAspectCrop(ratio)}
                    onResetCrop={cropGridHook.handleResetCrop}
                />
            )}

            {/* Mode-Specific Quick Sub-Toolbar: Multiple Frames Controls */}
            {image && mode === 'frames' && (
                <FramesToolbar
                    framesConfig={framesConfig}
                    selectedFrameIndex={framesHook.selectedFrameIndex}
                    originalDimensions={originalDimensions}
                    onAddFrame={framesHook.handleAddFrame}
                    onDuplicateFrame={framesHook.handleDuplicateFrame}
                    onDeleteSelectedFrame={() => framesHook.handleDeleteSelectedFrame()}
                    onClearAllFrames={framesHook.handleClearAllFrames}
                    onApplyFramesPresetLayout={framesHook.applyFramesPresetLayout}
                    onUpdateSelectedFrameDimensions={framesHook.updateSelectedFrameDimensions}
                    onApplyAspectToSelectedFrame={framesHook.applyAspectToSelectedFrame}
                    onUpdateSelectedFrameGrid={framesHook.updateSelectedFrameGrid}
                    onResetSelectedFrameDividers={framesHook.resetSelectedFrameDividers}
                />
            )}

            {/* Mode-Specific Quick Sub-Toolbar: Grid Settings */}
            {image && (mode === 'grid' || (mode === 'batch' && batchHook.batchSubMode === 'grid')) && (
                <GridToolbar
                    grid={grid}
                    localBorderWidth={cropGridHook.localBorderWidth}
                    onUpdateGridDims={cropGridHook.updateGridDims}
                    onResetGridBounds={() => cropGridHook.updateGridSlices({ ...(grid || { cols: 2, rows: 1 }), bounds: { x: 0, y: 0, width: 1, height: 1 } })}
                    onToggleBorder={() => {
                        const nextEnable = !grid?.enableBorder;
                        cropGridHook.updateGridBorderConfig({
                            enableBorder: nextEnable,
                            borderWidth: grid?.borderWidth ?? 24,
                            borderMode: grid?.borderMode ?? 'inner'
                        });
                    }}
                    onBorderWidthChange={cropGridHook.handleBorderWidthInputChange}
                    onBorderWidthCommit={cropGridHook.handleBorderWidthInputCommit}
                    onSetBorderWidthQuick={(px) => {
                        if (cropGridHook.borderDebounceTimerRef.current) clearTimeout(cropGridHook.borderDebounceTimerRef.current);
                        cropGridHook.updateGridBorderConfig({ borderWidth: px });
                    }}
                    onSetBorderMode={(bMode) => cropGridHook.updateGridBorderConfig({ borderMode: bMode })}
                    onToggleCustomDividers={() => {
                        const nextCustom = !grid?.customDividers;
                        cropGridHook.updateGridSlices({
                            ...(grid || { cols: 2, rows: 1 }),
                            customDividers: nextCustom
                        });
                    }}
                    onResetDividers={() => {
                        cropGridHook.updateGridSlices({
                            ...(grid || { cols: 2, rows: 1 }),
                            colDividers: undefined,
                            rowDividers: undefined
                        });
                    }}
                />
            )}

            {/* Image Container - Canvas, Overlays, Navigation, Dropzone */}
            <ImageCanvasContainer
                nodeId={node.id}
                image={image}
                mode={mode}
                batchSubMode={batchHook.batchSubMode}
                batchFiles={batchHook.batchFiles}
                isDragOver={importHook.isDragOver}
                originalDimensions={originalDimensions}
                getFullSizeImage={getFullSizeImage}
                metadataPrompt={importHook.metadataPrompt}
                prompt={prompt}
                croppedImage={croppedImage}
                extractedImages={extractedImages}
                frameImages={frameImages}
                activeCropRect={cropGridHook.activeCropRect}
                activeGridConfig={cropGridHook.activeGridConfig}
                framesConfig={framesConfig}
                selectedFrameIndex={framesHook.selectedFrameIndex}
                showControls={showControls}
                isAnalyzingImage={isAnalyzingImage}
                t={t}
                onDrop={importHook.handleDrop}
                onDragEnter={importHook.handleDragEnter}
                onDragOver={importHook.handleDragOver}
                onDragLeave={importHook.handleDragLeave}
                onClickContainer={() => {
                    if (!image) {
                        if (mode === 'batch') {
                            importHook.batchFileInputRef.current?.click();
                        } else {
                            importHook.fileInputRef.current?.click();
                        }
                    }
                }}
                onImageClick={importHook.handleImageClick}
                onCopyImage={importHook.handleCopyImage}
                onDownload={importHook.handleDownload}
                onClearImage={importHook.handleClearImage}
                onImageToText={() => onImageToText && onImageToText(node.id)}
                onOpenRasterEditor={() => importHook.setIsEditorOpen(true)}
                onOpenInNode={exportHook.handleOpenInNode}
                onToggleControls={handleToggleControls}
                onNavigateBatch={batchHook.handleNavigateBatch}
                onChangeCropRect={(newRect) => cropGridHook.updateSingleCropSlice(newRect, mode)}
                onChangeGridConfig={(newConfig) => cropGridHook.updateGridSlices(newConfig, mode)}
                onChangeFramesConfig={(newConfig) => framesHook.updateMultipleFramesSlices(newConfig, mode)}
                onSelectFrame={framesHook.setSelectedFrameIndex}
            />

            {/* Multi-Image Thumbnails Strip in All Modes (Normal, Crop, Grid, Frames) */}
            {mode !== 'batch' && effectiveBatchFiles.length > 0 && (
                <ImageBatchThumbnailsBar
                    batchFiles={effectiveBatchFiles}
                    selectedIndex={batchHook.batchFiles.length > 0 ? batchHook.selectedRefIndex : 0}
                    onSelectIndex={(idx) => {
                        if (batchHook.batchFiles.length > 0) {
                            batchHook.handleSelectReferenceIndex(idx);
                        }
                    }}
                    onRemoveFile={(idx) => {
                        if (batchHook.batchFiles.length > 0) {
                            batchHook.handleRemoveBatchFile(idx);
                        } else {
                            importHook.handleClearImage();
                        }
                    }}
                    onClearBatch={() => {
                        if (batchHook.batchFiles.length > 0) {
                            batchHook.handleClearBatch();
                        } else {
                            importHook.handleClearImage();
                        }
                    }}
                    onAddFiles={(files) => batchHook.loadMultipleFiles(files)}
                    onPasteClipboard={importHook.handlePasteFromClipboard}
                    onNavigatePrev={() => batchHook.handleNavigateBatch('prev')}
                    onNavigateNext={() => batchHook.handleNavigateBatch('next')}
                />
            )}

            {/* Slices Drawer in Single Crop Mode */}
            {image && mode === 'single' && (croppedImage || getFullSizeImage(node.id, 1)) && (
                <SingleCropPreview
                    nodeId={node.id}
                    croppedImage={croppedImage}
                    cropRect={cropRect}
                    imageNaturalSize={originalDimensions}
                    getFullSizeImage={getFullSizeImage}
                    onCopyImageToClipboard={onCopyImageToClipboard}
                    onDownloadImage={onDownloadImage}
                    addToast={addToast}
                    onImageClick={importHook.handleImageClick}
                    onSendToNote={exportHook.handleSendSingleCropToNote}
                />
            )}

            {/* Slices Drawer in Grid Mode */}
            {image && mode === 'grid' && extractedImages && extractedImages.length > 0 && (
                <ImageSlicesPreview
                    nodeId={node.id}
                    slices={extractedImages}
                    originalImage={image}
                    includeOriginal={grid?.includeOriginal ?? true}
                    onChangeIncludeOriginal={(val) => {
                        cropGridHook.updateGridSlices({
                            ...(grid || { cols: 2, rows: 1 }),
                            includeOriginal: val
                        });
                    }}
                    assetName={cropGridHook.gridAssetName}
                    onChangeAssetName={cropGridHook.handleGridAssetNameChange}
                    getFullSizeImage={getFullSizeImage}
                    onCopyImageToClipboard={onCopyImageToClipboard}
                    onDownloadImage={onDownloadImage}
                    addToast={addToast}
                    cols={grid?.cols || 2}
                    rows={grid?.rows || 1}
                    onSendToNote={exportHook.handleSendGridSlicesToNote}
                />
            )}

            {/* Slices Drawer in Multiple Frames Mode */}
            {image && mode === 'frames' && framesConfig?.frames && framesConfig.frames.length > 0 && (
                <ImageFramesPreview
                    nodeId={node.id}
                    frames={framesConfig.frames}
                    frameThumbnails={frameImages || []}
                    selectedFrameIndex={framesHook.selectedFrameIndex}
                    onSelectFrame={framesHook.setSelectedFrameIndex}
                    onAddFrame={framesHook.handleAddFrame}
                    onDeleteFrame={framesHook.handleDeleteSelectedFrame}
                    onDuplicateFrame={framesHook.handleDuplicateFrame}
                    originalImage={image}
                    includeOriginal={framesConfig?.includeOriginal ?? true}
                    onChangeIncludeOriginal={(val) => {
                        const currentFrames = framesConfig || { frames: [] };
                        framesHook.updateMultipleFramesSlices({
                            ...currentFrames,
                            includeOriginal: val
                        }, mode);
                    }}
                    assetName={framesHook.framesAssetName}
                    onChangeAssetName={(name) => {
                        framesHook.setFramesAssetName(name);
                        const currentFrames = framesConfig || { frames: [] };
                        framesHook.updateMultipleFramesSlices({
                            ...currentFrames,
                            assetName: name
                        }, mode);
                    }}
                    getFullSizeImage={getFullSizeImage}
                    onCopyImageToClipboard={onCopyImageToClipboard}
                    onDownloadImage={onDownloadImage}
                    addToast={addToast}
                    onSendToNote={exportHook.handleSendFramesToNote}
                />
            )}

            {/* Batch Processing Panel in Batch Mode */}
            {mode === 'batch' && (
                <BatchProcessingPanel
                    nodeId={node.id}
                    batchFiles={batchHook.batchFiles}
                    selectedReferenceIndex={batchHook.selectedRefIndex}
                    onSelectReferenceIndex={batchHook.handleSelectReferenceIndex}
                    onNavigatePrev={() => batchHook.handleNavigateBatch('prev')}
                    onNavigateNext={() => batchHook.handleNavigateBatch('next')}
                    onRemoveBatchFile={batchHook.handleRemoveBatchFile}
                    onClearBatch={batchHook.handleClearBatch}
                    onAddBatchFiles={(files) => batchHook.loadMultipleFiles(files)}
                    subMode={batchHook.batchSubMode}
                    onChangeSubMode={batchHook.handleBatchSubModeChange}
                    includeOriginal={batchHook.includeOriginal}
                    onChangeIncludeOriginal={batchHook.handleIncludeOriginalChange}
                    assetName={batchHook.assetName}
                    onChangeAssetName={batchHook.handleAssetNameChange}
                    individualGridSettings={batchHook.individualGridSettings}
                    onChangeIndividualGridSettings={batchHook.handleIndividualGridSettingsChange}
                    onApplyCurrentGridToAll={batchHook.handleApplyCurrentGridToAll}
                    onResetGridForAll={batchHook.handleResetGridForAll}
                    onResetGridForCurrent={batchHook.handleResetGridForCurrent}
                    cropRect={cropGridHook.activeCropRect}
                    gridConfig={cropGridHook.activeGridConfig}
                    isProcessing={batchHook.isBatchProcessing}
                    progress={batchHook.batchProgress}
                    onStartBatchProcess={batchHook.handleStartBatchProcess}
                    onCancelBatchProcess={batchHook.handleCancelBatchProcess}
                    batchResult={batchHook.batchResult}
                    onDownloadZip={batchHook.handleDownloadZip}
                    onOpenArchiveFolder={() => batchHook.setIsArchiveFolderModalOpen(true)}
                    addToast={addToast}
                    upstreamImagesCount={importHook.upstreamImages.length}
                    onSyncFromUpstream={() => batchHook.syncFromUpstream(importHook.upstreamImages)}
                    onPasteClipboard={importHook.handlePasteFromClipboard}
                />
            )}

            {/* Controls Section */}
            <ImageControlsSection
                showControls={showControls}
                isBatchMode={isBatchMode}
                setIsBatchMode={setIsBatchMode}
                t={t}
                onProcessImage={() => onProcessImage(node.id)}
                isProcessingImage={isProcessingImage}
                image={image}
                transformingRatio={importHook.transformingRatio}
                onOpenInNode={exportHook.handleOpenInNode}
                onImageToText={() => onImageToText && onImageToText(node.id)}
                isAnalyzingImage={isAnalyzingImage}
                onRatioExpand={importHook.handleRatioExpand}
                onOpenRasterEditor={() => importHook.setIsEditorOpen(true)}
                mode={mode}
                metadataPrompt={importHook.metadataPrompt}
                onUseMetadataPrompt={() => {
                    handleValueUpdate({ prompt: `${prompt ? prompt + ', ' : ''}${importHook.metadataPrompt}` });
                    importHook.setMetadataPrompt(null);
                }}
                deselectAllNodes={deselectAllNodes}
                prompt={prompt || ''}
                onPromptChange={(val) => handleValueUpdate({ prompt: val })}
            />

            {/* Archive Folder Inspector Modal */}
            <ArchiveFolderModal
                isOpen={batchHook.isArchiveFolderModalOpen}
                onClose={() => batchHook.setIsArchiveFolderModalOpen(false)}
                batchResult={batchHook.batchResult}
                onDownloadZip={batchHook.handleDownloadZip}
                addToast={addToast}
            />
        </div>
    );
};
