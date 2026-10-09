import { OptimizedThumbnail } from '../image-editor/OptimizedThumbnail';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { containedImageSize } from '../../../utils/containedImageSize';
import { NodeType } from '../../../types';
import { ActionButton } from '../../ActionButton';
import { Tooltip } from '../../Tooltip';
import { CopyIcon } from '../../icons/AppIcons';
import { setupImageDragData } from '../../../utils/imageUtils';
import { ImageCropOverlay } from './ImageCropOverlay';
import { ImageGridOverlay } from './ImageGridOverlay';
import { ImageFramesOverlay } from './ImageFramesOverlay';
import {
    ImageBatchItem,
    ImageBatchSubMode,
    ImageInputCropRect,
    ImageInputFramesConfig,
    ImageInputGridConfig,
    ImageInputMode,
} from './types';

interface ImageCanvasContainerProps {
    nodeId: string;
    image: string | null;
    mode: ImageInputMode;
    batchSubMode: ImageBatchSubMode;
    batchFiles: ImageBatchItem[];
    isDragOver: boolean;
    originalDimensions: { width: number; height: number } | null;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
    metadataPrompt: string | null;
    prompt?: string;
    croppedImage: string | null;
    extractedImages: string[];
    frameImages: string[];
    activeCropRect: ImageInputCropRect;
    activeGridConfig: ImageInputGridConfig;
    framesConfig?: ImageInputFramesConfig;
    selectedFrameIndex: number;
    showControls: boolean;
    isAnalyzingImage?: boolean;
    t: (key: string) => string;
    onDrop: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onClickContainer: () => void;
    onImageClick: (e: React.MouseEvent) => void;
    onCopyImage: (e: React.MouseEvent) => void;
    onDownload: (e: React.MouseEvent) => void;
    onClearImage: (e: React.MouseEvent) => void;
    onImageToText?: () => void;
    onOpenRasterEditor: () => void;
    onOpenInNode: (e: React.MouseEvent, type: NodeType) => void;
    onToggleControls: (e: React.MouseEvent) => void;
    onNavigateBatch: (direction: 'prev' | 'next') => void;
    onChangeCropRect: (newRect: ImageInputCropRect) => void;
    onChangeGridConfig: (newConfig: ImageInputGridConfig) => void;
    onChangeFramesConfig: (newConfig: ImageInputFramesConfig) => void;
    onSelectFrame: (index: number) => void;
}

export const ImageCanvasContainer: React.FC<ImageCanvasContainerProps> = ({
    nodeId,
    image,
    mode,
    batchSubMode,
    batchFiles,
    isDragOver,
    originalDimensions,
    getFullSizeImage,
    metadataPrompt,
    prompt,
    croppedImage,
    extractedImages,
    frameImages,
    activeCropRect,
    activeGridConfig,
    framesConfig,
    selectedFrameIndex,
    showControls,
    isAnalyzingImage,
    t,
    onDrop,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onClickContainer,
    onImageClick,
    onCopyImage,
    onDownload,
    onClearImage,
    onImageToText,
    onOpenRasterEditor,
    onOpenInNode,
    onToggleControls,
    onNavigateBatch,
    onChangeCropRect,
    onChangeGridConfig,
    onChangeFramesConfig,
    onSelectFrame,
}) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const element = viewportRef.current;
        if (!element) return;
        const measure = () => {
            // client sizes are in canvas coordinates, unaffected by its zoom.
            const width = Math.max(0, element.clientWidth - 8);
            const height = Math.max(0, element.clientHeight - 8);
            setViewportSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const fitted = containedImageSize(viewportSize.width, viewportSize.height, originalDimensions);
    return (
        <div className="flex-grow min-h-0 relative group rounded-md overflow-hidden bg-gray-800 border border-gray-700/60 flex flex-col">
            <div
                ref={viewportRef}
                onClick={onClickContainer}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`w-full h-full flex items-center justify-center transition-all relative ${isDragOver ? 'bg-gray-700 ring-2 ring-accent' : 'hover:bg-gray-750'}`}
            >
                {(image || getFullSizeImage(nodeId, 0)) ? (
                    <div className="relative w-full h-full flex items-center justify-center overflow-visible p-1">
                        <div 
                            className="relative max-w-full max-h-full flex items-center justify-center"
                            style={fitted || { width: '100%', height: '100%' }}
                        >
                            <OptimizedThumbnail size={512}
                                src={getFullSizeImage(nodeId, 0) || image}
                                fallbackSrc={image}
                                width={originalDimensions?.width}
                                height={originalDimensions?.height}
                                alt="Input"
                                className="w-full h-full object-contain pointer-events-auto block"
                                draggable={mode === 'full'}
                                onMouseDown={(e) => {
                                    if (mode !== 'full') e.stopPropagation();
                                }}
                                onClick={onImageClick}
                                onDragStart={(e) => {
                                    const imageToDrag = (mode === 'single' ? getFullSizeImage(nodeId, 1) : null) || getFullSizeImage(nodeId, 0) || image;
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
                                    cropRect={activeCropRect}
                                    onChangeCropRect={onChangeCropRect}
                                    imageNaturalSize={originalDimensions}
                                    nodeId={nodeId}
                                    getFullSizeImage={getFullSizeImage}
                                    croppedImageSrc={croppedImage}
                                />
                            )}

                            {/* Interactive Overlays: Grid */}
                            {(mode === 'grid' || (mode === 'batch' && batchSubMode === 'grid')) && (
                                <ImageGridOverlay
                                    gridConfig={activeGridConfig}
                                    onChangeGridConfig={onChangeGridConfig}
                                    imageNaturalSize={originalDimensions}
                                    onGetCellImage={(cellIdx) => getFullSizeImage(nodeId, cellIdx + 1) || extractedImages?.[cellIdx]}
                                />
                            )}

                            {/* Interactive Overlays: Multiple Frames */}
                            {mode === 'frames' && (
                                <ImageFramesOverlay
                                    framesConfig={framesConfig || { frames: [], selectedFrameIndex: 0 }}
                                    onChangeFramesConfig={onChangeFramesConfig}
                                    selectedFrameIndex={selectedFrameIndex}
                                    onSelectFrame={onSelectFrame}
                                    imageNaturalSize={originalDimensions}
                                    nodeId={nodeId}
                                    getFullSizeImage={getFullSizeImage}
                                    frameThumbnails={frameImages || []}
                                />
                            )}

                            {/* Batch / Multi-image Mode Preview Navigation Arrows */}
                            {(mode === 'batch' || mode === 'full') && batchFiles.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigateBatch('prev');
                                        }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-cyan-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg border border-cyan-500/40 hover:scale-110 active:scale-95"
                                        title="Предыдущее изображение (клавиша ←)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigateBatch('next');
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-cyan-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg border border-cyan-500/40 hover:scale-110 active:scale-95"
                                        title="Следующее изображение (клавиша →)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
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
                            <ActionButton title={t('node.action.download')} onClick={onDownload}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.copy')} onClick={onCopyImage}>
                                <CopyIcon className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton title={t('node.action.clear')} onClick={onClearImage}>
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
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onImageToText && onImageToText(); }}
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
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onOpenRasterEditor(); }}
                                className="p-1 bg-gray-900/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors shadow-sm"
                            >
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                            </button>
                        </Tooltip>

                        {/* Open in AI Editor */}
                        <Tooltip content={mode === 'grid' ? "Открыть всю сетку в AI Editor" : t('node.action.openInAIEditor')}>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onOpenInNode(e, NodeType.IMAGE_EDITOR); }}
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
                        type="button"
                        onClick={onToggleControls}
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
    );
};
