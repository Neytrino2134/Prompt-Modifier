import { useState, useRef, useCallback, useMemo } from 'react';
import { readPromptFromPNG } from '../../../../utils/pngMetadata';
import { getImageTimestampString } from '../../../../utils/imageUtils';
import { expandImageAspectRatio } from '../../../../services/imageActions';
import { Node } from '../../../../types';
import { ImageInputMode, ImageInputValue, ImageBatchItem } from '../types';

interface UseImageInputImportParams {
    nodeId: string;
    nodeValue: string;
    image: string | null;
    prompt?: string;
    mode: ImageInputMode;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined | null;
    setFullSizeImage: (nodeId: string, frameIndex: number, dataUrl: string) => void;
    onValueChange: (nodeId: string, value: string) => void;
    onPasteImage: (nodeId: string, file: File) => void;
    onCopyImageToClipboard?: (dataUrl: string) => void;
    onDownloadImage?: (nodeId: string) => void;
    setImageViewer?: (viewer: any) => void;
    addToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    t: (key: string) => string;
    getUpstreamNodeValues?: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
    parsedValueRef: React.MutableRefObject<ImageInputValue>;
    handleValueUpdate: (updates: Partial<ImageInputValue>) => void;
    loadMultipleFiles: (files: FileList | File[]) => Promise<void>;
    batchFilesRef: React.MutableRefObject<ImageBatchItem[]>;
    refreshSlicesOnImageChange: (dataUrl: string) => Promise<void>;
    croppedImage?: string | null;
}

export const useImageInputImport = ({
    nodeId,
    image,
    prompt,
    mode,
    getFullSizeImage,
    setFullSizeImage,
    onPasteImage,
    onCopyImageToClipboard,
    onDownloadImage,
    setImageViewer,
    addToast,
    t,
    getUpstreamNodeValues,
    handleValueUpdate,
    loadMultipleFiles,
    batchFilesRef,
    refreshSlicesOnImageChange,
    croppedImage
}: UseImageInputImportParams) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const batchFileInputRef = useRef<HTMLInputElement>(null);
    const [metadataPrompt, setMetadataPrompt] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [transformingRatio, setTransformingRatio] = useState<string | null>(null);
    // Incoming stream from upstream connections
    const upstreamData = useMemo(() => {
        if (!getUpstreamNodeValues) return [];
        return getUpstreamNodeValues(nodeId, 'image', undefined, false);
    }, [getUpstreamNodeValues, nodeId]);

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

    const handleImageChange = useCallback(async (dataUrl: string) => {
        const promptFromMeta = await readPromptFromPNG(dataUrl);
        setMetadataPrompt(promptFromMeta);

        // Save high-res to cache slot 0
        setFullSizeImage(nodeId, 0, dataUrl);

        // Update slices & thumbnail
        await refreshSlicesOnImageChange(dataUrl);
    }, [nodeId, setFullSizeImage, refreshSlicesOnImageChange]);

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
                    onPasteImage(nodeId, imageFiles[0]);
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
                    onPasteImage(nodeId, file);
                }
                return;
            }
            if (addToast) addToast('В буфере обмена нет изображений', 'info');
        } catch (err) {
            console.error('Clipboard paste failed:', err);
            if (addToast) addToast('Не удалось прочитать изображение из буфера', 'error');
        }
    }, [mode, loadMultipleFiles, onPasteImage, nodeId, addToast, batchFilesRef]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (e.target.files.length > 1) {
            loadMultipleFiles(e.target.files);
        } else {
            const file = e.target.files[0];
            if (mode === 'batch') {
                loadMultipleFiles([file]);
            } else {
                onPasteImage(nodeId, file);
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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

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
                      onPasteImage(nodeId, file);
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
                onPasteImage(nodeId, file);
            }
        }
    };

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!image) return;

        let fullSizeSrc = getFullSizeImage(nodeId, 0) || image;
        if (mode === 'single') {
            fullSizeSrc = getFullSizeImage(nodeId, 1) || croppedImage || fullSizeSrc;
        }

        if (fullSizeSrc && setImageViewer) {
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
        const fullSizeSrc = (mode === 'single' ? getFullSizeImage(nodeId, 1) : null) || getFullSizeImage(nodeId, 0) || image;
        if (fullSizeSrc && onCopyImageToClipboard) {
            onCopyImageToClipboard(fullSizeSrc);
            if (addToast) addToast(t('toast.imageCopied'), 'success');
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (mode === 'single') {
            const singleSrc = getFullSizeImage(nodeId, 1) || croppedImage;
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
            onDownloadImage(nodeId);
        }
    };

    const handleClearImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        handleValueUpdate({ image: null, croppedImage: null, extractedImages: [] });
        if (addToast) addToast(t('toast.contentCleared'));
    };

    const handleRatioExpand = async (targetRatio: string) => {
        const fullSizeSrc = getFullSizeImage(nodeId, 0) || image;
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

    return {
        fileInputRef,
        batchFileInputRef,
        metadataPrompt,
        setMetadataPrompt,
        isDragOver,
        isEditorOpen,
        setIsEditorOpen,
        transformingRatio,
        upstreamImages,
        handleImageChange,
        handlePasteFromClipboard,
        handleFileChange,
        handleBatchFileInputChange,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleImageClick,
        handleCopyImage,
        handleDownload,
        handleClearImage,
        handleRatioExpand
    };
};
