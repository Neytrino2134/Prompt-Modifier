import { useCallback } from 'react';
import { NodeType } from '../../../../types';
import { ImageInputCropRect, ImageInputFramesConfig, ImageInputGridConfig, ImageInputMode } from '../types';

interface UseImageInputExportAndDispatchParams {
    nodeId: string;
    nodePosition: { x: number; y: number };
    nodeWidth?: number;
    image: string | null;
    prompt?: string;
    mode: ImageInputMode;
    cropRect: ImageInputCropRect | null;
    croppedImage: string | null;
    grid: ImageInputGridConfig;
    gridAssetName: string;
    extractedImages: string[];
    framesConfig?: ImageInputFramesConfig;
    framesAssetName: string;
    frameImages: string[];
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined | null;
    setFullSizeImage: (nodeId: string, frameIndex: number, dataUrl: string) => void;
    onValueChange: (nodeId: string, value: string) => void;
    addNode?: (type: NodeType, position: { x: number; y: number }, title?: string, options?: any) => string;
    deleteNode?: (nodeId: string) => void;
    setSelectedNodeIds?: (ids: string[]) => void;
    addToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    t: (key: string) => string;
}

export const useImageInputExportAndDispatch = ({
    nodeId,
    nodePosition,
    nodeWidth,
    image,
    prompt,
    mode,
    croppedImage,
    grid,
    gridAssetName,
    extractedImages,
    framesConfig,
    framesAssetName,
    frameImages,
    getFullSizeImage,
    setFullSizeImage,
    onValueChange,
    addNode,
    deleteNode,
    setSelectedNodeIds,
    addToast,
    t
}: UseImageInputExportAndDispatchParams) => {
    const handleOpenInNode = useCallback((e: React.MouseEvent, targetType: NodeType) => {
        if (!addNode) return;

        const fullRes = getFullSizeImage(nodeId, 0) || image;
        if (!fullRes) return;

        let newPosition = { x: nodePosition.x, y: nodePosition.y };

        if (!e.shiftKey) {
             const GAP = 50;
             newPosition = {
                 x: nodePosition.x + (nodeWidth || 600) + GAP,
                 y: nodePosition.y
             };
        }

        const newNodeId = addNode(targetType, newPosition);
        if (!newNodeId) return;

        if (targetType === NodeType.IMAGE_ANALYZER) {
            const activeImage = mode === 'single' ? (croppedImage || image) : image;
            const activeFull = mode === 'single' ? (getFullSizeImage(nodeId, 1) || fullRes) : fullRes;
            onValueChange(newNodeId, JSON.stringify({ image: activeImage, description: '', softPrompt: false }));
            setFullSizeImage(newNodeId, 0, activeFull);
        } else if (targetType === NodeType.IMAGE_EDITOR) {
            if (mode === 'grid' && extractedImages && extractedImages.length > 0) {
                const cols = grid?.cols || 2;
                const rows = grid?.rows || 1;
                const total = cols * rows;
                const activeCells = grid?.selectedCells || Array.from({ length: total }, (_, i) => i);

                const editorThumbnails: string[] = [];
                activeCells.forEach((cellIdx, editorIdx) => {
                    const thumb = extractedImages[cellIdx] || image || '';
                    if (thumb) {
                        editorThumbnails.push(thumb);
                        const cellFull = getFullSizeImage(nodeId, 1 + cellIdx) || thumb;
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
                                const frameFull = getFullSizeImage(nodeId, 1 + globalIdx) || thumb;
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
                const singleFull = getFullSizeImage(nodeId, 1) || fullRes;
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
            deleteNode(nodeId);
        }
    }, [addNode, getFullSizeImage, nodeId, image, nodePosition.x, nodePosition.y, nodeWidth, mode, croppedImage, onValueChange, setFullSizeImage, grid, extractedImages, prompt, addToast, framesConfig, frameImages, setSelectedNodeIds, deleteNode]);

    const handleSendGridSlicesToNote = useCallback(() => {
        if (!addNode) return;
        const cleanAssetName = (gridAssetName || 'Asset_Name').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Name';
        const cols = grid?.cols || 2;
        const references: { id: string; image: string | null; caption: string }[] = [];

        // 1. Original if includeOriginal
        if (grid?.includeOriginal && image) {
            const origFull = getFullSizeImage ? getFullSizeImage(nodeId, 0) : null;
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
                const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, i + 1) : null;
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
            x: nodePosition.x + (nodeWidth || 600) + GAP,
            y: nodePosition.y
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
    }, [addNode, gridAssetName, grid?.cols, grid?.includeOriginal, image, getFullSizeImage, nodeId, nodePosition.x, nodePosition.y, nodeWidth, extractedImages, onValueChange, setSelectedNodeIds, addToast, t]);

    const handleSendFramesToNote = useCallback(() => {
        if (!addNode) return;
        const cleanAssetName = (framesAssetName || 'Asset_Frames').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Frames';
        const frames = framesConfig?.frames || [];
        const references: { id: string; image: string | null; caption: string }[] = [];

        // 1. Original if includeOriginal
        if (framesConfig?.includeOriginal && image) {
            const origFull = getFullSizeImage ? getFullSizeImage(nodeId, 0) : null;
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
                    const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, globalIdx + 1) : null;
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
            x: nodePosition.x + (nodeWidth || 600) + GAP,
            y: nodePosition.y
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
    }, [addNode, framesAssetName, framesConfig?.frames, framesConfig?.includeOriginal, image, getFullSizeImage, nodeId, nodePosition.x, nodePosition.y, nodeWidth, frameImages, onValueChange, setSelectedNodeIds, addToast, t]);

    const handleSendSingleCropToNote = useCallback(() => {
        if (!addNode) return;
        const activeFull = getFullSizeImage ? getFullSizeImage(nodeId, 1) : null;
        const activeImage = activeFull || croppedImage || image;
        if (!activeImage) {
            if (addToast) addToast(t('imageEditor.noImagesToSend') || 'Нет изображения для отправки', 'warning');
            return;
        }

        const GAP = 50;
        const position = {
            x: nodePosition.x + (nodeWidth || 600) + GAP,
            y: nodePosition.y
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
    }, [addNode, getFullSizeImage, croppedImage, image, nodeId, nodePosition.x, nodePosition.y, nodeWidth, onValueChange, setSelectedNodeIds, addToast, t]);

    return {
        handleOpenInNode,
        handleSendGridSlicesToNote,
        handleSendFramesToNote,
        handleSendSingleCropToNote
    };
};
