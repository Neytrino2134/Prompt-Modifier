import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ImageInputCropRect, ImageInputFrameItem, ImageInputFramesConfig } from './types';
import { setupImageDragData, getEffectiveDividers, getIntervalsFromDividers } from '../../../utils/imageUtils';

interface ImageFramesOverlayProps {
    framesConfig: ImageInputFramesConfig;
    onChangeFramesConfig: (config: ImageInputFramesConfig) => void;
    imageNaturalSize?: { width: number; height: number } | null;
    nodeId?: string;
    getFullSizeImage?: (nodeId: string, frameNumber: number) => string | undefined;
    frameThumbnails?: string[];
    selectedFrameIndex?: number;
    onSelectFrame?: (index: number) => void;
}

type DragHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'move' | 'create' | null;

interface DraggingDividerState {
    frameIndex: number;
    type: 'col' | 'row';
    index: number;
    startDivs: number[];
}

export const ImageFramesOverlay: React.FC<ImageFramesOverlayProps> = ({
    framesConfig,
    onChangeFramesConfig,
    imageNaturalSize,
    nodeId,
    getFullSizeImage,
    frameThumbnails = [],
    selectedFrameIndex = 0,
    onSelectFrame,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const frames = framesConfig.frames || [];
    const activeIndex = Math.max(0, Math.min(frames.length - 1, selectedFrameIndex));

    const [isDragging, setIsDragging] = useState(false);
    const [localFrames, setLocalFrames] = useState<ImageInputFrameItem[]>(frames);
    const [creatingFrame, setCreatingFrame] = useState<ImageInputCropRect | null>(null);
    const [draggingDivider, setDraggingDivider] = useState<DraggingDividerState | null>(null);

    // Sync from prop when not actively dragging
    useEffect(() => {
        if (!isDragging && !draggingDivider) {
            setLocalFrames(framesConfig.frames || []);
        }
    }, [framesConfig.frames, isDragging, draggingDivider]);

    const dragStateRef = useRef<{
        handle: DragHandle;
        frameIndex: number;
        startX: number;
        startY: number;
        startRect: ImageInputCropRect;
        current: ImageInputCropRect;
    } | null>(null);

    const dividerDragStateRef = useRef<DraggingDividerState | null>(null);

    const handlePointerDown = (
        handle: DragHandle,
        frameIndex: number,
        e: React.PointerEvent
    ) => {
        e.preventDefault();
        e.stopPropagation();

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        if (handle === 'create') {
            const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
            const initial: ImageInputCropRect = { x: relX, y: relY, width: 0.01, height: 0.01 };
            
            setCreatingFrame(initial);
            dragStateRef.current = {
                handle: 'create',
                frameIndex: -1,
                startX: clientX,
                startY: clientY,
                startRect: initial,
                current: initial,
            };
        } else {
            const targetFrame = localFrames[frameIndex];
            if (!targetFrame) return;

            if (onSelectFrame && selectedFrameIndex !== frameIndex) {
                onSelectFrame(frameIndex);
            }

            dragStateRef.current = {
                handle,
                frameIndex,
                startX: clientX,
                startY: clientY,
                startRect: { ...targetFrame.rect },
                current: { ...targetFrame.rect },
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

        const updatedRect: ImageInputCropRect = { x, y, width, height };
        dragState.current = updatedRect;

        if (dragState.handle === 'create') {
            setCreatingFrame(updatedRect);
        } else {
            setLocalFrames(prev => {
                const next = [...prev];
                if (next[dragState.frameIndex]) {
                    next[dragState.frameIndex] = {
                        ...next[dragState.frameIndex],
                        rect: updatedRect,
                    };
                }
                return next;
            });
        }
    }, []);

    const handlePointerUp = useCallback(() => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        dragStateRef.current = null;
        setIsDragging(false);

        if (dragState.handle === 'create') {
            const finalRect = dragState.current;
            setCreatingFrame(null);
            if (finalRect && finalRect.width >= 0.02 && finalRect.height >= 0.02) {
                const newId = `frame_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                const newFrame: ImageInputFrameItem = {
                    id: newId,
                    rect: finalRect,
                    name: `Frame ${localFrames.length + 1}`
                };
                const nextFrames = [...localFrames, newFrame];
                const newIndex = nextFrames.length - 1;
                setLocalFrames(nextFrames);
                if (onSelectFrame) onSelectFrame(newIndex);
                onChangeFramesConfig({
                    ...framesConfig,
                    frames: nextFrames,
                    selectedFrameIndex: newIndex
                });
            }
        } else {
            const finalRect = dragState.current;
            const nextFrames = [...localFrames];
            if (nextFrames[dragState.frameIndex]) {
                nextFrames[dragState.frameIndex] = {
                    ...nextFrames[dragState.frameIndex],
                    rect: finalRect
                };
                onChangeFramesConfig({
                    ...framesConfig,
                    frames: nextFrames,
                    selectedFrameIndex: dragState.frameIndex
                });
            }
        }
    }, [localFrames, framesConfig, onChangeFramesConfig, onSelectFrame]);

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

    // Draggable Grid Dividers inside frames
    const handleDividerPointerDown = (
        frameIndex: number,
        type: 'col' | 'row',
        dividerIndex: number,
        e: React.PointerEvent
    ) => {
        e.preventDefault();
        e.stopPropagation();

        const targetFrame = localFrames[frameIndex];
        if (!targetFrame) return;

        if (onSelectFrame && selectedFrameIndex !== frameIndex) {
            onSelectFrame(frameIndex);
        }

        const cols = Math.max(1, Math.min(20, targetFrame.cols || 1));
        const rows = Math.max(1, Math.min(20, targetFrame.rows || 1));

        const startDivs = type === 'col'
            ? getEffectiveDividers(cols, targetFrame.colDividers)
            : getEffectiveDividers(rows, targetFrame.rowDividers);

        const state: DraggingDividerState = {
            frameIndex,
            type,
            index: dividerIndex,
            startDivs
        };

        dividerDragStateRef.current = state;
        setDraggingDivider(state);
    };

    const handleDividerPointerMove = useCallback((e: PointerEvent) => {
        const state = dividerDragStateRef.current;
        if (!state || !containerRef.current) return;

        const targetFrame = localFrames[state.frameIndex];
        if (!targetFrame) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        if (containerRect.width <= 0 || containerRect.height <= 0) return;

        const frameLeft = containerRect.left + targetFrame.rect.x * containerRect.width;
        const frameTop = containerRect.top + targetFrame.rect.y * containerRect.height;
        const frameWidth = targetFrame.rect.width * containerRect.width;
        const frameHeight = targetFrame.rect.height * containerRect.height;

        if (frameWidth <= 0 || frameHeight <= 0) return;

        const minGap = 0.02; // 2% minimum distance

        if (state.type === 'col') {
            const normX = (e.clientX - frameLeft) / frameWidth;
            const prev = state.index > 0 ? state.startDivs[state.index - 1] : 0;
            const next = state.index < state.startDivs.length - 1 ? state.startDivs[state.index + 1] : 1;
            const clamped = Math.max(prev + minGap, Math.min(next - minGap, normX));

            const updated = [...state.startDivs];
            updated[state.index] = clamped;

            setLocalFrames(prevFrames => {
                const nextFrames = [...prevFrames];
                if (nextFrames[state.frameIndex]) {
                    nextFrames[state.frameIndex] = {
                        ...nextFrames[state.frameIndex],
                        colDividers: updated
                    };
                }
                return nextFrames;
            });
        } else {
            const normY = (e.clientY - frameTop) / frameHeight;
            const prev = state.index > 0 ? state.startDivs[state.index - 1] : 0;
            const next = state.index < state.startDivs.length - 1 ? state.startDivs[state.index + 1] : 1;
            const clamped = Math.max(prev + minGap, Math.min(next - minGap, normY));

            const updated = [...state.startDivs];
            updated[state.index] = clamped;

            setLocalFrames(prevFrames => {
                const nextFrames = [...prevFrames];
                if (nextFrames[state.frameIndex]) {
                    nextFrames[state.frameIndex] = {
                        ...nextFrames[state.frameIndex],
                        rowDividers: updated
                    };
                }
                return nextFrames;
            });
        }
    }, [localFrames]);

    const handleDividerPointerUp = useCallback(() => {
        const state = dividerDragStateRef.current;
        if (state) {
            dividerDragStateRef.current = null;
            setDraggingDivider(null);

            onChangeFramesConfig({
                ...framesConfig,
                frames: localFrames,
                selectedFrameIndex: state.frameIndex
            });
        }
    }, [localFrames, framesConfig, onChangeFramesConfig]);

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

    const handleUpdateFrameGrid = (idx: number, newCols: number, newRows: number, e?: React.SyntheticEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const safeCols = Math.max(1, Math.min(20, newCols));
        const safeRows = Math.max(1, Math.min(20, newRows));
        const nextFrames = localFrames.map((f, i) => {
            if (i === idx) {
                const { colDividers, rowDividers, ...rest } = f;
                return { ...rest, cols: safeCols, rows: safeRows };
            }
            return f;
        });
        setLocalFrames(nextFrames);
        onChangeFramesConfig({
            ...framesConfig,
            frames: nextFrames,
            selectedFrameIndex: idx
        });
    };

    const handleResetFrameDividers = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const nextFrames = localFrames.map((f, i) => {
            if (i === idx) {
                const { colDividers, rowDividers, ...rest } = f;
                return rest;
            }
            return f;
        });
        setLocalFrames(nextFrames);
        onChangeFramesConfig({
            ...framesConfig,
            frames: nextFrames,
            selectedFrameIndex: idx
        });
    };

    const handleDeleteFrame = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const nextFrames = localFrames.filter((_, i) => i !== idx);
        const newIndex = Math.max(0, Math.min(nextFrames.length - 1, activeIndex >= idx ? activeIndex - 1 : activeIndex));
        setLocalFrames(nextFrames);
        if (onSelectFrame) onSelectFrame(newIndex);
        onChangeFramesConfig({
            ...framesConfig,
            frames: nextFrames,
            selectedFrameIndex: newIndex
        });
    };

    const getFrameSliceImage = (frameIdx: number, subIndex: number = 0) => {
        let globalOffset = 0;
        for (let i = 0; i < frameIdx; i++) {
            const c = Math.max(1, Math.min(20, localFrames[i]?.cols || 1));
            const r = Math.max(1, Math.min(20, localFrames[i]?.rows || 1));
            globalOffset += c * r;
        }
        const targetGlobalIdx = globalOffset + subIndex;
        const fullRes = (nodeId && getFullSizeImage) ? getFullSizeImage(nodeId, targetGlobalIdx + 1) : null;
        return fullRes || frameThumbnails[targetGlobalIdx];
    };

    const handleSliceDragOut = (frameIdx: number, subIndex: number, cellLabel: string, e: React.DragEvent) => {
        e.stopPropagation();
        const imgToDrag = getFrameSliceImage(frameIdx, subIndex);
        if (imgToDrag) {
            const frameName = localFrames[frameIdx]?.name || `Frame_${frameIdx + 1}`;
            const cleanName = `${frameName}_${cellLabel}`.replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_');
            const filename = `${cleanName}_${Date.now()}.png`;
            setupImageDragData(e, imgToDrag, filename);
        }
    };

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-30 select-none cursor-crosshair overflow-visible"
            onPointerDown={(e) => handlePointerDown('create', -1, e)}
        >
            {/* Render Creating Temporary Frame */}
            {creatingFrame && (
                <div
                    className="absolute border-2 border-dashed border-accent-secondary bg-accent-secondary/20 shadow-md pointer-events-none z-50"
                    style={{
                        left: `${creatingFrame.x * 100}%`,
                        top: `${creatingFrame.y * 100}%`,
                        width: `${creatingFrame.width * 100}%`,
                        height: `${creatingFrame.height * 100}%`,
                    }}
                >
                    <div className="absolute top-1 left-1 bg-black/90 text-accent-secondary text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow">
                        Новая рамка...
                    </div>
                </div>
            )}

            {/* Render all existing frames */}
            {localFrames.map((frame, idx) => {
                const isSelected = idx === activeIndex;
                const rect = frame.rect;
                const cols = Math.max(1, Math.min(20, frame.cols || 1));
                const rows = Math.max(1, Math.min(20, frame.rows || 1));
                const hasSubGrid = cols > 1 || rows > 1;

                const leftPercent = rect.x * 100;
                const topPercent = rect.y * 100;
                const widthPercent = rect.width * 100;
                const heightPercent = rect.height * 100;
                const isNearTop = topPercent < 7;

                const pixelWidth = imageNaturalSize ? Math.round(rect.width * imageNaturalSize.width) : null;
                const pixelHeight = imageNaturalSize ? Math.round(rect.height * imageNaturalSize.height) : null;

                const effectiveColDivs = getEffectiveDividers(cols, frame.colDividers);
                const effectiveRowDivs = getEffectiveDividers(rows, frame.rowDividers);
                const colIntervals = getIntervalsFromDividers(effectiveColDivs);
                const rowIntervals = getIntervalsFromDividers(effectiveRowDivs);
                const hasCustomDividers = Boolean(frame.colDividers?.length || frame.rowDividers?.length);

                return (
                    <div
                        key={frame.id || idx}
                        className={`absolute cursor-move group/frame ${
                            isSelected
                                ? 'border-2 border-cyan-400 bg-cyan-500/15 shadow-[0_0_15px_rgba(6,182,212,0.5)] z-40'
                                : 'border-2 border-indigo-400/80 hover:border-cyan-300 bg-indigo-500/10 hover:bg-cyan-500/10 z-30 shadow-sm'
                        }`}
                        style={{
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                            width: `${widthPercent}%`,
                            height: `${heightPercent}%`,
                            transform: 'translateZ(0)',
                            backfaceVisibility: 'hidden',
                            WebkitFontSmoothing: 'antialiased',
                        }}
                        onPointerDown={(e) => handlePointerDown('move', idx, e)}
                    >
                        {/* Sub-grid rendering inside frame */}
                        {hasSubGrid ? (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {colIntervals.map((cInt, cIdx) => (
                                    rowIntervals.map((rInt, rIdx) => {
                                        const cellIdx = rIdx * cols + cIdx;
                                        const leftPct = cInt.start * 100;
                                        const topPct = rInt.start * 100;
                                        const widthPct = (cInt.end - cInt.start) * 100;
                                        const heightPct = (rInt.end - rInt.start) * 100;

                                        return (
                                            <div
                                                key={`${rIdx}-${cIdx}`}
                                                className="absolute border border-cyan-300/40 bg-cyan-400/5 flex items-start justify-start p-0.5 overflow-hidden"
                                                style={{
                                                    left: `${leftPct}%`,
                                                    top: `${topPct}%`,
                                                    width: `${widthPct}%`,
                                                    height: `${heightPct}%`,
                                                }}
                                            >
                                                <span className="bg-[#070b12] text-cyan-200 font-mono text-[8px] font-bold px-1 py-0.5 rounded shadow border border-cyan-500/80 leading-none pointer-events-none select-none">
                                                    {rIdx + 1},{cIdx + 1}
                                                </span>

                                                {/* Individual Cell Drag-out Button in bottom corner of each cell */}
                                                <div
                                                    draggable={true}
                                                    onDragStart={(e) => handleSliceDragOut(idx, cellIdx, `${rIdx + 1}_${cIdx + 1}`, e)}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    className={`absolute bottom-0.5 right-0.5 z-40 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-[8px] font-medium px-1.5 py-0.5 rounded shadow-md border border-cyan-400 cursor-grab active:cursor-grabbing flex items-center gap-0.5 select-none pointer-events-auto transition-opacity duration-150 ${
                                                        isSelected ? 'opacity-90 hover:opacity-100' : 'opacity-0 group-hover/frame:opacity-90 group-hover/frame:hover:opacity-100'
                                                    }`}
                                                    title={`Потяните мышью, чтобы вытащить ячейку [${rIdx + 1},${cIdx + 1}] (ассет #${idx + 1}) на холст`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} shapeRendering="geometricPrecision">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                                    </svg>
                                                    <span>Вытащить</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ))}

                                {/* Draggable Column Divider Lines (X) */}
                                {effectiveColDivs.map((normX, divIdx) => (
                                    <div
                                        key={`col-div-${divIdx}`}
                                        onPointerDown={(e) => handleDividerPointerDown(idx, 'col', divIdx, e)}
                                        className="absolute top-0 bottom-0 z-30 group/div cursor-col-resize pointer-events-auto"
                                        style={{
                                            left: `${normX * 100}%`,
                                            width: '14px',
                                            transform: 'translateX(-50%)',
                                        }}
                                        title="Потяните мышью, чтобы изменить ширину колонок сетки в рамке"
                                    >
                                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-cyan-400/80 group-hover/div:bg-cyan-200 group-hover/div:w-1 group-hover/div:shadow-[0_0_8px_rgba(6,182,212,0.9)] transition-all" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-5 bg-[#09101b] border border-cyan-400 rounded flex items-center justify-center opacity-0 group-hover/div:opacity-100 transition-opacity shadow-md pointer-events-none">
                                            <span className="text-[8px] text-cyan-300 font-bold leading-none">↔</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Draggable Row Divider Lines (Y) */}
                                {effectiveRowDivs.map((normY, divIdx) => (
                                    <div
                                        key={`row-div-${divIdx}`}
                                        onPointerDown={(e) => handleDividerPointerDown(idx, 'row', divIdx, e)}
                                        className="absolute left-0 right-0 z-30 group/div cursor-row-resize pointer-events-auto"
                                        style={{
                                            top: `${normY * 100}%`,
                                            height: '14px',
                                            transform: 'translateY(-50%)',
                                        }}
                                        title="Потяните мышью, чтобы изменить высоту строк сетки в рамке"
                                    >
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-cyan-400/80 group-hover/div:bg-cyan-200 group-hover/div:h-1 group-hover/div:shadow-[0_0_8px_rgba(6,182,212,0.9)] transition-all" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-3.5 bg-[#09101b] border border-cyan-400 rounded flex items-center justify-center opacity-0 group-hover/div:opacity-100 transition-opacity shadow-md pointer-events-none">
                                            <span className="text-[8px] text-cyan-300 font-bold leading-none">↕</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : isSelected ? (
                            /* Default 3x3 helper lines inside selected single frame */
                            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25 border border-cyan-300/40">
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
                        ) : null}

                        {/* Individual Frame Drag-out Button in bottom-right corner of the frame */}
                        {!hasSubGrid && (
                            <div
                                draggable={true}
                                onDragStart={(e) => handleSliceDragOut(idx, 0, `frame_${idx + 1}`, e)}
                                onPointerDown={(e) => e.stopPropagation()}
                                className={`absolute bottom-1.5 right-1.5 z-40 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-[9px] font-medium px-2 py-0.5 rounded shadow-lg border border-cyan-400 cursor-grab active:cursor-grabbing flex items-center gap-1 select-none pointer-events-auto transition-opacity duration-150 ${
                                    isSelected ? 'opacity-100' : 'opacity-0 group-hover/frame:opacity-100'
                                }`}
                                title={`Потяните мышью, чтобы вытащить рамку #${idx + 1} на холст`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} shapeRendering="geometricPrecision">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                                <span>Вытащить</span>
                            </div>
                        )}

                        {/* Top Floating Controls Bar */}
                        <div
                            className={`absolute ${isNearTop ? 'top-1.5' : '-top-7'} left-1 flex items-center gap-1 z-50 pointer-events-auto flex-nowrap`}
                            style={{
                                transform: 'translateZ(0)',
                                backfaceVisibility: 'hidden',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                textRendering: 'geometricPrecision',
                            }}
                        >
                            {/* Frame Number & Resolution Badge (Always visible, click to select) */}
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectFrame) onSelectFrame(idx);
                                }}
                                className={`h-[22px] text-[10px] font-mono font-bold px-1.5 rounded shadow-md flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                                    isSelected
                                        ? 'bg-[#09101b] text-cyan-200 border border-cyan-400 ring-1 ring-cyan-400/60'
                                        : 'bg-[#0a0f18] text-gray-300 border border-gray-700 hover:border-cyan-400'
                                }`}
                                title={`Рамка #${idx + 1} (Сетка ${cols}×${rows} = ${cols * rows} ассетов)`}
                            >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-indigo-400'}`} />
                                <span className="font-semibold text-white">#{idx + 1}</span>
                                <span className="text-cyan-300 font-bold bg-cyan-950/90 px-1 py-0.5 rounded border border-cyan-500/60 leading-none text-[9px]">
                                    {cols}×{rows}
                                </span>
                                {pixelWidth && pixelHeight ? (
                                    <span className="text-gray-300">{pixelWidth}×{pixelHeight}</span>
                                ) : (
                                    <span className="text-gray-400">{Math.round(widthPercent)}%×{Math.round(heightPercent)}%</span>
                                )}
                            </div>

                            {/* Action buttons (Visible on selected frame or on frame hover) */}
                            <div className={`flex items-center gap-1 transition-opacity duration-150 ${
                                isSelected
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none group-hover/frame:opacity-100 group-hover/frame:pointer-events-auto'
                            }`}>
                                {/* Floating Grid Split Controls (+/- Horizontal & Vertical) */}
                                <div
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1"
                                >
                                    {/* Horizontal Split (Cols -/+) */}
                                    <div className="h-[22px] flex items-center bg-[#0d1624] border border-cyan-800/80 rounded overflow-hidden text-[10px] font-mono shadow-sm">
                                        <span className="px-1.5 text-cyan-400 font-bold select-none text-[9px] flex items-center justify-center" title="Разделение по горизонтали (столбцы X)">
                                            ↔
                                        </span>
                                        <button
                                            type="button"
                                            disabled={cols <= 1}
                                            onClick={(e) => handleUpdateFrameGrid(idx, cols - 1, rows, e)}
                                            className="w-6 h-full bg-[#142032] hover:bg-cyan-600 active:bg-cyan-700 disabled:opacity-30 disabled:hover:bg-[#142032] text-cyan-200 hover:text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer disabled:cursor-not-allowed leading-none select-none"
                                            title="Уменьшить деление по горизонтали (X - 1)"
                                        >
                                            -
                                        </button>
                                        <span className={`w-4 text-center font-bold leading-none select-none ${cols > 1 ? 'text-cyan-300' : 'text-gray-400'}`}>
                                            {cols}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={cols >= 20}
                                            onClick={(e) => handleUpdateFrameGrid(idx, cols + 1, rows, e)}
                                            className="w-6 h-full bg-[#142032] hover:bg-cyan-600 active:bg-cyan-700 disabled:opacity-30 disabled:hover:bg-[#142032] text-cyan-200 hover:text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer disabled:cursor-not-allowed leading-none select-none"
                                            title="Разделить рамку по горизонтали на сетку (X + 1)"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Vertical Split (Rows -/+) */}
                                    <div className="h-[22px] flex items-center bg-[#0d1624] border border-cyan-800/80 rounded overflow-hidden text-[10px] font-mono shadow-sm">
                                        <span className="px-1.5 text-cyan-400 font-bold select-none text-[9px] flex items-center justify-center" title="Разделение по вертикали (строки Y)">
                                            ↕
                                        </span>
                                        <button
                                            type="button"
                                            disabled={rows <= 1}
                                            onClick={(e) => handleUpdateFrameGrid(idx, cols, rows - 1, e)}
                                            className="w-6 h-full bg-[#142032] hover:bg-cyan-600 active:bg-cyan-700 disabled:opacity-30 disabled:hover:bg-[#142032] text-cyan-200 hover:text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer disabled:cursor-not-allowed leading-none select-none"
                                            title="Уменьшить деление по вертикали (Y - 1)"
                                        >
                                            -
                                        </button>
                                        <span className={`w-4 text-center font-bold leading-none select-none ${rows > 1 ? 'text-cyan-300' : 'text-gray-400'}`}>
                                            {rows}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={rows >= 20}
                                            onClick={(e) => handleUpdateFrameGrid(idx, cols, rows + 1, e)}
                                            className="w-6 h-full bg-[#142032] hover:bg-cyan-600 active:bg-cyan-700 disabled:opacity-30 disabled:hover:bg-[#142032] text-cyan-200 hover:text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer disabled:cursor-not-allowed leading-none select-none"
                                            title="Разделить рамку по вертикали на сетку (Y + 1)"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Reset custom dividers button if custom lines dragged */}
                                    {hasSubGrid && hasCustomDividers && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleResetFrameDividers(idx, e)}
                                            className="h-[22px] px-1.5 flex items-center justify-center bg-amber-950 hover:bg-amber-700 text-amber-200 rounded border border-amber-600/70 text-[9px] font-mono whitespace-nowrap transition-colors shadow-sm leading-none"
                                            title="Сбросить линии разделения к равномерным"
                                        >
                                            Сброс
                                        </button>
                                    )}

                                    {/* Reset button or Quick preset for this frame */}
                                    {hasSubGrid && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleUpdateFrameGrid(idx, 1, 1, e)}
                                            className="h-[22px] px-1.5 flex items-center justify-center bg-cyan-950 hover:bg-cyan-700 active:bg-cyan-800 text-cyan-200 hover:text-white rounded border border-cyan-600/60 text-[9px] font-mono font-bold whitespace-nowrap transition-colors shadow-sm leading-none"
                                            title="Сбросить сетку рамки к 1×1 (цельный кадр)"
                                        >
                                            1×1
                                        </button>
                                    )}

                                    {/* Quick 2x2 preset button if 1x1 */}
                                    {!hasSubGrid && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleUpdateFrameGrid(idx, 2, 2, e)}
                                            className="h-[22px] px-1.5 flex items-center justify-center bg-[#0e1c2e] hover:bg-cyan-700 text-cyan-300 hover:text-white rounded border border-cyan-700/60 text-[9px] font-mono whitespace-nowrap transition-colors shadow-sm leading-none"
                                            title="Быстро разделить рамку на сетку 2×2 (4 ассета)"
                                        >
                                            2×2
                                        </button>
                                    )}
                                </div>

                                {/* Delete Frame Button */}
                                <button
                                    type="button"
                                    onClick={(e) => handleDeleteFrame(idx, e)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="h-[22px] w-[22px] bg-red-950 hover:bg-red-600 active:bg-red-700 text-red-200 hover:text-white rounded border border-red-700/80 flex items-center justify-center text-[10px] font-bold transition-colors shadow-md leading-none"
                                    title="Удалить эту рамку"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Resizer Handles (Only visible on selected frame or hover) */}
                        {isSelected && (
                            <>
                                {/* Corners */}
                                <div
                                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-md z-40"
                                    onPointerDown={(e) => handlePointerDown('nw', idx, e)}
                                />
                                <div
                                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-md z-40"
                                    onPointerDown={(e) => handlePointerDown('ne', idx, e)}
                                />
                                <div
                                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-md z-40"
                                    onPointerDown={(e) => handlePointerDown('sw', idx, e)}
                                />
                                <div
                                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-md z-40"
                                    onPointerDown={(e) => handlePointerDown('se', idx, e)}
                                />

                                {/* Midpoints */}
                                <div
                                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-cyan-500 rounded-sm cursor-ns-resize shadow-md z-40"
                                    onPointerDown={(e) => handlePointerDown('n', idx, e)}
                                />
                                <div
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-cyan-500 rounded-sm cursor-ns-resize shadow-md z-40"
                                    onPointerDown={(e) => handlePointerDown('s', idx, e)}
                                />
                                <div
                                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-cyan-500 rounded-sm cursor-ew-resize shadow-md z-40"
                                    onPointerDown={(e) => handlePointerDown('w', idx, e)}
                                />
                                <div
                                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-cyan-500 rounded-sm cursor-ew-resize shadow-md z-40"
                                    onPointerDown={(e) => handlePointerDown('e', idx, e)}
                                />
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
