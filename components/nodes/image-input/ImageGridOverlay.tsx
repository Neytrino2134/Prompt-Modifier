import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ImageInputCropRect, ImageInputGridConfig } from './types';
import { setupImageDragData, getEffectiveDividers, getIntervalsFromDividers } from '../../../utils/imageUtils';

interface ImageGridOverlayProps {
    gridConfig: ImageInputGridConfig;
    onChangeGridConfig: (config: ImageInputGridConfig) => void;
    imageNaturalSize?: { width: number; height: number } | null;
    onGetCellImage?: (cellIndex: number) => string | undefined;
}

type DragHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'move' | null;

interface DraggingDividerState {
    type: 'col' | 'row';
    index: number;
    startDivs: number[];
}

export const ImageGridOverlay: React.FC<ImageGridOverlayProps> = ({
    gridConfig,
    onChangeGridConfig,
    imageNaturalSize,
    onGetCellImage,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gridBoxRef = useRef<HTMLDivElement>(null);

    const cols = Math.max(1, Math.min(50, gridConfig.cols || 4));
    const rows = Math.max(1, Math.min(50, gridConfig.rows || 5));

    const [localBounds, setLocalBounds] = useState<ImageInputCropRect>(
        gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 }
    );
    const [localColDividers, setLocalColDividers] = useState<number[]>(() =>
        getEffectiveDividers(cols, gridConfig.colDividers)
    );
    const [localRowDividers, setLocalRowDividers] = useState<number[]>(() =>
        getEffectiveDividers(rows, gridConfig.rowDividers)
    );

    const [selectedCells, setSelectedCells] = useState<number[] | undefined>(gridConfig.selectedCells);
    const [hoveredCell, setHoveredCell] = useState<number | null>(null);
    const [hoveredDivider, setHoveredDivider] = useState<{ type: 'col' | 'row'; index: number } | null>(null);
    const [isDraggingBounds, setIsDraggingBounds] = useState(false);
    const [draggingDivider, setDraggingDivider] = useState<DraggingDividerState | null>(null);

    const boundsDragStateRef = useRef<{
        handle: DragHandle;
        startX: number;
        startY: number;
        startBounds: ImageInputCropRect;
        current: ImageInputCropRect;
    } | null>(null);

    const dividerDragStateRef = useRef<DraggingDividerState | null>(null);
    const localColDivsRef = useRef(localColDividers);
    localColDivsRef.current = localColDividers;
    const localRowDivsRef = useRef(localRowDividers);
    localRowDivsRef.current = localRowDividers;

    // Sync external bounds & dividers when gridConfig changes
    useEffect(() => {
        if (!isDraggingBounds) {
            setLocalBounds(gridConfig.bounds || { x: 0, y: 0, width: 1, height: 1 });
        }
    }, [gridConfig.bounds, isDraggingBounds]);

    useEffect(() => {
        if (!draggingDivider) {
            setLocalColDividers(getEffectiveDividers(cols, gridConfig.colDividers));
        }
    }, [cols, gridConfig.colDividers, draggingDivider]);

    useEffect(() => {
        if (!draggingDivider) {
            setLocalRowDividers(getEffectiveDividers(rows, gridConfig.rowDividers));
        }
    }, [rows, gridConfig.rowDividers, draggingDivider]);

    useEffect(() => {
        setSelectedCells(gridConfig.selectedCells);
    }, [gridConfig.selectedCells]);

    // Outer Bounding Box Drag Handlers
    const handleBoundsPointerDown = (handle: DragHandle, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!containerRef.current) return;
        boundsDragStateRef.current = {
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startBounds: { ...localBounds },
            current: { ...localBounds }
        };
        setIsDraggingBounds(true);
    };

    const handleBoundsPointerMove = useCallback((e: PointerEvent) => {
        const dragState = boundsDragStateRef.current;
        if (!dragState || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const dx = (e.clientX - dragState.startX) / rect.width;
        const dy = (e.clientY - dragState.startY) / rect.height;

        let { x, y, width, height } = dragState.startBounds;

        if (dragState.handle === 'move') {
            x = Math.max(0, Math.min(1 - width, x + dx));
            y = Math.max(0, Math.min(1 - height, y + dy));
        } else {
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

    const handleBoundsPointerUp = useCallback(() => {
        if (boundsDragStateRef.current) {
            const finalBounds = boundsDragStateRef.current.current;
            boundsDragStateRef.current = null;
            setIsDraggingBounds(false);
            onChangeGridConfig({
                ...gridConfig,
                bounds: finalBounds
            });
        }
    }, [onChangeGridConfig, gridConfig]);

    useEffect(() => {
        if (isDraggingBounds) {
            window.addEventListener('pointermove', handleBoundsPointerMove);
            window.addEventListener('pointerup', handleBoundsPointerUp);
            return () => {
                window.removeEventListener('pointermove', handleBoundsPointerMove);
                window.removeEventListener('pointerup', handleBoundsPointerUp);
            };
        }
    }, [isDraggingBounds, handleBoundsPointerMove, handleBoundsPointerUp]);

    // Table / Grid Column & Row Divider Drag Handlers
    const handleDividerPointerDown = (type: 'col' | 'row', index: number, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startDivs = type === 'col' ? [...localColDivsRef.current] : [...localRowDivsRef.current];
        const state: DraggingDividerState = {
            type,
            index,
            startDivs
        };
        dividerDragStateRef.current = state;
        setDraggingDivider(state);
    };

    const handleDividerPointerMove = useCallback((e: PointerEvent) => {
        const state = dividerDragStateRef.current;
        if (!state || !gridBoxRef.current) return;

        const rect = gridBoxRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const minGap = 0.02; // minimum distance between lines or edges (2%)

        if (state.type === 'col') {
            const normX = (e.clientX - rect.left) / rect.width;
            const prev = state.index > 0 ? state.startDivs[state.index - 1] : 0;
            const next = state.index < state.startDivs.length - 1 ? state.startDivs[state.index + 1] : 1;
            const clamped = Math.max(prev + minGap, Math.min(next - minGap, normX));

            const updated = [...state.startDivs];
            updated[state.index] = clamped;
            setLocalColDividers(updated);
        } else {
            const normY = (e.clientY - rect.top) / rect.height;
            const prev = state.index > 0 ? state.startDivs[state.index - 1] : 0;
            const next = state.index < state.startDivs.length - 1 ? state.startDivs[state.index + 1] : 1;
            const clamped = Math.max(prev + minGap, Math.min(next - minGap, normY));

            const updated = [...state.startDivs];
            updated[state.index] = clamped;
            setLocalRowDividers(updated);
        }
    }, []);

    const handleDividerPointerUp = useCallback(() => {
        const state = dividerDragStateRef.current;
        if (state) {
            dividerDragStateRef.current = null;
            setDraggingDivider(null);

            const finalCols = state.type === 'col' ? localColDivsRef.current : gridConfig.colDividers;
            const finalRows = state.type === 'row' ? localRowDivsRef.current : gridConfig.rowDividers;

            onChangeGridConfig({
                ...gridConfig,
                customDividers: true,
                colDividers: finalCols,
                rowDividers: finalRows
            });
        }
    }, [onChangeGridConfig, gridConfig]);

    useEffect(() => {
        if (draggingDivider) {
            window.addEventListener('pointermove', handleDividerPointerMove);
            window.addEventListener('pointerup', handleDividerPointerUp);
            return () => {
                window.removeEventListener('pointermove', handleDividerPointerMove);
                window.removeEventListener('pointerup', handleDividerPointerUp);
            };
        }
    }, [draggingDivider, handleDividerPointerMove, handleDividerPointerUp]);

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

    const colIntervals = getIntervalsFromDividers(localColDividers);
    const rowIntervals = getIntervalsFromDividers(localRowDividers);

    const isCustomActive = Boolean(gridConfig.customDividers);

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
                ref={gridBoxRef}
                className="absolute border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-cyan-500/5"
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
                    {isCustomActive && (
                        <span className="text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/60 text-[10px]">
                            Табличные границы
                        </span>
                    )}
                    {rawBw > 0 && (
                        <span className="text-cyan-200 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-700/60 text-[10px]">
                            Рамка: {Math.round(rawBw)}px ({borderMode === 'all' ? 'Внутр.+Внешн.' : 'Только внутр.'})
                        </span>
                    )}
                </div>

                {/* Darkened Border Cutout Areas (Only applied to border thickness regions) */}
                {rawBw > 0 && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                        {/* Outer Borders if borderMode === 'all' */}
                        {borderMode === 'all' && (
                            <>
                                {/* Top Outer Border */}
                                <div
                                    className="absolute left-0 right-0 top-0 bg-black/60 border-b border-cyan-500/30"
                                    style={{ height: `${(rawBw / boundPxH) * 100}%` }}
                                />
                                {/* Bottom Outer Border */}
                                <div
                                    className="absolute left-0 right-0 bottom-0 bg-black/60 border-t border-cyan-500/30"
                                    style={{ height: `${(rawBw / boundPxH) * 100}%` }}
                                />
                                {/* Left Outer Border */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-black/60 border-r border-cyan-500/30"
                                    style={{ width: `${(rawBw / boundPxW) * 100}%` }}
                                />
                                {/* Right Outer Border */}
                                <div
                                    className="absolute right-0 top-0 bottom-0 bg-black/60 border-l border-cyan-500/30"
                                    style={{ width: `${(rawBw / boundPxW) * 100}%` }}
                                />
                            </>
                        )}

                        {/* Column Border Gaps (Between Cells) */}
                        {cols > 1 && localColDividers.map((divPos, cIdx) => {
                            const leftPct = ((divPos * boundPxW - rawBw / 2) / boundPxW) * 100;
                            const widthPct = (rawBw / boundPxW) * 100;
                            return (
                                <div
                                    key={`col-border-${cIdx}`}
                                    className="absolute top-0 bottom-0 bg-black/60 border-x border-cyan-500/30"
                                    style={{
                                        left: `${leftPct}%`,
                                        width: `${widthPct}%`
                                    }}
                                />
                            );
                        })}

                        {/* Row Border Gaps (Between Cells) */}
                        {rows > 1 && localRowDividers.map((divPos, rIdx) => {
                            const topPct = ((divPos * boundPxH - rawBw / 2) / boundPxH) * 100;
                            const heightPct = (rawBw / boundPxH) * 100;
                            return (
                                <div
                                    key={`row-border-${rIdx}`}
                                    className="absolute left-0 right-0 bg-black/60 border-y border-cyan-500/30"
                                    style={{
                                        top: `${topPct}%`,
                                        height: `${heightPct}%`
                                    }}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Grid Cells Container */}
                <div className="w-full h-full relative">
                    {Array.from({ length: totalCells }).map((_, idx) => {
                        const r = Math.floor(idx / cols);
                        const c = idx % cols;
                        const itemNumber = idx + 1;
                        const isSelected = !selectedCells || selectedCells.includes(idx);
                        const isHovered = hoveredCell === idx;

                        const colInt = colIntervals[c] || { start: c / cols, end: (c + 1) / cols, size: 1 / cols };
                        const rowInt = rowIntervals[r] || { start: r / rows, end: (r + 1) / rows, size: 1 / rows };

                        const unpaddedColStart = colInt.start * boundPxW;
                        const unpaddedColEnd = colInt.end * boundPxW;
                        const unpaddedRowStart = rowInt.start * boundPxH;
                        const unpaddedRowEnd = rowInt.end * boundPxH;

                        let padLeft = 0;
                        let padRight = 0;
                        let padTop = 0;
                        let padBottom = 0;

                        if (rawBw > 0) {
                            if (borderMode === 'all') {
                                padLeft = (c === 0) ? rawBw : rawBw / 2;
                                padRight = (c === cols - 1) ? rawBw : rawBw / 2;
                                padTop = (r === 0) ? rawBw : rawBw / 2;
                                padBottom = (r === rows - 1) ? rawBw : rawBw / 2;
                            } else {
                                padLeft = (c === 0) ? 0 : rawBw / 2;
                                padRight = (c === cols - 1) ? 0 : rawBw / 2;
                                padTop = (r === 0) ? 0 : rawBw / 2;
                                padBottom = (r === rows - 1) ? 0 : rawBw / 2;
                            }
                        }

                        const leftPx = unpaddedColStart + padLeft;
                        const topPx = unpaddedRowStart + padTop;
                        const widthPx = Math.max(1, (unpaddedColEnd - padRight) - (unpaddedColStart + padLeft));
                        const heightPx = Math.max(1, (unpaddedRowEnd - padBottom) - (unpaddedRowStart + padTop));

                        const leftPct = (leftPx / boundPxW) * 100;
                        const topPct = (topPx / boundPxH) * 100;
                        const widthPct = (widthPx / boundPxW) * 100;
                        const heightPct = (heightPx / boundPxH) * 100;

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
                                className={`absolute border border-cyan-400/60 transition-colors cursor-grab active:cursor-grabbing group ${
                                    isSelected
                                        ? isHovered
                                            ? 'bg-cyan-400/30 border-cyan-300 shadow-sm'
                                            : 'bg-cyan-500/10 hover:bg-cyan-400/20'
                                        : 'bg-black/75 opacity-40 border-dashed border-gray-600'
                                }`}
                                onMouseEnter={() => setHoveredCell(idx)}
                                onMouseLeave={() => setHoveredCell(null)}
                                onClick={(e) => toggleCellSelection(idx, e)}
                                title={`Ассет #${itemNumber} (Ряд ${r + 1}, Столбец ${c + 1}) ~${Math.round(widthPx)}×${Math.round(heightPx)}px\nПотяните для вытаскивания на холст или кликните для переключения`}
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
                                            <span className="text-gray-400 text-[9px]">~{Math.round(widthPx)}×{Math.round(heightPx)}px</span>
                                            <span className="text-[9px] text-cyan-400">✋ Drag</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Interactive Column Dividers (Vertical lines) */}
                {cols > 1 && localColDividers.map((divPos, colIdx) => {
                    const isDraggingThis = draggingDivider?.type === 'col' && draggingDivider.index === colIdx;
                    const isHoveredThis = hoveredDivider?.type === 'col' && hoveredDivider.index === colIdx;
                    const colW1 = (colIntervals[colIdx]?.size || (1 / cols)) * boundPxW;
                    const colW2 = (colIntervals[colIdx + 1]?.size || (1 / cols)) * boundPxW;

                    return (
                        <div
                            key={`col-div-${colIdx}`}
                            style={{ left: `${divPos * 100}%` }}
                            className="absolute top-0 bottom-0 w-4 -ml-2 z-40 cursor-col-resize group/col flex items-center justify-center pointer-events-auto"
                            onPointerDown={(e) => handleDividerPointerDown('col', colIdx, e)}
                            onMouseEnter={() => setHoveredDivider({ type: 'col', index: colIdx })}
                            onMouseLeave={() => setHoveredDivider(null)}
                            title={`Граница столбца ${colIdx + 1}/${colIdx + 2} (Ширина: ${Math.round(colW1)}px | ${Math.round(colW2)}px) — Потяните мышкой для изменения`}
                        >
                            {/* Visual vertical divider line */}
                            <div
                                className={`w-0.5 h-full transition-colors ${
                                    isDraggingThis || isHoveredThis
                                        ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)] w-1'
                                        : isCustomActive
                                            ? 'bg-amber-400/80 group-hover/col:bg-amber-300 group-hover/col:w-1'
                                            : 'bg-cyan-400/70 group-hover/col:bg-cyan-300 group-hover/col:w-1 shadow-[0_0_6px_rgba(6,182,212,0.6)]'
                                }`}
                            />

                            {/* Center Grab Handle */}
                            <div
                                className={`absolute bg-gray-900 border text-[9px] px-1 py-0.5 rounded shadow-lg flex items-center gap-0.5 pointer-events-none transition-all font-mono ${
                                    isDraggingThis || isHoveredThis
                                        ? 'opacity-100 scale-110 border-amber-400 text-amber-300 bg-black'
                                        : 'opacity-60 group-hover/col:opacity-100 border-cyan-400 text-cyan-200'
                                }`}
                            >
                                <span>⇿</span>
                                {(isDraggingThis || isHoveredThis) && (
                                    <span className="text-[8px] whitespace-nowrap">
                                        {Math.round(colW1)}|{Math.round(colW2)}px
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Interactive Row Dividers (Horizontal lines) */}
                {rows > 1 && localRowDividers.map((divPos, rowIdx) => {
                    const isDraggingThis = draggingDivider?.type === 'row' && draggingDivider.index === rowIdx;
                    const isHoveredThis = hoveredDivider?.type === 'row' && hoveredDivider.index === rowIdx;
                    const rowH1 = (rowIntervals[rowIdx]?.size || (1 / rows)) * boundPxH;
                    const rowH2 = (rowIntervals[rowIdx + 1]?.size || (1 / rows)) * boundPxH;

                    return (
                        <div
                            key={`row-div-${rowIdx}`}
                            style={{ top: `${divPos * 100}%` }}
                            className="absolute left-0 right-0 h-4 -mt-2 z-40 cursor-row-resize group/row flex items-center justify-center pointer-events-auto"
                            onPointerDown={(e) => handleDividerPointerDown('row', rowIdx, e)}
                            onMouseEnter={() => setHoveredDivider({ type: 'row', index: rowIdx })}
                            onMouseLeave={() => setHoveredDivider(null)}
                            title={`Граница строки ${rowIdx + 1}/${rowIdx + 2} (Высота: ${Math.round(rowH1)}px | ${Math.round(rowH2)}px) — Потяните мышкой для изменения`}
                        >
                            {/* Visual horizontal divider line */}
                            <div
                                className={`h-0.5 w-full transition-colors ${
                                    isDraggingThis || isHoveredThis
                                        ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)] h-1'
                                        : isCustomActive
                                            ? 'bg-amber-400/80 group-hover/row:bg-amber-300 group-hover/row:h-1'
                                            : 'bg-cyan-400/70 group-hover/row:bg-cyan-300 group-hover/row:h-1 shadow-[0_0_6px_rgba(6,182,212,0.6)]'
                                }`}
                            />

                            {/* Center Grab Handle */}
                            <div
                                className={`absolute bg-gray-900 border text-[9px] px-1 py-0.5 rounded shadow-lg flex items-center gap-0.5 pointer-events-none transition-all font-mono ${
                                    isDraggingThis || isHoveredThis
                                        ? 'opacity-100 scale-110 border-amber-400 text-amber-300 bg-black'
                                        : 'opacity-60 group-hover/row:opacity-100 border-cyan-400 text-cyan-200'
                                }`}
                            >
                                <span>⇳</span>
                                {(isDraggingThis || isHoveredThis) && (
                                    <span className="text-[8px] whitespace-nowrap">
                                        {Math.round(rowH1)}|{Math.round(rowH2)}px
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Outer Resizers: Corners & Edges for precise individual Width and Height adjustment */}
                {/* Corners */}
                <div
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-50"
                    onPointerDown={(e) => handleBoundsPointerDown('nw', e)}
                    title="Потяните угол для изменения размера сетки (NW)"
                />
                <div
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform z-50"
                    onPointerDown={(e) => handleBoundsPointerDown('ne', e)}
                    title="Потяните угол для изменения размера сетки (NE)"
                />
                <div
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform z-50"
                    onPointerDown={(e) => handleBoundsPointerDown('sw', e)}
                    title="Потяните угол для изменения размера сетки (SW)"
                />
                <div
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-50"
                    onPointerDown={(e) => handleBoundsPointerDown('se', e)}
                    title="Потяните угол для изменения размера сетки (SE)"
                />

                {/* Edges: Top (N), Bottom (S), Left (W), Right (E) */}
                <div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white/90 border-2 border-cyan-500 rounded-sm cursor-ns-resize shadow-md hover:scale-110 transition-transform z-50 flex items-center justify-center"
                    onPointerDown={(e) => handleBoundsPointerDown('n', e)}
                    title="Потяните для изменения высоты сетки сверху (Высота)"
                >
                    <div className="w-2.5 h-0.5 bg-cyan-600 rounded-full" />
                </div>
                <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white/90 border-2 border-cyan-500 rounded-sm cursor-ns-resize shadow-md hover:scale-110 transition-transform z-50 flex items-center justify-center"
                    onPointerDown={(e) => handleBoundsPointerDown('s', e)}
                    title="Потяните для изменения высоты сетки снизу (Высота)"
                >
                    <div className="w-2.5 h-0.5 bg-cyan-600 rounded-full" />
                </div>
                <div
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-6 bg-white/90 border-2 border-cyan-500 rounded-sm cursor-ew-resize shadow-md hover:scale-110 transition-transform z-50 flex items-center justify-center"
                    onPointerDown={(e) => handleBoundsPointerDown('w', e)}
                    title="Потяните для изменения ширины сетки слева (Ширина)"
                >
                    <div className="w-0.5 h-2.5 bg-cyan-600 rounded-full" />
                </div>
                <div
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-6 bg-white/90 border-2 border-cyan-500 rounded-sm cursor-ew-resize shadow-md hover:scale-110 transition-transform z-50 flex items-center justify-center"
                    onPointerDown={(e) => handleBoundsPointerDown('e', e)}
                    title="Потяните для изменения ширины сетки справа (Ширина)"
                >
                    <div className="w-0.5 h-2.5 bg-cyan-600 rounded-full" />
                </div>
            </div>
        </div>
    );
};

