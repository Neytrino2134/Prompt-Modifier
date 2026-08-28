import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ImageInputCropRect } from './types';
import { setupImageDragData } from '../../../utils/imageUtils';

interface ImageCropOverlayProps {
    cropRect: ImageInputCropRect | null;
    onChangeCropRect: (rect: ImageInputCropRect) => void;
    imageNaturalSize?: { width: number; height: number } | null;
    viewScale?: number;
    nodeId?: string;
    getFullSizeImage?: (nodeId: string, frameNumber: number) => string | undefined;
    croppedImageSrc?: string | null;
}

type DragHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'move' | 'create' | null;

export const ImageCropOverlay: React.FC<ImageCropOverlayProps> = ({
    cropRect,
    onChangeCropRect,
    imageNaturalSize,
    nodeId,
    getFullSizeImage,
    croppedImageSrc,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [localRect, setLocalRect] = useState<ImageInputCropRect>(
        cropRect || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
    );
    const [isDragging, setIsDragging] = useState(false);

    const dragStateRef = useRef<{
        handle: DragHandle;
        startX: number;
        startY: number;
        startRect: ImageInputCropRect;
        current: ImageInputCropRect;
    } | null>(null);

    // Sync from external prop when not dragging
    useEffect(() => {
        if (!isDragging && cropRect) {
            setLocalRect(cropRect);
        }
    }, [cropRect, isDragging]);

    const handlePointerDown = (handle: DragHandle, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        const baseRect = localRect;

        if (handle === 'create') {
            const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
            const initial = { x: relX, y: relY, width: 0.01, height: 0.01 };
            dragStateRef.current = {
                handle: 'create',
                startX: clientX,
                startY: clientY,
                startRect: initial,
                current: initial
            };
            setLocalRect(initial);
        } else {
            dragStateRef.current = {
                handle,
                startX: clientX,
                startY: clientY,
                startRect: { ...baseRect },
                current: { ...baseRect }
            };
        }
        setIsDragging(true);
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const dx = (e.clientX - dragState.startX) / rect.width;
        const dy = (e.clientY - dragState.startY) / rect.height;

        let { x, y, width, height } = dragState.startRect;

        if (dragState.handle === 'move') {
            x = Math.max(0, Math.min(1 - width, x + dx));
            y = Math.max(0, Math.min(1 - height, y + dy));
        } else if (dragState.handle === 'create') {
            const currentRelX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const currentRelY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            x = Math.min(dragState.startRect.x, currentRelX);
            y = Math.min(dragState.startRect.y, currentRelY);
            width = Math.max(0.02, Math.abs(currentRelX - dragState.startRect.x));
            height = Math.max(0.02, Math.abs(currentRelY - dragState.startRect.y));
        } else {
            if (dragState.handle?.includes('w')) {
                const newX = Math.max(0, Math.min(x + width - 0.02, x + dx));
                width += x - newX;
                x = newX;
            }
            if (dragState.handle?.includes('e')) {
                width = Math.max(0.02, Math.min(1 - x, width + dx));
            }
            if (dragState.handle?.includes('n')) {
                const newY = Math.max(0, Math.min(y + height - 0.02, y + dy));
                height += y - newY;
                y = newY;
            }
            if (dragState.handle?.includes('s')) {
                height = Math.max(0.02, Math.min(1 - y, height + dy));
            }
        }

        // Clamp values safely
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        width = Math.max(0.02, Math.min(1 - x, width));
        height = Math.max(0.02, Math.min(1 - y, height));

        const updated: ImageInputCropRect = { x, y, width, height };
        dragState.current = updated;
        setLocalRect(updated);
    }, []);

    const handlePointerUp = useCallback(() => {
        if (dragStateRef.current) {
            const finalRect = dragStateRef.current.current;
            dragStateRef.current = null;
            setIsDragging(false);
            onChangeCropRect(finalRect);
        }
    }, [onChangeCropRect]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            return () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
            };
        }
    }, [isDragging, handlePointerMove, handlePointerUp]);

    const handleDragOut = (e: React.DragEvent) => {
        const fullRes = (nodeId && getFullSizeImage) ? getFullSizeImage(nodeId, 1) : null;
        const imgToDrag = fullRes || croppedImageSrc;
        if (imgToDrag) {
            const filename = `Crop_${Date.now()}.png`;
            setupImageDragData(e, imgToDrag, filename);
            e.stopPropagation();
        }
    };

    // Pixel dimensions readout
    const pixelWidth = imageNaturalSize ? Math.round(localRect.width * imageNaturalSize.width) : null;
    const pixelHeight = imageNaturalSize ? Math.round(localRect.height * imageNaturalSize.height) : null;

    const leftPercent = localRect.x * 100;
    const topPercent = localRect.y * 100;
    const widthPercent = localRect.width * 100;
    const heightPercent = localRect.height * 100;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-30 select-none cursor-crosshair overflow-hidden"
            onPointerDown={(e) => handlePointerDown('create', e)}
        >
            {/* Dark Mask Top */}
            <div
                className="absolute left-0 top-0 right-0 bg-black/60 pointer-events-none transition-colors"
                style={{ height: `${topPercent}%` }}
            />
            {/* Dark Mask Bottom */}
            <div
                className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none transition-colors"
                style={{ top: `${topPercent + heightPercent}%` }}
            />
            {/* Dark Mask Left */}
            <div
                className="absolute left-0 bg-black/60 pointer-events-none transition-colors"
                style={{
                    top: `${topPercent}%`,
                    height: `${heightPercent}%`,
                    width: `${leftPercent}%`
                }}
            />
            {/* Dark Mask Right */}
            <div
                className="absolute right-0 bg-black/60 pointer-events-none transition-colors"
                style={{
                    top: `${topPercent}%`,
                    height: `${heightPercent}%`,
                    left: `${leftPercent + widthPercent}%`
                }}
            />

            {/* Selection Box */}
            <div
                className="absolute border-2 border-cyan-400 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.4)] cursor-move"
                style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`
                }}
                onPointerDown={(e) => handlePointerDown('move', e)}
            >
                {/* Center crosshair / grid lines */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30 border border-cyan-300/40">
                    <div className="border-r border-b border-cyan-300/40" />
                    <div className="border-r border-b border-cyan-300/40" />
                    <div className="border-b border-cyan-300/40" />
                    <div className="border-r border-b border-cyan-300/40" />
                    <div className="border-r border-b border-cyan-300/40" />
                    <div className="border-b border-cyan-300/40" />
                    <div className="border-r border-b border-cyan-300/40" />
                    <div className="border-r border-b border-cyan-300/40" />
                    <div />
                </div>

                {/* Dimension & Drag Handle Badge */}
                <div className="absolute -top-7 left-0 flex items-center gap-1 z-40">
                    <div className="bg-gray-900/90 text-cyan-300 text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow border border-cyan-500/40 backdrop-blur-sm pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
                        <span>✂ Region:</span>
                        {pixelWidth && pixelHeight ? (
                            <span>{pixelWidth} × {pixelHeight} px</span>
                        ) : (
                            <span>{Math.round(widthPercent)}% × {Math.round(heightPercent)}%</span>
                        )}
                    </div>

                    {/* Draggable chip to drag cropped image directly out of the frame */}
                    <div
                        draggable={true}
                        onDragStart={handleDragOut}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow border border-cyan-400/80 cursor-grab active:cursor-grabbing flex items-center gap-1 transition-transform hover:scale-105 active:scale-95"
                        title="Потяните мышью, чтобы вытащить фрагмент на холст"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                        <span>Вытащить</span>
                    </div>
                </div>

                {/* Corner Resizer Handles */}
                <div
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('nw', e)}
                />
                <div
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('ne', e)}
                />
                <div
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('sw', e)}
                />
                <div
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('se', e)}
                />

                {/* Edge Midpoint Resizer Handles */}
                <div
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-cyan-500 rounded-sm cursor-ns-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('n', e)}
                />
                <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-cyan-500 rounded-sm cursor-ns-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('s', e)}
                />
                <div
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-cyan-500 rounded-sm cursor-ew-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('w', e)}
                />
                <div
                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-cyan-500 rounded-sm cursor-ew-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('e', e)}
                />
            </div>
        </div>
    );
};
