import React, { useState } from 'react';
import { ActionButton } from '../../ActionButton';
import { ImageInputCropRect } from './types';
import { setupImageDragData, getImageTimestampString } from '../../../utils/imageUtils';

interface SingleCropPreviewProps {
    nodeId: string;
    croppedImage?: string | null;
    cropRect: ImageInputCropRect | null;
    imageNaturalSize?: { width: number; height: number } | null;
    getFullSizeImage?: (nodeId: string, frameNumber: number) => string | undefined;
    onCopyImageToClipboard?: (src: string) => void;
    onDownloadImage?: (nodeId: string) => void;
    addToast?: (message: string, type?: any) => void;
    onImageClick?: (e: React.MouseEvent) => void;
}

export const SingleCropPreview: React.FC<SingleCropPreviewProps> = ({
    nodeId,
    croppedImage,
    cropRect,
    imageNaturalSize,
    getFullSizeImage,
    onCopyImageToClipboard,
    addToast,
    onImageClick,
}) => {
    const [copied, setCopied] = useState(false);

    const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, 1) : null;
    const activeImage = fullRes || croppedImage;

    const pixelWidth = (imageNaturalSize && cropRect)
        ? Math.round(cropRect.width * imageNaturalSize.width)
        : null;
    const pixelHeight = (imageNaturalSize && cropRect)
        ? Math.round(cropRect.height * imageNaturalSize.height)
        : null;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeImage && onCopyImageToClipboard) {
            onCopyImageToClipboard(activeImage);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
            if (addToast) addToast('Обрезанное изображение скопировано', 'success');
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeImage) {
            const a = document.createElement('a');
            a.href = activeImage;
            a.download = `crop_${pixelWidth || 'custom'}x${pixelHeight || 'custom'}_${getImageTimestampString()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (addToast) addToast('Обрезанное изображение сохранено', 'success');
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        if (!activeImage) return;
        const filename = `Crop_${pixelWidth || 'custom'}x${pixelHeight || 'custom'}_${getImageTimestampString()}.png`;
        setupImageDragData(e, activeImage, filename);
        e.stopPropagation();
    };

    if (!activeImage) return null;

    return (
        <div className="w-full flex flex-col gap-2 pt-2 border-t border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>Фрагмент (Single Crop)</span>
                    {pixelWidth && pixelHeight && (
                        <span className="text-[10px] text-cyan-400/90 font-mono bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.2 rounded ml-1">
                            {pixelWidth} × {pixelHeight} px
                        </span>
                    )}
                </span>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded text-[11px] font-medium transition-colors"
                        title="Скопировать в буфер"
                    >
                        {copied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                        <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium shadow-sm transition-colors"
                        title="Скачать фрагмент в полном качестве (PNG)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Скачать PNG</span>
                    </button>
                </div>
            </div>

            {/* Preview Box with Drag-and-Drop capability */}
            <div className="w-full flex items-center gap-3 p-1.5 bg-gray-950/70 border border-gray-800 rounded-md">
                <div
                    draggable={true}
                    onDragStart={handleDragStart}
                    onClick={onImageClick}
                    className="relative flex-shrink-0 w-24 h-24 bg-gray-900 border border-cyan-500/40 hover:border-cyan-400 rounded overflow-hidden group cursor-grab active:cursor-grabbing transition-all shadow-md"
                    title="Потяните, чтобы вытащить изображение на холст или в другую ноду"
                >
                    <img
                        src={activeImage}
                        alt="Cropped preview"
                        className="w-full h-full object-contain pointer-events-none"
                    />

                    {/* Drag Hint Indicator */}
                    <div className="absolute top-1 left-1 bg-black/80 text-cyan-300 text-[9px] font-mono px-1 rounded flex items-center gap-0.5 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                        <span>Drag</span>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <ActionButton
                            title="Скопировать"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </ActionButton>
                        <ActionButton
                            title="Скачать PNG"
                            onClick={handleDownload}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </ActionButton>
                    </div>
                </div>

                {/* Info Text & Drag Guide */}
                <div className="flex flex-col gap-1 text-xs text-gray-300 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Готов к использованию</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight">
                        Перетащите миниатюру или рамку кропа мышью на холст, чтобы создать новую ноду изображения или подключить в другие ноды.
                    </p>
                </div>
            </div>
        </div>
    );
};
