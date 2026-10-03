import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../localization';
import { 
    Plus, 
    Trash2, 
    Folder, 
    ChevronLeft, 
    ChevronRight, 
    Copy, 
    Download, 
    EyeOff, 
    Zap, 
    Square, 
    Check, 
    Loader2, 
    FileJson,
    CheckCheck,
    Shuffle
} from 'lucide-react';
import { OptimizedThumbnail } from '../image-editor/OptimizedThumbnail';
import { CustomCheckbox } from '../../CustomCheckbox';
import { BatchPreparePack, ViewSlotKey } from './types';
import { download3DModelFromUrl, format3DAssetFilename } from '../../../services/tripoBatchService';
import { downloadTaskMetadataJson } from '../../../services/tripoService';

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
    onTogglePackEnabled?: (packId: string, enabled: boolean) => void;
    onSelectAllPacks?: () => void;
    onDeselectAllPacks?: () => void;
    onInvertPackSelection?: () => void;
    onSelectPackRange?: (rangeStr: string) => void;
    isBatchRunning?: boolean;
    onStart3DBatch?: () => void;
    onStop3DBatch?: () => void;
    addToast?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
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
    onTogglePackEnabled,
    onSelectAllPacks,
    onDeselectAllPacks,
    onInvertPackSelection,
    onSelectPackRange,
    isBatchRunning = false,
    onStart3DBatch,
    onStop3DBatch,
    addToast
}) => {
    const { t } = useLanguage();
    const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
    const [rangeInput, setRangeInput] = useState<string>('');

    const enabledPacksCount = useMemo(() => {
        return packs.filter(p => p.enabled !== false).length;
    }, [packs]);

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

    const PACK_ITEM_HEIGHT = 162; // card height + gap
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

    const handleCopyId = (taskId: string) => {
        navigator.clipboard.writeText(taskId);
        setCopiedTaskId(taskId);
        if (addToast) addToast(`Task ID "${taskId}" скопирован!`, 'success');
        setTimeout(() => setCopiedTaskId(null), 2000);
    };

    const handleDownloadGlb = (pack: BatchPreparePack, index: number) => {
        if (!pack.modelUrl) return;
        const filename = format3DAssetFilename(pack.name || assetBaseName, index + 1, 'glb', Date.now());
        download3DModelFromUrl(pack.modelUrl, filename);
        if (addToast) addToast(`Скачивание модели: ${filename}`, 'info');
    };

    const handleDownloadJson = (pack: BatchPreparePack, index: number) => {
        if (!pack.taskId) return;
        const filename = downloadTaskMetadataJson({
            taskId: pack.taskId,
            type: 'multiview_to_3d',
            prompt: pack.name,
            status: pack.status || 'success',
            progress: pack.progress || 100,
            modelUrl: pack.modelUrl,
            thumbnailUrl: pack.thumbnailUrl,
            renderedImageUrl: pack.renderedImageUrl,
            createdAt: pack.createdAt
        }, pack.name, index + 1);
        if (addToast && filename) addToast(`Метаданные сохранены: ${filename}`, 'success');
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
            {/* Header with Title and Counter */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                        4. {t('batchprep.col4.title') || 'Буфер паков (Packs)'}
                    </span>
                    <span 
                        className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold"
                        title={`Активно ${enabledPacksCount} из ${packs.length} паков`}
                    >
                        {enabledPacksCount === packs.length ? packs.length : `${enabledPacksCount}/${packs.length}`}
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

            {/* Asset Base Name Field */}
            <div className="p-2 bg-gray-950/80 border-b border-gray-800/80 flex items-center space-x-1.5 shrink-0">
                <span className="text-[10px] font-semibold text-gray-400 shrink-0">Asset Name:</span>
                <input
                    type="text"
                    value={assetBaseName}
                    placeholder="Asset_Name"
                    onChange={(e) => onBaseNameChange(e.target.value)}
                    className="flex-1 min-w-0 text-xs font-semibold text-cyan-200 bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-400 focus:bg-gray-850 px-2 py-0.5 rounded outline-none shadow-inner"
                />
            </div>

            {/* Selection Toolbar: Select All, Deselect All, Invert, Range Select */}
            <div className="px-2 py-1.5 bg-gray-950/90 border-b border-gray-800 flex items-center justify-between gap-1.5 shrink-0 text-xs">
                <div className="flex items-center space-x-1 shrink-0">
                    <button
                        onClick={onSelectAllPacks}
                        disabled={packs.length === 0}
                        className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300 hover:text-cyan-100 disabled:opacity-40 transition-colors border border-gray-700/60"
                        title="Выбрать все паки (Select All)"
                    >
                        <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onDeselectAllPacks}
                        disabled={packs.length === 0}
                        className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors border border-gray-700/60"
                        title="Снять выбор со всех (Deselect All)"
                    >
                        <Square className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onInvertPackSelection}
                        disabled={packs.length === 0}
                        className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-amber-300 hover:text-amber-100 disabled:opacity-40 transition-colors border border-gray-700/60"
                        title="Инвертировать выбор (Invert Selection)"
                    >
                        <Shuffle className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Range Input & Apply */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (rangeInput.trim()) {
                            onSelectPackRange?.(rangeInput.trim());
                        }
                    }}
                    className="flex items-center space-x-1 flex-1 min-w-0 max-w-[155px] justify-end"
                >
                    <input
                        type="text"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="3-7 или 1,4-6"
                        className="w-full text-[10px] font-mono text-cyan-200 bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-cyan-400 px-1.5 py-0.5 rounded outline-none"
                        title="Укажите диапазон номеров паков (например: 3-7 или 1, 3-5)"
                    />
                    <button
                        type="submit"
                        disabled={!rangeInput.trim() || packs.length === 0}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-40 shrink-0"
                        title="Применить выбор диапазона"
                    >
                        OK
                    </button>
                </form>
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
                            Нажмите "⚡ Нарезать ВСЕ в Пак Буфер" во 2-й колонке или сохраните ракурсы вручную
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Virtual scroll top spacer */}
                        {packTopSpacerHeight > 0 && (
                            <div style={{ height: `${packTopSpacerHeight}px` }} />
                        )}

                        {visiblePackItems.map(({ pack, index: idx }) => {
                            const isEnabled = pack.enabled !== false;
                            const isActive = activePackId === pack.id;
                            const isSuccess = pack.status === 'success' || Boolean(pack.modelUrl);
                            const isRunning = pack.status === 'running' || pack.status === 'uploading';

                            return (
                                <div
                                    key={pack.id}
                                    onClick={() => onSelectActivePack(pack.id)}
                                    className={`relative flex flex-col p-2 rounded-lg border cursor-pointer transition-all ${
                                        !isEnabled
                                            ? 'bg-gray-950/40 border-gray-800/40 opacity-60 grayscale-[35%]'
                                            : isActive 
                                                ? 'bg-cyan-950/50 border-cyan-500 shadow-md shadow-cyan-950/80 ring-1 ring-cyan-500/50' 
                                                : isSuccess
                                                    ? 'bg-emerald-950/20 border-emerald-800/60 hover:bg-emerald-950/40'
                                                    : isRunning
                                                        ? 'bg-blue-950/30 border-blue-600/60 animate-pulse'
                                                        : 'bg-gray-800/60 border-gray-700/70 hover:border-gray-600 hover:bg-gray-800'
                                    }`}
                                >
                                    {/* Pack Header with Checkbox */}
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-1">
                                            <CustomCheckbox
                                                checked={isEnabled}
                                                onChange={(checked) => onTogglePackEnabled?.(pack.id, checked)}
                                                title={isEnabled ? 'Пак активен для генерации' : 'Пак деактивирован'}
                                            />
                                            <span className={`text-[10px] font-bold font-mono shrink-0 ${isEnabled ? 'text-gray-400' : 'text-gray-600 line-through'}`}>
                                                #{idx + 1}
                                            </span>
                                            <span className={`text-[11px] font-bold truncate ${isEnabled ? 'text-gray-100' : 'text-gray-500'}`} title={pack.name}>
                                                {pack.name}
                                            </span>
                                        </div>

                                        {!isEnabled && (
                                            <span className="text-[8px] px-1.5 py-0.2 rounded font-semibold bg-gray-800 text-gray-400 border border-gray-700 shrink-0">
                                                ВЫКЛ
                                            </span>
                                        )}
                                        {isEnabled && isActive && (
                                            <span className="text-[8px] px-1.5 py-0.2 rounded font-bold bg-cyan-500 text-black shrink-0">
                                                ACTIVE
                                            </span>
                                        )}
                                        {isEnabled && isSuccess && !isActive && (
                                            <span className="text-[8px] px-1.5 py-0.2 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 shrink-0">
                                                3D READY
                                            </span>
                                        )}
                                    </div>

                                    {/* Task ID Pill (if generated/assigned) */}
                                    {pack.taskId && (
                                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-black/60 border border-gray-800 text-[9px] font-mono text-cyan-300 mb-1">
                                            <span className="truncate max-w-[130px]" title={pack.taskId}>
                                                ID: {pack.taskId}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyId(pack.taskId!);
                                                }}
                                                className="text-gray-400 hover:text-white transition-colors"
                                                title="Скопировать Task ID"
                                            >
                                                {copiedTaskId === pack.taskId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                            </button>
                                        </div>
                                    )}

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
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-800/60">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectActivePack(pack.id);
                                            }}
                                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                                                isActive 
                                                    ? 'bg-cyan-700 text-white' 
                                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                            }`}
                                            title="Выбрать и настроить в редакторе ракурсов (Колонка 3)"
                                        >
                                            {isActive ? '✓ В редакторе' : 'Настроить'}
                                        </button>

                                        <div className="flex items-center space-x-1">
                                            {pack.modelUrl && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadGlb(pack, idx);
                                                    }}
                                                    className="p-1 text-emerald-400 hover:text-emerald-200 rounded hover:bg-emerald-950/60 transition-colors"
                                                    title="Скачать готовую .GLB 3D модель"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </button>
                                            )}
                                            {pack.taskId && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadJson(pack, idx);
                                                    }}
                                                    className="p-1 text-amber-400 hover:text-amber-200 rounded hover:bg-amber-950/60 transition-colors"
                                                    title="Скачать JSON метаданные задачи"
                                                >
                                                    <FileJson className="w-3 h-3" />
                                                </button>
                                            )}
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
                                                title="Скачать ZIP ракурсов пака"
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

            {/* Bottom CTA: Start/Stop 3D Batch Button matching Column 3 size & style */}
            <div className="p-2 border-t border-gray-800 bg-gray-900/90 shrink-0">
                {isBatchRunning ? (
                    <button
                        onClick={onStop3DBatch}
                        className="w-full py-1.5 text-xs font-bold rounded-md bg-red-700 hover:bg-red-600 active:bg-red-800 text-white flex items-center justify-center space-x-1.5 shadow-md shadow-red-950/50 transition-all border border-red-500/50 animate-pulse"
                    >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Остановить 3D Batch</span>
                    </button>
                ) : (
                    <button
                        onClick={onStart3DBatch}
                        disabled={enabledPacksCount === 0}
                        className={`w-full py-1.5 text-xs font-bold rounded-md flex items-center justify-center space-x-1.5 shadow-md transition-all border ${
                            enabledPacksCount > 0 
                                ? 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 active:from-cyan-700 active:to-purple-700 text-white border-cyan-400/40 shadow-cyan-950/50 cursor-pointer' 
                                : 'bg-gray-800 text-gray-500 border-gray-700/60 cursor-not-allowed opacity-50'
                        }`}
                        title="Отправить активные паки в 3D генерацию с сохранением Task ID и авто-скачиванием GLB"
                    >
                        <Zap className={`w-3.5 h-3.5 ${enabledPacksCount > 0 ? 'text-yellow-300 fill-current' : 'text-gray-500'}`} />
                        <span>Запустить 3D Batch ({enabledPacksCount})</span>
                    </button>
                )}
            </div>
        </div>
    );
};
