import React from 'react';
import { useLanguage } from '../../../localization';
import { BatchPrepareIcon } from '../../icons/AppIcons';
import { FolderPlus, Download, Sparkles, Zap, Square, Loader2 } from 'lucide-react';
import { BatchPreparePack } from './types';

interface BatchPrepareHeaderProps {
    filledActiveViewCount: number;
    activePack: BatchPreparePack | null;
    packsCount: number;
    onSaveCurrentToPack: () => void;
    onDownloadAllPacksZip: () => void;
    isBatchRunning?: boolean;
    batchProgress?: {
        completed: number;
        total: number;
        percent: number;
    } | null;
    onStart3DBatch?: () => void;
    onStop3DBatch?: () => void;
}

export const BatchPrepareHeader: React.FC<BatchPrepareHeaderProps> = ({
    filledActiveViewCount,
    activePack,
    packsCount,
    onSaveCurrentToPack,
    onDownloadAllPacksZip,
    isBatchRunning = false,
    batchProgress,
    onStart3DBatch,
    onStop3DBatch,
}) => {
    const { t } = useLanguage();

    return (
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800/80 bg-gray-900/90 backdrop-blur-md shrink-0">
            <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-inner">
                    <BatchPrepareIcon className="w-4 h-4" />
                </div>
                <div>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-100 tracking-wide">
                            {t('batchprep.nodeTitle') || '3D Multiview Batch Prepare'}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${
                            filledActiveViewCount === 4 
                                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' 
                                : filledActiveViewCount > 0 
                                    ? 'bg-amber-950/70 border-amber-500/50 text-amber-300' 
                                    : 'bg-gray-800 border-gray-700 text-gray-400'
                        }`}>
                            {filledActiveViewCount}/4 Active Views
                        </span>
                        {activePack ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center space-x-1 shadow-sm">
                                <Sparkles className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                                <span>Пак: {activePack.name} (Авто-синхронизация)</span>
                            </span>
                        ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-800 border border-gray-700 text-gray-400">
                                Живой редактор (Без пака)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-1.5">
                {/* 3D Batch Generation Start / Stop Button */}
                {isBatchRunning ? (
                    <button
                        onClick={onStop3DBatch}
                        className="px-3 py-1 text-xs font-bold rounded-md bg-red-700 hover:bg-red-600 active:bg-red-800 text-white flex items-center space-x-1.5 shadow-md transition-all border border-red-500/50 animate-pulse"
                        title="Остановить пакетную генерацию 3D моделей"
                    >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>
                            {batchProgress 
                                ? `Остановить 3D Batch (${batchProgress.completed}/${batchProgress.total})` 
                                : 'Остановить 3D Batch'}
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={onStart3DBatch}
                        disabled={packsCount === 0}
                        className={`px-3 py-1 text-xs font-bold rounded-md text-white flex items-center space-x-1.5 shadow-md transition-all border ${
                            packsCount > 0
                                ? 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 border-cyan-400/50 shadow-cyan-900/30'
                                : 'bg-gray-800 text-gray-500 border-gray-700/60 cursor-not-allowed'
                        }`}
                        title="Запустить пакетную генерацию 3D моделей для всех паков в буфере через Tripo 3D и Task Queue"
                    >
                        <Zap className={`w-3.5 h-3.5 ${packsCount > 0 ? 'text-yellow-300 fill-current' : 'text-gray-500'}`} />
                        <span>🚀 Запустить 3D Batch ({packsCount})</span>
                    </button>
                )}

                <button
                    onClick={onSaveCurrentToPack}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center space-x-1 shadow-sm transition-all border border-indigo-400/30"
                    title={t('batchprep.saveToPackTitle') || 'Сохранить текущие 4 ракурса как новый пак в буфер'}
                >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{t('batchprep.savePackBtn') || '+ Пак в буфер'}</span>
                </button>
                {packsCount > 0 && (
                    <button
                        onClick={onDownloadAllPacksZip}
                        className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 hover:text-white border border-gray-700/60 transition-colors"
                        title="Скачать все паки ракурсов архивом ZIP"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
};
