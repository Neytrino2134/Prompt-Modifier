import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import type { NodeContentProps } from '../../types';
import { NodeType } from '../../types';
import { readPromptFromPNG } from '../../utils/pngMetadata';
import { ActionButton } from '../ActionButton';
import { Tooltip } from '../Tooltip';
import ImageEditorModal from '../ImageEditorModal';
import { generateThumbnail, cropImageNormalized, sliceImageGrid, setupImageDragData, getImageTimestampString } from '../../utils/imageUtils';
import { useAppContext } from '../../contexts/AppContext';
import { expandImageAspectRatio } from '../../services/imageActions';
import { CopyIcon } from '../../components/icons/AppIcons';
import { ImageCropOverlay } from './image-input/ImageCropOverlay';
import { ImageGridOverlay } from './image-input/ImageGridOverlay';
import { ImageSlicesPreview } from './image-input/ImageSlicesPreview';
import { SingleCropPreview } from './image-input/SingleCropPreview';
import { BatchProcessingPanel } from './image-input/BatchProcessingPanel';
import { ImageBatchItem, ImageBatchSubMode, ImageInputCropRect, ImageInputGridConfig, ImageInputMode, ImageInputValue } from './image-input/types';

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
        grid = { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } }, 
        batchConfig,
        batchFiles: initialBatchFiles = [],
        extractedImages = [],
        showSlicesDrawer = true,
        showControls = false
    } = parsedValue;

    // State for batch processing mode
    const [batchFiles, setBatchFiles] = useState<ImageBatchItem[]>(() => initialBatchFiles);
    const [selectedRefIndex, setSelectedRefIndex] = useState<number>(0);
    const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentName: string; percent: number } | null>(null);
    const [batchResult, setBatchResult] = useState<{ zipBlob: Blob; totalImages: number; totalSlices: number; timestamp: string; filename: string } | null>(null);
    const abortBatchRef = useRef<boolean>(false);

    // Synchronize batchFiles from node value if changed externally (e.g. sent from TaskQueue Batch Job)
    useEffect(() => {
        if (parsedValue.batchFiles && Array.isArray(parsedValue.batchFiles) && parsedValue.batchFiles.length > 0) {
            setBatchFiles(prev => {
                if (prev.length === parsedValue.batchFiles!.length && prev[0]?.id === parsedValue.batchFiles![0]?.id) {
                    return prev;
                }
                return parsedValue.batchFiles!;
            });
        }
    }, [parsedValue.batchFiles]);

    // Direct React state for batchSubMode to guarantee instant responsiveness and zero race conditions
    const [batchSubMode, setBatchSubMode] = useState<ImageBatchSubMode>(() => {
        return batchConfig?.subMode || 'crop';
    });

    const [includeOriginal, setIncludeOriginal] = useState<boolean>(() => {
        return batchConfig?.includeOriginal ?? false;
    });

    // Synchronize batchSubMode and includeOriginal if external node value changed
    useEffect(() => {
        if (batchConfig?.subMode && batchConfig.subMode !== batchSubMode) {
            setBatchSubMode(batchConfig.subMode);
        }
        if (batchConfig?.includeOriginal !== undefined && batchConfig.includeOriginal !== includeOriginal) {
            setIncludeOriginal(batchConfig.includeOriginal);
        }
    }, [batchConfig?.subMode, batchConfig?.includeOriginal]);

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
    const updateSingleCropSlice = useCallback(async (rect: ImageInputCropRect, explicitMode?: ImageInputMode, overrideSrc?: string) => {
        const masterSrc = overrideSrc || getFullSizeImage(node.id, 0) || image;
        if (!masterSrc) return;

        const thisOpId = ++operationIdRef.current;

        try {
            const highResCrop = await cropImageNormalized(masterSrc, rect);
            if (thisOpId !== operationIdRef.current) return;

            setFullSizeImage(node.id, 1, highResCrop);
            const thumb = await generateThumbnail(highResCrop, 256, 256);
            if (thisOpId !== operationIdRef.current) return;

            const updates: Partial<ImageInputValue> = {
                cropRect: rect,
                croppedImage: thumb
            };
            if (explicitMode) {
                updates.mode = explicitMode;
            }
            handleValueUpdate(updates);
        } catch (e) {
            console.error('Error cropping image:', e);
        }
    }, [getFullSizeImage, node.id, image, setFullSizeImage, handleValueUpdate]);

    // Update grid slices at full resolution
    const updateGridSlices = useCallback(async (gridConfig: ImageInputGridConfig, explicitMode?: ImageInputMode, overrideSrc?: string) => {
        const masterSrc = overrideSrc || getFullSizeImage(node.id, 0) || image;
        if (!masterSrc) return;

        const thisOpId = ++operationIdRef.current;
        setIsSlicing(true);
        try {
            const cols = Math.max(1, gridConfig.cols || 4);
            const rows = Math.max(1, gridConfig.rows || 5);
            const bounds = gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 };
            const borderConfig = {
                enableBorder: gridConfig.enableBorder,
                borderWidth: gridConfig.borderWidth,
                borderMode: gridConfig.borderMode
            };

            const { slices, thumbs } = await sliceImageGrid(masterSrc, cols, rows, bounds, borderConfig);
            if (thisOpId !== operationIdRef.current) return;

            // Store full-res slices in cache frames 1..N
            slices.forEach((slice, idx) => {
                setFullSizeImage(node.id, idx + 1, slice);
            });

            const updates: Partial<ImageInputValue> = {
                grid: gridConfig,
                extractedImages: thumbs
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
    }, [getFullSizeImage, node.id, image, setFullSizeImage, handleValueUpdate]);

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

        if (isNewImage) {
            if (mode === 'single') {
                const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                updateSingleCropSlice(activeCrop, undefined, masterSrc);
            } else if (mode === 'grid') {
                const activeGrid = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                updateGridSlices(activeGrid, undefined, masterSrc);
            }
        } else if (isFirstLoad) {
            if (mode === 'single' && !croppedImage) {
                const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                updateSingleCropSlice(activeCrop, undefined, masterSrc);
            } else if (mode === 'grid' && (!extractedImages || extractedImages.length === 0)) {
                const activeGrid = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                updateGridSlices(activeGrid, undefined, masterSrc);
            }
        }
    }, [fullResImage, image, mode, updateSingleCropSlice, updateGridSlices, cropRect, grid, croppedImage, extractedImages]);

    const handleImageChange = async (dataUrl: string) => {
        const promptFromMeta = await readPromptFromPNG(dataUrl);
        setMetadataPrompt(promptFromMeta);
        
        // Generate thumbnail to keep node.value small
        const thumbnail = await generateThumbnail(dataUrl, 256, 256);
        
        // Save high-res to cache (index 0)
        setFullSizeImage(node.id, 0, dataUrl);
        
        // Refresh slices if in single or grid mode
        if (mode === 'single') {
            const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            const highResCrop = await cropImageNormalized(dataUrl, activeCrop);
            setFullSizeImage(node.id, 1, highResCrop);
            const cropThumb = await generateThumbnail(highResCrop, 256, 256);
            handleValueUpdate({ image: thumbnail, croppedImage: cropThumb });
        } else if (mode === 'grid') {
            const activeGrid = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
            const { slices, thumbs } = await sliceImageGrid(
                dataUrl, 
                activeGrid.cols, 
                activeGrid.rows, 
                activeGrid.bounds,
                {
                    enableBorder: activeGrid.enableBorder,
                    borderWidth: activeGrid.borderWidth,
                    borderMode: activeGrid.borderMode
                }
            );
            slices.forEach((slice, idx) => setFullSizeImage(node.id, idx + 1, slice));
            handleValueUpdate({ image: thumbnail, extractedImages: thumbs });
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
                newItems.push({
                    id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
                    name: file.name,
                    dataUrl,
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

        // If batch was empty or no image yet, configure the first file as the active reference template
        if (isInitialBatch || !image) {
            setSelectedRefIndex(0);
            const firstItem = newItems[0];
            setFullSizeImage(node.id, 0, firstItem.dataUrl);
            const thumb = await generateThumbnail(firstItem.dataUrl, 256, 256);
            
            if (batchSubMode === 'crop') {
                const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                updateSingleCropSlice(activeCrop, 'batch', firstItem.dataUrl);
            } else {
                const activeGrid = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                updateGridSlices(activeGrid, 'batch', firstItem.dataUrl);
            }
            handleValueUpdate({ image: thumb, mode: 'batch', batchFiles: updatedFiles });
        } else {
            handleValueUpdate({ batchFiles: updatedFiles });
        }

        if (addToast) {
            addToast(`Загружено ${newItems.length} изображений для пакетной обработки`, 'success');
        }
    };

    const handleSelectReferenceIndex = async (index: number) => {
        if (index < 0 || index >= batchFiles.length) return;
        setSelectedRefIndex(index);
        const item = batchFiles[index];
        setFullSizeImage(node.id, 0, item.dataUrl);
        const thumb = await generateThumbnail(item.dataUrl, 256, 256);

        if (batchSubMode === 'crop') {
            const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            updateSingleCropSlice(activeCrop, 'batch', item.dataUrl);
        } else {
            const activeGrid = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
            updateGridSlices(activeGrid, 'batch', item.dataUrl);
        }
        handleValueUpdate({ image: thumb, batchFiles });
    };

    const handleRemoveBatchFile = (index: number) => {
        const updated = batchFiles.filter((_, i) => i !== index);
        setBatchFiles(updated);
        handleValueUpdate({ batchFiles: updated });
        if (updated.length === 0) {
            setSelectedRefIndex(0);
        } else if (selectedRefIndex >= updated.length) {
            const nextIdx = updated.length - 1;
            setSelectedRefIndex(nextIdx);
            handleSelectReferenceIndex(nextIdx);
        }
    };

    const handleClearBatch = () => {
        setBatchFiles([]);
        setSelectedRefIndex(0);
        setBatchResult(null);
        setBatchProgress(null);
        handleValueUpdate({ batchFiles: [] });
        if (addToast) addToast('Пакет изображений очищен', 'info');
    };

    const syncFromUpstream = useCallback(async (forcedImages?: string[]) => {
        const imgs = forcedImages || upstreamImages;
        if (imgs.length === 0) return;

        const newItems: ImageBatchItem[] = imgs.map((dataUrl, i) => ({
            id: `upstream-batch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
            name: `Sequence_Frame_${String(i + 1).padStart(3, '0')}.png`,
            dataUrl,
            size: Math.round(dataUrl.length * 0.75)
        }));

        setBatchFiles(newItems);
        setSelectedRefIndex(0);
        const firstItem = newItems[0];
        setFullSizeImage(node.id, 0, firstItem.dataUrl);
        const thumb = await generateThumbnail(firstItem.dataUrl, 256, 256);

        if (batchSubMode === 'crop') {
            const activeCrop = parsedValueRef.current.cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            updateSingleCropSlice(activeCrop, 'batch', firstItem.dataUrl);
        } else {
            const activeGrid = parsedValueRef.current.grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
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
        
        const isFirstConnection = prevUpstreamSigRef.current === '' && sig !== '';
        prevUpstreamSigRef.current = sig;

        if (upstreamImages.length > 0) {
            if (mode === 'batch' || upstreamImages.length > 1 || (isFirstConnection && !image)) {
                syncFromUpstream(upstreamImages);
            } else if (upstreamImages.length === 1 && !image) {
                handleImageChange(upstreamImages[0]);
            }
        }
    }, [upstreamImages, mode, image, syncFromUpstream, handleImageChange]);

    const handleBatchSubModeChange = (newSubMode: ImageBatchSubMode) => {
        setBatchSubMode(newSubMode);
        const currentBatchConfig = parsedValueRef.current.batchConfig || {};
        const updatedBatchConfig = {
            ...currentBatchConfig,
            subMode: newSubMode,
            includeOriginal
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
                const activeGrid = parsedValueRef.current.grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                updateGridSlices(activeGrid, 'batch', currentMaster);
            }
        }
    };

    const handleIncludeOriginalChange = (newInclude: boolean) => {
        setIncludeOriginal(newInclude);
        const currentBatchConfig = parsedValueRef.current.batchConfig || { subMode: batchSubMode };
        const updatedBatchConfig = {
            ...currentBatchConfig,
            includeOriginal: newInclude
        };
        handleValueUpdate({
            batchConfig: updatedBatchConfig
        });
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
            let totalSlicesCount = 0;

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
                const folderName = `${String(i + 1).padStart(2, '0')}_${cleanBaseName}`;
                const folder = zip.folder(folderName) || zip;

                // 1. If includeOriginal is requested, write full uncropped original image in this subfolder
                if (includeOriginal && item.dataUrl) {
                    const dataParts = item.dataUrl.split(',');
                    if (dataParts.length > 1) {
                        const mimeMatch = item.dataUrl.match(/data:([^;]+);/);
                        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                        const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
                        folder.file(`original_${cleanBaseName}.${ext}`, dataParts[1], { base64: true });
                        totalSlicesCount += 1;
                    }
                }

                // 2. Process crop or grid slices
                if (batchSubMode === 'crop') {
                    const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                    const croppedDataUrl = await cropImageNormalized(item.dataUrl, activeCrop);
                    const base64Data = croppedDataUrl.split(',')[1];
                    folder.file(`crop_${cleanBaseName}.png`, base64Data, { base64: true });
                    totalSlicesCount += 1;
                } else {
                    const activeGrid = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                    const { slices } = await sliceImageGrid(
                        item.dataUrl,
                        activeGrid.cols,
                        activeGrid.rows,
                        activeGrid.bounds,
                        {
                            enableBorder: activeGrid.enableBorder,
                            borderWidth: activeGrid.borderWidth,
                            borderMode: activeGrid.borderMode
                        }
                    );

                    for (let s = 0; s < slices.length; s++) {
                        const sliceData = slices[s];
                        const base64Data = sliceData.split(',')[1];
                        const row = Math.floor(s / activeGrid.cols) + 1;
                        const col = (s % activeGrid.cols) + 1;
                        const sliceFileName = `slice_${String(s + 1).padStart(3, '0')}_r${row}_c${col}.png`;
                        folder.file(sliceFileName, base64Data, { base64: true });
                        totalSlicesCount += 1;
                    }
                }

                // Small micro-delay to let React render progress bar smoothly
                await new Promise(resolve => setTimeout(resolve, 15));
            }

            // Generate ZIP archive blob with STORE (fastest, no extra compression overhead for PNGs)
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'STORE'
            });

            const zipFilename = `Batch_${batchSubMode === 'crop' ? 'Crop' : `Grid_${grid?.cols || 4}x${grid?.rows || 5}`}_${batchFiles.length}_images_${timestamp}.zip`;

            const result = {
                zipBlob,
                totalImages: batchFiles.length,
                totalSlices: totalSlicesCount,
                timestamp,
                filename: zipFilename
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
                  if (mode === 'batch') {
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
            if (mode === 'batch') {
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
                 x: node.position.x + (node.width || 380) + GAP, 
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
                const cols = grid?.cols || 4;
                const rows = grid?.rows || 5;
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

        if (newMode === 'single') {
            const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
            updateSingleCropSlice(activeCrop, 'single');
        } else if (newMode === 'grid') {
            const activeGrid = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
            const expectedTotal = (activeGrid.cols || 4) * (activeGrid.rows || 5);
            if (!extractedImages || extractedImages.length !== expectedTotal) {
                updateGridSlices(activeGrid, 'grid');
            }
        } else if (newMode === 'batch') {
            const masterSrc = batchFiles[selectedRefIndex]?.dataUrl || getFullSizeImage(node.id, 0) || image;
            if (masterSrc) {
                if (batchSubMode === 'crop') {
                    const activeCrop = cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
                    updateSingleCropSlice(activeCrop, 'batch', masterSrc);
                } else {
                    const activeGrid = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
                    updateGridSlices(activeGrid, 'batch', masterSrc);
                }
            }
        }
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
        const newGrid: ImageInputGridConfig = {
            ...(grid || {}),
            cols: safeCols,
            rows: safeRows,
            bounds: grid?.bounds || { x: 0, y: 0, width: 1, height: 1 },
            selectedCells: undefined // reset selection to all
        };
        updateGridSlices(newGrid, mode);
    };

    const updateGridBorderConfig = (borderUpdates: Partial<ImageInputGridConfig>) => {
        const currentGrid: ImageInputGridConfig = grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } };
        const newGrid: ImageInputGridConfig = {
            ...currentGrid,
            ...borderUpdates,
            selectedCells: undefined
        };
        updateGridSlices(newGrid, mode);
    };

    return (
        <div className="flex flex-col h-full space-y-2 select-none" data-node-id={node.id}>
            <ImageEditorModal 
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onApply={handleApplyEdit}
                imageSrc={getFullSizeImage(node.id, 0) || image}
            />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <input ref={batchFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBatchFileInputChange} />
            
            {/* Top Mode Selector Bar */}
            <div className="flex items-center justify-between bg-gray-900/90 border border-gray-700/80 p-1 rounded-md text-xs">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMode('full');
                        }}
                        className={`px-2 py-1 rounded font-medium transition-all ${
                            mode === 'full' 
                                ? 'bg-accent text-white shadow-sm font-semibold' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`}
                    >
                        Обычный
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMode('single');
                        }}
                        className={`px-2 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                            mode === 'single' 
                                ? 'bg-cyan-600 text-white shadow-sm font-semibold ring-1 ring-cyan-400' 
                                : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                        }`}
                    >
                        <span>✂ Single Crop</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMode('grid');
                        }}
                        className={`px-2 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                            mode === 'grid' 
                                ? 'bg-cyan-600 text-white shadow-sm font-semibold ring-1 ring-cyan-400' 
                                : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                        }`}
                    >
                        <span>▦ Multiple Grid</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMode('batch');
                        }}
                        className={`px-2 py-1 rounded font-medium transition-all flex items-center gap-1 ${
                            mode === 'batch' 
                                ? 'bg-cyan-600 text-white shadow-sm font-semibold ring-1 ring-cyan-400' 
                                : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                        }`}
                    >
                        <span>📦 Batch</span>
                    </button>
                </div>

                {/* Mode Status Pill */}
                <div className="text-[10px] text-gray-400 font-mono pr-1 truncate max-w-[140px]">
                    {mode === 'full' && 'Full image'}
                    {mode === 'single' && 'Active selection -> output'}
                    {mode === 'grid' && `${(grid?.cols || 4) * (grid?.rows || 5)} assets pack`}
                    {mode === 'batch' && (batchFiles.length > 0 ? `${batchFiles.length} files (${batchSubMode})` : 'Batch mode')}
                </div>
            </div>

            {/* Batch Sub-Mode Selector: Placed directly under Batch tab */}
            {mode === 'batch' && (
                <div className="flex items-center justify-between bg-cyan-950/60 border border-cyan-700/60 px-2 py-1.5 rounded-md text-xs animate-fadeIn">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-cyan-300 font-semibold text-[11px] mr-1">Режим обработки:</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBatchSubModeChange('crop');
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                                batchSubMode === 'crop'
                                    ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                                    : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <span>✂ Кадрирование (Crop)</span>
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBatchSubModeChange('grid');
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                                batchSubMode === 'grid'
                                    ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                                    : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <span>▦ Сетка ({grid?.cols || 4}×{grid?.rows || 5})</span>
                        </button>
                    </div>

                    <div className="text-[10px] text-cyan-400 font-mono hidden sm:inline">
                        {batchFiles.length > 0 ? `Файлов: ${batchFiles.length}` : 'Пакетный режим'}
                    </div>
                </div>
            )}

            {/* Mode-Specific Quick Sub-Toolbar: Crop Presets */}
            {image && (mode === 'single' || (mode === 'batch' && batchSubMode === 'crop')) && (
                <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-800/40 px-2 py-1 rounded-md text-[11px] text-cyan-200 animate-fadeIn">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-cyan-300">Пресеты {mode === 'batch' ? 'для пакета' : ''}:</span>
                        <button onClick={() => applyAspectCrop('1:1')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">1:1</button>
                        <button onClick={() => applyAspectCrop('16:9')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">16:9</button>
                        <button onClick={() => applyAspectCrop('9:16')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">9:16</button>
                        <button onClick={() => applyAspectCrop('4:3')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">4:3</button>
                        <button onClick={() => applyAspectCrop('3:4')} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-800 rounded font-mono">3:4</button>
                        <button onClick={handleResetCrop} className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded">Весь кадр</button>
                    </div>
                    <span className="text-[10px] text-cyan-400/80 font-mono hidden sm:inline">Качество 100% (Без сжатия)</span>
                </div>
            )}

            {/* Mode-Specific Quick Sub-Toolbar: Grid Settings */}
            {image && (mode === 'grid' || (mode === 'batch' && batchSubMode === 'grid')) && (
                <div className="flex flex-col gap-1.5 bg-cyan-950/40 border border-cyan-800/40 p-2 rounded-md text-xs text-cyan-200 animate-fadeIn">
                    {/* Row 1: Grid Dimensions (Cols/Rows) and Presets */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Columns (X) */}
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-cyan-300 text-[11px]">Столбцы (X):</span>
                                <div className="flex items-center bg-gray-900 border border-cyan-700/50 rounded overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => updateGridDims((grid?.cols || 4) - 1, grid?.rows || 5)}
                                        className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                                    >
                                        -
                                    </button>
                                    <span className="px-2 py-0.5 text-center font-mono font-bold text-cyan-200 text-xs">
                                        {grid?.cols || 4}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => updateGridDims((grid?.cols || 4) + 1, grid?.rows || 5)}
                                        className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Rows (Y) */}
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-cyan-300 text-[11px]">Строки (Y):</span>
                                <div className="flex items-center bg-gray-900 border border-cyan-700/50 rounded overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => updateGridDims(grid?.cols || 4, (grid?.rows || 5) - 1)}
                                        className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                                    >
                                        -
                                    </button>
                                    <span className="px-2 py-0.5 text-center font-mono font-bold text-cyan-200 text-xs">
                                        {grid?.rows || 5}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => updateGridDims(grid?.cols || 4, (grid?.rows || 5) + 1)}
                                        className="px-1.5 py-0.5 hover:bg-cyan-800/60 text-cyan-300 font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1 text-[11px] flex-wrap">
                            <button onClick={() => updateGridDims(4, 5)} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-700 font-mono rounded font-bold">4×5</button>
                            <button onClick={() => updateGridDims(3, 3)} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-700 font-mono rounded">3×3</button>
                            <button onClick={() => updateGridDims(2, 2)} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-700 font-mono rounded">2×2</button>
                            <button onClick={() => updateGridDims(5, 4)} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-700 font-mono rounded">5×4</button>
                            <button onClick={() => updateGridDims(4, 4)} className="px-1.5 py-0.5 bg-cyan-900/60 hover:bg-cyan-700 font-mono rounded">4×4</button>
                            <button 
                                onClick={() => updateGridSlices({ ...(grid || { cols: 4, rows: 5 }), bounds: { x: 0, y: 0, width: 1, height: 1 } })} 
                                className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px]"
                                title="Сбросить внешние границы сетки"
                            >
                                Сброс границ
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Border Thickness & Border Mode Controls */}
                    <div className="flex items-center justify-between border-t border-cyan-800/30 pt-1.5 flex-wrap gap-2 text-[11px]">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Toggle Enable Border */}
                            <button
                                type="button"
                                onClick={() => {
                                    const nextEnable = !grid?.enableBorder;
                                    updateGridBorderConfig({
                                        enableBorder: nextEnable,
                                        borderWidth: grid?.borderWidth ?? 24,
                                        borderMode: grid?.borderMode ?? 'inner'
                                    });
                                }}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-medium transition-colors ${
                                    grid?.enableBorder
                                        ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                                        : 'bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-700'
                                }`}
                            >
                                <span className="w-3.5 h-3.5 flex items-center justify-center rounded border border-current text-[10px] font-bold">
                                    {grid?.enableBorder ? '✓' : ''}
                                </span>
                                <span>Толщина границы</span>
                            </button>

                            {/* When Border Enabled: Pixel Thickness Stepper & Presets */}
                            {grid?.enableBorder && (
                                <div className="flex items-center gap-1.5 bg-gray-900/90 border border-cyan-700/60 px-1.5 py-0.5 rounded">
                                    <span className="text-cyan-300 text-[10px] font-semibold">px:</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = grid?.borderWidth ?? 24;
                                            updateGridBorderConfig({ borderWidth: Math.max(1, current - 1) });
                                        }}
                                        className="px-1 py-0.2 hover:bg-cyan-800/70 text-cyan-300 font-bold rounded"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        min={0}
                                        max={300}
                                        value={grid?.borderWidth ?? 24}
                                        onChange={(e) => {
                                            const val = Math.max(0, Math.min(300, parseInt(e.target.value) || 0));
                                            updateGridBorderConfig({ borderWidth: val });
                                        }}
                                        className="w-10 text-center font-mono font-bold bg-transparent text-cyan-200 focus:outline-none focus:bg-gray-800 rounded text-[11px]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = grid?.borderWidth ?? 24;
                                            updateGridBorderConfig({ borderWidth: Math.min(300, current + 1) });
                                        }}
                                        className="px-1 py-0.2 hover:bg-cyan-800/70 text-cyan-300 font-bold rounded"
                                    >
                                        +
                                    </button>

                                    <div className="flex items-center gap-0.5 pl-1 border-l border-gray-700 font-mono text-[10px]">
                                        {[24, 32, 48, 64, 96].map((px) => (
                                             <button
                                                key={px}
                                                type="button"
                                                onClick={() => updateGridBorderConfig({ borderWidth: px })}
                                                className={`px-1 py-0.2 rounded hover:bg-cyan-800/70 ${
                                                    (grid?.borderWidth ?? 24) === px
                                                        ? 'bg-cyan-700 text-white font-bold'
                                                        : 'text-gray-400'
                                                }`}
                                            >
                                                {px}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Border Scope Mode (Inner Only vs All Borders) */}
                        {grid?.enableBorder && (
                            <div className="flex items-center bg-gray-900/90 border border-cyan-700/60 p-0.5 rounded gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => updateGridBorderConfig({ borderMode: 'inner' })}
                                    className={`px-2 py-0.5 rounded transition-all ${
                                        (grid?.borderMode || 'inner') === 'inner'
                                            ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                                            : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                    title="Обрезать только внутренние разделители между ячейками"
                                >
                                    Только центральные
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateGridBorderConfig({ borderMode: 'all' })}
                                    className={`px-2 py-0.5 rounded transition-all ${
                                        grid?.borderMode === 'all'
                                            ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                                            : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                    title="Обрезать все границы: внутренние рамки и внешнюю окантовку"
                                >
                                    Все границы
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Image Container - Grows to fill space */}
            <div className="flex-grow min-h-0 relative group rounded-md overflow-hidden bg-gray-800 border border-gray-700/60 flex flex-col">
                <div
                    onClick={() => {
                        if (!image) {
                            if (mode === 'batch') {
                                batchFileInputRef.current?.click();
                            } else {
                                fileInputRef.current?.click();
                            }
                        }
                    }}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full h-full flex items-center justify-center transition-all relative ${isDragOver ? 'bg-gray-700 ring-2 ring-accent' : 'hover:bg-gray-750'}`}
                >
                    {image ? (
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-1">
                            <div 
                                className="relative max-w-full max-h-full flex items-center justify-center"
                                style={originalDimensions ? {
                                    aspectRatio: `${originalDimensions.width} / ${originalDimensions.height}`,
                                    width: 'auto',
                                    height: 'auto',
                                    maxWidth: '100%',
                                    maxHeight: '100%'
                                } : { width: '100%', height: '100%' }}
                            >
                                <img
                                    src={getFullSizeImage(node.id, 0) || image}
                                    alt="Input"
                                    className="w-full h-full object-contain pointer-events-auto block"
                                    draggable={mode === 'full'}
                                    onMouseDown={(e) => {
                                        if (mode !== 'full') e.stopPropagation();
                                    }}
                                    onClick={handleImageClick}
                                    onDragStart={(e) => {
                                        const imageToDrag = (mode === 'single' ? getFullSizeImage(node.id, 1) : null) || getFullSizeImage(node.id, 0) || image;
                                        if (imageToDrag) {
                                            const filename = `Input_Image_${Date.now()}.png`;
                                            setupImageDragData(e, imageToDrag, filename, metadataPrompt || undefined);
                                            e.stopPropagation();
                                        }
                                    }}
                                />

                                {/* Interactive Overlays: Crop */}
                                {(mode === 'single' || (mode === 'batch' && batchSubMode === 'crop')) && (
                                    <ImageCropOverlay
                                        cropRect={cropRect}
                                        onChangeCropRect={(newRect) => {
                                            updateSingleCropSlice(newRect, mode);
                                        }}
                                        imageNaturalSize={originalDimensions}
                                        nodeId={node.id}
                                        getFullSizeImage={getFullSizeImage}
                                        croppedImageSrc={croppedImage}
                                    />
                                )}

                                {/* Interactive Overlays: Grid */}
                                {(mode === 'grid' || (mode === 'batch' && batchSubMode === 'grid')) && (
                                    <ImageGridOverlay
                                        gridConfig={grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } }}
                                        onChangeGridConfig={(newConfig) => {
                                            updateGridSlices(newConfig, mode);
                                        }}
                                        imageNaturalSize={originalDimensions}
                                        onGetCellImage={(cellIdx) => getFullSizeImage(node.id, cellIdx + 1) || extractedImages?.[cellIdx]}
                                    />
                                )}
                            </div>
                            
                            {/* Original Resolution Info */}
                            {originalDimensions && (
                                <div className="absolute bottom-2 left-2 z-20 bg-black/70 text-gray-300 text-[10px] px-1.5 py-0.5 rounded pointer-events-none backdrop-blur-sm font-mono border border-gray-700/50">
                                    {originalDimensions.width}×{originalDimensions.height} px
                                </div>
                            )}

                            {/* Quick Top Right Action Buttons */}
                            <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-40 bg-black/75 backdrop-blur-sm p-1 rounded-md border border-gray-700/70">
                                <ActionButton title={t('node.action.download')} onClick={handleDownload}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </ActionButton>
                                <ActionButton title={t('node.action.copy')} onClick={handleCopyImage}>
                                    <CopyIcon className="h-4 w-4" />
                                </ActionButton>
                                <ActionButton title={t('node.action.clear')} onClick={handleClearImage}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </ActionButton>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-gray-400 pointer-events-none space-y-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 opacity-60 text-accent">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                            <span className="text-sm font-medium">
                                {mode === 'batch' ? 'Перетащите несколько изображений для пакета' : t('node.content.dropImage')}
                            </span>
                            <span className="text-xs text-gray-500">
                                {mode === 'batch' ? 'Или нажмите, чтобы выбрать файлы' : 'Поддерживает одиночные изображения и сетки ассетов (4x5)'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Compact View Toggle - Bottom Right */}
                <div className="absolute bottom-2 right-2 z-40 flex gap-1 items-center">
                    {!showControls && image && (
                        <>
                             {/* Image to Text */}
                             <Tooltip content={t('node.content.imageToText')}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onImageToText && onImageToText(node.id); }}
                                    disabled={isAnalyzingImage || !onImageToText}
                                    className="p-1 bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAnalyzingImage ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                        </svg>
                                    )}
                                </button>
                            </Tooltip>

                            {/* Raster Editor */}
                            <Tooltip content={t('node.action.rasterEditor')}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsEditorOpen(true); }}
                                    className="p-1 bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors shadow-sm"
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                </button>
                            </Tooltip>

                            {/* Open in AI Editor */}
                            <Tooltip content={mode === 'grid' ? "Открыть всю сетку в AI Editor" : t('node.action.openInAIEditor')}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenInNode(e, NodeType.IMAGE_EDITOR); }}
                                    className={`p-1 rounded transition-colors shadow-sm ${mode === 'grid' ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" />
                                    </svg>
                                </button>
                            </Tooltip>
                        </>
                    )}

                    <Tooltip content={showControls ? "Свернуть панель" : "Развернуть панель"}>
                        <button
                            onClick={handleToggleControls}
                            className="p-1 bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors shadow-sm"
                        >
                            {showControls ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                            )}
                        </button>
                    </Tooltip>
                </div>
            </div>

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
                />
            )}

            {/* Slices Drawer in Grid Mode */}
            {image && mode === 'grid' && extractedImages && extractedImages.length > 0 && (
                <ImageSlicesPreview
                    nodeId={node.id}
                    slices={extractedImages}
                    getFullSizeImage={getFullSizeImage}
                    onCopyImageToClipboard={onCopyImageToClipboard}
                    onDownloadImage={onDownloadImage}
                    addToast={addToast}
                    cols={grid?.cols || 4}
                    rows={grid?.rows || 5}
                />
            )}

            {/* Batch Processing Panel in Batch Mode */}
            {mode === 'batch' && (
                <BatchProcessingPanel
                    nodeId={node.id}
                    batchFiles={batchFiles}
                    selectedReferenceIndex={selectedRefIndex}
                    onSelectReferenceIndex={handleSelectReferenceIndex}
                    onRemoveBatchFile={handleRemoveBatchFile}
                    onClearBatch={handleClearBatch}
                    onAddBatchFiles={(files) => loadMultipleFiles(files)}
                    subMode={batchSubMode}
                    onChangeSubMode={handleBatchSubModeChange}
                    includeOriginal={includeOriginal}
                    onChangeIncludeOriginal={handleIncludeOriginalChange}
                    cropRect={cropRect}
                    gridConfig={grid || { cols: 4, rows: 5, bounds: { x: 0, y: 0, width: 1, height: 1 } }}
                    isProcessing={isBatchProcessing}
                    progress={batchProgress}
                    onStartBatchProcess={handleStartBatchProcess}
                    onCancelBatchProcess={handleCancelBatchProcess}
                    batchResult={batchResult}
                    onDownloadZip={handleDownloadZip}
                    addToast={addToast}
                    upstreamImagesCount={upstreamImages.length}
                    onSyncFromUpstream={() => syncFromUpstream()}
                />
            )}
            
            {/* Controls Section - Slides smoothly down when collapsed without changing node size */}
            <div 
                className={`flex-shrink-0 flex flex-col space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${
                    showControls 
                        ? 'h-[220px] opacity-100 translate-y-0' 
                        : 'h-0 opacity-0 translate-y-8 pointer-events-none'
                }`}
            >
                
                {/* Top Controls Grid */}
                <div className="flex gap-2 shrink-0 h-[80px]">
                    
                    {/* LEFT COLUMN (Process + Small Tools) */}
                    <div className="flex-[1.2] flex flex-col gap-2 min-w-0">
                        {/* Process Button */}
                        <Tooltip content={t('node.action.processImageTitle')} className="w-full">
                            <button
                                onClick={() => onProcessImage(node.id)}
                                disabled={isProcessingImage || !image || !!transformingRatio}
                                className="w-full h-9 px-3 text-sm font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 truncate flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" /></svg>
                                <span className="truncate">{isProcessingImage ? t('node.content.processing') : t('node.action.processImage')}</span>
                            </button>
                        </Tooltip>

                         {/* 4-Button Grid */}
                         <div className="grid grid-cols-4 gap-1 h-9">
                            {/* Analyzer Icon */}
                            <Tooltip content={t('node.action.openInAnalyzer')}>
                                <button
                                    onClick={(e) => handleOpenInNode(e, NodeType.IMAGE_ANALYZER)}
                                    disabled={!image}
                                    className="w-full h-full flex items-center justify-center bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.792V5.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h7.55" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 18.375L21 21" />
                                    </svg>
                                </button>
                            </Tooltip>
                            
                            {/* Image to Text Icon */}
                            <Tooltip content={t('node.content.imageToText')}>
                                <button
                                    onClick={() => onImageToText && onImageToText(node.id)}
                                    disabled={!image || isAnalyzingImage || !onImageToText}
                                    className="w-full h-full flex items-center justify-center bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    {isAnalyzingImage ? (
                                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                        </svg>
                                    )}
                                </button>
                            </Tooltip>

                            {/* 16:9 Button */}
                            <Tooltip content={t('node.action.expand169')}>
                                <button
                                    onClick={() => handleRatioExpand('16:9')}
                                    disabled={!image || isProcessingImage || !!transformingRatio}
                                    className="w-full h-full px-1 text-[10px] font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1"
                                >
                                    {transformingRatio === '16:9' ? <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 hidden sm:block"><rect x="2" y="6" width="20" height="12" rx="2" /></svg>
                                            <span>16:9</span>
                                        </>
                                    )}
                                </button>
                            </Tooltip>
                            
                            {/* 9:16 Button */}
                            <Tooltip content={t('node.action.expand916')}>
                                <button
                                    onClick={() => handleRatioExpand('9:16')}
                                    disabled={!image || isProcessingImage || !!transformingRatio}
                                    className="w-full h-full px-1 text-[10px] font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1"
                                >
                                    {transformingRatio === '9:16' ? <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 hidden sm:block"><rect x="6" y="2" width="12" height="20" rx="2" /></svg>
                                            <span>9:16</span>
                                        </>
                                    )}
                                </button>
                            </Tooltip>
                         </div>
                    </div>

                    {/* RIGHT COLUMN (Editors) */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                        {/* Raster Editor */}
                        <Tooltip content={t('node.action.rasterEditor')} className="w-full">
                            <button
                                onClick={() => setIsEditorOpen(true)}
                                disabled={!image}
                                className="w-full h-9 px-2 text-xs font-bold text-white bg-accent-secondary rounded-md hover:bg-accent-secondary-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                <span className="truncate">{t('node.action.rasterEditor')}</span>
                            </button>
                        </Tooltip>

                        {/* Open in AI Editor Button */}
                        <Tooltip content={mode === 'grid' ? "Открыть все ассеты сетки в AI Editor" : t('node.action.openInAIEditor')} className="w-full">
                            <button
                                onClick={(e) => handleOpenInNode(e, NodeType.IMAGE_EDITOR)}
                                disabled={!image}
                                className={`w-full h-9 px-2 text-xs font-bold text-white rounded-md transition-colors duration-200 flex items-center justify-center gap-1.5 disabled:bg-gray-500 disabled:cursor-not-allowed ${
                                    mode === 'grid' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-md ring-1 ring-cyan-400/50' : 'bg-accent hover:bg-accent-hover'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" />
                                </svg>
                                <span className="truncate">{mode === 'grid' ? 'В AI Editor (Сетка)' : t('node.action.openInAIEditor')}</span>
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {metadataPrompt && (
                    <div className="flex-shrink-0 relative">
                         <div className="absolute top-0 right-0 z-10">
                            <button onClick={() => { handleValueUpdate({ prompt: `${prompt ? prompt + ', ' : ''}${metadataPrompt}` }); setMetadataPrompt(null); }} className="px-2 py-0.5 text-[10px] font-bold bg-accent hover:bg-accent-hover text-white rounded shadow-sm" title={t('node.action.copyPrompt')}>
                                Use
                            </button>
                         </div>
                        <textarea readOnly value={metadataPrompt} placeholder={t('node.content.metadataPromptPlaceholder')} className="w-full p-2 text-xs bg-input/50 rounded-md resize-none focus:outline-none text-gray-400 italic border border-gray-600/50" rows={2} onWheel={e => e.stopPropagation()} onFocus={deselectAllNodes} />
                    </div>
                )}
                
                <div className="flex-grow min-h-0 flex flex-col relative">
                    <textarea
                        value={prompt || ''}
                        onChange={(e) => handleValueUpdate({ prompt: e.target.value })}
                        placeholder={t('node.content.prompt')}
                        className="w-full h-full p-2 bg-[#18202f] border border-gray-600 rounded-md resize-none focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none custom-scrollbar text-sm"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onFocus={deselectAllNodes}
                    />
                     <div className="absolute bottom-2 right-2 opacity-50 hover:opacity-100 transition-opacity">
                        <ActionButton title={t('node.action.copy')} onClick={() => navigator.clipboard.writeText(prompt || '')}>
                            <CopyIcon className="h-4 w-4" />
                        </ActionButton>
                     </div>
                </div>
            </div>
        </div>
    );
};
