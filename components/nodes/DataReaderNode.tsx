import React, { useMemo, useState, useEffect } from 'react';
import type { NodeContentProps } from '../../types';

interface ImageDimensionInfo {
    width: number;
    height: number;
    aspectRatio: string;
    mime?: string;
}

export const DataReaderNode: React.FC<NodeContentProps> = ({ node, onReadData, t, onSelectNode, getUpstreamNodeValues }) => {
    const { text, images, mediaUrl, mediaType } = useMemo(() => {
        try {
            const parsed = JSON.parse(node.value || '{}');
            let imgs: string[] = [];
            if (Array.isArray(parsed.images) && parsed.images.length > 0) {
                imgs = parsed.images;
            } else if (parsed.image) {
                imgs = [parsed.image];
            }

            return { 
                text: parsed.text || '', 
                images: imgs,
                mediaUrl: parsed.mediaUrl || null,
                mediaType: parsed.mediaType || 'video'
            };
        } catch {
            return { text: '', images: [], mediaUrl: null, mediaType: 'video' };
        }
    }, [node.value]);

    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [dimensionsMap, setDimensionsMap] = useState<Record<number, ImageDimensionInfo>>({});
    const [showFileList, setShowFileList] = useState<boolean>(false);

    // Keep selected index within bounds when image array changes
    useEffect(() => {
        if (selectedImageIndex >= images.length && images.length > 0) {
            setSelectedImageIndex(0);
        }
    }, [images.length, selectedImageIndex]);

    // Load and store dimensions for each image in the array
    useEffect(() => {
        if (images.length === 0) {
            setDimensionsMap({});
            return;
        }

        images.forEach((imgSrc, idx) => {
            if (!imgSrc) return;
            const img = new Image();
            img.onload = () => {
                const w = img.naturalWidth;
                const h = img.naturalHeight;
                let ratio = '1:1';
                if (w && h) {
                    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
                    const divisor = gcd(w, h);
                    const simplifiedW = w / divisor;
                    const simplifiedH = h / divisor;
                    if (simplifiedW <= 16 && simplifiedH <= 16) {
                        ratio = `${simplifiedW}:${simplifiedH}`;
                    } else {
                        ratio = (w / h).toFixed(2) + ':1';
                    }
                }

                const mimeMatch = imgSrc.match(/data:(image\/[a-zA-Z0-9.+_-]+);/);
                const mime = mimeMatch ? mimeMatch[1].replace('image/', '').toUpperCase() : 'IMG';

                setDimensionsMap(prev => ({
                    ...prev,
                    [idx]: {
                        width: w,
                        height: h,
                        aspectRatio: ratio,
                        mime
                    }
                }));
            };
            img.src = imgSrc;
        });
    }, [images]);

    // Automatic update trigger when upstream connections change
    const upstreamData = useMemo(() => {
        return getUpstreamNodeValues(node.id);
    }, [getUpstreamNodeValues, node.id]);

    const upstreamSignature = JSON.stringify(upstreamData);

    useEffect(() => {
        onReadData(node.id);
    }, [upstreamSignature, onReadData, node.id]);

    const activeImageSrc = images[selectedImageIndex] || images[0] || null;
    const activeDimensions = dimensionsMap[selectedImageIndex] || dimensionsMap[0] || null;

    return (
        <div className="flex flex-col h-full space-y-2 select-none">
            <div className="flex-grow min-h-0 flex flex-col space-y-2 overflow-y-auto custom-scrollbar">
                {/* Media Display (Video/Audio) */}
                {mediaUrl && (
                    <div className="flex-1 min-h-[140px] bg-black rounded-md overflow-hidden relative group border border-gray-700" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
                        {mediaType === 'video' ? (
                            <video 
                                src={mediaUrl} 
                                controls 
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-900">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                                <audio src={mediaUrl} controls className="w-full max-w-[90%]" />
                            </div>
                        )}
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none uppercase backdrop-blur-sm border border-white/10">
                            {mediaType}
                        </div>
                    </div>
                )}

                {/* Multiple Images Statistics & Preview Area */}
                {images.length > 0 && (
                    <div className="flex flex-col gap-1.5 bg-gray-950/60 rounded-md border border-gray-800 p-2" onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}>
                        {/* Header Stats Bar */}
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-gray-800 flex-wrap gap-1">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                <span className="font-semibold text-gray-200">
                                    Изображений: <span className="text-cyan-300 font-mono font-bold">{images.length}</span>
                                </span>
                                {images.length > 1 && (
                                    <span className="text-gray-400 font-mono text-[11px]">
                                        (выбрано #{selectedImageIndex + 1})
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5">
                                {activeDimensions && (
                                    <span className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-cyan-300 font-mono text-[11px]">
                                        {activeDimensions.width} × {activeDimensions.height} px ({activeDimensions.aspectRatio})
                                    </span>
                                )}

                                {images.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowFileList(!showFileList)}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                                            showFileList 
                                                ? 'bg-cyan-950 border-cyan-500 text-cyan-300' 
                                                : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                                        }`}
                                        title="Показать / скрыть подробный список файлов и разрешений"
                                    >
                                        {showFileList ? 'Скрыть список' : 'Список файлов'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Main Active Image Frame */}
                        {activeImageSrc && (
                            <div className="w-full h-44 bg-gray-900/80 rounded relative flex items-center justify-center overflow-hidden border border-gray-800/80 group">
                                <img 
                                    src={activeImageSrc} 
                                    alt={`Image #${selectedImageIndex + 1}`} 
                                    className="object-contain w-full h-full max-h-44" 
                                />

                                {/* Frame Index Tag */}
                                <div className="absolute top-1.5 left-1.5 bg-black/75 text-cyan-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm">
                                    #{selectedImageIndex + 1} / {images.length}
                                </div>

                                {/* Active Resolution Overlay */}
                                {activeDimensions && (
                                    <div className="absolute bottom-1.5 right-1.5 bg-black/75 text-white font-mono text-[10px] px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-sm">
                                        {activeDimensions.width} × {activeDimensions.height} px
                                    </div>
                                )}

                                {/* Prev / Next Quick Nav Controls */}
                                {images.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
                                            }}
                                            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
                                            title="Предыдущее изображение"
                                        >
                                            ‹
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
                                            }}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
                                            title="Следующее изображение"
                                        >
                                            ›
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Thumbnail Carousel Strip for Multiple Images */}
                        {images.length > 1 && (
                            <div className="flex gap-1.5 overflow-x-auto p-1 bg-gray-900/50 rounded border border-gray-800/80 custom-scrollbar max-h-16">
                                {images.map((src, idx) => {
                                    const isSelected = idx === selectedImageIndex;
                                    const dim = dimensionsMap[idx];
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedImageIndex(idx)}
                                            className={`relative flex-shrink-0 w-12 h-12 rounded overflow-hidden cursor-pointer group transition-all ${
                                                isSelected 
                                                    ? 'ring-2 ring-cyan-400 border-transparent shadow scale-105 z-10' 
                                                    : 'border border-gray-700/80 hover:border-gray-500 opacity-70 hover:opacity-100'
                                            }`}
                                            title={`Изображение #${idx + 1}${dim ? ` (${dim.width}×${dim.height})` : ''}`}
                                        >
                                            <img 
                                                src={src} 
                                                alt={`thumb-${idx + 1}`} 
                                                className="w-full h-full object-cover pointer-events-none" 
                                            />
                                            <div className="absolute top-0.5 left-0.5 bg-black/80 text-[8px] font-mono text-cyan-300 px-0.5 rounded leading-tight">
                                                #{idx + 1}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Detailed Files & Resolutions List Table */}
                        {showFileList && images.length > 0 && (
                            <div className="mt-1 p-2 bg-gray-900/90 border border-gray-800 rounded text-xs flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                                <div className="text-[11px] font-semibold text-gray-300 flex items-center justify-between border-b border-gray-800 pb-1">
                                    <span>Список файлов ({images.length} шт.):</span>
                                    <span className="text-gray-500 text-[10px]">Кликните на строку для выбора</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {images.map((_, idx) => {
                                        const isSelected = idx === selectedImageIndex;
                                        const dim = dimensionsMap[idx];
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedImageIndex(idx)}
                                                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors text-[11px] font-mono ${
                                                    isSelected
                                                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold'
                                                        : 'hover:bg-gray-800/60 text-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={isSelected ? 'text-cyan-400' : 'text-gray-500'}>
                                                        #{String(idx + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className="truncate max-w-[120px]">
                                                        Image_Sequence_{String(idx + 1).padStart(3, '0')}.png
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-[10px]">
                                                    {dim ? (
                                                        <>
                                                            <span className="text-gray-400">{dim.width} × {dim.height}</span>
                                                            <span className="px-1 py-0.2 rounded bg-gray-800 text-gray-300">{dim.aspectRatio}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-500">Загрузка...</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Text Display */}
                <div className="flex-grow min-h-0 relative">
                    <textarea
                        readOnly
                        value={text}
                        placeholder={images.length === 0 && !text && !mediaUrl ? '' : t('node.content.textDataHere')}
                        className="w-full h-full p-2 bg-slate-800 border-none rounded-md resize-none focus:outline-none text-gray-300 custom-scrollbar text-xs"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                    />
                     {images.length === 0 && !text && !mediaUrl && (
                        <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500 pointer-events-none p-4 text-xs">
                            <span>{t('node.content.noDataRead')}</span>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => onReadData(node.id)}
                className="w-full px-4 py-2 font-bold text-white bg-accent rounded-md hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0 text-xs"
            >
                {t('node.content.readData')}
            </button>
        </div>
    );
};
