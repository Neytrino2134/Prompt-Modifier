import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../localization';
import { Upload, Copy, Trash2, Link, Unlink, Eye } from 'lucide-react';
import { setupImageDragData } from '../../../utils/imageUtils';
import { OptimizedThumbnail } from '../image-editor/OptimizedThumbnail';

interface BatchPrepareInputColumnProps {
    allInputImages: string[];
    selectedInputIndex: number;
    hasIncomingConnections: boolean;
    hasLocalInputs: boolean;
    onSelectInput: (idx: number) => void;
    onBakeAndDisconnect: () => void;
    onUploadFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPasteFromClipboard: () => void;
    onClearLocalInputs: () => void;
    onAutoAssignToViews: (images: string[]) => void;
    onDropFiles: (files: FileList) => void;
    onOpenImageViewer?: (src: string, index: number) => void;
}

const BatchPrepareInputColumnComponent: React.FC<BatchPrepareInputColumnProps> = ({
    allInputImages,
    selectedInputIndex,
    hasIncomingConnections,
    hasLocalInputs,
    onSelectInput,
    onBakeAndDisconnect,
    onUploadFiles,
    onPasteFromClipboard,
    onClearLocalInputs,
    onAutoAssignToViews,
    onDropFiles,
    onOpenImageViewer,
}) => {
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDropOverInputs, setIsDropOverInputs] = useState(false);

    // Virtual Scroll Buffering for Inputs List (Column 1)
    const inputsContainerRef = useRef<HTMLDivElement>(null);
    const [inputsScrollTop, setInputsScrollTop] = useState(0);
    const [inputsViewportHeight, setInputsViewportHeight] = useState(400);

    const handleInputsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setInputsScrollTop(e.currentTarget.scrollTop);
    }, []);

    useEffect(() => {
        if (!inputsContainerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setInputsViewportHeight(entry.contentRect.height || 400);
            }
        });
        ro.observe(inputsContainerRef.current);
        return () => ro.disconnect();
    }, []);

    const INPUT_ITEM_HEIGHT = 74; // height + gap
    const INPUT_OVERSCAN = 3;

    const { visibleInputItems, inputTopSpacerHeight, inputBottomSpacerHeight } = useMemo(() => {
        const total = allInputImages.length;
        if (total === 0) {
            return { visibleInputItems: [], inputTopSpacerHeight: 0, inputBottomSpacerHeight: 0 };
        }

        const startIndex = Math.max(0, Math.floor(inputsScrollTop / INPUT_ITEM_HEIGHT) - INPUT_OVERSCAN);
        const endIndex = Math.min(total, Math.ceil((inputsScrollTop + inputsViewportHeight) / INPUT_ITEM_HEIGHT) + INPUT_OVERSCAN);

        const items: { imgSrc: string; index: number }[] = [];
        for (let i = startIndex; i < endIndex; i++) {
            items.push({ imgSrc: allInputImages[i], index: i });
        }

        const topSpacer = startIndex * INPUT_ITEM_HEIGHT;
        const bottomSpacer = (total - endIndex) * INPUT_ITEM_HEIGHT;

        return {
            visibleInputItems: items,
            inputTopSpacerHeight: topSpacer,
            inputBottomSpacerHeight: bottomSpacer
        };
    }, [allInputImages, inputsScrollTop, inputsViewportHeight]);

    return (
        <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                        1. {t('batchprep.col1.title') || 'Вход (Inputs)'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-400 border border-gray-700 font-semibold">
                        {allInputImages.length}
                    </span>
                </div>
                <div className="flex items-center space-x-1">
                    {/* Disconnect connection & embed all images into node */}
                    <button
                        onClick={onBakeAndDisconnect}
                        disabled={allInputImages.length === 0 && !hasIncomingConnections}
                        className={`p-1 rounded transition-colors ${
                            hasIncomingConnections 
                                ? 'text-cyan-300 hover:text-cyan-100 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 shadow-sm' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        } disabled:opacity-35`}
                        title={
                            hasIncomingConnections
                                ? "Разорвать входящее соединение и встроить все изображения в ноду"
                                : "Встроить все изображения в ноду"
                        }
                    >
                        {hasIncomingConnections ? <Unlink className="w-3.5 h-3.5 text-cyan-300" /> : <Link className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                        title="Загрузить изображения с диска"
                    >
                        <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onPasteFromClipboard}
                        className="p-1 rounded text-gray-300 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                        title="Вставить из буфера"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    {hasLocalInputs && (
                        <button
                            onClick={onClearLocalInputs}
                            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
                            title="Очистить локальные входы"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                onChange={onUploadFiles} 
            />

            {/* Quick batch assign button */}
            {allInputImages.length >= 2 && (
                <div className="px-2 py-1 bg-gray-950/60 border-b border-gray-800/80 flex items-center justify-between shrink-0">
                    <span className="text-[10px] text-gray-400">Быстрое заполнение:</span>
                    <button
                        onClick={() => onAutoAssignToViews(allInputImages)}
                        className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/40 text-cyan-300 hover:bg-cyan-900/80 transition-colors font-medium flex items-center space-x-1"
                        title="Заполнить 4 ракурса из первых 4 входящих изображений"
                    >
                        <span>1→4 Ракурса</span>
                    </button>
                </div>
            )}

            {/* Input items virtualized list */}
            <div 
                ref={inputsContainerRef}
                onScroll={handleInputsScroll}
                className={`flex-1 min-h-0 overflow-y-auto p-2 space-y-2 no-scrollbar ${
                    isDropOverInputs ? 'bg-cyan-950/20 border-2 border-dashed border-cyan-500/50' : ''
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDropOverInputs(true); }}
                onDragLeave={() => setIsDropOverInputs(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDropOverInputs(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        onDropFiles(e.dataTransfer.files);
                    }
                }}
            >
                {allInputImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-3 text-gray-500 border border-dashed border-gray-800 rounded-lg">
                        <Upload className="w-6 h-6 mb-1 text-gray-600" />
                        <span className="text-xs font-medium text-gray-400">Нет входящих картинок</span>
                        <span className="text-[10px] text-gray-600 mt-0.5">
                            Перетащите сюда, вставьте из буфера или подключите ноду на вход
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Virtual scroll top spacer */}
                        {inputTopSpacerHeight > 0 && (
                            <div style={{ height: `${inputTopSpacerHeight}px` }} />
                        )}

                        {visibleInputItems.map(({ imgSrc, index: idx }) => {
                            const isSelected = selectedInputIndex === idx;
                            return (
                                <div
                                    key={`in-${idx}`}
                                    draggable
                                    onDragStart={(e) => {
                                        setupImageDragData(e, imgSrc, `Input_${idx + 1}.png`);
                                    }}
                                    onClick={() => onSelectInput(idx)}
                                    className={`group relative flex items-center p-1.5 rounded-md border cursor-pointer transition-all ${
                                        isSelected 
                                            ? 'bg-cyan-950/40 border-cyan-500/70 shadow-sm shadow-cyan-950/50' 
                                            : 'bg-gray-800/60 border-gray-700/60 hover:border-gray-600 hover:bg-gray-800'
                                    }`}
                                    style={{ height: '66px' }}
                                >
                                    <span className="text-[10px] font-bold text-gray-400 w-4 text-center shrink-0">
                                        #{idx + 1}
                                    </span>
                                    {/* 64x64 Preview Thumbnail */}
                                    <div className="w-16 h-16 rounded bg-black/60 overflow-hidden shrink-0 border border-gray-700/70 flex items-center justify-center">
                                        <OptimizedThumbnail
                                            src={imgSrc}
                                            size={64}
                                            alt={`Input ${idx + 1}`}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    <div className="ml-2 flex-1 min-w-0 flex flex-col justify-center">
                                        <span className="text-[11px] font-semibold text-gray-200 truncate">
                                            Кадр #{idx + 1}
                                        </span>
                                        <span className="text-[9px] text-gray-500">
                                            {isSelected ? '● Выбран для нарезки' : 'Нажмите для выбора'}
                                        </span>
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenImageViewer?.(imgSrc, idx + 1);
                                            }}
                                            className="p-1 text-gray-400 hover:text-white rounded"
                                            title="Просмотр в полном разрешении"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Virtual scroll bottom spacer */}
                        {inputBottomSpacerHeight > 0 && (
                            <div style={{ height: `${inputBottomSpacerHeight}px` }} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export const BatchPrepareInputColumn = React.memo(BatchPrepareInputColumnComponent);
