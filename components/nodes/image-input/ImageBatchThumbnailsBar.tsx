import { setupImageDragData } from '../../../utils/imageUtils';
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { ImageBatchItem } from './types';

interface ImageBatchThumbnailsBarProps {
    batchFiles: ImageBatchItem[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
    onRemoveFile: (index: number) => void;
    onClearBatch: () => void;
    onAddFiles: (files: FileList | File[]) => void;
    onPasteClipboard: () => void;
    onNavigatePrev?: () => void;
    onNavigateNext?: () => void;
}

export const ImageBatchThumbnailsBar: React.FC<ImageBatchThumbnailsBarProps> = ({
    batchFiles,
    selectedIndex,
    onSelectIndex,
    onRemoveFile,
    onClearBatch,
    onAddFiles,
    onPasteClipboard,
    onNavigatePrev,
    onNavigateNext,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [containerWidth, setContainerWidth] = useState(400);

    const ITEM_WIDTH = 64;
    const ITEM_GAP = 6;
    const SLOT_WIDTH = ITEM_WIDTH + ITEM_GAP;

    useEffect(() => {
        if (!scrollContainerRef.current) return;
        setContainerWidth(scrollContainerRef.current.clientWidth || 400);

        const observer = new ResizeObserver((entries) => {
            if (entries[0] && entries[0].contentRect.width > 0) {
                setContainerWidth(entries[0].contentRect.width);
            }
        });
        observer.observe(scrollContainerRef.current);
        return () => observer.disconnect();
    }, [batchFiles.length]);

    const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (scrollContainerRef.current) {
            const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
            scrollContainerRef.current.scrollLeft += delta;
        }
    };

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollLeft(e.currentTarget.scrollLeft);
    }, []);

    useEffect(() => {
        if (!scrollContainerRef.current || batchFiles.length === 0) return;
        const targetLeft = selectedIndex * SLOT_WIDTH;
        const currentScroll = scrollContainerRef.current.scrollLeft;
        const width = containerWidth || scrollContainerRef.current.clientWidth || 400;

        if (targetLeft < currentScroll || targetLeft + ITEM_WIDTH > currentScroll + width) {
            scrollContainerRef.current.scrollTo({
                left: Math.max(0, targetLeft - width / 2 + ITEM_WIDTH / 2),
                behavior: 'smooth'
            });
        }
    }, [selectedIndex, batchFiles.length, containerWidth, SLOT_WIDTH, ITEM_WIDTH]);

    const totalSlotCount = batchFiles.length + 2;
    const totalContentWidth = totalSlotCount * SLOT_WIDTH - ITEM_GAP;

    // Virtualization buffer with 300px overscan to ensure 60fps scrolling
    const visibleItems = useMemo(() => {
        if (batchFiles.length === 0) return [];
        const buffer = 300;
        const visibleStart = Math.max(0, scrollLeft - buffer);
        const visibleEnd = scrollLeft + containerWidth + buffer;

        const startIndex = Math.max(0, Math.floor(visibleStart / SLOT_WIDTH));
        const endIndex = Math.min(batchFiles.length - 1, Math.ceil(visibleEnd / SLOT_WIDTH));

        const items = [];
        for (let i = startIndex; i <= endIndex; i++) {
            items.push({
                file: batchFiles[i],
                index: i,
                left: i * SLOT_WIDTH
            });
        }
        return items;
    }, [batchFiles, scrollLeft, containerWidth, SLOT_WIDTH]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAddFiles(e.target.files);
            e.target.value = '';
        }
    };

    if (batchFiles.length === 0) return null;

    return (
        <div className="w-full flex flex-col gap-1.5 pt-2 border-t border-gray-800 animate-fadeIn select-none">
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
            />

            {/* Header / Info Row */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 flex-wrap gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    {/* Navigation Buttons */}
                    {batchFiles.length > 1 && (
                        <div className="flex items-center gap-0.5 bg-gray-900/90 border border-gray-700/80 rounded p-0.5">
                            <button
                                type="button"
                                onClick={() => onNavigatePrev ? onNavigatePrev() : onSelectIndex((selectedIndex - 1 + batchFiles.length) % batchFiles.length)}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 text-cyan-300 hover:text-white transition-colors"
                                title="Предыдущее изображение (клавиша ←)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="text-[10px] font-mono font-bold text-cyan-300 px-1 select-none">
                                {selectedIndex + 1}/{batchFiles.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => onNavigateNext ? onNavigateNext() : onSelectIndex((selectedIndex + 1) % batchFiles.length)}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 text-cyan-300 hover:text-white transition-colors"
                                title="Следующее изображение (клавиша →)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <span className="truncate max-w-[180px] sm:max-w-[260px]">
                        <b className="text-cyan-300">#{selectedIndex + 1} ({batchFiles[selectedIndex]?.name})</b>
                    </span>

                    {batchFiles.length > 1 && (
                        <span className="text-[10px] text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40 hidden md:inline font-mono">
                            ⌨ ← / → выбор фото
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                        type="button"
                        onClick={onPasteClipboard}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-950/60 hover:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-800/60 transition-colors shadow-xs"
                        title="Вставить изображение из буфера обмена (Ctrl+V)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Вставить (Ctrl+V)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium bg-cyan-950/60 hover:bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-800/60 transition-colors shadow-xs"
                        title="Выбрать файлы с устройства для добавления в пакет"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Добавить</span>
                    </button>

                    {batchFiles.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearBatch}
                            className="px-1.5 py-0.5 bg-gray-900 hover:bg-red-950 text-gray-400 hover:text-red-400 border border-gray-800 hover:border-red-800 rounded text-[10px] transition-colors"
                            title="Очистить список изображений пакета"
                        >
                            Очистить
                        </button>
                    )}
                </div>
            </div>

            {/* Virtual Carousel Strip: 64x64px Miniature Thumbnails */}
            <div
                ref={scrollContainerRef}
                onWheel={handleWheelScroll}
                onScroll={handleScroll}
                className="w-full overflow-x-auto overflow-y-hidden p-1.5 bg-gray-950/70 border border-gray-800 rounded-md custom-scrollbar h-[76px] relative"
            >
                <div
                    style={{ width: `${Math.max(totalContentWidth, 240)}px`, height: '64px', position: 'relative' }}
                >
                    {/* Rendered Items via Virtualization */}
                    {visibleItems.map(({ file, index: idx, left }) => {
                        const isSelected = idx === selectedIndex;
                        return (
                            <div
                                key={file.id || idx}
                                    draggable
                                    onDragStart={e => { e.stopPropagation(); setupImageDragData(e, file.dataUrl, file.name); }}
                                onClick={() => onSelectIndex(idx)}
                                style={{
                                    position: 'absolute',
                                    left: `${left}px`,
                                    top: 0,
                                    width: `${ITEM_WIDTH}px`,
                                    height: `${ITEM_WIDTH}px`,
                                }}
                                className={`rounded overflow-hidden cursor-pointer group transition-all ${
                                    isSelected
                                        ? 'ring-2 ring-cyan-400 border-transparent shadow-md scale-105 z-10'
                                        : 'border border-gray-700/80 hover:border-gray-500 opacity-75 hover:opacity-100'
                                }`}
                                title={`#${idx + 1}: ${file.name}`}
                            >
                                <img
                                    src={file.thumbnailUrl || file.dataUrl}
                                    alt={file.name}
                                    loading="lazy"
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover pointer-events-none select-none"
                                />

                                {/* Badge */}
                                <div className="absolute top-0.5 left-0.5 bg-black/80 text-cyan-300 text-[8px] font-mono px-1 rounded z-10">
                                    #{idx + 1}
                                </div>

                                {/* Delete Button on Hover */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFile(idx);
                                    }}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                                    title="Удалить из пакета"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {/* Filename */}
                                <div className="absolute bottom-0 inset-x-0 bg-black/80 text-gray-300 text-[7px] truncate px-0.5 py-0.2 text-center font-mono">
                                    {file.name}
                                </div>
                            </div>
                        );
                    })}

                    {/* Direct '+' Add Button */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            position: 'absolute',
                            left: `${batchFiles.length * SLOT_WIDTH}px`,
                            top: 0,
                            width: `${ITEM_WIDTH}px`,
                            height: `${ITEM_WIDTH}px`,
                        }}
                        className="rounded overflow-hidden cursor-pointer border-2 border-dashed border-cyan-500/60 hover:border-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/40 flex flex-col items-center justify-center text-cyan-300 transition-all group shrink-0"
                        title="Добавить файлы изображений в пакет"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[8px] font-medium text-cyan-200 mt-0.5">Добавить</span>
                    </div>

                    {/* Direct 'Paste' Clipboard Button */}
                    <div
                        onClick={onPasteClipboard}
                        style={{
                            position: 'absolute',
                            left: `${(batchFiles.length + 1) * SLOT_WIDTH}px`,
                            top: 0,
                            width: `${ITEM_WIDTH}px`,
                            height: `${ITEM_WIDTH}px`,
                        }}
                        className="rounded overflow-hidden cursor-pointer border-2 border-dashed border-emerald-500/60 hover:border-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/40 flex flex-col items-center justify-center text-emerald-300 transition-all group shrink-0"
                        title="Вставить изображение из буфера обмена (Ctrl+V)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-[8px] font-medium text-emerald-200 mt-0.5">Вставить</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
