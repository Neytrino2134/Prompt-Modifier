import { useState, useCallback, useRef } from 'react';
import { cropImageNormalized, generateThumbnail, getEffectiveDividers, getIntervalsFromDividers } from '../../../../utils/imageUtils';
import { ImageInputFramesConfig, ImageInputFrameItem, ImageInputCropRect, ImageInputMode, ImageInputValue } from '../types';

interface UseImageInputFramesParams {
    nodeId: string;
    image: string | null;
    mode: ImageInputMode;
    framesConfig?: ImageInputFramesConfig;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined | null;
    setFullSizeImage: (nodeId: string, frameIndex: number, dataUrl: string) => void;
    handleValueUpdate: (updates: Partial<ImageInputValue>) => void;
    parsedValueRef: React.MutableRefObject<ImageInputValue>;
    operationIdRef: React.MutableRefObject<number>;
    setIsSlicing: (isSlicing: boolean) => void;
    originalDimensions: { width: number; height: number } | null;
}

export const useImageInputFrames = ({
    nodeId,
    image,
    mode,
    framesConfig,
    getFullSizeImage,
    setFullSizeImage,
    handleValueUpdate,
    parsedValueRef,
    operationIdRef,
    setIsSlicing,
    originalDimensions
}: UseImageInputFramesParams) => {
    const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(() => framesConfig?.selectedFrameIndex ?? 0);
    const [framesAssetName, setFramesAssetName] = useState<string>(() => framesConfig?.assetName || 'Asset_Frames');

    const updateMultipleFramesSlices = useCallback(async (
        config: ImageInputFramesConfig,
        explicitMode?: ImageInputMode,
        overrideSrc?: string,
        overrideThumbnail?: string
    ) => {
        const masterSrc = overrideSrc || getFullSizeImage(nodeId, 0) || image;
        if (!masterSrc) return;

        const thisOpId = ++operationIdRef.current;
        setIsSlicing(true);
        try {
            const currentFrames = config.frames || [];
            if (currentFrames.length === 0) {
                handleValueUpdate({
                    framesConfig: config,
                    frameImages: [],
                    ...(overrideThumbnail ? { image: overrideThumbnail } : {}),
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
                setFullSizeImage(nodeId, idx + 1, crop);
            });

            const thumbPromises = highResCrops.map(crop => generateThumbnail(crop, 512, 512));
            const thumbs = await Promise.all(thumbPromises);
            if (thisOpId !== operationIdRef.current) return;

            const fullConfig: ImageInputFramesConfig = {
                ...config,
                assetName: config.assetName || framesAssetName || 'Asset_Frames'
            };

            const updates: Partial<ImageInputValue> = {
                framesConfig: fullConfig,
                frameImages: thumbs,
                ...(overrideThumbnail ? { image: overrideThumbnail } : {})
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
    }, [getFullSizeImage, nodeId, image, setFullSizeImage, handleValueUpdate, framesAssetName, operationIdRef, setIsSlicing]);

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

    return {
        selectedFrameIndex,
        setSelectedFrameIndex,
        framesAssetName,
        setFramesAssetName,
        updateMultipleFramesSlices,
        handleAddFrame,
        handleDuplicateFrame,
        handleDeleteSelectedFrame,
        handleClearAllFrames,
        updateSelectedFrameGrid,
        applyFramesPresetLayout,
        applyAspectToSelectedFrame,
        updateSelectedFrameDimensions,
        resetSelectedFrameDividers
    };
};
