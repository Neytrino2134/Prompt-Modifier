import { VisibleImage } from '../../VisibleImage';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import { StickyNote } from 'lucide-react';
import { setupImageDragData, getImageTimestampString } from '../../../utils/imageUtils';
import { ActionButton } from '../../ActionButton';

interface ImageSlicesPreviewProps {
    nodeId: string;
    slices: string[]; // Thumbnails or full data
    originalImage?: string | null;
    includeOriginal?: boolean;
    onChangeIncludeOriginal?: (val: boolean) => void;
    assetName?: string;
    onChangeAssetName?: (name: string) => void;
    getFullSizeImage?: (nodeId: string, frameNumber: number) => string | undefined;
    onCopyImageToClipboard?: (src: string) => void;
    onDownloadImage?: (nodeId: string) => void;
    addToast?: (message: string, type?: any) => void;
    cols: number;
    rows: number;
    onSendToNote?: () => void;
}

export const ImageSlicesPreview: React.FC<ImageSlicesPreviewProps> = ({
    nodeId,
    slices,
    originalImage,
    includeOriginal = true,
    onChangeIncludeOriginal,
    assetName = 'Asset_Name',
    onChangeAssetName,
    getFullSizeImage,
    onCopyImageToClipboard,
    addToast,
    cols,
    rows,
    onSendToNote
}) => {
    const [isZipping, setIsZipping] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [containerWidth, setContainerWidth] = useState(400);

    const ITEM_SIZE = 72;
    const ITEM_GAP = 8;
    const SLOT_WIDTH = ITEM_SIZE + ITEM_GAP;

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
    }, [slices.length]);

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

    const totalContentWidth = slices.length * SLOT_WIDTH - ITEM_GAP;

    // Virtualization buffer
    const visibleSlices = useMemo(() => {
        if (slices.length === 0) return [];
        const buffer = 200;
        const visibleStart = Math.max(0, scrollLeft - buffer);
        const visibleEnd = scrollLeft + containerWidth + buffer;

        const startIndex = Math.max(0, Math.floor(visibleStart / SLOT_WIDTH));
        const endIndex = Math.min(slices.length - 1, Math.ceil(visibleEnd / SLOT_WIDTH));

        const items = [];
        for (let i = startIndex; i <= endIndex; i++) {
            items.push({
                url: slices[i],
                index: i,
                left: i * SLOT_WIDTH
            });
        }
        return items;
    }, [slices, scrollLeft, containerWidth, SLOT_WIDTH]);

    const handleDownloadAllZip = async () => {
        if (!slices || slices.length === 0) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const cleanAssetName = (assetName || 'Asset_Name').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Name';
            const folder = zip.folder(`assets_${cleanAssetName}_grid_${rows}x${cols}`) || zip;
            let totalSaved = 0;

            // 1. If includeOriginal is requested, write full uncropped original image
            if (includeOriginal && originalImage) {
                const origFull = getFullSizeImage ? getFullSizeImage(nodeId, 0) : null;
                const origSrc = origFull || originalImage;
                if (origSrc && origSrc.startsWith('data:')) {
                    const dataParts = origSrc.split(',');
                    if (dataParts.length > 1) {
                        const mimeMatch = origSrc.match(/data:([^;]+);/);
                        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                        const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
                        folder.file(`original_${cleanAssetName}.${ext}`, dataParts[1], { base64: true });
                        totalSaved += 1;
                    }
                }
            }

            // 2. Add all slices in original full resolution
            for (let i = 0; i < slices.length; i++) {
                const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, i + 1) : null;
                const src = fullRes || slices[i];
                if (src && src.startsWith('data:')) {
                    const base64Data = src.split(',')[1];
                    const row = Math.floor(i / cols) + 1;
                    const col = (i % cols) + 1;
                    const filename = `slice_${String(i + 1).padStart(3, '0')}_${cleanAssetName}_r${row}_c${col}.png`;
                    folder.file(filename, base64Data, { base64: true });
                    totalSaved += 1;
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;

            const timestamp = getImageTimestampString();
            a.download = `Grid_${cols}x${rows}_${cleanAssetName}_${slices.length}_${timestamp}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (addToast) addToast(`Скачано ${totalSaved} ассетов (${cleanAssetName}) в ZIP архиве`, 'success');
        } catch (err: any) {
            console.error('Error creating ZIP:', err);
            if (addToast) addToast('Не удалось создать ZIP архив', 'error');
        } finally {
            setIsZipping(false);
        }
    };

    const handleCopy = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, idx + 1) : null;
        const src = fullRes || slices[idx];
        if (src && onCopyImageToClipboard) {
            onCopyImageToClipboard(src);
            setCopiedIndex(idx);
            setTimeout(() => setCopiedIndex(null), 1500);
        }
    };

    const handleDownloadSingle = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, idx + 1) : null;
        const src = fullRes || slices[idx];
        if (src) {
            const cleanAssetName = (assetName || 'Asset_Name').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Name';
            const row = Math.floor(idx / cols) + 1;
            const col = (idx % cols) + 1;
            const timestamp = getImageTimestampString();
            const a = document.createElement('a');
            a.href = src;
            a.download = `slice_${String(idx + 1).padStart(3, '0')}_${cleanAssetName}_r${row}_c${col}_${timestamp}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleSliceDragStart = (idx: number, e: React.DragEvent) => {
        const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, idx + 1) : null;
        const src = fullRes || slices[idx];
        if (src) {
            const cleanAssetName = (assetName || 'Asset_Name').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Name';
            const filename = `slice_${String(idx + 1).padStart(3, '0')}_${cleanAssetName}_${getImageTimestampString()}.png`;
            setupImageDragData(e, src, filename);
            e.stopPropagation();
        }
    };

    return (
        <div className="w-full flex flex-col gap-2 pt-2 border-t border-gray-800">
            {/* Header & ZIP download */}
            <div className="flex items-center justify-between px-1 text-xs gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span>Сетка ассетов ({slices.length + (includeOriginal ? 1 : 0)} шт.)</span>
                    </span>

                    {/* Asset Name Field */}
                    <div className="flex items-center gap-1.5 bg-gray-900/90 border border-cyan-800/60 px-2 py-0.5 rounded text-[11px]">
                        <span className="text-gray-400 font-medium">Имя ассета:</span>
                        <input
                            type="text"
                            value={assetName}
                            onChange={(e) => onChangeAssetName && onChangeAssetName(e.target.value)}
                            disabled={isZipping}
                            placeholder="Asset_Name"
                            className="w-28 bg-gray-950 border border-gray-700 focus:border-cyan-400 rounded px-1.5 py-0.5 text-cyan-200 font-mono text-[11px] focus:outline-none"
                            title="Имя ассета (добавляется к названию архива и всем файлам)"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onChangeIncludeOriginal && (
                        <button
                            type="button"
                            onClick={() => onChangeIncludeOriginal(!includeOriginal)}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                includeOriginal
                                    ? 'bg-cyan-900/60 border border-cyan-500/80 text-cyan-200'
                                    : 'bg-gray-800/80 border border-gray-700 text-gray-400 hover:text-gray-300'
                            }`}
                            title="Добавить в ZIP архив оригинальное неразрезанное изображение"
                        >
                            <span className={`w-3.5 h-3.5 flex items-center justify-center rounded border text-[10px] font-bold ${
                                includeOriginal
                                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                                    : 'border-gray-600'
                            }`}>
                                {includeOriginal ? '✓' : ''}
                            </span>
                            <span>Включить оригинал</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleDownloadAllZip}
                        disabled={isZipping || slices.length === 0}
                        className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white rounded text-[11px] font-medium shadow-sm transition-colors"
                    >
                        {isZipping ? (
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        )}
                        <span>Скачать все (ZIP)</span>
                    </button>

                    {onSendToNote && (
                        <button
                            type="button"
                            onClick={onSendToNote}
                            disabled={slices.length === 0}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-secondary hover:brightness-110 disabled:bg-gray-700 text-white rounded text-[11px] font-medium shadow-sm transition-colors"
                            title="Отправить все ассеты сетки в новую заметку (Note в режиме References)"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-white" />
                            <span>Отправить в заметку</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Slices Virtual Carousel Strip */}
            <div 
                ref={scrollContainerRef}
                onWheel={handleWheelScroll}
                onScroll={handleScroll}
                className="w-full overflow-x-auto overflow-y-hidden p-1.5 bg-gray-950/70 border border-gray-800 rounded-md custom-scrollbar h-[88px] relative"
            >
                <div style={{ width: `${Math.max(totalContentWidth, 200)}px`, height: `${ITEM_SIZE}px`, position: 'relative' }}>
                    {visibleSlices.map(({ url: sliceUrl, index: idx, left }) => {
                        const row = Math.floor(idx / cols) + 1;
                        const col = (idx % cols) + 1;
                        return (
                            <div
                                key={idx}
                                draggable={true}
                                onDragStart={(e) => handleSliceDragStart(idx, e)}
                                style={{
                                    position: 'absolute',
                                    left: `${left}px`,
                                    top: 0,
                                    width: `${ITEM_SIZE}px`,
                                    height: `${ITEM_SIZE}px`,
                                }}
                                className="bg-gray-900 border border-gray-700/70 rounded overflow-hidden group/cell hover:border-cyan-400 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                                title={`Ассет #${idx + 1} — Потяните мышью для вытаскивания на холст или в ноды`}
                            >
                                <VisibleImage
                                    src={sliceUrl}
                                    alt={`Asset ${idx + 1}`}
                                    loading="lazy"
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover pointer-events-none select-none"
                                />

                                {/* Badge */}
                                <div className="absolute top-0.5 left-0.5 bg-black/80 text-cyan-300 text-[9px] font-mono px-1 rounded flex items-center gap-0.5 z-10">
                                    <span>#{idx + 1}</span>
                                </div>
                                
                                <div className="absolute bottom-0.5 left-0.5 bg-black/80 text-gray-400 text-[8px] font-mono px-1 rounded z-10">
                                    r{row}c{col}
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center gap-1 z-20">
                                    <ActionButton
                                        title="Скопировать в буфер"
                                        onClick={(e) => handleCopy(idx, e)}
                                    >
                                        {copiedIndex === idx ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </ActionButton>

                                    <ActionButton
                                        title="Скачать PNG в полном разрешении"
                                        onClick={(e) => handleDownloadSingle(idx, e)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </ActionButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
