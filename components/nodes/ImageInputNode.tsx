import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import type { NodeContentProps } from '../../types';
import { NodeType } from '../../types';
import { readPromptFromPNG } from '../../utils/pngMetadata';
import ImageEditorModal from '../ImageEditorModal';
import { generateThumbnail, cropImageNormalized, sliceImageGrid, getImageTimestampString, getIntervalsFromDividers, getEffectiveDividers } from '../../utils/imageUtils';
import { useAppContext } from '../../contexts/AppContext';
import { expandImageAspectRatio } from '../../services/imageActions';
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
    BatchResultData, 
    BatchResultFolder, 
    BatchResultFileItem, 
    ImageBatchItem, 
    ImageBatchSubMode, 
    ImageInputCropRect, 
    ImageInputGridConfig, 
    ImageInputMode, 
    ImageInputValue, 
    ImageInputFramesConfig, 
    ImageInputFrameItem 
} from './image-input/types';

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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const batchFileInputRef = useRef<HTMLInputElement>(null);
    const [metadataPrompt, setMetadataPrompt] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    
    // State for aspect ratio transformation loading
    const [transformingRatio, setTransformingRatio] = useState<string | null>(null);
    const [isSlicing, setIsSlicing] = useState(false);

    // State for original image dimensions
    const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

    // Incoming stream from upstream connections (e.g. AI Image Editor in sequence mode)
    const upstreamData = useMemo(() => {
        if (!getUpstreamNodeValues) return [];
        return getUpstreamNodeValues(node.id, 'image', undefined, false);
    }, [getUpstreamNodeValues, node.id]);

    const upstreamImages: string[] = useMemo(() => {
        if (!Array.isArray(upstreamData) || upstreamData.length === 0) return [];
        const result: string[] = [];
        upstreamData.forEach(item => {
            if (typeof item === 'string' && item.startsWith('data:image')) {
                result.push(item);
            } else if (typeof item === 'object' && item !== null && item.base64ImageData) {
                result.push(`data:${item.mimeType || 'image/png'};base64,${item.base64ImageData}`);
            }
        });
        return result;
    }, [upstreamData]);

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

    // State for multiple frames mode
    const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(() => framesConfig?.selectedFrameIndex ?? 0);
    const [framesAssetName, setFramesAssetName] = useState<string>(() => framesConfig?.assetName || 'Asset_Frames');

    // State for batch processing mode
    const [batchFiles, setBatchFiles] = useState<ImageBatchItem[]>(() => initialBatchFiles);
    const [selectedRefIndex, setSelectedRefIndex] = useState<number>(0);
    const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentName: string; percent: number } | null>(null);
    const [batchResult, setBatchResult] = useState<BatchResultData | null>(null);
    const [isArchiveFolderModalOpen, setIsArchiveFolderModalOpen] = useState<boolean>(false);
    const [isNodeHovered, setIsNodeHovered] = useState<boolean>(false);
    const nodeContainerRef = useRef<HTMLDivElement>(null);
    const abortBatchRef = useRef<boolean>(false);

    // Synchronize batchFiles from node value if changed externally (e.g. sent from TaskQueue Batch Job)
    useEffect(() => {
        if (parsedValue.batchFiles && Array.isArray(parsedValue.batchFiles) && parsedValue.batchFiles.length > 0) {
            setBatchFiles(parsedValue.batchFiles);
            batchFilesRef.current = parsedValue.batchFiles;
        }
    }, [parsedValue.batchFiles]);

    // Direct React state for batchSubMode to guarantee instant responsiveness and zero race conditions
    const [batchSubMode, setBatchSubMode] = useState<ImageBatchSubMode>(() => {
        return batchConfig?.subMode || 'crop';
    });

    const [includeOriginal, setIncludeOriginal] = useState<boolean>(() => {
        return batchConfig?.includeOriginal ?? true;
    });

    const [assetName, setAssetName] = useState<string>(() => {
        return batchConfig?.assetName || 'Asset_Name';
    });

    const [gridAssetName, setGridAssetName] = useState<string>(() => {
        return grid?.assetName || 'Asset_Name';
    });

    const [individualGridSettings, setIndividualGridSettings] = useState<boolean>(() => {
        return batchConfig?.individualGridSettings ?? false;
    });

    // Local state and debouncing for border width (px) input
    const [localBorderWidth, setLocalBorderWidth] = useState<string>(() => String(grid?.borderWidth ?? 24));
    const borderDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const externalVal = grid?.borderWidth ?? 24;
        setLocalBorderWidth(String(externalVal));
    }, [grid?.borderWidth]);

    useEffect(() => {
        if (grid?.assetName !== undefined && grid.assetName !== gridAssetName) {
            setGridAssetName(grid.assetName);
        }
    }, [grid?.assetName]);

    // Synchronize batchSubMode, includeOriginal, assetName, individualGridSettings if external node value changed
    useEffect(() => {
        if (batchConfig?.subMode && batchConfig.subMode !== batchSubMode) {
            setBatchSubMode(batchConfig.subMode);
        }
        if (batchConfig?.includeOriginal !== undefined && batchConfig.includeOriginal !== includeOriginal) {
            setIncludeOriginal(batchConfig.includeOriginal);
        }
        if (batchConfig?.assetName !== undefined && batchConfig.assetName !== assetName) {
            setAssetName(batchConfig.assetName);
        }
        if (batchConfig?.individualGridSettings !== undefined && batchConfig.individualGridSettings !== individualGridSettings) {
            setIndividualGridSettings(batchConfig.individualGridSettings);
        }
    }, [batchConfig?.subMode, batchConfig?.includeOriginal, batchConfig?.assetName, batchConfig?.individualGridSettings]);

    const fullResImage = getFullSizeImage(node.id, 0);

    // Calculate original dimensions from full resolution image if available
    useEffect(() => {
        const srcToCheck = fullResImage || image;
        if (!srcToCheck) {
            setOriginalDimensions(null);
            return;
        }

        const img = new Image();
        img.onload = () => {
            setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = srcToCheck;
    }, [fullResImage, image]);

    const parsedValueRef = useRef<ImageInputValue>(parsedValue);
    useEffect(() => {
        parsedValueRef.current = {
            ...parsedValueRef.current,
            ...parsedValue
        };
    }, [parsedValue]);

    // Refs for synchronization in callbacks
    const batchFilesRef = useRef<ImageBatchItem[]>(batchFiles);
    useEffect(() => {
        batchFilesRef.current = batchFiles;
    }, [batchFiles]);

    const selectedRefIndexRef = useRef<number>(selectedRefIndex);
    useEffect(() => {
        selectedRefIndexRef.current = selectedRefIndex;
    }, [selectedRefIndex]);

    const individualGridSettingsRef = useRef<boolean>(individualGridSettings);
    useEffect(() => {
        individualGridSettingsRef.current = individualGridSettings;
    }, [individualGridSettings]);

    // Active configurations for the current preview image (taking individual settings into account)
    const activeGridConfig: ImageInputGridConfig = useMemo(() => {
        const rootGrid = parsedValueRef.current.grid || grid;
        const globalCols = rootGrid?.cols || 2;
        const globalRows = rootGrid?.rows || 1;
        const baseGrid: ImageInputGridConfig = rootGrid || { cols: globalCols, rows: globalRows, bounds: { x: 0, y: 0, width: 1, height: 1 } };

        if (mode === 'batch' && individualGridSettings && batchFiles[selectedRefIndex]?.gridConfig) {
            const itemGrid = batchFiles[selectedRefIndex].gridConfig!;
            return {
                ...baseGrid,
                ...itemGrid,
                cols: globalCols,
                rows: globalRows,
                bounds: itemGrid.bounds || baseGrid.bounds || { x: 0, y: 0, width: 1, height: 1 }
            };
        }
        return {
            ...baseGrid,
            cols: globalCols,
            rows: globalRows,
            bounds: baseGrid.bounds || { x: 0, y: 0, width: 1, height: 1 }
        };
    }, [mode, individualGridSettings, batchFiles, selectedRefIndex, grid]);

    const activeCropRect: ImageInputCropRect = useMemo(() => {
        const baseCrop = parsedValueRef.current.cropRect || cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
        if (mode === 'batch' && individualGridSettings && batchFiles[selectedRefIndex]?.cropRect) {
            return batchFiles[selectedRefIndex].cropRect!;
        }
        return baseCrop;
    }, [mode, individualGridSettings, batchFiles, selectedRefIndex, cropRect]);

    // Unique operation sequence token to prevent stale async slicing results from overriding current state
    const operationIdRef = useRef<number>(0);

    const handleValueUpdate = useCallback((updates: Partial<ImageInputValue>) => {
        const updated: ImageInputValue = {
            ...parsedValueRef.current,
            ...updates
        };
        parsedValueRef.current = updated;
        onValueChange(node.id, JSON.stringify(updated));
    }, [onValueChange, node.id]);

    // Update single crop slice at full resolution
    const updateSingleCropSlice = useCallback(async (
        rect: ImageInputCropRect,
        explicitMode?: ImageInputMode,
        overrideSrc?: string,
        targetRefIndex?: number,
        overrideThumbnail?: string
    ) => {
        const masterSrc = overrideSrc || getFullSizeImage(node.id, 0) || image;
        if (!masterSrc) return;

        const thisOpId = ++operationIdRef.current;

        try {
            const highResCrop = await cropImageNormalized(masterSrc, rect);
            if (thisOpId !== operationIdRef.current) return;

            setFullSizeImage(node.id, 1, highResCrop);
            const thumb = await generateThumbnail(highResCrop, 256, 256);
            if (thisOpId !== operationIdRef.current) return;

            const currentMode = explicitMode || mode;
            let currentBatch = batchFilesRef.current;
            const targetIdx = targetRefIndex !== undefined ? targetRefIndex : selectedRefIndexRef.current;

            if (currentMode === 'batch' && currentBatch.length > 0) {
                if (individualGridSettingsRef.current) {
                    currentBatch = currentBatch.map((bf, idx) => {
                        if (idx === targetIdx) {
                            return { ...bf, cropRect: { ...rect } };
                        }
                        return bf;
                    });
                } else {
                    currentBatch = currentBatch.map(bf => ({
                        ...bf,
                        cropRect: { ...rect }
                    }));
                }
                batchFilesRef.current = currentBatch;
                setBatchFiles(currentBatch);
            }

            const updates: Partial<ImageInputValue> = {
                cropRect: rect,
                croppedImage: thumb,
                ...(overrideThumbnail ? { image: overrideThumbnail } : {}),
                ...(currentMode === 'batch' ? { batchFiles: currentBatch } : {})
            };
            if (explicitMode) {
                updates.mode = explicitMode;
            }
            handleValueUpdate(updates);
        } catch (e) {
            console.error('Error cropping image:', e);
        }
    }, [getFullSizeImage, node.id, image, setFullSizeImage, handleValueUpdate, mode]);

    // Update grid slices at full resolution
    const updateGridSlices = useCallback(async (
        gridConfig: ImageInputGridConfig,
        explicitMode?: ImageInputMode,
        overrideSrc?: string,
        targetRefIndex?: number,
        overrideThumbnail?: string
    ) => {
        const masterSrc = overrideSrc || getFullSizeImage(node.id, 0) || image;
        if (!masterSrc) return;

        const thisOpId = ++operationIdRef.current;
        setIsSlicing(true);
        try {
            // cols and rows are global across all images
            const rootGrid = parsedValueRef.current.grid || grid;
            const cols = Math.max(1, gridConfig.cols || rootGrid?.cols || 2);
            const rows = Math.max(1, gridConfig.rows || rootGrid?.rows || 1);
            const bounds = gridConfig.bounds || rootGrid?.bounds || { x: 0, y: 0, width: 1, height: 1 };
            const borderConfig = {
                enableBorder: gridConfig.enableBorder !== undefined ? gridConfig.enableBorder : rootGrid?.enableBorder,
                borderWidth: gridConfig.borderWidth !== undefined ? gridConfig.borderWidth : rootGrid?.borderWidth,
                borderMode: gridConfig.borderMode !== undefined ? gridConfig.borderMode : rootGrid?.borderMode,
                customDividers: gridConfig.customDividers !== undefined ? gridConfig.customDividers : rootGrid?.customDividers,
                colDividers: gridConfig.colDividers !== undefined ? gridConfig.colDividers : rootGrid?.colDividers,
                rowDividers: gridConfig.rowDividers !== undefined ? gridConfig.rowDividers : rootGrid?.rowDividers
            };

            const fullConfig: ImageInputGridConfig = {
                ...rootGrid,
                ...gridConfig,
                ...borderConfig,
                cols,
                rows,
                bounds,
                assetName: gridConfig.assetName || rootGrid?.assetName || gridAssetName || 'Asset_Name'
            };

            const { slices, thumbs } = await sliceImageGrid(masterSrc, cols, rows, bounds, borderConfig);
            if (thisOpId !== operationIdRef.current) return;

            // Store full-res slices in cache frames 1..N
            slices.forEach((slice, idx) => {
                setFullSizeImage(node.id, idx + 1, slice);
            });

            const currentMode = explicitMode || mode;
            let currentBatch = batchFilesRef.current;
            const targetIdx = targetRefIndex !== undefined ? targetRefIndex : selectedRefIndexRef.current;

            if (currentMode === 'batch' && currentBatch.length > 0) {
                if (individualGridSettingsRef.current) {
                    currentBatch = currentBatch.map((bf, idx) => {
                        if (idx === targetIdx) {
                            return { ...bf, gridConfig: { ...fullConfig } };
                        }
                        return bf;
                    });
                } else {
                    currentBatch = currentBatch.map(bf => ({
                        ...bf,
                        gridConfig: { ...fullConfig }
                    }));
                }
                batchFilesRef.current = currentBatch;
                setBatchFiles(currentBatch);
            }

            const updates: Partial<ImageInputValue> = {
                grid: fullConfig,
                extractedImages: thumbs,
                ...(overrideThumbnail ? { image: overrideThumbnail } : {}),
                ...(currentMode === 'batch' ? { batchFiles: currentBatch } : {})
            };
            if (explicitMode) {
                updates.mode = explicitMode;
            }
            handleValueUpdate(updates);
        } catch (e) {
            console.error('Error slicing grid:', e);
        } finally {
            if (thisOpId === operationIdRef.current) {
                setIsSlicing(false);
            }
        }
    }, [getFullSizeImage, node.id, image, setFullSizeImage, handleValueUpdate, mode, grid, gridAssetName]);

    const updateMultipleFramesSlices = useCallback(async (
        config: ImageInputFramesConfig,
        explicitMode?: ImageInputMode,
        overrideSrc?: string
    ) => {
        const masterSrc = overrideSrc || getFullSizeImage(node.id, 0) || image;
        if (!masterSrc) return;

        const thisOpId = ++operationIdRef.current;
        setIsSlicing(true);
        try {
            const currentFrames = config.frames || [];
            if (currentFrames.length === 0) {
                handleValueUpdate({
                    framesConfig: config,
                    frameImages: [],
                    ...(explicitMode ? { mode: explicitMode } : {})
                });
                return;
            }

            const subSlicesToCrop: ImageInputCropRect[] = [];
            currentFrames.forEach((frame) => {
                const cols = Math.max(1, Math.min(20, frame.cols || 1));
                const rows = Math.max(1, Math.min(20, frame.rows || 1));
                const effectiveColDivs = getEffectiveDividers(cols, frame.colDividers);
                const effectiveRowDivs = getEffectiveDividers(rows, frame.rowDividers);
                const colIntervals = getIntervalsFromDividers(effectiveColDivs);
                const rowIntervals = getIntervalsFromDividers(effectiveRowDivs);

                for (let r = 0; r < rows; r++) {
                    const rowInt = rowIntervals[r] || { start: r / rows, end: (r + 1) / rows };
                    const cellY = frame.rect.y + rowInt.start * frame.rect.height;
                    const cellHeight = (rowInt.end - rowInt.start) * frame.rect.height;

                    for (let c = 0; c < cols; c++) {
                        const colInt = colIntervals[c] || { start: c / cols, end: (c + 1) / cols };
                        const cellX = frame.rect.x + colInt.start * frame.rect.width;
                        const cellWidth = (colInt.end - colInt.start) * frame.rect.width;

                        subSlicesToCrop.push({
                            x: cellX,
                            y: cellY,
                            width: cellWidth,
                            height: cellHeight
                        });
                    }
                }
            });

            const cropPromises = subSlicesToCrop.map(r => cropImageNormalized(masterSrc, r));
            const highResCrops = await Promise.all(cropPromises);
            if (thisOpId !== operationIdRef.current) return;

            highResCrops.forEach((crop, idx) => {
                setFullSizeImage(node.id, idx + 1, crop);
            });

            const thumbPromises = highResCrops.map(crop => generateThumbnail(crop, 256, 256));
            const thumbs = await Promise.all(thumbPromises);
            if (thisOpId !== operationIdRef.current) return;

            const fullConfig: ImageInputFramesConfig = {
                ...config,
                assetName: config.assetName || framesAssetName || 'Asset_Frames'
            };

            const updates: Partial<ImageInputValue> = {
                framesConfig: fullConfig,
                frameImages: thumbs
            };
            if (explicitMode) {
                updates.mode = explicitMode;
            }
            handleValueUpdate(updates);
        } catch (e) {
            console.error('Error slicing multiple frames:', e);
        } finally {
            if (thisOpId === operationIdRef.current) {
                setIsSlicing(false);
            }
        }
    }, [getFullSizeImage, node.id, image, setFullSizeImage, handleValueUpdate, framesAssetName]);

    const prevMasterSrcRef = useRef<string | null>(null);

    // Initial slice loading and automatic update when master image is changed / uploaded
    useEffect(() => {
        const masterSrc = fullResImage || image;
        if (!masterSrc) {
            prevMasterSrcRef.current = null;
            return;
        }

        const isNewImage = prevMasterSrcRef.current !== null && prevMasterSrcRef.current !== masterSrc;
        const isFirstLoad = prevMasterSrcRef.current === null;
        prevMasterSrcRef.current = masterSrc;

        // For batch mode, index switching and batch uploads handle their own explicit slicing
        if (mode === 'batch') {
            return;
        }

        if (isNewImage) {
            if (mode === 'single') {
                const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                updateSingleCropSlice(activeCrop, undefined, masterSrc);
            } else if (mode === 'grid') {
                const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                updateGridSlices(activeGrid, undefined, masterSrc);
            } else if (mode === 'frames') {
                const activeFrames = framesConfig || { frames: [{ id: 'frame-1', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, name: 'Frame 1' }], selectedFrameIndex: 0 };
                updateMultipleFramesSlices(activeFrames, undefined, masterSrc);
            }
        } else if (isFirstLoad) {
            if (mode === 'single' && !croppedImage) {
                const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                updateSingleCropSlice(activeCrop, undefined, masterSrc);
            } else if (mode === 'grid' && (!extractedImages || extractedImages.length === 0)) {
                const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                updateGridSlices(activeGrid, undefined, masterSrc);
            } else if (mode === 'frames' && (!frameImages || frameImages.length === 0)) {
                const activeFrames = framesConfig || { frames: [{ id: 'frame-1', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, name: 'Frame 1' }], selectedFrameIndex: 0 };
                updateMultipleFramesSlices(activeFrames, undefined, masterSrc);
            }
        }
    }, [fullResImage, image, mode, updateSingleCropSlice, updateGridSlices, updateMultipleFramesSlices, cropRect, grid, framesConfig, croppedImage, extractedImages, frameImages]);

    const handleImageChange = async (dataUrl: string) => {
        const promptFromMeta = await readPromptFromPNG(dataUrl);
        setMetadataPrompt(promptFromMeta);
        
        // Generate thumbnail to keep node.value small
        const thumbnail = await generateThumbnail(dataUrl, 256, 256);
        
        // Save high-res to cache (index 0)
        setFullSizeImage(node.id, 0, dataUrl);
        
        // Refresh slices if in single, grid or frames mode
        if (mode === 'single') {
            const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            const highResCrop = await cropImageNormalized(dataUrl, activeCrop);
            setFullSizeImage(node.id, 1, highResCrop);
            const cropThumb = await generateThumbnail(highResCrop, 256, 256);
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
            const subSlicesToCrop: ImageInputCropRect[] = [];
            (activeFrames.frames || []).forEach(f => {
                const cols = Math.max(1, Math.min(20, f.cols || 1));
                const rows = Math.max(1, Math.min(20, f.rows || 1));
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        subSlicesToCrop.push({
                            x: f.rect.x + (c / cols) * f.rect.width,
                            y: f.rect.y + (r / rows) * f.rect.height,
                            width: f.rect.width / cols,
                            height: f.rect.height / rows
                        });
                    }
                }
            });
            const cropPromises = subSlicesToCrop.map(r => cropImageNormalized(dataUrl, r));
            const highResCrops = await Promise.all(cropPromises);
            highResCrops.forEach((crop, idx) => setFullSizeImage(node.id, idx + 1, crop));
            const thumbPromises = highResCrops.map(crop => generateThumbnail(crop, 256, 256));
            const thumbs = await Promise.all(thumbPromises);
            handleValueUpdate({ image: thumbnail, frameImages: thumbs });
        } else {
            handleValueUpdate({ image: thumbnail });
        }
    };

    // Batch processing handlers
    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const loadMultipleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (fileArray.length === 0) return;

        const newItems: ImageBatchItem[] = [];
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            try {
                const dataUrl = await readFileAsDataURL(file);
                let thumbnailUrl: string | undefined;
                try {
                    thumbnailUrl = await generateThumbnail(dataUrl, 128, 128);
                } catch {
                    thumbnailUrl = dataUrl;
                }
                newItems.push({
                    id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
                    name: file.name,
                    dataUrl,
                    thumbnailUrl,
                    size: file.size
                });
            } catch (e) {
                console.error('Failed to read file:', file.name, e);
            }
        }

        if (newItems.length === 0) return;

        const isInitialBatch = batchFiles.length === 0;
        const updatedFiles = [...batchFiles, ...newItems];
        setBatchFiles(updatedFiles);
        batchFilesRef.current = updatedFiles;

        // Populate full size cache slots for each item in the batch
        updatedFiles.forEach((item, idx) => {
            if (item.dataUrl) {
                setFullSizeImage(node.id, idx, item.dataUrl);
            }
        });

        // If batch was empty or no image yet, configure the first file as the active reference template
        if (isInitialBatch || !image) {
            setSelectedRefIndex(0);
            selectedRefIndexRef.current = 0;
            const firstItem = newItems[0];
            setFullSizeImage(node.id, 0, firstItem.dataUrl);
            const thumb = await generateThumbnail(firstItem.dataUrl, 256, 256);
            
            if (mode === 'batch') {
                if (batchSubMode === 'crop') {
                    const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                    updateSingleCropSlice(activeCrop, 'batch', firstItem.dataUrl);
                } else {
                    const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                    updateGridSlices(activeGrid, 'batch', firstItem.dataUrl);
                }
                handleValueUpdate({ image: thumb, mode: 'batch', batchFiles: updatedFiles });
            } else {
                handleValueUpdate({ image: thumb, batchFiles: updatedFiles });
            }
        } else {
            handleValueUpdate({ batchFiles: updatedFiles });
        }

        if (addToast) {
            addToast(`Загружено ${newItems.length} изображений`, 'success');
        }
    };

    const handlePasteFromClipboard = useCallback(async () => {
        try {
            const items = await navigator.clipboard.read();
            const imageFiles: File[] = [];
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const ext = blob.type.split('/')[1] || 'png';
                        const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type: blob.type });
                        imageFiles.push(file);
                    }
                }
            }
            if (imageFiles.length > 0) {
                if (mode === 'batch' || mode === 'full' || imageFiles.length > 1 || batchFilesRef.current.length > 0) {
                    await loadMultipleFiles(imageFiles);
                } else {
                    onPasteImage(node.id, imageFiles[0]);
                }
                return;
            }

            const text = await navigator.clipboard.readText();
            if (text && text.startsWith('data:image')) {
                const res = await fetch(text);
                const blob = await res.blob();
                const file = new File([blob], `pasted_data_${Date.now()}.png`, { type: blob.type || 'image/png' });
                if (mode === 'batch' || mode === 'full' || batchFilesRef.current.length > 0) {
                    await loadMultipleFiles([file]);
                } else {
                    onPasteImage(node.id, file);
                }
                return;
            }
            if (addToast) addToast('В буфере обмена нет изображений', 'info');
        } catch (err) {
            console.error('Clipboard paste failed:', err);
            if (addToast) addToast('Не удалось прочитать изображение из буфера', 'error');
        }
    }, [mode, loadMultipleFiles, onPasteImage, node.id, addToast]);

    const handleSelectReferenceIndex = async (index: number) => {
        if (index < 0 || index >= batchFilesRef.current.length) return;
        selectedRefIndexRef.current = index;
        setSelectedRefIndex(index);
        const item = batchFilesRef.current[index];
        if (!item) return;

        setFullSizeImage(node.id, 0, item.dataUrl);
        const thumb = await generateThumbnail(item.dataUrl, 256, 256);

        if (mode === 'full') {
            handleValueUpdate({
                image: thumb,
                batchFiles: batchFilesRef.current
            });
            return;
        }

        const currentRootGrid = parsedValueRef.current.grid || grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
        const globalCols = currentRootGrid.cols || 2;
        const globalRows = currentRootGrid.rows || 1;

        if (batchSubMode === 'crop') {
            const currentRootCrop = parsedValueRef.current.cropRect || cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            const activeCrop = (individualGridSettingsRef.current && item.cropRect) 
                ? item.cropRect 
                : currentRootCrop;
            await updateSingleCropSlice(activeCrop, 'batch', item.dataUrl, index, thumb);
        } else {
            const activeGrid: ImageInputGridConfig = (individualGridSettingsRef.current && item.gridConfig)
                ? {
                    ...currentRootGrid,
                    ...item.gridConfig,
                    cols: globalCols,
                    rows: globalRows,
                    bounds: item.gridConfig.bounds || currentRootGrid.bounds || { x: 0, y: 0, width: 1, height: 1 }
                }
                : {
                    ...currentRootGrid,
                    cols: globalCols,
                    rows: globalRows,
                    bounds: currentRootGrid.bounds || { x: 0, y: 0, width: 1, height: 1 }
                };
            await updateGridSlices(activeGrid, 'batch', item.dataUrl, index, thumb);
        }
    };

    const handleNavigateBatch = useCallback((direction: 'prev' | 'next') => {
        const total = batchFilesRef.current.length;
        if (total <= 1) return;
        const current = selectedRefIndexRef.current;
        const nextIndex = direction === 'prev'
            ? (current - 1 + total) % total
            : (current + 1) % total;
        handleSelectReferenceIndex(nextIndex);
    }, []);

    // Keyboard Arrow navigation (Left / Right arrow keys) for batch images in both Batch and Full modes
    useEffect(() => {
        if ((mode !== 'batch' && mode !== 'full') || batchFiles.length <= 1) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing inside text fields, textareas, or contentEditable elements
            const target = e.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
                    return;
                }
            }

            // Only respond if the node is hovered, or focused, or selected
            const isInside = nodeContainerRef.current?.contains(document.activeElement);
            const isSelected = context?.selectedNodeIds?.includes(node.id);
            const shouldHandle = isNodeHovered || isInside || isSelected;

            if (!shouldHandle) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                handleNavigateBatch('prev');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                handleNavigateBatch('next');
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [mode, batchFiles.length, isNodeHovered, context?.selectedNodeIds, node.id, handleNavigateBatch]);

    const handleRemoveBatchFile = (index: number) => {
        const updated = batchFiles.filter((_, i) => i !== index);
        setBatchFiles(updated);
        batchFilesRef.current = updated;
        if (updated.length === 0) {
            setSelectedRefIndex(0);
            selectedRefIndexRef.current = 0;
            handleValueUpdate({ batchFiles: [] });
        } else {
            const nextIdx = selectedRefIndex >= updated.length ? updated.length - 1 : selectedRefIndex;
            setSelectedRefIndex(nextIdx);
            selectedRefIndexRef.current = nextIdx;
            const activeItem = updated[nextIdx];
            if (activeItem) {
                setFullSizeImage(node.id, 0, activeItem.dataUrl);
                generateThumbnail(activeItem.dataUrl, 256, 256).then(thumb => {
                    handleValueUpdate({ image: thumb, batchFiles: updated });
                });
            } else {
                handleValueUpdate({ batchFiles: updated });
            }
        }
    };

    const handleClearBatch = () => {
        setBatchFiles([]);
        batchFilesRef.current = [];
        setSelectedRefIndex(0);
        selectedRefIndexRef.current = 0;
        setBatchResult(null);
        setBatchProgress(null);
        handleValueUpdate({ batchFiles: [] });
        if (addToast) addToast('Пакет изображений очищен', 'info');
    };

    const syncFromUpstream = useCallback(async (forcedImages?: string[]) => {
        const imgs = forcedImages || upstreamImages;
        if (imgs.length === 0) return;

        const newItems: ImageBatchItem[] = await Promise.all(imgs.map(async (dataUrl, i) => {
            let thumbnailUrl: string | undefined;
            try {
                thumbnailUrl = await generateThumbnail(dataUrl, 128, 128);
            } catch {
                thumbnailUrl = dataUrl;
            }
            return {
                id: `upstream-batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
                name: `Sequence_Frame_${String(i + 1).padStart(3, '0')}.png`,
                dataUrl,
                thumbnailUrl,
                size: Math.round(dataUrl.length * 0.75)
            };
        }));

        setBatchFiles(newItems);
        newItems.forEach((item, i) => {
            setFullSizeImage(node.id, i, item.dataUrl);
        });
        setSelectedRefIndex(0);
        const firstItem = newItems[0];
        setFullSizeImage(node.id, 0, firstItem.dataUrl);
        const thumb = await generateThumbnail(firstItem.dataUrl, 256, 256);

        if (batchSubMode === 'crop') {
            const activeCrop = parsedValueRef.current.cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            updateSingleCropSlice(activeCrop, 'batch', firstItem.dataUrl);
        } else {
            const activeGrid = parsedValueRef.current.grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
            updateGridSlices(activeGrid, 'batch', firstItem.dataUrl);
        }
        handleValueUpdate({ image: thumb, mode: 'batch', batchFiles: newItems });

        if (addToast) {
            addToast(`Загружено ${newItems.length} кадров из цепи нод в пакетный режим`, 'success');
        }
    }, [upstreamImages, setFullSizeImage, node.id, batchSubMode, updateSingleCropSlice, updateGridSlices, handleValueUpdate, addToast]);

    const prevUpstreamSigRef = useRef<string>('');
    useEffect(() => {
        const sig = upstreamImages.map(img => img.slice(0, 40) + img.length).join('|');
        if (sig === prevUpstreamSigRef.current) return;
        
        prevUpstreamSigRef.current = sig;

        if (upstreamImages.length > 0) {
            if (mode === 'batch' || upstreamImages.length > 1) {
                syncFromUpstream(upstreamImages);
            } else if (upstreamImages.length === 1) {
                handleImageChange(upstreamImages[0]);
            }
        }
    }, [upstreamImages, mode, syncFromUpstream, handleImageChange]);

    const handleBatchSubModeChange = (newSubMode: ImageBatchSubMode) => {
        setBatchSubMode(newSubMode);
        const currentBatchConfig = parsedValueRef.current.batchConfig || {};
        const updatedBatchConfig = {
            ...currentBatchConfig,
            subMode: newSubMode,
            includeOriginal,
            assetName,
            individualGridSettings
        };

        handleValueUpdate({
            batchConfig: updatedBatchConfig
        });

        const currentMaster = batchFiles[selectedRefIndex]?.dataUrl || getFullSizeImage(node.id, 0) || image;
        if (currentMaster) {
            if (newSubMode === 'crop') {
                const activeCrop = parsedValueRef.current.cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                updateSingleCropSlice(activeCrop, 'batch', currentMaster);
            } else {
                const activeGrid = parsedValueRef.current.grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                updateGridSlices(activeGrid, 'batch', currentMaster);
            }
        }
    };

    const handleIncludeOriginalChange = (newInclude: boolean) => {
        setIncludeOriginal(newInclude);
        const currentBatchConfig = parsedValueRef.current.batchConfig || { subMode: batchSubMode, assetName, individualGridSettings };
        const updatedBatchConfig = {
            ...currentBatchConfig,
            includeOriginal: newInclude,
            assetName,
            individualGridSettings
        };
        handleValueUpdate({
            batchConfig: updatedBatchConfig
        });
    };

    const handleAssetNameChange = (newAssetName: string) => {
        setAssetName(newAssetName);
        const currentBatchConfig = parsedValueRef.current.batchConfig || { subMode: batchSubMode, includeOriginal, individualGridSettings };
        const updatedBatchConfig = {
            ...currentBatchConfig,
            assetName: newAssetName,
            individualGridSettings
        };
        handleValueUpdate({
            batchConfig: updatedBatchConfig
        });
    };

    const handleGridAssetNameChange = (newAssetName: string) => {
        setGridAssetName(newAssetName);
        const currentGrid = parsedValueRef.current.grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
        const updatedGrid: ImageInputGridConfig = {
            ...currentGrid,
            assetName: newAssetName
        };
        handleValueUpdate({
            grid: updatedGrid
        });
    };

    const handleIndividualGridSettingsChange = (newIndividual: boolean) => {
        setIndividualGridSettings(newIndividual);
        const currentBatchConfig = parsedValueRef.current.batchConfig || { subMode: batchSubMode, includeOriginal, assetName };
        const updatedBatchConfig = {
            ...currentBatchConfig,
            individualGridSettings: newIndividual
        };
        handleValueUpdate({
            batchConfig: updatedBatchConfig
        });
        if (addToast) {
            addToast(
                newIndividual
                    ? 'Включена индивидуальная настройка сетки для каждого фото'
                    : 'Отключена индивидуальная настройка (используется общая сетка)',
                'info'
            );
        }
    };

    const handleApplyCurrentGridToAll = () => {
        const currentActiveGrid = activeGridConfig;
        const updatedBatch = batchFiles.map(item => ({
            ...item,
            gridConfig: { ...currentActiveGrid }
        }));
        batchFilesRef.current = updatedBatch;
        setBatchFiles(updatedBatch);
        handleValueUpdate({
            batchFiles: updatedBatch,
            grid: currentActiveGrid
        });
        if (addToast) {
            addToast(`Текущие границы и разделители применены ко всем ${updatedBatch.length} фото в пакете`, 'success');
        }
    };

    const handleResetGridForAll = () => {
        const cols = grid?.cols || 2;
        const rows = grid?.rows || 1;
        const uniformGrid: ImageInputGridConfig = {
            ...(grid || { cols: 2, rows: 1 }),
            cols,
            rows,
            bounds: { x: 0, y: 0, width: 1, height: 1 },
            customDividers: false,
            colDividers: undefined,
            rowDividers: undefined
        };
        const updatedBatch = batchFiles.map(item => ({
            ...item,
            gridConfig: { ...uniformGrid }
        }));
        batchFilesRef.current = updatedBatch;
        setBatchFiles(updatedBatch);
        const currentMaster = batchFiles[selectedRefIndex]?.dataUrl || getFullSizeImage(node.id, 0) || image;
        if (currentMaster) {
            updateGridSlices(uniformGrid, 'batch', currentMaster, selectedRefIndex);
        }
        handleValueUpdate({
            batchFiles: updatedBatch,
            grid: uniformGrid
        });
        if (addToast) {
            addToast(`Разделители и границы сброшены ко всем ${updatedBatch.length} фото`, 'info');
        }
    };

    const handleResetGridForCurrent = () => {
        const cols = grid?.cols || 2;
        const rows = grid?.rows || 1;
        const uniformGrid: ImageInputGridConfig = {
            ...(grid || { cols: 2, rows: 1 }),
            cols,
            rows,
            bounds: { x: 0, y: 0, width: 1, height: 1 },
            customDividers: false,
            colDividers: undefined,
            rowDividers: undefined
        };
        const updatedBatch = batchFiles.map((item, idx) => {
            if (idx === selectedRefIndex) {
                return { ...item, gridConfig: { ...uniformGrid } };
            }
            return item;
        });
        batchFilesRef.current = updatedBatch;
        setBatchFiles(updatedBatch);
        const currentMaster = batchFiles[selectedRefIndex]?.dataUrl || getFullSizeImage(node.id, 0) || image;
        if (currentMaster) {
            updateGridSlices(uniformGrid, 'batch', currentMaster, selectedRefIndex);
        }
        handleValueUpdate({
            batchFiles: updatedBatch,
            grid: uniformGrid
        });
        if (addToast) {
            addToast(`Сетка фото #${selectedRefIndex + 1} сброшена к равномерной`, 'info');
        }
    };

    const handleStartBatchProcess = async () => {
        if (batchFiles.length === 0) {
            if (addToast) addToast('Загрузите изображения для пакетной обработки', 'error');
            return;
        }

        setIsBatchProcessing(true);
        abortBatchRef.current = false;
        setBatchResult(null);
        setBatchProgress({ current: 0, total: batchFiles.length, currentName: '', percent: 0 });

        try {
            const JSZipConstructor = (JSZip as any).default || JSZip;
            const zip = new JSZipConstructor();
            const timestamp = getImageTimestampString();
            const cleanAssetName = (assetName || 'Asset_Name').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Name';
            let totalSlicesCount = 0;
            const generatedFolders: BatchResultFolder[] = [];

            for (let i = 0; i < batchFiles.length; i++) {
                if (abortBatchRef.current) {
                    if (addToast) addToast('Пакетная обработка отменена', 'info');
                    setIsBatchProcessing(false);
                    setBatchProgress(null);
                    return;
                }

                const item = batchFiles[i];
                setBatchProgress({
                    current: i + 1,
                    total: batchFiles.length,
                    currentName: item.name,
                    percent: Math.round(((i + 1) / batchFiles.length) * 100)
                });

                const cleanBaseName = item.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_');
                const folderName = `${String(i + 1).padStart(2, '0')}_${cleanBaseName}_${cleanAssetName}`;
                const folder = zip.folder(folderName) || zip;
                const currentFolderFiles: BatchResultFileItem[] = [];

                // 1. If includeOriginal is requested, write full uncropped original image in this subfolder
                if (includeOriginal && item.dataUrl) {
                    const dataParts = item.dataUrl.split(',');
                    if (dataParts.length > 1) {
                        const mimeMatch = item.dataUrl.match(/data:([^;]+);/);
                        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                        const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
                        const origFileName = `original_${cleanBaseName}_${cleanAssetName}.${ext}`;
                        folder.file(origFileName, dataParts[1], { base64: true });
                        totalSlicesCount += 1;
                        currentFolderFiles.push({
                            name: origFileName,
                            type: 'original',
                            dataUrl: item.dataUrl
                        });
                    }
                }

                // 2. Process crop or grid slices
                if (batchSubMode === 'crop') {
                    const activeCrop = (individualGridSettings && item.cropRect) ? item.cropRect : (cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
                    const croppedDataUrl = await cropImageNormalized(item.dataUrl, activeCrop);
                    const base64Data = croppedDataUrl.split(',')[1];
                    const cropFileName = `crop_${cleanBaseName}_${cleanAssetName}.png`;
                    folder.file(cropFileName, base64Data, { base64: true });
                    totalSlicesCount += 1;
                    currentFolderFiles.push({
                        name: cropFileName,
                        type: 'crop',
                        dataUrl: croppedDataUrl
                    });
                } else {
                    const globalCols = grid?.cols || 2;
                    const globalRows = grid?.rows || 1;
                    const activeGrid = (individualGridSettings && item.gridConfig)
                        ? {
                            ...item.gridConfig,
                            cols: globalCols,
                            rows: globalRows,
                            bounds: item.gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 }
                        }
                        : (grid || { cols: globalCols, rows: globalRows, bounds: { x: 0, y: 0, width: 1, height: 1 } });
                    const cols = globalCols;
                    const rows = globalRows;
                    const { slices } = await sliceImageGrid(
                        item.dataUrl,
                        cols,
                        rows,
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

                    for (let s = 0; s < slices.length; s++) {
                        const sliceData = slices[s];
                        const base64Data = sliceData.split(',')[1];
                        const row = Math.floor(s / cols) + 1;
                        const col = (s % cols) + 1;
                        const sliceFileName = `slice_${String(s + 1).padStart(3, '0')}_${cleanAssetName}_r${row}_c${col}.png`;
                        folder.file(sliceFileName, base64Data, { base64: true });
                        totalSlicesCount += 1;
                        currentFolderFiles.push({
                            name: sliceFileName,
                            type: 'slice',
                            dataUrl: sliceData,
                            row,
                            col,
                            sliceIndex: s
                        });
                    }
                }

                generatedFolders.push({
                    name: folderName,
                    imageIndex: i,
                    sourceImageName: item.name,
                    files: currentFolderFiles
                });

                // Small micro-delay to let React render progress bar smoothly
                await new Promise(resolve => setTimeout(resolve, 15));
            }

            // Generate ZIP archive blob with STORE (fastest, no extra compression overhead for PNGs)
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'STORE'
            });

            const zipFilename = `Batch_${batchSubMode === 'crop' ? 'Crop' : `Grid_${grid?.cols || 2}x${grid?.rows || 1}`}_${cleanAssetName}_${batchFiles.length}_images_${timestamp}.zip`;

            const result: BatchResultData = {
                zipBlob,
                totalImages: batchFiles.length,
                totalSlices: totalSlicesCount,
                timestamp,
                filename: zipFilename,
                folders: generatedFolders
            };

            setBatchResult(result);

            // Auto-trigger download
            const downloadUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = zipFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            if (addToast) {
                addToast(`Пакетная обработка завершена! Скачан ZIP архив (${totalSlicesCount} файлов в папках).`, 'success');
            }
        } catch (err: any) {
            console.error('Batch processing error:', err);
            if (addToast) addToast(`Ошибка пакетной обработки: ${err.message || err}`, 'error');
        } finally {
            setIsBatchProcessing(false);
            setBatchProgress(null);
        }
    };

    const handleCancelBatchProcess = () => {
        abortBatchRef.current = true;
    };

    const handleDownloadZip = () => {
        if (!batchResult?.zipBlob) return;
        const downloadUrl = URL.createObjectURL(batchResult.zipBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = batchResult.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        if (addToast) addToast('ZIP архив скачан повторно', 'success');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (e.target.files.length > 1) {
            loadMultipleFiles(e.target.files);
        } else {
            const file = e.target.files[0];
            if (mode === 'batch') {
                loadMultipleFiles([file]);
            } else {
                onPasteImage(node.id, file);
            }
        }
    };

    const handleBatchFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        loadMultipleFiles(e.target.files);
        e.target.value = '';
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
        const el = document.getElementById('app-container');
        if (el) el.classList.remove('ring-2', 'ring-cyan-500', 'ring-inset');
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const dragImageData = e.dataTransfer.getData('application/prompt-modifier-drag-image');
        if (dragImageData) {
            fetch(dragImageData)
              .then(res => res.blob())
              .then(blob => {
                  const file = new File([blob], "dragged_image.png", { type: blob.type });
                  if (mode === 'batch' || (mode === 'full' && batchFilesRef.current.length > 0)) {
                      loadMultipleFiles([file]);
                  } else {
                      onPasteImage(node.id, file);
                  }
              });
            return;
        }

        if (e.dataTransfer.files && e.dataTransfer.files.length > 1) {
            loadMultipleFiles(e.dataTransfer.files);
            return;
        }

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            if (mode === 'batch' || (mode === 'full' && batchFilesRef.current.length > 0)) {
                loadMultipleFiles([file]);
            } else {
                onPasteImage(node.id, file);
            }
        }
    };
    
    const handleApplyEdit = (imageDataUrl: string) => {
        handleImageChange(imageDataUrl);
    };

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!image) return;

        let fullSizeSrc = getFullSizeImage(node.id, 0) || image;
        if (mode === 'single') {
            fullSizeSrc = getFullSizeImage(node.id, 1) || croppedImage || fullSizeSrc;
        }

        if (fullSizeSrc) {
            setImageViewer({
                sources: [{
                    src: fullSizeSrc,
                    frameNumber: 0,
                    prompt: prompt || 'Input Image'
                }],
                initialIndex: 0
            });
        }
    };

    const handleCopyImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        const fullSizeSrc = (mode === 'single' ? getFullSizeImage(node.id, 1) : null) || getFullSizeImage(node.id, 0) || image;
        if (fullSizeSrc && onCopyImageToClipboard) {
            onCopyImageToClipboard(fullSizeSrc);
            if (addToast) addToast(t('toast.imageCopied'), 'success');
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (mode === 'single') {
            const singleSrc = getFullSizeImage(node.id, 1) || croppedImage;
            if (singleSrc) {
                const a = document.createElement('a');
                a.href = singleSrc;
                a.download = `cropped_image_${getImageTimestampString()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                return;
            }
        }
        if (onDownloadImage) {
            onDownloadImage(node.id);
        }
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleValueUpdate({ image: null, croppedImage: null, extractedImages: [] });
        if (addToast) addToast(t('toast.contentCleared'));
    };
    
    const handleRatioExpand = async (targetRatio: string) => {
        const fullSizeSrc = getFullSizeImage(node.id, 0) || image;
        if (!fullSizeSrc) return;

        setTransformingRatio(targetRatio);
        try {
            const newImage = await expandImageAspectRatio(fullSizeSrc, targetRatio, prompt, 'gemini-2.5-flash-image');
            await handleImageChange(newImage);
            if (addToast) addToast(`Converted to ${targetRatio} successfully`, 'success');
        } catch (error: any) {
            console.error("Ratio expansion failed:", error);
            if (addToast) addToast(`Failed to convert: ${error.message}`, 'error');
        } finally {
            setTransformingRatio(null);
        }
    };

    const handleOpenInNode = (e: React.MouseEvent, targetType: NodeType) => {
        if (!addNode) return;
        
        const fullRes = getFullSizeImage(node.id, 0) || image;
        if (!fullRes) return;

        let newPosition = { x: node.position.x, y: node.position.y };
        
        if (!e.shiftKey) {
             const GAP = 50;
             newPosition = { 
                 x: node.position.x + (node.width || 600) + GAP, 
                 y: node.position.y 
             };
        }

        const newNodeId = addNode(targetType, newPosition);
        if (!newNodeId) return;

        if (targetType === NodeType.IMAGE_ANALYZER) {
            const activeImage = mode === 'single' ? (croppedImage || image) : image;
            const activeFull = mode === 'single' ? (getFullSizeImage(node.id, 1) || fullRes) : fullRes;
            onValueChange(newNodeId, JSON.stringify({ image: activeImage, description: '', softPrompt: false }));
            setFullSizeImage(newNodeId, 0, activeFull);
        } else if (targetType === NodeType.IMAGE_EDITOR) {
            if (mode === 'grid' && extractedImages && extractedImages.length > 0) {
                // Populate all grid items into Image Editor!
                const cols = grid?.cols || 2;
                const rows = grid?.rows || 1;
                const total = cols * rows;
                const activeCells = grid?.selectedCells || Array.from({ length: total }, (_, i) => i);
                
                const editorThumbnails: string[] = [];
                activeCells.forEach((cellIdx, editorIdx) => {
                    const thumb = extractedImages[cellIdx] || image || '';
                    if (thumb) {
                        editorThumbnails.push(thumb);
                        const cellFull = getFullSizeImage(node.id, 1 + cellIdx) || thumb;
                        setFullSizeImage(newNodeId, editorIdx + 1, cellFull);
                    }
                });

                const defaultEditorState = {
                    inputImages: editorThumbnails,
                    prompt: prompt || '',
                    outputImage: null,
                    aspectRatio: '1:1',
                    enableAspectRatio: false,
                    enableOutpainting: false,
                    outpaintingPrompt: '{main_prompt}. Fill the background with environment.',
                    model: 'gemini-2.5-flash-image',
                    autoDownload: true,
                    autoCrop169: false,
                    leftPaneWidth: 280,
                    topPaneHeight: 320,
                    isSequenceMode: true,
                    checkedSequenceOutputIndices: editorThumbnails.map((_, i) => i)
                };
                onValueChange(newNodeId, JSON.stringify(defaultEditorState));
                if (addToast) addToast(`Loaded ${editorThumbnails.length} assets into AI Editor!`, 'success');
            } else if (mode === 'frames' && framesConfig?.frames && framesConfig.frames.length > 0) {
                // Populate all frame items and sub-grid sliced assets into Image Editor!
                const editorThumbnails: string[] = [];
                let globalIdx = 0;
                framesConfig.frames.forEach((frame) => {
                    const cols = Math.max(1, Math.min(20, frame.cols || 1));
                    const rows = Math.max(1, Math.min(20, frame.rows || 1));
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            const thumb = frameImages[globalIdx] || image || '';
                            if (thumb) {
                                editorThumbnails.push(thumb);
                                const frameFull = getFullSizeImage(node.id, 1 + globalIdx) || thumb;
                                setFullSizeImage(newNodeId, editorThumbnails.length, frameFull);
                            }
                            globalIdx++;
                        }
                    }
                });

                const defaultEditorState = {
                    inputImages: editorThumbnails,
                    prompt: prompt || '',
                    outputImage: null,
                    aspectRatio: '1:1',
                    enableAspectRatio: false,
                    enableOutpainting: false,
                    outpaintingPrompt: '{main_prompt}. Fill the background with environment.',
                    model: 'gemini-2.5-flash-image',
                    autoDownload: true,
                    autoCrop169: false,
                    leftPaneWidth: 280,
                    topPaneHeight: 320,
                    isSequenceMode: true,
                    checkedSequenceOutputIndices: editorThumbnails.map((_, i) => i)
                };
                onValueChange(newNodeId, JSON.stringify(defaultEditorState));
                if (addToast) addToast(`Загружено ${editorThumbnails.length} ассетов в AI Editor!`, 'success');
            } else if (mode === 'single') {
                const singleThumb = croppedImage || image;
                const singleFull = getFullSizeImage(node.id, 1) || fullRes;
                const defaultEditorState = {
                    inputImages: [singleThumb],
                    prompt: prompt || '',
                    outputImage: null,
                    aspectRatio: '1:1',
                    enableAspectRatio: false,
                    enableOutpainting: false,
                    outpaintingPrompt: '{main_prompt}. Fill the background with environment.',
                    model: 'gemini-2.5-flash-image',
                    autoDownload: true,
                    autoCrop169: false,
                    leftPaneWidth: 280,
                    topPaneHeight: 320,
                };
                onValueChange(newNodeId, JSON.stringify(defaultEditorState));
                setFullSizeImage(newNodeId, 1, singleFull);
            } else {
                const defaultEditorState = {
                    inputImages: [image],
                    prompt: prompt || '',
                    outputImage: null,
                    aspectRatio: '1:1',
                    enableAspectRatio: false,
                    enableOutpainting: false,
                    outpaintingPrompt: '{main_prompt}. Fill the background with environment.',
                    model: 'gemini-2.5-flash-image',
                    autoDownload: true,
                    autoCrop169: false,
                    leftPaneWidth: 280,
                    topPaneHeight: 320,
                };
                onValueChange(newNodeId, JSON.stringify(defaultEditorState));
                setFullSizeImage(newNodeId, 1, fullRes); 
            }
        }

        if (setSelectedNodeIds) {
            setSelectedNodeIds([newNodeId]);
        }

        if (e.shiftKey && deleteNode) {
            deleteNode(node.id);
        }
    };

    const handleSendGridSlicesToNote = useCallback(() => {
        if (!addNode) return;
        const cleanAssetName = (gridAssetName || 'Asset_Name').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Name';
        const cols = grid?.cols || 2;
        const references: { id: string; image: string | null; caption: string }[] = [];

        // 1. Original if includeOriginal
        if (grid?.includeOriginal && image) {
            const origFull = getFullSizeImage ? getFullSizeImage(node.id, 0) : null;
            const origSrc = origFull || image;
            if (origSrc) {
                references.push({
                    id: `ref-${Date.now()}-orig-${Math.random().toString(36).substring(2, 7)}`,
                    image: origSrc,
                    caption: `Original (${cleanAssetName})`
                });
            }
        }

        // 2. All grid slices
        if (extractedImages && extractedImages.length > 0) {
            for (let i = 0; i < extractedImages.length; i++) {
                const fullRes = getFullSizeImage ? getFullSizeImage(node.id, i + 1) : null;
                const src = fullRes || extractedImages[i];
                if (src) {
                    const row = Math.floor(i / cols) + 1;
                    const col = (i % cols) + 1;
                    references.push({
                        id: `ref-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
                        image: src,
                        caption: `#${i + 1} (${cleanAssetName} r${row}c${col})`
                    });
                }
            }
        }

        if (references.length === 0) {
            if (addToast) addToast(t('imageEditor.noImagesToSend') || 'Нет ассетов для отправки', 'warning');
            return;
        }

        const GAP = 50;
        const position = {
            x: node.position.x + (node.width || 600) + GAP,
            y: node.position.y
        };

        const noteData = {
            text: '',
            references,
            activeTab: 'reference',
            isMinimal: false,
            style: {
                fontSize: 14,
                color: '#ffffff',
                isBold: false,
                isItalic: false,
                textAlign: 'left'
            }
        };

        const newNodeId = addNode(NodeType.NOTE, position, `Note (${cleanAssetName})`, {
            initialValue: JSON.stringify(noteData)
        });

        if (newNodeId) {
            onValueChange(newNodeId, JSON.stringify(noteData));
            if (setSelectedNodeIds) {
                setSelectedNodeIds([newNodeId]);
            }
            if (addToast) {
                addToast(`Отправлено ${references.length} ассетов в Note (References)`, 'success');
            }
        }
    }, [addNode, gridAssetName, grid?.cols, grid?.includeOriginal, image, getFullSizeImage, node.id, node.position, node.width, extractedImages, onValueChange, setSelectedNodeIds, addToast, t]);

    const handleSendFramesToNote = useCallback(() => {
        if (!addNode) return;
        const cleanAssetName = (framesAssetName || 'Asset_Frames').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Frames';
        const frames = framesConfig?.frames || [];
        const references: { id: string; image: string | null; caption: string }[] = [];

        // 1. Original if includeOriginal
        if (framesConfig?.includeOriginal && image) {
            const origFull = getFullSizeImage ? getFullSizeImage(node.id, 0) : null;
            const origSrc = origFull || image;
            if (origSrc) {
                references.push({
                    id: `ref-${Date.now()}-orig-${Math.random().toString(36).substring(2, 7)}`,
                    image: origSrc,
                    caption: `Original (${cleanAssetName})`
                });
            }
        }

        // 2. All frames and sub-grid sliced assets
        let globalIdx = 0;
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const cols = Math.max(1, Math.min(20, frame.cols || 1));
            const rows = Math.max(1, Math.min(20, frame.rows || 1));
            const totalInFrame = cols * rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const fullRes = getFullSizeImage ? getFullSizeImage(node.id, globalIdx + 1) : null;
                    const src = fullRes || frameImages[globalIdx];
                    if (src) {
                        const frameName = frame?.name || `Frame ${i + 1}`;
                        const caption = totalInFrame > 1
                            ? `#${globalIdx + 1} (${frameName} [${r + 1},${c + 1}])`
                            : `#${globalIdx + 1} (${frameName})`;
                        references.push({
                            id: `ref-${Date.now()}-${globalIdx}-${Math.random().toString(36).substring(2, 7)}`,
                            image: src,
                            caption
                        });
                    }
                    globalIdx++;
                }
            }
        }

        if (references.length === 0) {
            if (addToast) addToast(t('imageEditor.noImagesToSend') || 'Нет рамок для отправки', 'warning');
            return;
        }

        const GAP = 50;
        const position = {
            x: node.position.x + (node.width || 600) + GAP,
            y: node.position.y
        };

        const noteData = {
            text: '',
            references,
            activeTab: 'reference',
            isMinimal: false,
            style: {
                fontSize: 14,
                color: '#ffffff',
                isBold: false,
                isItalic: false,
                textAlign: 'left'
            }
        };

        const newNodeId = addNode(NodeType.NOTE, position, `Note (${cleanAssetName})`, {
            initialValue: JSON.stringify(noteData)
        });

        if (newNodeId) {
            onValueChange(newNodeId, JSON.stringify(noteData));
            if (setSelectedNodeIds) {
                setSelectedNodeIds([newNodeId]);
            }
            if (addToast) {
                addToast(`Отправлено ${references.length} рамок в Note (References)`, 'success');
            }
        }
    }, [addNode, framesAssetName, framesConfig?.frames, framesConfig?.includeOriginal, image, getFullSizeImage, node.id, node.position, node.width, frameImages, onValueChange, setSelectedNodeIds, addToast, t]);

    const handleSendSingleCropToNote = useCallback(() => {
        if (!addNode) return;
        const activeFull = getFullSizeImage ? getFullSizeImage(node.id, 1) : null;
        const activeImage = activeFull || croppedImage || image;
        if (!activeImage) {
            if (addToast) addToast(t('imageEditor.noImagesToSend') || 'Нет изображения для отправки', 'warning');
            return;
        }

        const GAP = 50;
        const position = {
            x: node.position.x + (node.width || 600) + GAP,
            y: node.position.y
        };

        const references = [
            {
                id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                image: activeImage,
                caption: 'Single Crop'
            }
        ];

        const noteData = {
            text: '',
            references,
            activeTab: 'reference',
            isMinimal: false,
            style: {
                fontSize: 14,
                color: '#ffffff',
                isBold: false,
                isItalic: false,
                textAlign: 'left'
            }
        };

        const newNodeId = addNode(NodeType.NOTE, position, 'Note (Crop)', {
            initialValue: JSON.stringify(noteData)
        });

        if (newNodeId) {
            onValueChange(newNodeId, JSON.stringify(noteData));
            if (setSelectedNodeIds) {
                setSelectedNodeIds([newNodeId]);
            }
            if (addToast) {
                addToast('Отправлено обрезанное изображение в Note (References)', 'success');
            }
        }
    }, [addNode, getFullSizeImage, croppedImage, image, node.id, node.position, node.width, onValueChange, setSelectedNodeIds, addToast, t]);

    const handleToggleControls = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleValueUpdate({ showControls: !showControls });
    };

    // Mode changer with robust cancellation of pending tasks
    const setMode = (newMode: ImageInputMode) => {
        // Cancel any pending async slice operations
        operationIdRef.current++;
        setIsSlicing(false);

        // Update mode atomically
        handleValueUpdate({ mode: newMode });

        if (newMode === 'full') {
            if (batchFiles.length > 0) {
                const activeItem = batchFiles[selectedRefIndex] || batchFiles[0];
                if (activeItem) {
                    setFullSizeImage(node.id, 0, activeItem.dataUrl);
                    handleValueUpdate({
                        mode: 'full',
                        image: activeItem.thumbnailUrl || activeItem.dataUrl,
                        batchFiles
                    });
                }
            }
        } else if (newMode === 'single') {
            const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            updateSingleCropSlice(activeCrop, 'single');
        } else if (newMode === 'grid') {
            const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
            const expectedTotal = (activeGrid.cols || 2) * (activeGrid.rows || 1);
            if (!extractedImages || extractedImages.length !== expectedTotal) {
                updateGridSlices(activeGrid, 'grid');
            }
        } else if (newMode === 'frames') {
            const activeFrames = parsedValueRef.current.framesConfig || framesConfig || {
                frames: [{ id: 'frame-1', rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, name: 'Frame 1' }],
                selectedFrameIndex: 0
            };
            updateMultipleFramesSlices(activeFrames, 'frames');
        } else if (newMode === 'batch') {
            const masterSrc = batchFiles[selectedRefIndex]?.dataUrl || getFullSizeImage(node.id, 0) || image;
            if (masterSrc) {
                if (batchSubMode === 'crop') {
                    const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                    updateSingleCropSlice(activeCrop, 'batch', masterSrc);
                } else {
                    const activeGrid = grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                    updateGridSlices(activeGrid, 'batch', masterSrc);
                }
            }
        }
    };

    // Frame helper functions for Multiple Frames mode
    const handleAddFrame = () => {
        const currentFrames = parsedValueRef.current.framesConfig?.frames || framesConfig?.frames || [];
        const offset = (currentFrames.length * 0.05) % 0.3;
        const newFrame: ImageInputFrameItem = {
            id: `frame_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            rect: {
                x: Math.min(0.6, 0.15 + offset),
                y: Math.min(0.6, 0.15 + offset),
                width: 0.4,
                height: 0.4
            },
            name: `Frame ${currentFrames.length + 1}`
        };
        const nextFrames = [...currentFrames, newFrame];
        const newIndex = nextFrames.length - 1;
        setSelectedFrameIndex(newIndex);
        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: nextFrames,
            selectedFrameIndex: newIndex
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    const handleDuplicateFrame = () => {
        const currentFrames = parsedValueRef.current.framesConfig?.frames || framesConfig?.frames || [];
        if (currentFrames.length === 0) {
            handleAddFrame();
            return;
        }
        const target = currentFrames[selectedFrameIndex] || currentFrames[0];
        const newRect: ImageInputCropRect = {
            x: Math.max(0, Math.min(1 - target.rect.width, target.rect.x + 0.04)),
            y: Math.max(0, Math.min(1 - target.rect.height, target.rect.y + 0.04)),
            width: target.rect.width,
            height: target.rect.height
        };
        const newFrame: ImageInputFrameItem = {
            id: `frame_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            rect: newRect,
            name: `Frame ${currentFrames.length + 1}`
        };
        const nextFrames = [...currentFrames, newFrame];
        const newIndex = nextFrames.length - 1;
        setSelectedFrameIndex(newIndex);
        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: nextFrames,
            selectedFrameIndex: newIndex
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    const handleDeleteSelectedFrame = (indexToDelete?: number) => {
        const currentFrames = parsedValueRef.current.framesConfig?.frames || framesConfig?.frames || [];
        const idx = indexToDelete !== undefined ? indexToDelete : selectedFrameIndex;
        if (idx < 0 || idx >= currentFrames.length) return;
        const nextFrames = currentFrames.filter((_, i) => i !== idx);
        const newIndex = Math.max(0, Math.min(nextFrames.length - 1, idx >= nextFrames.length ? nextFrames.length - 1 : idx));
        setSelectedFrameIndex(newIndex);
        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: nextFrames,
            selectedFrameIndex: newIndex
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    const handleClearAllFrames = () => {
        setSelectedFrameIndex(0);
        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: [],
            selectedFrameIndex: 0
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    const updateSelectedFrameGrid = (newCols: number, newRows: number) => {
        const currentFrames = parsedValueRef.current.framesConfig?.frames || framesConfig?.frames || [];
        if (currentFrames.length === 0) return;
        const targetIdx = selectedFrameIndex >= 0 && selectedFrameIndex < currentFrames.length ? selectedFrameIndex : 0;
        const safeCols = Math.max(1, Math.min(20, newCols));
        const safeRows = Math.max(1, Math.min(20, newRows));

        const nextFrames = currentFrames.map((f, i) => {
            if (i === targetIdx) {
                return { ...f, cols: safeCols, rows: safeRows };
            }
            return f;
        });

        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: nextFrames,
            selectedFrameIndex: targetIdx
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    const applyFramesPresetLayout = (rows: number, cols: number) => {
        const newFrames: ImageInputFrameItem[] = [];
        const cellW = 1 / cols;
        const cellH = 1 / rows;
        let count = 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newFrames.push({
                    id: `frame_${Date.now()}_${r}_${c}`,
                    rect: {
                        x: c * cellW,
                        y: r * cellH,
                        width: cellW,
                        height: cellH
                    },
                    name: `Frame ${count++}`
                });
            }
        }
        setSelectedFrameIndex(0);
        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: newFrames,
            selectedFrameIndex: 0
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    const applyAspectToSelectedFrame = (ratioStr: string) => {
        if (!originalDimensions) return;
        const currentFrames = parsedValueRef.current.framesConfig?.frames || framesConfig?.frames || [];
        if (currentFrames.length === 0) {
            handleAddFrame();
            return;
        }
        const targetIdx = selectedFrameIndex >= 0 && selectedFrameIndex < currentFrames.length ? selectedFrameIndex : 0;
        const target = currentFrames[targetIdx];

        if (ratioStr === 'full') {
            const newRect: ImageInputCropRect = { x: 0, y: 0, width: 1, height: 1 };
            const nextFrames = [...currentFrames];
            nextFrames[targetIdx] = { ...target, rect: newRect };
            const newConfig: ImageInputFramesConfig = {
                ...(parsedValueRef.current.framesConfig || framesConfig || {}),
                frames: nextFrames,
                selectedFrameIndex: targetIdx
            };
            updateMultipleFramesSlices(newConfig, mode);
            return;
        }

        const [w, h] = ratioStr.split(':').map(Number);
        const targetRatio = w / h;
        const imgRatio = originalDimensions.width / originalDimensions.height;

        let width = target.rect.width || 0.5;
        let height = target.rect.height || 0.5;

        if (imgRatio > targetRatio) {
            width = (height * originalDimensions.height * targetRatio) / originalDimensions.width;
        } else {
            height = (width * originalDimensions.width / targetRatio) / originalDimensions.height;
        }

        width = Math.min(0.98, Math.max(0.05, width));
        height = Math.min(0.98, Math.max(0.05, height));

        const cx = target.rect.x + (target.rect.width / 2);
        const cy = target.rect.y + (target.rect.height / 2);

        let x = cx - (width / 2);
        let y = cy - (height / 2);

        x = Math.max(0, Math.min(1 - width, x));
        y = Math.max(0, Math.min(1 - height, y));

        const newRect: ImageInputCropRect = { x, y, width, height };
        const nextFrames = [...currentFrames];
        nextFrames[targetIdx] = { ...target, rect: newRect };
        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: nextFrames,
            selectedFrameIndex: targetIdx
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    const updateSelectedFrameDimensions = (newWidthPx: number, newHeightPx: number) => {
        const currentFrames = parsedValueRef.current.framesConfig?.frames || framesConfig?.frames || [];
        if (currentFrames.length === 0) return;
        const targetIdx = selectedFrameIndex >= 0 && selectedFrameIndex < currentFrames.length ? selectedFrameIndex : 0;
        const target = currentFrames[targetIdx];

        let normW: number;
        let normH: number;

        if (originalDimensions && originalDimensions.width > 0 && originalDimensions.height > 0) {
            normW = Math.max(0.02, Math.min(1, newWidthPx / originalDimensions.width));
            normH = Math.max(0.02, Math.min(1, newHeightPx / originalDimensions.height));
        } else {
            normW = Math.max(0.02, Math.min(1, newWidthPx / 100));
            normH = Math.max(0.02, Math.min(1, newHeightPx / 100));
        }

        const clampedX = Math.max(0, Math.min(1 - normW, target.rect.x));
        const clampedY = Math.max(0, Math.min(1 - normH, target.rect.y));

        const nextFrames = currentFrames.map((f, i) => {
            if (i === targetIdx) {
                return {
                    ...f,
                    rect: {
                        x: clampedX,
                        y: clampedY,
                        width: normW,
                        height: normH
                    }
                };
            }
            return f;
        });

        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: nextFrames,
            selectedFrameIndex: targetIdx
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    const resetSelectedFrameDividers = () => {
        const currentFrames = parsedValueRef.current.framesConfig?.frames || framesConfig?.frames || [];
        if (currentFrames.length === 0) return;
        const targetIdx = selectedFrameIndex >= 0 && selectedFrameIndex < currentFrames.length ? selectedFrameIndex : 0;

        const nextFrames = currentFrames.map((f, i) => {
            if (i === targetIdx) {
                const { colDividers, rowDividers, ...rest } = f;
                return rest;
            }
            return f;
        });

        const newConfig: ImageInputFramesConfig = {
            ...(parsedValueRef.current.framesConfig || framesConfig || {}),
            frames: nextFrames,
            selectedFrameIndex: targetIdx
        };
        updateMultipleFramesSlices(newConfig, mode);
    };

    // Quick Aspect Ratio Crop presets
    const applyAspectCrop = (ratioStr: string) => {
        if (!originalDimensions) return;
        const [w, h] = ratioStr.split(':').map(Number);
        const targetRatio = w / h;
        const imgRatio = originalDimensions.width / originalDimensions.height;

        let width = 0.8;
        let height = 0.8;

        if (imgRatio > targetRatio) {
            height = 0.8;
            width = (height * originalDimensions.height * targetRatio) / originalDimensions.width;
        } else {
            width = 0.8;
            height = (width * originalDimensions.width / targetRatio) / originalDimensions.height;
        }

        width = Math.min(0.95, width);
        height = Math.min(0.95, height);
        const x = (1 - width) / 2;
        const y = (1 - height) / 2;

        const newRect: ImageInputCropRect = { x, y, width, height };
        updateSingleCropSlice(newRect, mode);
    };

    const handleResetCrop = () => {
        const fullRect: ImageInputCropRect = { x: 0, y: 0, width: 1, height: 1 };
        updateSingleCropSlice(fullRect, mode);
    };

    // Grid dimension and border handlers
    const updateGridDims = (newCols: number, newRows: number) => {
        const safeCols = Math.max(1, Math.min(30, newCols));
        const safeRows = Math.max(1, Math.min(30, newRows));
        const rootGrid = parsedValueRef.current.grid || grid;
        const newGrid: ImageInputGridConfig = {
            ...(rootGrid || {}),
            cols: safeCols,
            rows: safeRows,
            bounds: activeGridConfig.bounds || rootGrid?.bounds || { x: 0, y: 0, width: 1, height: 1 },
            selectedCells: undefined, // reset selection to all
            colDividers: undefined, // reset dividers to equal distribution for new dimensions
            rowDividers: undefined
        };

        if (mode === 'batch' && batchFilesRef.current.length > 0) {
            const updatedBatch = batchFilesRef.current.map(bf => {
                if (bf.gridConfig) {
                    return {
                        ...bf,
                        gridConfig: {
                            ...bf.gridConfig,
                            cols: safeCols,
                            rows: safeRows,
                            colDividers: undefined,
                            rowDividers: undefined
                        }
                    };
                }
                return bf;
            });
            batchFilesRef.current = updatedBatch;
            setBatchFiles(updatedBatch);
        }

        updateGridSlices(newGrid, mode);
    };

    const updateGridBorderConfig = (borderUpdates: Partial<ImageInputGridConfig>) => {
        const rootGrid = parsedValueRef.current.grid || grid;
        const currentGrid: ImageInputGridConfig = rootGrid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
        const newGrid: ImageInputGridConfig = {
            ...currentGrid,
            ...borderUpdates,
            selectedCells: undefined
        };
        if (borderUpdates.borderWidth !== undefined) {
            setLocalBorderWidth(String(borderUpdates.borderWidth));
        }
        updateGridSlices(newGrid, mode);
    };

    const handleBorderWidthInputChange = (valStr: string) => {
        setLocalBorderWidth(valStr);
        if (borderDebounceTimerRef.current) {
            clearTimeout(borderDebounceTimerRef.current);
        }
        borderDebounceTimerRef.current = setTimeout(() => {
            const parsed = parseInt(valStr);
            if (!isNaN(parsed)) {
                const clamped = Math.max(0, Math.min(300, parsed));
                updateGridBorderConfig({ borderWidth: clamped });
            }
        }, 220);
    };

    const handleBorderWidthInputCommit = () => {
        if (borderDebounceTimerRef.current) {
            clearTimeout(borderDebounceTimerRef.current);
        }
        const parsed = parseInt(localBorderWidth);
        const clamped = isNaN(parsed) ? (grid?.borderWidth ?? 24) : Math.max(0, Math.min(300, parsed));
        setLocalBorderWidth(String(clamped));
        if ((grid?.borderWidth ?? 24) !== clamped) {
            updateGridBorderConfig({ borderWidth: clamped });
        }
    };

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
                            await loadMultipleFiles(imageFiles);
                        } else {
                            onPasteImage(node.id, imageFiles[0]);
                        }
                        return;
                    }
                }
            }}
        >
            <ImageEditorModal 
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onApply={handleApplyEdit}
                imageSrc={getFullSizeImage(node.id, 0) || image}
            />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <input ref={batchFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBatchFileInputChange} />
            
            {/* Top Mode Selector Bar */}
            <ModeSelectorBar
                mode={mode}
                onSetMode={setMode}
                batchFiles={batchFiles}
                batchSubMode={batchSubMode}
                grid={grid}
                framesConfig={framesConfig}
            />

            {/* Batch Sub-Mode Selector: Placed directly under Batch tab */}
            {mode === 'batch' && (
                <BatchSubModeSelector
                    batchSubMode={batchSubMode}
                    onChangeSubMode={handleBatchSubModeChange}
                    batchFiles={batchFiles}
                    grid={grid}
                />
            )}

            {/* Mode-Specific Quick Sub-Toolbar: Crop Presets */}
            {image && (mode === 'single' || (mode === 'batch' && batchSubMode === 'crop')) && (
                <CropPresetsBar
                    mode={mode}
                    onApplyAspectCrop={applyAspectCrop}
                    onResetCrop={handleResetCrop}
                />
            )}

            {/* Mode-Specific Quick Sub-Toolbar: Multiple Frames Controls */}
            {image && mode === 'frames' && (
                <FramesToolbar
                    framesConfig={framesConfig}
                    selectedFrameIndex={selectedFrameIndex}
                    originalDimensions={originalDimensions}
                    onAddFrame={handleAddFrame}
                    onDuplicateFrame={handleDuplicateFrame}
                    onDeleteSelectedFrame={() => handleDeleteSelectedFrame()}
                    onClearAllFrames={handleClearAllFrames}
                    onApplyFramesPresetLayout={applyFramesPresetLayout}
                    onUpdateSelectedFrameDimensions={updateSelectedFrameDimensions}
                    onApplyAspectToSelectedFrame={applyAspectToSelectedFrame}
                    onUpdateSelectedFrameGrid={updateSelectedFrameGrid}
                    onResetSelectedFrameDividers={resetSelectedFrameDividers}
                />
            )}

            {/* Mode-Specific Quick Sub-Toolbar: Grid Settings */}
            {image && (mode === 'grid' || (mode === 'batch' && batchSubMode === 'grid')) && (
                <GridToolbar
                    grid={grid}
                    localBorderWidth={localBorderWidth}
                    onUpdateGridDims={updateGridDims}
                    onResetGridBounds={() => updateGridSlices({ ...(grid || { cols: 2, rows: 1 }), bounds: { x: 0, y: 0, width: 1, height: 1 } })}
                    onToggleBorder={() => {
                        const nextEnable = !grid?.enableBorder;
                        updateGridBorderConfig({
                            enableBorder: nextEnable,
                            borderWidth: grid?.borderWidth ?? 24,
                            borderMode: grid?.borderMode ?? 'inner'
                        });
                    }}
                    onBorderWidthChange={handleBorderWidthInputChange}
                    onBorderWidthCommit={handleBorderWidthInputCommit}
                    onSetBorderWidthQuick={(px) => {
                        if (borderDebounceTimerRef.current) clearTimeout(borderDebounceTimerRef.current);
                        updateGridBorderConfig({ borderWidth: px });
                    }}
                    onSetBorderMode={(mode) => updateGridBorderConfig({ borderMode: mode })}
                    onToggleCustomDividers={() => {
                        const nextCustom = !grid?.customDividers;
                        updateGridSlices({
                            ...(grid || { cols: 2, rows: 1 }),
                            customDividers: nextCustom
                        });
                    }}
                    onResetDividers={() => {
                        updateGridSlices({
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
                batchSubMode={batchSubMode}
                batchFiles={batchFiles}
                isDragOver={isDragOver}
                originalDimensions={originalDimensions}
                getFullSizeImage={getFullSizeImage}
                metadataPrompt={metadataPrompt}
                prompt={prompt}
                croppedImage={croppedImage}
                extractedImages={extractedImages}
                frameImages={frameImages}
                activeCropRect={activeCropRect}
                activeGridConfig={activeGridConfig}
                framesConfig={framesConfig}
                selectedFrameIndex={selectedFrameIndex}
                showControls={showControls}
                isAnalyzingImage={isAnalyzingImage}
                t={t}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClickContainer={() => {
                    if (!image) {
                        if (mode === 'batch') {
                            batchFileInputRef.current?.click();
                        } else {
                            fileInputRef.current?.click();
                        }
                    }
                }}
                onImageClick={handleImageClick}
                onCopyImage={handleCopyImage}
                onDownload={handleDownload}
                onClearImage={handleClearImage}
                onImageToText={() => onImageToText && onImageToText(node.id)}
                onOpenRasterEditor={() => setIsEditorOpen(true)}
                onOpenInNode={handleOpenInNode}
                onToggleControls={handleToggleControls}
                onNavigateBatch={handleNavigateBatch}
                onChangeCropRect={(newRect) => updateSingleCropSlice(newRect, mode)}
                onChangeGridConfig={(newConfig) => updateGridSlices(newConfig, mode)}
                onChangeFramesConfig={(newConfig) => updateMultipleFramesSlices(newConfig, mode)}
                onSelectFrame={setSelectedFrameIndex}
            />

            {/* Multi-Image Thumbnails Strip in Full (Normal) Mode */}
            {mode === 'full' && batchFiles.length > 0 && (
                <ImageBatchThumbnailsBar
                    batchFiles={batchFiles}
                    selectedIndex={selectedRefIndex}
                    onSelectIndex={handleSelectReferenceIndex}
                    onRemoveFile={handleRemoveBatchFile}
                    onClearBatch={handleClearBatch}
                    onAddFiles={(files) => loadMultipleFiles(files)}
                    onPasteClipboard={handlePasteFromClipboard}
                    onNavigatePrev={() => handleNavigateBatch('prev')}
                    onNavigateNext={() => handleNavigateBatch('next')}
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
                    onImageClick={handleImageClick}
                    onSendToNote={handleSendSingleCropToNote}
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
                        updateGridSlices({
                            ...(grid || { cols: 2, rows: 1 }),
                            includeOriginal: val
                        });
                    }}
                    assetName={gridAssetName}
                    onChangeAssetName={handleGridAssetNameChange}
                    getFullSizeImage={getFullSizeImage}
                    onCopyImageToClipboard={onCopyImageToClipboard}
                    onDownloadImage={onDownloadImage}
                    addToast={addToast}
                    cols={grid?.cols || 2}
                    rows={grid?.rows || 1}
                    onSendToNote={handleSendGridSlicesToNote}
                />
            )}

            {/* Slices Drawer in Multiple Frames Mode */}
            {image && mode === 'frames' && framesConfig?.frames && framesConfig.frames.length > 0 && (
                <ImageFramesPreview
                    nodeId={node.id}
                    frames={framesConfig.frames}
                    frameThumbnails={frameImages || []}
                    selectedFrameIndex={selectedFrameIndex}
                    onSelectFrame={setSelectedFrameIndex}
                    onAddFrame={handleAddFrame}
                    onDeleteFrame={handleDeleteSelectedFrame}
                    onDuplicateFrame={handleDuplicateFrame}
                    originalImage={image}
                    includeOriginal={framesConfig?.includeOriginal ?? true}
                    onChangeIncludeOriginal={(val) => {
                        const currentFrames = framesConfig || { frames: [] };
                        updateMultipleFramesSlices({
                            ...currentFrames,
                            includeOriginal: val
                        }, mode);
                    }}
                    assetName={framesAssetName}
                    onChangeAssetName={(name) => {
                        setFramesAssetName(name);
                        const currentFrames = framesConfig || { frames: [] };
                        updateMultipleFramesSlices({
                            ...currentFrames,
                            assetName: name
                        }, mode);
                    }}
                    getFullSizeImage={getFullSizeImage}
                    onCopyImageToClipboard={onCopyImageToClipboard}
                    onDownloadImage={onDownloadImage}
                    addToast={addToast}
                    onSendToNote={handleSendFramesToNote}
                />
            )}

            {/* Batch Processing Panel in Batch Mode */}
            {mode === 'batch' && (
                <BatchProcessingPanel
                    nodeId={node.id}
                    batchFiles={batchFiles}
                    selectedReferenceIndex={selectedRefIndex}
                    onSelectReferenceIndex={handleSelectReferenceIndex}
                    onNavigatePrev={() => handleNavigateBatch('prev')}
                    onNavigateNext={() => handleNavigateBatch('next')}
                    onRemoveBatchFile={handleRemoveBatchFile}
                    onClearBatch={handleClearBatch}
                    onAddBatchFiles={(files) => loadMultipleFiles(files)}
                    subMode={batchSubMode}
                    onChangeSubMode={handleBatchSubModeChange}
                    includeOriginal={includeOriginal}
                    onChangeIncludeOriginal={handleIncludeOriginalChange}
                    assetName={assetName}
                    onChangeAssetName={handleAssetNameChange}
                    individualGridSettings={individualGridSettings}
                    onChangeIndividualGridSettings={handleIndividualGridSettingsChange}
                    onApplyCurrentGridToAll={handleApplyCurrentGridToAll}
                    onResetGridForAll={handleResetGridForAll}
                    onResetGridForCurrent={handleResetGridForCurrent}
                    cropRect={activeCropRect}
                    gridConfig={activeGridConfig}
                    isProcessing={isBatchProcessing}
                    progress={batchProgress}
                    onStartBatchProcess={handleStartBatchProcess}
                    onCancelBatchProcess={handleCancelBatchProcess}
                    batchResult={batchResult}
                    onDownloadZip={handleDownloadZip}
                    onOpenArchiveFolder={() => setIsArchiveFolderModalOpen(true)}
                    addToast={addToast}
                    upstreamImagesCount={upstreamImages.length}
                    onSyncFromUpstream={() => syncFromUpstream()}
                    onPasteClipboard={handlePasteFromClipboard}
                />
            )}
            
            {/* Controls Section - Slides smoothly down when collapsed */}
            <ImageControlsSection
                showControls={showControls}
                isBatchMode={isBatchMode}
                setIsBatchMode={setIsBatchMode}
                t={t}
                onProcessImage={() => onProcessImage(node.id)}
                isProcessingImage={isProcessingImage}
                image={image}
                transformingRatio={transformingRatio}
                onOpenInNode={handleOpenInNode}
                onImageToText={() => onImageToText && onImageToText(node.id)}
                isAnalyzingImage={isAnalyzingImage}
                onRatioExpand={handleRatioExpand}
                onOpenRasterEditor={() => setIsEditorOpen(true)}
                mode={mode}
                metadataPrompt={metadataPrompt}
                onUseMetadataPrompt={() => {
                    handleValueUpdate({ prompt: `${prompt ? prompt + ', ' : ''}${metadataPrompt}` });
                    setMetadataPrompt(null);
                }}
                deselectAllNodes={deselectAllNodes}
                prompt={prompt || ''}
                onPromptChange={(val) => handleValueUpdate({ prompt: val })}
            />

            {/* Archive Folder Inspector Modal */}
            <ArchiveFolderModal
                isOpen={isArchiveFolderModalOpen}
                onClose={() => setIsArchiveFolderModalOpen(false)}
                batchResult={batchResult}
                onDownloadZip={handleDownloadZip}
                addToast={addToast}
            />
        </div>
    );
};
