import React, { useRef } from 'react';
import { useLanguage } from '../../../localization';
import { 
    HeadFrontIcon, 
    HeadLeftIcon, 
    HeadRightIcon, 
    HeadBackIcon 
} from '../../icons/AppIcons';
import { 
    ArrowLeftRight, 
    ArrowUpDown, 
    RotateCw, 
    Trash2, 
    Eye, 
    EyeOff, 
    FlipHorizontal, 
    Maximize2, 
    X, 
    Plus, 
    Folder 
} from 'lucide-react';
import { setupImageDragData } from '../../../utils/imageUtils';
import { OptimizedThumbnail } from '../image-editor/OptimizedThumbnail';
import { BatchPrepareNodeState, BatchPreparePack, ViewSlotKey } from './types';

interface BatchPrepareViewsColumnProps {
    activeViews: BatchPrepareNodeState['activeViews'];
    mutedViews?: BatchPrepareNodeState['mutedViews'];
    activePack: BatchPreparePack | null;
    isDropOverSlot: { [key in ViewSlotKey]?: boolean };
    draggedSlot: ViewSlotKey | null;
    setDraggedSlot: (slot: ViewSlotKey | null) => void;
    setIsDropOverSlot: React.Dispatch<React.SetStateAction<{ [key in ViewSlotKey]?: boolean }>>;
    onSwapLeftRight: () => void;
    onSwapFrontBack: () => void;
    onRotateViews: () => void;
    onClearAllViews: () => void;
    onToggleMuteView: (slot: ViewSlotKey) => void;
    onFlipView: (slot: ViewSlotKey) => void;
    onSetSingleView: (slot: ViewSlotKey, dataUrl: string | null) => void;
    onDropOnViewSlot: (e: React.DragEvent, targetSlot: ViewSlotKey) => void;
    onSaveCurrentToPack: () => void;
    onOpenImageViewer?: (src: string, label: string) => void;
}

export const BatchPrepareViewsColumn: React.FC<BatchPrepareViewsColumnProps> = ({
    activeViews,
    mutedViews,
    activePack,
    isDropOverSlot,
    setDraggedSlot,
    setIsDropOverSlot,
    onSwapLeftRight,
    onSwapFrontBack,
    onRotateViews,
    onClearAllViews,
    onToggleMuteView,
    onFlipView,
    onSetSingleView,
    onDropOnViewSlot,
    onSaveCurrentToPack,
    onOpenImageViewer,
}) => {
    const { t } = useLanguage();
    const viewFileInputRef = useRef<{ [key in ViewSlotKey]?: HTMLInputElement | null }>({});

    const slotConfig: { [key in ViewSlotKey]: { label: string; icon: React.ReactNode; color: string; badge: string; shortcut: string } } = {
        front: { label: t('batchprep.view.front') || 'Спереди (Front)', icon: <HeadFrontIcon className="w-5 h-5" />, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20', badge: 'Front', shortcut: 'F' },
        back: { label: t('batchprep.view.back') || 'Сзади (Back)', icon: <HeadBackIcon className="w-5 h-5" />, color: 'text-blue-400 border-blue-500/40 bg-blue-950/20', badge: 'Back', shortcut: 'B' },
        left: { label: t('batchprep.view.left') || 'Слева (Left)', icon: <HeadLeftIcon className="w-5 h-5" />, color: 'text-purple-400 border-purple-500/40 bg-purple-950/20', badge: 'Left', shortcut: 'L' },
        right: { label: t('batchprep.view.right') || 'Справа (Right)', icon: <HeadRightIcon className="w-5 h-5" />, color: 'text-amber-400 border-amber-500/40 bg-amber-950/20', badge: 'Right', shortcut: 'R' },
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/70 rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-800 bg-gray-900/90 shrink-0">
                <div className="flex items-center space-x-1">
                    <span className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
                        3. {t('batchprep.col3.title') || '4 Ракурса (3D Views)'}
                    </span>
                    {activePack && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 truncate max-w-[80px]">
                            {activePack.name}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={onSwapLeftRight}
                        className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-purple-300 transition-colors border border-gray-700/50"
                        title="Поменять Левый ↔ Правый вид местами (авто-синхронизируется с паком)"
                    >
                        <ArrowLeftRight className="w-3 h-3" />
                    </button>
                    <button
                        onClick={onSwapFrontBack}
                        className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-blue-300 transition-colors border border-gray-700/50"
                        title="Поменять Передний ↔ Задний вид местами (авто-синхронизируется с паком)"
                    >
                        <ArrowUpDown className="w-3 h-3" />
                    </button>
                    <button
                        onClick={onRotateViews}
                        className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-amber-300 transition-colors border border-gray-700/50"
                        title="Сдвинуть ракурсы по кругу (Front→Right→Back→Left)"
                    >
                        <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                        onClick={onClearAllViews}
                        className="p-1 rounded bg-gray-800 hover:bg-red-950/80 text-gray-400 hover:text-red-300 transition-colors border border-gray-700/50"
                        title="Очистить все 4 ракурса"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* 4 Interactive View Cards with 128x128 Previews */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 grid grid-cols-2 gap-2 no-scrollbar">
                {(['front', 'back', 'left', 'right'] as ViewSlotKey[]).map((slotKey) => {
                    const conf = slotConfig[slotKey];
                    const dataUrl = activeViews[slotKey];
                    const isMuted = Boolean(mutedViews?.[slotKey]);
                    const isOver = Boolean(isDropOverSlot[slotKey]);

                    return (
                        <div
                            key={`view-slot-${slotKey}`}
                            draggable={Boolean(dataUrl)}
                            onDragStart={(e) => {
                                if (dataUrl) {
                                    setDraggedSlot(slotKey);
                                    setupImageDragData(e, dataUrl, `${slotKey}.png`);
                                }
                            }}
                            onDragEnd={() => setDraggedSlot(null)}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDropOverSlot(prev => ({ ...prev, [slotKey]: true }));
                            }}
                            onDragLeave={() => {
                                setIsDropOverSlot(prev => ({ ...prev, [slotKey]: false }));
                            }}
                            onDrop={(e) => onDropOnViewSlot(e, slotKey)}
                            className={`relative flex flex-col rounded-lg border transition-all p-1.5 ${
                                isOver
                                    ? 'border-2 border-dashed border-cyan-400 bg-cyan-950/40 scale-[1.02]'
                                    : isMuted
                                        ? 'border-red-500/50 bg-red-950/20 opacity-80'
                                        : dataUrl
                                            ? `${conf.color} border-opacity-60`
                                            : 'border-dashed border-gray-700/70 bg-gray-950/40 hover:border-gray-600'
                            }`}
                        >
                            {/* Slot Header with Mute & Controls */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isMuted ? 'text-red-400 line-through opacity-70' : ''}`}>
                                        [{conf.shortcut}] {conf.badge}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-1">
                                    {/* MUTE / UNMUTE BUTTON (EYE / EYE-OFF) */}
                                    <button
                                        onClick={() => onToggleMuteView(slotKey)}
                                        className={`p-1 rounded transition-colors ${
                                            isMuted 
                                                ? 'bg-red-900/60 text-red-300 hover:bg-red-800 hover:text-white shadow-sm border border-red-500/40' 
                                                : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-800'
                                        }`}
                                        title={isMuted ? `Включить ракурс ${conf.badge} (Скрыт)` : `Исключить/скрыть ракурс ${conf.badge} из пака`}
                                    >
                                        {isMuted ? <EyeOff className="w-3 h-3 text-red-300" /> : <Eye className="w-3 h-3" />}
                                    </button>

                                    {dataUrl && (
                                        <>
                                            <button
                                                onClick={() => onFlipView(slotKey)}
                                                className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-800"
                                                title="Отразить по горизонтали (Flip)"
                                            >
                                                <FlipHorizontal className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onOpenImageViewer?.(dataUrl, conf.label);
                                                }}
                                                className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-800"
                                                title="Увеличить в полном разрешении"
                                            >
                                                <Maximize2 className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                                onClick={() => onSetSingleView(slotKey, null)}
                                                className="p-0.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-800"
                                                title="Удалить ракурс"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 128x128 3D View Preview Container */}
                            <div className="flex-1 min-h-[90px] rounded bg-black/60 border border-gray-800/80 flex items-center justify-center overflow-hidden relative">
                                {dataUrl ? (
                                    <>
                                        <OptimizedThumbnail
                                            src={dataUrl}
                                            size={128}
                                            alt={slotKey}
                                            className={`w-full h-full object-contain transition-all ${isMuted ? 'opacity-30 grayscale filter' : ''}`}
                                        />
                                        {isMuted && (
                                            <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center">
                                                <EyeOff className="w-4 h-4 text-red-400 mb-0.5" />
                                                <span className="text-[9px] font-bold text-red-300">Исключен из пака</span>
                                                <button
                                                    onClick={() => onToggleMuteView(slotKey)}
                                                    className="mt-1 text-[8px] px-1.5 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-white border border-red-500/40 flex items-center space-x-1"
                                                >
                                                    <Eye className="w-2.5 h-2.5" />
                                                    <span>Включить</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div 
                                        onClick={() => viewFileInputRef.current[slotKey]?.click()}
                                        className="flex flex-col items-center justify-center p-2 text-center text-gray-600 hover:text-gray-400 cursor-pointer w-full h-full"
                                    >
                                        <Plus className="w-4 h-4 mb-0.5" />
                                        <span className="text-[9px] font-medium">Перетащите или нажмите</span>
                                    </div>
                                )}
                            </div>

                            <input 
                                ref={(el) => { viewFileInputRef.current[slotKey] = el; }} 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const r = new FileReader();
                                        r.onload = () => onSetSingleView(slotKey, r.result as string);
                                        r.readAsDataURL(file);
                                    }
                                    e.target.value = '';
                                }} 
                            />
                        </div>
                    );
                })}
            </div>

            {/* Bottom CTA */}
            <div className="p-2 border-t border-gray-800 bg-gray-900/90 shrink-0">
                <button
                    onClick={onSaveCurrentToPack}
                    className="w-full py-1.5 text-xs font-bold rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-950/50 transition-all border border-indigo-400/40"
                >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{t('batchprep.savePackBtn') || 'Save to Pack Buffer'}</span>
                </button>
            </div>
        </div>
    );
};
