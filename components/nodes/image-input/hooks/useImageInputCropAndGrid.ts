import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cropImageNormalized, sliceImageGrid, generateThumbnail } from '../../../../utils/imageUtils';
import { ImageInputCropRect, ImageInputGridConfig, ImageInputMode, ImageInputValue, ImageBatchItem } from '../types';

interface UseImageInputCropAndGridParams {
    nodeId: string;
    image: string | null;
    mode: ImageInputMode;
    cropRect: ImageInputCropRect | null;
    grid: ImageInputGridConfig;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined | null;
    setFullSizeImage: (nodeId: string, frameIndex: number, dataUrl: string) => void;
    handleValueUpdate: (updates: Partial<ImageInputValue>) => void;
    parsedValueRef: React.MutableRefObject<ImageInputValue>;
    batchFiles: ImageBatchItem[];
    setBatchFiles: (files: ImageBatchItem[]) => void;
    batchFilesRef: React.MutableRefObject<ImageBatchItem[]>;
    selectedRefIndex: number;
    selectedRefIndexRef: React.MutableRefObject<number>;
    individualGridSettings: boolean;
    individualGridSettingsRef: React.MutableRefObject<boolean>;
    originalDimensions: { width: number; height: number } | null;
}

export const useImageInputCropAndGrid = ({
    nodeId,
    image,
    mode,
    cropRect,
    grid,
    getFullSizeImage,
    setFullSizeImage,
    handleValueUpdate,
    parsedValueRef,
    batchFiles,
    setBatchFiles,
    batchFilesRef,
    selectedRefIndex,
    selectedRefIndexRef,
    individualGridSettings,
    individualGridSettingsRef,
    originalDimensions
}: UseImageInputCropAndGridParams) => {
    const [isSlicing, setIsSlicing] = useState(false);
    const [gridAssetName, setGridAssetName] = useState<string>(() => grid?.assetName || 'Asset_Name');
    const [localBorderWidth, setLocalBorderWidth] = useState<string>(() => String(grid?.borderWidth ?? 24));
    
    const operationIdRef = useRef<number>(0);
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
    }, [mode, individualGridSettings, batchFiles, selectedRefIndex, grid, parsedValueRef]);

    const activeCropRect: ImageInputCropRect = useMemo(() => {
        const baseCrop = parsedValueRef.current.cropRect || cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
        if (mode === 'batch' && individualGridSettings && batchFiles[selectedRefIndex]?.cropRect) {
            return batchFiles[selectedRefIndex].cropRect!;
        }
        return baseCrop;
    }, [mode, individualGridSettings, batchFiles, selectedRefIndex, cropRect, parsedValueRef]);

    // Update single crop slice at full resolution
    const updateSingleCropSlice = useCallback(async (
        rect: ImageInputCropRect,
        explicitMode?: ImageInputMode,
        overrideSrc?: string,
        targetRefIndex?: number,
        overrideThumbnail?: string
    ) => {
        const masterSrc = overrideSrc || getFullSizeImage(nodeId, 0) || image;
        if (!masterSrc) return;

        const thisOpId = ++operationIdRef.current;

        try {
            const highResCrop = await cropImageNormalized(masterSrc, rect);
            if (thisOpId !== operationIdRef.current) return;

            setFullSizeImage(nodeId, 1, highResCrop);
            const thumb = await generateThumbnail(highResCrop, 512, 512);
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
    }, [getFullSizeImage, nodeId, image, setFullSizeImage, handleValueUpdate, mode, batchFilesRef, individualGridSettingsRef, selectedRefIndexRef, setBatchFiles]);

    // Update grid slices at full resolution
    const updateGridSlices = useCallback(async (
        gridConfig: ImageInputGridConfig,
        explicitMode?: ImageInputMode,
        overrideSrc?: string,
        targetRefIndex?: number,
        overrideThumbnail?: string
    ) => {
        const masterSrc = overrideSrc || getFullSizeImage(nodeId, 0) || image;
        if (!masterSrc) return;

        const thisOpId = ++operationIdRef.current;
        setIsSlicing(true);
        try {
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
                setFullSizeImage(nodeId, idx + 1, slice);
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
    }, [getFullSizeImage, nodeId, image, setFullSizeImage, handleValueUpdate, mode, grid, gridAssetName, parsedValueRef, batchFilesRef, selectedRefIndexRef, individualGridSettingsRef, setBatchFiles]);

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
            selectedCells: undefined,
            colDividers: undefined,
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

    return {
        isSlicing,
        setIsSlicing,
        operationIdRef,
        gridAssetName,
        setGridAssetName,
        localBorderWidth,
        borderDebounceTimerRef,
        activeGridConfig,
        activeCropRect,
        updateSingleCropSlice,
        updateGridSlices,
        applyAspectCrop,
        handleResetCrop,
        updateGridDims,
        updateGridBorderConfig,
        handleBorderWidthInputChange,
        handleBorderWidthInputCommit,
        handleGridAssetNameChange
    };
};
