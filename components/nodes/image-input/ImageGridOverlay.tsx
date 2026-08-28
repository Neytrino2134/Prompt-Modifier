import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ImageInputCropRect, ImageInputGridConfig } from './types';
import { setupImageDragData } from '../../../utils/imageUtils';

interface ImageGridOverlayProps {
    gridConfig: ImageInputGridConfig;
    onChangeGridConfig: (config: ImageInputGridConfig) => void;
    imageNaturalSize?: { width: number; height: number } | null;
    onGetCellImage?: (cellIndex: number) => string | undefined;
}

type DragHandle = 'nw' | 'ne' | 'se' | 'sw' | null;

export const ImageGridOverlay: React.FC<ImageGridOverlayProps> = ({
    gridConfig,
    onChangeGridConfig,
    imageNaturalSize,
    onGetCellImage,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cols = Math.max(1, Math.min(50, gridConfig.cols || 4));
    const rows = Math.max(1, Math.min(50, gridConfig.rows || 5));
    const [localBounds, setLocalBounds] = useState<ImageInputCropRect>(
        gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 }
    );
    const [selectedCells, setSelectedCells] = useState<number[] | undefined>(gridConfig.selectedCells);
    const [hoveredCell, setHoveredCell] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const dragStateRef = useRef<{
        handle: DragHandle;
        startX: number;
        startY: number;
        startBounds: ImageInputCropRect;
        current: ImageInputCropRect;
    } | null>(null);

    // Sync external props
    useEffect(() => {
        if (!isDragging && gridConfig.bounds) {
            setLocalBounds(gridConfig.bounds);
        }
    }, [gridConfig.bounds, isDragging]);

    useEffect(() => {
        setSelectedCells(gridConfig.selectedCells);
    }, [gridConfig.selectedCells]);

    const handlePointerDown = (handle: DragHandle, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!containerRef.current) return;
        const clientX = e.clientX;
        const clientY = e.clientY;

        dragStateRef.current = {
            handle,
            startX: clientX,
            startY: clientY,
            startBounds: { ...localBounds },
            current: { ...localBounds }
        };
        setIsDragging(true);
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const dx = (e.clientX - dragState.startX) / rect.width;
        const dy = (e.clientY - dragState.startY) / rect.height;

        let { x, y, width, height } = dragState.startBounds;

        if (dragState.handle?.includes('w')) {
            const newX = Math.max(0, Math.min(x + width - 0.05, x + dx));
            width += x - newX;
            x = newX;
        }
        if (dragState.handle?.includes('e')) {
            width = Math.max(0.05, Math.min(1 - x, width + dx));
        }
        if (dragState.handle?.includes('n')) {
            const newY = Math.max(0, Math.min(y + height - 0.05, y + dy));
            height += y - newY;
            y = newY;
        }
        if (dragState.handle?.includes('s')) {
            height = Math.max(0.05, Math.min(1 - y, height + dy));
        }

        // Clamp
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        width = Math.max(0.05, Math.min(1 - x, width));
        height = Math.max(0.05, Math.min(1 - y, height));

        const updated: ImageInputCropRect = { x, y, width, height };
        dragState.current = updated;
        setLocalBounds(updated);
    }, []);

    const handlePointerUp = useCallback(() => {
        if (dragStateRef.current) {
            const finalBounds = dragStateRef.current.current;
            dragStateRef.current = null;
            setIsDragging(false);
            onChangeGridConfig({
                ...gridConfig,
                bounds: finalBounds
            });
        }
    }, [onChangeGridConfig, gridConfig]);

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

    const toggleCellSelection = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const total = cols * rows;
        const currentActive = selectedCells || Array.from({ length: total }, (_, i) => i);
        let next: number[];

        if (currentActive.includes(index)) {
            // Can't deselect all
            if (currentActive.length <= 1) return;
            next = currentActive.filter((i) => i !== index);
        } else {
            next = [...currentActive, index].sort((a, b) => a - b);
        }

        setSelectedCells(next);
        onChangeGridConfig({
            ...gridConfig,
            selectedCells: next
        });
    };

    const handleCellDragStart = (idx: number, e: React.DragEvent) => {
        const cellImage = onGetCellImage ? onGetCellImage(idx) : null;
        if (cellImage) {
            const filename = `Asset_${idx + 1}_${Date.now()}.png`;
            setupImageDragData(e, cellImage, filename);
            e.stopPropagation();
        }
    };

    const leftPercent = localBounds.x * 100;
    const topPercent = localBounds.y * 100;
    const widthPercent = localBounds.width * 100;
    const heightPercent = localBounds.height * 100;

    const totalCells = cols * rows;

    const enableBorder = Boolean(gridConfig.enableBorder);
    const rawBw = enableBorder ? Math.max(0, Number(gridConfig.borderWidth) || 0) : 0;
    const borderMode = gridConfig.borderMode || 'inner';

    // Calculate approximate bound dimensions in pixels for positioning
    const boundPxW = Math.max(1, imageNaturalSize ? (localBounds.width * imageNaturalSize.width) : 1000);
    const boundPxH = Math.max(1, imageNaturalSize ? (localBounds.height * imageNaturalSize.height) : 1000);

    let cellPxW: number;
    let cellPxH: number;
    let bwX = 0;
    let bwY = 0;
    let offsetPxX = 0;
    let offsetPxY = 0;

    if (rawBw > 0) {
        if (borderMode === 'all') {
            const maxBwX = Math.max(0, (boundPxW - cols * 2) / (cols + 1));
            const maxBwY = Math.max(0, (boundPxH - rows * 2) / (rows + 1));
            bwX = Math.min(rawBw, maxBwX);
            bwY = Math.min(rawBw, maxBwY);
            const availW = Math.max(cols * 2, boundPxW - (cols + 1) * bwX);
            const availH = Math.max(rows * 2, boundPxH - (rows + 1) * bwY);
            cellPxW = availW / cols;
            cellPxH = availH / rows;
            offsetPxX = bwX;
            offsetPxY = bwY;
        } else {
            const maxBwX = cols > 1 ? Math.max(0, (boundPxW - cols * 2) / (cols - 1)) : 0;
            const maxBwY = rows > 1 ? Math.max(0, (boundPxH - rows * 2) / (rows - 1)) : 0;
            bwX = cols > 1 ? Math.min(rawBw, maxBwX) : 0;
            bwY = rows > 1 ? Math.min(rawBw, maxBwY) : 0;
            const availW = Math.max(cols * 2, boundPxW - (cols - 1) * bwX);
            const availH = Math.max(rows * 2, boundPxH - (rows - 1) * bwY);
            cellPxW = availW / cols;
            cellPxH = availH / rows;
            offsetPxX = 0;
            offsetPxY = 0;
        }
    } else {
        cellPxW = boundPxW / cols;
        cellPxH = boundPxH / rows;
    }

    return (
        <div ref={containerRef} className="absolute inset-0 z-30 select-none overflow-hidden pointer-events-auto">
            {/* Outer Dark Mask if bounds are trimmed */}
            {(localBounds.x > 0 || localBounds.y > 0 || localBounds.width < 1 || localBounds.height < 1) && (
                <>
                    <div className="absolute left-0 top-0 right-0 bg-black/50 pointer-events-none" style={{ height: `${topPercent}%` }} />
                    <div className="absolute left-0 right-0 bottom-0 bg-black/50 pointer-events-none" style={{ top: `${topPercent + heightPercent}%` }} />
                    <div className="absolute left-0 bg-black/50 pointer-events-none" style={{ top: `${topPercent}%`, height: `${heightPercent}%`, width: `${leftPercent}%` }} />
                    <div className="absolute right-0 bg-black/50 pointer-events-none" style={{ top: `${topPercent}%`, height: `${heightPercent}%`, left: `${leftPercent + widthPercent}%` }} />
                </>
            )}

            {/* Grid Box */}
            <div
                className={`absolute border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ${
                    rawBw > 0 ? 'bg-black/40' : 'bg-cyan-500/5'
                }`}
                style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`
                }}
            >
                {/* Grid Header Info */}
                <div className="absolute -top-7 left-0 bg-gray-900/95 text-cyan-300 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded shadow border border-cyan-500/40 backdrop-blur-sm pointer-events-none flex items-center gap-2 whitespace-nowrap z-20">
                    <span>▦ Grid: {cols}×{rows} ({totalCells})</span>
                    {rawBw > 0 && (
                        <span className="text-cyan-200 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-700/60 text-[10px]">
                            Рамка: {Math.round(bwX)}px ({borderMode === 'all' ? 'Внутр.+Внешн.' : 'Только внутр.'})
                        </span>
                    )}
                    {imageNaturalSize && (
                        <span className="text-gray-400 font-normal">~{Math.round(cellPxW)}×{Math.round(cellPxH)}px</span>
                    )}
                </div>

                {/* Grid Cells Container */}
                <div className="w-full h-full relative">
                    {Array.from({ length: totalCells }).map((_, idx) => {
                        const r = Math.floor(idx / cols);
                        const c = idx % cols;
                        const itemNumber = idx + 1;
                        const isSelected = !selectedCells || selectedCells.includes(idx);
                        const isHovered = hoveredCell === idx;

                        const leftPct = ((offsetPxX + c * (cellPxW + bwX)) / boundPxW) * 100;
                        const topPct = ((offsetPxY + r * (cellPxH + bwY)) / boundPxH) * 100;
                        const widthPct = (cellPxW / boundPxW) * 100;
                        const heightPct = (cellPxH / boundPxH) * 100;

                        return (
                            <div
                                key={idx}
                                draggable={true}
                                onDragStart={(e) => handleCellDragStart(idx, e)}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{
                                    left: `${leftPct}%`,
                                    top: `${topPct}%`,
                                    width: `${widthPct}%`,
                                    height: `${heightPct}%`
                                }}
                                className={`absolute border border-cyan-400/60 transition-all cursor-grab active:cursor-grabbing group ${
                                    isSelected
                                        ? isHovered
                                            ? 'bg-cyan-400/30 border-cyan-300 shadow-sm'
                                            : 'bg-cyan-500/10 hover:bg-cyan-400/20'
                                        : 'bg-black/75 opacity-40 border-dashed border-gray-600'
                                }`}
                                onMouseEnter={() => setHoveredCell(idx)}
                                onMouseLeave={() => setHoveredCell(null)}
                                onClick={(e) => toggleCellSelection(idx, e)}
                                title={`Ассет #${itemNumber} (Ряд ${r + 1}, Столбец ${c + 1}) — Потяните для вытаскивания на холст или кликните для переключения`}
                            >
                                {/* Asset Number Badge */}
                                <div
                                    className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight shadow-md transition-transform flex items-center gap-0.5 ${
                                        isSelected
                                            ? 'bg-cyan-500 text-black shadow-cyan-500/50 group-hover:scale-110'
                                            : 'bg-gray-700 text-gray-400'
                                    }`}
                                >
                                    <span>#{itemNumber}</span>
                                </div>

                                {isHovered && isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-gray-950/90 text-cyan-200 text-[10px] px-1.5 py-0.5 rounded shadow border border-cyan-500/50 flex items-center gap-1 font-mono">
                                            <span>R{r + 1}:C{c + 1}</span>
                                            <span className="text-[9px] text-cyan-400">✋ Drag</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Outer Resizers if user wants to tweak grid margins */}
                <div
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('nw', e)}
                    title="Потяните для изменения внешних границ сетки"
                />
                <div
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('ne', e)}
                    title="Потяните для изменения внешних границ сетки"
                />
                <div
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('sw', e)}
                    title="Потяните для изменения внешних границ сетки"
                />
                <div
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown('se', e)}
                    title="Потяните для изменения внешних границ сетки"
                />
            </div>
        </div>
    );
};
