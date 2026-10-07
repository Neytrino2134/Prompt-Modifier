import { VisibleImage } from '../../VisibleImage';
import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { StickyNote } from 'lucide-react';
import { setupImageDragData, getImageTimestampString } from '../../../utils/imageUtils';
import { ActionButton } from '../../ActionButton';
import { ImageInputFrameItem } from './types';

interface ImageFramesPreviewProps {
    nodeId: string;
    frames: ImageInputFrameItem[];
    frameThumbnails: string[]; // Thumbnails or full data
    originalImage?: string | null;
    includeOriginal?: boolean;
    onChangeIncludeOriginal?: (val: boolean) => void;
    assetName?: string;
    onChangeAssetName?: (name: string) => void;
    getFullSizeImage?: (nodeId: string, frameNumber: number) => string | undefined;
    onCopyImageToClipboard?: (src: string) => void;
    onDownloadImage?: (nodeId: string) => void;
    addToast?: (message: string, type?: any) => void;
    selectedFrameIndex?: number;
    onSelectFrame?: (index: number) => void;
    onDeleteFrame?: (index: number) => void;
    onAddFrame?: () => void;
    onDuplicateFrame?: (index?: number) => void;
    onSendToNote?: () => void;
}

export const ImageFramesPreview: React.FC<ImageFramesPreviewProps> = ({
    nodeId,
    frames = [],
    frameThumbnails = [],
    originalImage,
    includeOriginal = true,
    onChangeIncludeOriginal,
    assetName = 'Asset_Frames',
    onChangeAssetName,
    getFullSizeImage,
    onCopyImageToClipboard,
    addToast,
    selectedFrameIndex = 0,
    onSelectFrame,
    onDeleteFrame,
    onAddFrame,
    onDuplicateFrame,
    onSendToNote
}) => {
    const [isZipping, setIsZipping] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Compute all individual sliced assets from frames and their sub-grids
    const flatAssets = React.useMemo(() => {
        const list: {
            globalIndex: number;
            frameIndex: number;
            subIndex: number;
            totalInFrame: number;
            row: number;
            col: number;
            name: string;
            frameName: string;
        }[] = [];

        frames.forEach((frame, fIdx) => {
            const cols = Math.max(1, Math.min(20, frame.cols || 1));
            const rows = Math.max(1, Math.min(20, frame.rows || 1));
            const totalInFrame = cols * rows;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const isSingle = totalInFrame === 1;
                    const baseName = frame.name || `Frame ${fIdx + 1}`;
                    const name = isSingle ? baseName : `${baseName} [${r + 1},${c + 1}]`;
                    list.push({
                        globalIndex: list.length,
                        frameIndex: fIdx,
                        subIndex: r * cols + c,
                        totalInFrame,
                        row: r + 1,
                        col: c + 1,
                        name,
                        frameName: baseName
                    });
                }
            }
        });
        return list;
    }, [frames]);

    const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (scrollContainerRef.current) {
            const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
            scrollContainerRef.current.scrollLeft += delta;
        }
    };

    const handleDownloadAllZip = async () => {
        if (!flatAssets || flatAssets.length === 0) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const cleanAssetName = (assetName || 'Asset_Frames').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Frames';
            const folder = zip.folder(`assets_${cleanAssetName}_frames_${flatAssets.length}`) || zip;
            let totalSaved = 0;

            // 1. Write uncropped original image if requested
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

            // 2. Add all frame crops and sub-grid sliced assets
            for (let i = 0; i < flatAssets.length; i++) {
                const asset = flatAssets[i];
                const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, asset.globalIndex + 1) : null;
                const src = fullRes || frameThumbnails[asset.globalIndex];
                if (src && src.startsWith('data:')) {
                    const base64Data = src.split(',')[1];
                    const cleanFrameName = asset.name.replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_');
                    const filename = `frame_${String(asset.globalIndex + 1).padStart(3, '0')}_${cleanAssetName}_${cleanFrameName}.png`;
                    folder.file(filename, base64Data, { base64: true });
                    totalSaved += 1;
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;

            const timestamp = getImageTimestampString();
            a.download = `Frames_${cleanAssetName}_${flatAssets.length}_${timestamp}.zip`;
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

    const handleCopy = (globalIdx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, globalIdx + 1) : null;
        const src = fullRes || frameThumbnails[globalIdx];
        if (src && onCopyImageToClipboard) {
            onCopyImageToClipboard(src);
            setCopiedIndex(globalIdx);
            setTimeout(() => setCopiedIndex(null), 1500);
        }
    };

    const handleDownloadSingle = (globalIdx: number, customName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, globalIdx + 1) : null;
        const src = fullRes || frameThumbnails[globalIdx];
        if (src) {
            const cleanAssetName = (assetName || 'Asset_Frames').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Frames';
            const cleanSubName = customName.replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_');
            const timestamp = getImageTimestampString();
            const a = document.createElement('a');
            a.href = src;
            a.download = `frame_${String(globalIdx + 1).padStart(3, '0')}_${cleanAssetName}_${cleanSubName}_${timestamp}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleFrameDragStart = (globalIdx: number, customName: string, e: React.DragEvent) => {
        const fullRes = getFullSizeImage ? getFullSizeImage(nodeId, globalIdx + 1) : null;
        const src = fullRes || frameThumbnails[globalIdx];
        if (src) {
            const cleanAssetName = (assetName || 'Asset_Frames').trim().replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_') || 'Asset_Frames';
            const cleanSubName = customName.replace(/[^a-zA-Z0-9_\-а-яА-ЯёЁ]/g, '_');
            const filename = `frame_${String(globalIdx + 1).padStart(3, '0')}_${cleanAssetName}_${cleanSubName}_${getImageTimestampString()}.png`;
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
                        <span>Сетка рамок ({flatAssets.length + (includeOriginal ? 1 : 0)} ассет.)</span>
                    </span>

                    {/* Asset Name Field */}
                    <div className="flex items-center gap-1.5 bg-gray-900/90 border border-cyan-800/60 px-2 py-0.5 rounded text-[11px]">
                        <span className="text-gray-400 font-medium">Имя ассета:</span>
                        <input
                            type="text"
                            value={assetName}
                            onChange={(e) => onChangeAssetName && onChangeAssetName(e.target.value)}
                            disabled={isZipping}
                            placeholder="Asset_Frames"
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
                            title="Добавить в ZIP архив оригинальное изображение целиком"
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
                        disabled={isZipping || flatAssets.length === 0}
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
                            disabled={flatAssets.length === 0}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-secondary hover:brightness-110 disabled:bg-gray-700 text-white rounded text-[11px] font-medium shadow-sm transition-colors"
                            title="Отправить все рамки-ассеты в новую заметку (Note в режиме References)"
                        >
                            <StickyNote className="h-3.5 w-3.5 text-white" />
                            <span>Отправить в заметку</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Frames Carousel / Slices Grid */}
            <div 
                ref={scrollContainerRef}
                onWheel={handleWheelScroll}
                className="w-full flex gap-2 overflow-x-auto p-1.5 bg-gray-950/70 border border-gray-800 rounded-md custom-scrollbar max-h-36 items-center"
            >
                {flatAssets.map((asset) => {
                    const thumbUrl = frameThumbnails[asset.globalIndex] || (getFullSizeImage ? getFullSizeImage(nodeId, asset.globalIndex + 1) : null);
                    const isSelected = asset.frameIndex === selectedFrameIndex;

                    return (
                        <div
                            key={`${asset.frameIndex}-${asset.subIndex}`}
                            draggable={true}
                            onDragStart={(e) => handleFrameDragStart(asset.globalIndex, asset.name, e)}
                            onClick={() => onSelectFrame && onSelectFrame(asset.frameIndex)}
                            className={`relative flex-shrink-0 w-20 h-20 bg-gray-900 border rounded overflow-hidden group/cell transition-all cursor-grab active:cursor-grabbing shadow-sm ${
                                isSelected
                                    ? 'border-cyan-400 ring-2 ring-cyan-500/50 scale-[1.02]'
                                    : 'border-gray-700/80 hover:border-cyan-400'
                            }`}
                            title={`Ассет ${asset.name} (Рамка #${asset.frameIndex + 1}${asset.totalInFrame > 1 ? ` Сетка [${asset.row},${asset.col}]` : ''}) — Нажмите для выбора или потяните`}
                        >
                            {thumbUrl ? (
                                <VisibleImage
                                    src={thumbUrl}
                                    alt={asset.name}
                                    className="w-full h-full object-cover pointer-events-none"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-500 text-[9px] font-mono">
                                    <span>#{asset.frameIndex + 1}</span>
                                    {asset.totalInFrame > 1 && <span>{asset.row},{asset.col}</span>}
                                </div>
                            )}

                            {/* Badge */}
                            <div className="absolute top-0.5 left-0.5 bg-black/85 text-cyan-300 text-[8px] font-mono px-1 rounded flex items-center gap-0.5 z-10 border border-cyan-500/30">
                                <span>#{asset.frameIndex + 1}</span>
                                {asset.totalInFrame > 1 && (
                                    <span className="text-cyan-200 font-bold">[{asset.row},{asset.col}]</span>
                                )}
                            </div>

                            {/* Delete Frame Button on hover */}
                            {onDeleteFrame && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteFrame(asset.frameIndex);
                                    }}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-900/90 hover:bg-red-600 text-white rounded flex items-center justify-center text-[9px] font-bold opacity-0 group-hover/cell:opacity-100 transition-opacity z-20 shadow"
                                    title={`Удалить рамку #${asset.frameIndex + 1}`}
                                >
                                    ✕
                                </button>
                            )}

                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center gap-1 z-10">
                                <ActionButton
                                    title="Скопировать в буфер"
                                    onClick={(e) => handleCopy(asset.globalIndex, e)}
                                >
                                    {copiedIndex === asset.globalIndex ? (
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
                                    onClick={(e) => handleDownloadSingle(asset.globalIndex, asset.name, e)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </ActionButton>
                            </div>
                        </div>
                    );
                })}

                {/* Add Frame Button at the end of Carousel */}
                {onAddFrame && (
                    <button
                        type="button"
                        onClick={onAddFrame}
                        className="flex-shrink-0 w-20 h-20 bg-gray-900/60 hover:bg-cyan-950/60 border border-dashed border-gray-700 hover:border-cyan-400 rounded flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-cyan-300 transition-all group/add shadow-sm"
                        title="Добавить еще одну рамку"
                    >
                        <span className="w-6 h-6 rounded-full bg-cyan-900/50 group-hover/add:bg-cyan-600 group-hover/add:text-white flex items-center justify-center text-sm font-bold transition-colors">
                            +
                        </span>
                        <span className="text-[10px] font-medium">Рамка</span>
                    </button>
                )}
            </div>
        </div>
    );
};
