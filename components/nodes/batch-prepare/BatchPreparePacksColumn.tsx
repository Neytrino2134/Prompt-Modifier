import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../localization';
import { Plus, Trash2, Folder, ChevronLeft, ChevronRight, Copy, Download, EyeOff } from 'lucide-react';
import { OptimizedThumbnail } from '../image-editor/OptimizedThumbnail';
import { BatchPreparePack, ViewSlotKey } from './types';

interface BatchPreparePacksColumnProps {
    packs: BatchPreparePack[];
    activePackId: string | null;
    assetBaseName: string;
    onBaseNameChange: (newBaseName: string) => void;
    onSaveCurrentToPack: () => void;
    onClearAllPacks: () => void;
    onSelectActivePack: (packId: string) => void;
    onDuplicatePack: (pack: BatchPreparePack) => void;
    onDownloadPackZip: (pack: BatchPreparePack) => void;
    onDeletePack: (packId: string) => void;
}

export const BatchPreparePacksColumn: React.FC<BatchPreparePacksColumnProps> = ({
    packs,
    activePackId,
    assetBaseName,
    onBaseNameChange,
    onSaveCurrentToPack,
    onClearAllPacks,
    onSelectActivePack,
    onDuplicatePack,
    onDownloadPackZip,
    onDeletePack,
}) => {
    const { t } = useLanguage();

    // Virtual Scroll Buffering for Packs Buffer (Column 4)
    const packsContainerRef = useRef<HTMLDivElement>(null);
    const [packsScrollTop, setPacksScrollTop] = useState(0);
    const [packsViewportHeight, setPacksViewportHeight] = useState(400);

    const handlePacksScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setPacksScrollTop(e.currentTarget.scrollTop);
    }, []);

    useEffect(() => {
        if (!packsContainerRef.current) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setPacksViewportHeight(entry.contentRect.height || 400);
            }
        });
        ro.observe(packsContainerRef.current);
        return () => ro.disconnect();
    }, []);

    const PACK_ITEM_HEIGHT = 148; // card height + gap
    const PACK_OVERSCAN = 2;

    const { visiblePackItems, packTopSpacerHeight, packBottomSpacerHeight } = useMemo(() => {
        const total = packs.length;
        if (total === 0) {
            return { visiblePackItems: [], packTopSpacerHeight: 0, packBottomSpacerHeight: 0 };
        }

        const startIndex = Math.max(0, Math.floor(packsScrollTop / PACK_ITEM_HEIGHT) - PACK_OVERSCAN);
        const endIndex = Math.min(total, Math.ceil((packsScrollTop + packsViewportHeight) / PACK_ITEM_HEIGHT) + PACK_OVERSCAN);

        const items: { pack: BatchPreparePack; index: number }[] = [];
        for (let i = startIndex; i < endIndex; i++) {
            items.push({ pack: packs[i], index: i });
        }

        const topSpacer = startIndex * PACK_ITEM_HEIGHT;
        const bottomSpacer = (total - endIndex) * PACK_ITEM_HEIGHT;

        return {
            visiblePackItems: items,
            packTopSpacerHeight: topSpacer,
            packBottomSpacerHeight: bottomSpacer
        };
    }, [packs, packsScrollTop, packsViewportHeight]);

    return (
        <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                        4. {t('batchprep.col4.title') || 'Буфер паков (Packs)'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold">
                        {packs.length}
                    </span>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={onSaveCurrentToPack}
                        className="p-1 rounded bg-gray-800 hover:bg-indigo-900 text-indigo-300 hover:text-white transition-colors border border-gray-700/60"
                        title="Добавить текущие 4 ракурса как новый пак"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    {packs.length > 0 && (
                        <button
                            onClick={onClearAllPacks}
                            className="p-1 rounded bg-gray-800 hover:bg-red-950/80 text-gray-400 hover:text-red-300 transition-colors border border-gray-700/60"
                            title="Очистить все паки в буфере"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Common Asset Name Field */}
            <div className="px-2 py-1.5 bg-gray-950/80 border-b border-gray-800/80 flex items-center space-x-1.5 shrink-0">
                <span className="text-[10px] font-semibold text-gray-400 shrink-0">Asset Name:</span>
                <input
                    type="text"
                    value={assetBaseName}
                    placeholder="Asset_Name"
                    onChange={(e) => onBaseNameChange(e.target.value)}
                    className="flex-1 min-w-0 text-xs font-semibold text-cyan-200 bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-400 focus:bg-gray-850 px-2 py-0.5 rounded outline-none shadow-inner"
                />
            </div>

            {/* Pack switcher ribbon */}
            {packs.length > 1 && (
                <div className="px-2 py-1 bg-gray-950/60 border-b border-gray-800 flex items-center justify-between shrink-0">
                    <span className="text-[10px] text-gray-400">Переключение паков:</span>
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => {
                                const currIdx = packs.findIndex(p => p.id === activePackId);
                                const prevIdx = currIdx <= 0 ? packs.length - 1 : currIdx - 1;
                                onSelectActivePack(packs[prevIdx].id);
                            }}
                            className="p-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
                            title="Предыдущий пак"
                        >
                            <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => {
                                const currIdx = packs.findIndex(p => p.id === activePackId);
                                const nextIdx = currIdx >= packs.length - 1 ? 0 : currIdx + 1;
                                onSelectActivePack(packs[nextIdx].id);
                            }}
                            className="p-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300"
                            title="Следующий пак"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Virtualized Packs List */}
            <div 
                ref={packsContainerRef}
                onScroll={handlePacksScroll}
                className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 no-scrollbar"
            >
                {packs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-3 text-gray-500 border border-dashed border-gray-800 rounded-lg">
                        <Folder className="w-6 h-6 mb-1 text-gray-600" />
                        <span className="text-xs font-medium text-gray-400">Буфер паков пуст</span>
                        <span className="text-[10px] text-gray-600 mt-0.5">
                            Нажмите "⚡ Нарезать ВСЕ в Пак Буфер" во 2-й колонке или настройте ракурсы вручную
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Virtual scroll top spacer */}
                        {packTopSpacerHeight > 0 && (
                            <div style={{ height: `${packTopSpacerHeight}px` }} />
                        )}

                        {visiblePackItems.map(({ pack, index: idx }) => {
                            const isActive = activePackId === pack.id;
                            return (
                                <div
                                    key={pack.id}
                                    onClick={() => onSelectActivePack(pack.id)}
                                    className={`relative flex flex-col p-2 rounded-lg border cursor-pointer transition-all ${
                                        isActive 
                                            ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-950/80 ring-1 ring-cyan-500/50' 
                                            : 'bg-gray-800/60 border-gray-700/70 hover:border-gray-600 hover:bg-gray-800'
                                    }`}
                                >
                                    {/* Pack Header */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-1">
                                            <span className="text-[10px] font-bold text-gray-400 shrink-0">
                                                #{idx + 1}
                                            </span>
                                            <span className="text-[11px] font-bold text-gray-100 truncate" title={pack.name}>
                                                {pack.name}
                                            </span>
                                        </div>

                                        {isActive && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-500 text-black shrink-0 animate-pulse">
                                                ACTIVE OUTPUT
                                            </span>
                                        )}
                                    </div>

                                    {/* 4 Mini 64x64 View Thumbnails Strip */}
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-black/50 rounded border border-gray-800/80">
                                        {(['front', 'back', 'left', 'right'] as ViewSlotKey[]).map((vKey) => {
                                            const img = pack.views[vKey];
                                            const isSlotMuted = Boolean(pack.mutedViews?.[vKey]);

                                            return (
                                                <div key={`pack-${pack.id}-${vKey}`} className="flex flex-col items-center">
                                                    <div className={`w-full h-10 rounded bg-gray-900 border overflow-hidden flex items-center justify-center relative ${
                                                        isSlotMuted ? 'border-red-500/60 bg-red-950/30' : 'border-gray-800'
                                                    }`}>
                                                        {img ? (
                                                            <OptimizedThumbnail
                                                                src={img}
                                                                size={64}
                                                                alt=""
                                                                className={`w-full h-full object-contain ${isSlotMuted ? 'opacity-25 grayscale' : ''}`}
                                                            />
                                                        ) : (
                                                            <span className="text-[8px] text-gray-600">-</span>
                                                        )}
                                                        {isSlotMuted && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <EyeOff className="w-3 h-3 text-red-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-[8px] font-semibold mt-0.5 uppercase ${
                                                        isSlotMuted ? 'text-red-400 line-through' : 'text-gray-400'
                                                    }`}>
                                                        {vKey[0].toUpperCase()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pack Toolbar Actions */}
                                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-800/60">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectActivePack(pack.id);
                                            }}
                                            className={`text-[9px] px-2 py-0.5 rounded font-medium transition-colors ${
                                                isActive 
                                                    ? 'bg-cyan-700 text-white' 
                                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                            }`}
                                            title="Выбрать и настроить в редакторе ракурсов (Колонка 3)"
                                        >
                                            {isActive ? '✓ В редакторе' : 'Настроить виды'}
                                        </button>

                                        <div className="flex items-center space-x-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDuplicatePack(pack);
                                                }}
                                                className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700"
                                                title="Дублировать пак"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDownloadPackZip(pack);
                                                }}
                                                className="p-1 text-gray-400 hover:text-cyan-300 rounded hover:bg-gray-700"
                                                title="Скачать ZIP пака"
                                            >
                                                <Download className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeletePack(pack.id);
                                                }}
                                                className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-gray-700"
                                                title="Удалить пак"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Virtual scroll bottom spacer */}
                        {packBottomSpacerHeight > 0 && (
                            <div style={{ height: `${packBottomSpacerHeight}px` }} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
