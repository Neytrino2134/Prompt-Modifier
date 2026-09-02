import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { ImageBatchItem, ImageBatchSubMode, ImageInputCropRect, ImageInputGridConfig } from './types';
import { ActionButton } from '../../ActionButton';

interface BatchProcessingPanelProps {
    nodeId: string;
    batchFiles: ImageBatchItem[];
    selectedReferenceIndex: number;
    onSelectReferenceIndex: (index: number) => void;
    onRemoveBatchFile: (index: number) => void;
    onClearBatch: () => void;
    onAddBatchFiles: (files: FileList | File[]) => void;
    subMode: ImageBatchSubMode;
    onChangeSubMode: (subMode: ImageBatchSubMode) => void;
    includeOriginal?: boolean;
    onChangeIncludeOriginal?: (include: boolean) => void;
    assetName?: string;
    onChangeAssetName?: (name: string) => void;
    cropRect: ImageInputCropRect | null;
    gridConfig: ImageInputGridConfig;
    isProcessing: boolean;
    progress: { current: number; total: number; currentName: string; percent: number } | null;
    onStartBatchProcess: () => void;
    onCancelBatchProcess: () => void;
    batchResult: { zipBlob: Blob; totalImages: number; totalSlices: number; timestamp: string; filename: string } | null;
    onDownloadZip: () => void;
    addToast?: (msg: string, type?: any) => void;
    upstreamImagesCount?: number;
    onSyncFromUpstream?: () => void;
}

export const BatchProcessingPanel: React.FC<BatchProcessingPanelProps> = ({
    batchFiles,
    selectedReferenceIndex,
    onSelectReferenceIndex,
    onRemoveBatchFile,
    onClearBatch,
    onAddBatchFiles,
    subMode,
    onChangeSubMode,
    includeOriginal = true,
    onChangeIncludeOriginal,
    assetName = 'Asset_Name',
    onChangeAssetName,
    gridConfig,
    isProcessing,
    progress,
    onStartBatchProcess,
    onCancelBatchProcess,
    batchResult,
    onDownloadZip,
    upstreamImagesCount = 0,
    onSyncFromUpstream
}) => {
    const multiFileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Horizontal Virtualization State
    const [scrollLeft, setScrollLeft] = useState(0);
    const [containerWidth, setContainerWidth] = useState(400);

    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                setContainerWidth(entries[0].contentRect.width);
            }
        });
        observer.observe(scrollContainerRef.current);
        return () => observer.disconnect();
    }, [batchFiles.length]);

    const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (scrollContainerRef.current) {
            // Translate vertical wheel scroll to horizontal scrolling
            const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
            scrollContainerRef.current.scrollLeft += delta;
        }
    };

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollLeft(e.currentTarget.scrollLeft);
    }, []);

    // Item size calculations: 64px width + 6px gap = 70px per item slot
    const ITEM_WIDTH = 64;
    const ITEM_GAP = 6;
    const SLOT_WIDTH = ITEM_WIDTH + ITEM_GAP;
    const totalContentWidth = batchFiles.length > 0 ? (batchFiles.length * SLOT_WIDTH - ITEM_GAP) : 0;

    const visibleItems = useMemo(() => {
        if (batchFiles.length === 0) return [];
        const buffer = 300; // Extra buffer in pixels for super smooth horizontal scroll
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
            onAddBatchFiles(e.target.files);
            e.target.value = '';
        }
    };

    const baseCalculatedSlices = subMode === 'crop'
        ? batchFiles.length
        : batchFiles.length * (gridConfig.cols || 4) * (gridConfig.rows || 5);
    const totalCalculatedSlices = baseCalculatedSlices + (includeOriginal ? batchFiles.length : 0);

    return (
        <div className="w-full flex flex-col gap-2 pt-2 border-t border-gray-800 animate-fadeIn select-none">
            <input
                ref={multiFileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
            />

            {/* Top Toolbar in Batch Mode: Include Original, Asset Name & File Management */}
            <div className="flex items-center justify-between px-1 text-xs gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Option: Include Original / Uncropped Image in ZIP */}
                    <button
                        type="button"
                        onClick={() => onChangeIncludeOriginal && onChangeIncludeOriginal(!includeOriginal)}
                        disabled={isProcessing}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 border ${
                            includeOriginal
                                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-sm'
                                : 'bg-gray-900/80 border-gray-700/80 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                        } disabled:opacity-50`}
                        title="Добавить оригинальное необрезанное изображение в подпапку каждого файла в ZIP-архиве"
                    >
                        <span className={`w-3.5 h-3.5 flex items-center justify-center rounded border text-[10px] font-bold ${
                            includeOriginal
                                ? 'bg-cyan-500 border-cyan-400 text-black'
                                : 'border-gray-500 bg-transparent text-transparent'
                        }`}>
                            ✓
                        </span>
                        <span>Включить оригинальное изображение</span>
                    </button>

                    {/* Asset Name Field */}
                    <div className="flex items-center gap-1.5 bg-gray-900/90 border border-cyan-800/60 px-2 py-0.5 rounded text-[11px]">
                        <span className="text-gray-400 font-medium">Имя ассета:</span>
                        <input
                            type="text"
                            value={assetName}
                            onChange={(e) => onChangeAssetName && onChangeAssetName(e.target.value)}
                            disabled={isProcessing}
                            placeholder="Asset_Name"
                            className="w-28 bg-gray-950 border border-gray-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-cyan-200 font-mono text-[11px] focus:outline-none"
                            title="Имя ассета (добавляется к названию архива и всем файлам)"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                    {upstreamImagesCount > 0 && onSyncFromUpstream && (
                        <button
                            type="button"
                            onClick={onSyncFromUpstream}
                            disabled={isProcessing}
                            className="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/80 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                            title="Синхронизировать и загрузить изображения из входной ноды (AI Image Editor / Sequence)"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span>Входной поток ({upstreamImagesCount})</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => multiFileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-cyan-800/60 rounded text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Добавить еще изображения в пакет"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>+ Добавить файлы</span>
                    </button>

                    {batchFiles.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearBatch}
                            disabled={isProcessing}
                            className="px-1.5 py-0.5 bg-gray-900 hover:bg-red-950 text-gray-400 hover:text-red-400 border border-gray-800 hover:border-red-800 rounded text-[11px] transition-colors disabled:opacity-50"
                            title="Очистить список изображений пакета"
                        >
                            Очистить
                        </button>
                    )}
                </div>
            </div>

            {/* Batch Status & Action Bar */}
            <div className="p-2 bg-gray-950/80 border border-gray-800 rounded-md flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span className="font-semibold text-gray-200">
                                Загружено: <span className="text-cyan-300 font-mono font-bold">{batchFiles.length}</span> изобр.
                            </span>
                        </div>

                        <span className="text-gray-500">•</span>

                        <span className="text-gray-400 text-[11px]">
                            Итог в ZIP: <span className="text-cyan-400 font-mono font-semibold">{totalCalculatedSlices}</span> файлов в папках
                        </span>
                    </div>

                    {/* Primary Action Button */}
                    <div className="flex items-center gap-2">
                        {isProcessing ? (
                            <button
                                type="button"
                                onClick={onCancelBatchProcess}
                                className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                            >
                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Отмена</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onStartBatchProcess}
                                disabled={batchFiles.length === 0}
                                className="px-3.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white rounded text-xs font-bold shadow-md ring-1 ring-cyan-400/50 transition-all flex items-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Обработать ({batchFiles.length})</span>
                            </button>
                        )}

                        {batchResult && !isProcessing && (
                            <button
                                type="button"
                                onClick={onDownloadZip}
                                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold shadow-md ring-1 ring-green-400/50 transition-all flex items-center gap-1.5 animate-bounce-short"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Скачать ZIP ({batchResult.totalSlices} шт.)</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Bar (Visible during processing) */}
                {isProcessing && progress && (
                    <div className="w-full flex flex-col gap-1 pt-1 border-t border-gray-800">
                        <div className="flex justify-between items-center text-[11px] text-gray-300 font-mono">
                            <span className="truncate max-w-[70%]">
                                Обработка: <span className="text-cyan-300 font-semibold">{progress.currentName || `Файл ${progress.current}/${progress.total}`}</span>
                            </span>
                            <span className="text-cyan-400 font-bold">{progress.percent}% ({progress.current}/{progress.total})</span>
                        </div>
                        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 transition-all duration-150 rounded-full"
                                style={{ width: `${progress.percent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Finished Result Banner */}
                {batchResult && !isProcessing && (
                    <div className="flex items-center justify-between p-2 bg-green-950/40 border border-green-800/60 rounded text-xs text-green-300">
                        <div className="flex items-center gap-2">
                            <span className="text-green-400 text-sm">✓</span>
                            <span>
                                Успешно обработано: <b>{batchResult.totalImages}</b> изобр. (<b>{batchResult.totalSlices}</b> файлов) в папках архива.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onDownloadZip}
                            className="text-green-400 hover:text-green-200 underline font-semibold text-[11px]"
                        >
                            Скачать еще раз
                        </button>
                    </div>
                )}
            </div>

            {/* Virtualized Reference Carousel / File Strip (Scrolls with mouse wheel) */}
            {batchFiles.length > 0 && (
                <div className="w-full flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                        <span>
                            Пример для настройки: <b className="text-cyan-300">#{selectedReferenceIndex + 1} ({batchFiles[selectedReferenceIndex]?.name})</b>
                        </span>
                        <span className="text-[10px] text-gray-500">Колесико мыши: прокрутка списка • Клик: выбор примера</span>
                    </div>

                    <div 
                        ref={scrollContainerRef}
                        onWheel={handleWheelScroll}
                        onScroll={handleScroll}
                        className="w-full overflow-x-auto overflow-y-hidden p-1.5 bg-gray-950/70 border border-gray-800 rounded-md custom-scrollbar h-[76px] relative"
                    >
                        <div 
                            style={{ width: `${totalContentWidth}px`, height: '64px', position: 'relative' }}
                        >
                            {visibleItems.map(({ file, index: idx, left }) => {
                                const isRef = idx === selectedReferenceIndex;
                                return (
                                    <div
                                        key={file.id || idx}
                                        onClick={() => onSelectReferenceIndex(idx)}
                                        style={{
                                            position: 'absolute',
                                            left: `${left}px`,
                                            top: 0,
                                            width: `${ITEM_WIDTH}px`,
                                            height: `${ITEM_WIDTH}px`,
                                        }}
                                        className={`rounded overflow-hidden cursor-pointer group transition-all ${
                                            isRef
                                                ? 'ring-2 ring-cyan-400 border-transparent shadow-md scale-105 z-10'
                                                : 'border border-gray-700/80 hover:border-gray-500 opacity-70 hover:opacity-100'
                                        }`}
                                        title={`#${idx + 1}: ${file.name}`}
                                    >
                                        {/* Uses 128x128 compressed thumbnail for super fast rendering, original dataUrl is preserved for full resolution batch processing */}
                                        <img
                                            src={file.thumbnailUrl || file.dataUrl}
                                            alt={file.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover pointer-events-none select-none"
                                        />

                                        {/* Number & Ref Badge */}
                                        <div className="absolute top-0.5 left-0.5 bg-black/80 text-cyan-300 text-[8px] font-mono px-1 rounded z-10">
                                            {isRef ? '★ Ref' : `#${idx + 1}`}
                                        </div>

                                        {/* Delete Button on Hover */}
                                        {!isProcessing && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveBatchFile(idx);
                                                }}
                                                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                                                title="Удалить из пакета"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}

                                        {/* Filename bottom banner */}
                                        <div className="absolute bottom-0 inset-x-0 bg-black/80 text-gray-300 text-[7px] truncate px-0.5 py-0.2 text-center font-mono">
                                            {file.name}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
