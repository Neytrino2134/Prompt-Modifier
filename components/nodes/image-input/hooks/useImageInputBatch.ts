import { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { persistBatchExport, acquireBatchExportBlob, deleteBatchExport } from '../../../../services/batchExportStore';
import { generateThumbnail, cropImageNormalized, sliceImageGrid, getImageTimestampString } from '../../../../utils/imageUtils';
import {
    ImageBatchItem,
    ImageBatchSubMode,
    ImageInputCropRect,
    ImageInputGridConfig,
    ImageInputMode,
    ImageInputValue,
    BatchResultData,
    BatchResultFolder,
    BatchResultFileItem
} from '../types';

interface UseImageInputBatchParams {
    nodeId: string;
    image: string | null;
    mode: ImageInputMode;
    initialBatchFiles?: ImageBatchItem[];
    batchConfig?: {
        subMode?: ImageBatchSubMode;
        includeOriginal?: boolean;
        assetName?: string;
        individualGridSettings?: boolean;
    };
    cropRect: ImageInputCropRect | null;
    grid: ImageInputGridConfig;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined | null;
    setFullSizeImage: (nodeId: string, frameIndex: number, dataUrl: string) => void;
    handleValueUpdate: (updates: Partial<ImageInputValue>) => void;
    parsedValueRef: React.MutableRefObject<ImageInputValue>;
    updateSingleCropSlice: (rect: ImageInputCropRect, explicitMode?: ImageInputMode, overrideSrc?: string, targetRefIndex?: number, overrideThumbnail?: string) => Promise<void>;
    updateGridSlices: (gridConfig: ImageInputGridConfig, explicitMode?: ImageInputMode, overrideSrc?: string, targetRefIndex?: number, overrideThumbnail?: string) => Promise<void>;
    addToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    selectedNodeIds?: string[];
    isNodeHovered: boolean;
    nodeContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const useImageInputBatch = ({
    nodeId,
    image,
    mode,
    initialBatchFiles = [],
    batchConfig,
    cropRect,
    grid,
    getFullSizeImage,
    setFullSizeImage,
    handleValueUpdate,
    parsedValueRef,
    updateSingleCropSlice,
    updateGridSlices,
    addToast,
    selectedNodeIds,
    isNodeHovered,
    nodeContainerRef
}: UseImageInputBatchParams) => {
    const [batchFiles, setBatchFiles] = useState<ImageBatchItem[]>(() => initialBatchFiles);
    const [selectedRefIndex, setSelectedRefIndex] = useState<number>(0);
    const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentName: string; percent: number } | null>(null);
    const [batchResult, setBatchResult] = useState<BatchResultData | null>(null);
    const [isArchiveFolderModalOpen, setIsArchiveFolderModalOpen] = useState<boolean>(false);
    const abortBatchRef = useRef<boolean>(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; abortBatchRef.current = true; };
    }, []);
    useEffect(() => {
        const key = batchResult?.archiveKey;
        return () => { if (key) void deleteBatchExport(key).catch(console.warn); };
    }, [batchResult?.archiveKey]);

    const [batchSubMode, setBatchSubMode] = useState<ImageBatchSubMode>(() => {
        return batchConfig?.subMode || 'crop';
    });

    const [includeOriginal, setIncludeOriginal] = useState<boolean>(() => {
        return batchConfig?.includeOriginal ?? true;
    });

    const [assetName, setAssetName] = useState<string>(() => {
        return batchConfig?.assetName || 'Asset_Name';
    });

    const [individualGridSettings, setIndividualGridSettings] = useState<boolean>(() => {
        return batchConfig?.individualGridSettings ?? false;
    });

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
                    thumbnailUrl = await generateThumbnail(dataUrl, 512, 512);
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
                setFullSizeImage(nodeId, idx, item.dataUrl);
            }
        });

        // If batch was empty or no image yet, configure the first file as the active reference template
        if (isInitialBatch || !image) {
            setSelectedRefIndex(0);
            selectedRefIndexRef.current = 0;
            const firstItem = newItems[0];
            setFullSizeImage(nodeId, 0, firstItem.dataUrl);
            const thumb = await generateThumbnail(firstItem.dataUrl, 512, 512);

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

    const handleSelectReferenceIndex = async (index: number) => {
        if (index < 0 || index >= batchFilesRef.current.length) return;
        selectedRefIndexRef.current = index;
        setSelectedRefIndex(index);
        const item = batchFilesRef.current[index];
        if (!item) return;

        setFullSizeImage(nodeId, 0, item.dataUrl);
        const thumb = await generateThumbnail(item.dataUrl, 512, 512);

        if (mode === 'full') {
            handleValueUpdate({
                image: thumb,
                batchFiles: batchFilesRef.current
            });
            return;
        }

        if (mode === 'single') {
            const currentRootCrop = parsedValueRef.current.cropRect || cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            await updateSingleCropSlice(currentRootCrop, 'single', item.dataUrl, index, thumb);
            return;
        }

        const currentRootGrid = parsedValueRef.current.grid || grid || { cols: 2, rows: 1, bounds: { x: 0, y: 0, width: 1, height: 1 } };
        const globalCols = currentRootGrid.cols || 2;
        const globalRows = currentRootGrid.rows || 1;

        if (mode === 'grid') {
            const activeGrid: ImageInputGridConfig = {
                ...currentRootGrid,
                cols: globalCols,
                rows: globalRows,
                bounds: currentRootGrid.bounds || { x: 0, y: 0, width: 1, height: 1 }
            };
            await updateGridSlices(activeGrid, 'grid', item.dataUrl, index, thumb);
            return;
        }

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

    // Keyboard Arrow navigation
    useEffect(() => {
        if ((mode !== 'batch' && mode !== 'full') || batchFiles.length <= 1) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
                    return;
                }
            }

            const isInside = nodeContainerRef.current?.contains(document.activeElement);
            const isSelected = selectedNodeIds?.includes(nodeId);
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
    }, [mode, batchFiles.length, isNodeHovered, selectedNodeIds, nodeId, handleNavigateBatch, nodeContainerRef]);

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
                setFullSizeImage(nodeId, 0, activeItem.dataUrl);
                generateThumbnail(activeItem.dataUrl, 512, 512).then(thumb => {
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
        if (!forcedImages || forcedImages.length === 0) return;

        const newItems: ImageBatchItem[] = await Promise.all(forcedImages.map(async (dataUrl, i) => {
            let thumbnailUrl: string | undefined;
            try {
                thumbnailUrl = await generateThumbnail(dataUrl, 512, 512);
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
            setFullSizeImage(nodeId, i, item.dataUrl);
        });
        setSelectedRefIndex(0);
        const firstItem = newItems[0];
        setFullSizeImage(nodeId, 0, firstItem.dataUrl);
        const thumb = await generateThumbnail(firstItem.dataUrl, 512, 512);

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
    }, [setFullSizeImage, nodeId, batchSubMode, updateSingleCropSlice, updateGridSlices, handleValueUpdate, addToast, parsedValueRef]);

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

        const currentMaster = batchFiles[selectedRefIndex]?.dataUrl || getFullSizeImage(nodeId, 0) || image;
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
        const rootGrid = parsedValueRef.current.grid || grid;
        const itemGrid = individualGridSettings ? batchFiles[selectedRefIndex]?.gridConfig : undefined;
        const currentActiveGrid: ImageInputGridConfig = {
            ...rootGrid,
            ...itemGrid,
            cols: rootGrid?.cols || 2,
            rows: rootGrid?.rows || 1,
            bounds: itemGrid?.bounds || rootGrid?.bounds || { x: 0, y: 0, width: 1, height: 1 }
        };

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
        const currentMaster = batchFiles[selectedRefIndex]?.dataUrl || getFullSizeImage(nodeId, 0) || image;
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
        const currentMaster = batchFiles[selectedRefIndex]?.dataUrl || getFullSizeImage(nodeId, 0) || image;
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

                await new Promise(resolve => setTimeout(resolve, 15));
            }

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

            try {
                const stored = await persistBatchExport(result);
                if (!mounted.current) {
                    if (stored.archiveKey) await deleteBatchExport(stored.archiveKey);
                    return;
                }
                setBatchResult(stored);
            } catch (error) {
                console.warn('Export storage failed; retaining archive for recovery:', error);
                if (!mounted.current) return;
                setBatchResult(result);
            }

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

    const handleDownloadZip = async () => {
        if (!batchResult) return;
        let blob: Blob;
        try { blob = await acquireBatchExportBlob(batchResult); }
        catch (error) { addToast?.(`Не удалось прочитать ZIP: ${String(error)}`, 'error'); return; }
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = batchResult.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        if (addToast) addToast('ZIP архив скачан повторно', 'success');
    };

    return {
        batchFiles,
        setBatchFiles,
        batchFilesRef,
        selectedRefIndex,
        setSelectedRefIndex,
        selectedRefIndexRef,
        isBatchProcessing,
        batchProgress,
        batchResult,
        isArchiveFolderModalOpen,
        setIsArchiveFolderModalOpen,
        batchSubMode,
        includeOriginal,
        assetName,
        individualGridSettings,
        individualGridSettingsRef,
        loadMultipleFiles,
        handleSelectReferenceIndex,
        handleNavigateBatch,
        handleRemoveBatchFile,
        handleClearBatch,
        syncFromUpstream,
        handleBatchSubModeChange,
        handleIncludeOriginalChange,
        handleAssetNameChange,
        handleIndividualGridSettingsChange,
        handleApplyCurrentGridToAll,
        handleResetGridForAll,
        handleResetGridForCurrent,
        handleStartBatchProcess,
        handleCancelBatchProcess,
        handleDownloadZip
    };
};
