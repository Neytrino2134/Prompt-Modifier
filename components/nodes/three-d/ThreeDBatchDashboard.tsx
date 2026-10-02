import React from 'react';
import { useLanguage } from '../../../localization';
import { 
    Box, 
    Sparkles, 
    Zap, 
    Download, 
    Copy, 
    Check, 
    Eye, 
    FolderDown, 
    FileJson, 
    RefreshCw, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    Loader2, 
    Layers,
    Square
} from 'lucide-react';
import { OptimizedThumbnail } from '../image-editor/OptimizedThumbnail';
import { ThreeDBatchJob, ThreeDBatchItemState, downloadAllBatch3DModelsZip, download3DModelFromUrl, format3DAssetFilename } from '../../../services/tripoBatchService';
import { downloadTaskMetadataJson } from '../../../services/tripoService';

interface ThreeDBatchDashboardProps {
    batchJob: ThreeDBatchJob | null;
    isBatchRunning: boolean;
    onStopBatch?: () => void;
    onStartBatch?: () => void;
    onExitBatchMode?: () => void;
    onOpenImageViewer?: (src: string, title: string) => void;
    addToast?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export const ThreeDBatchDashboard: React.FC<ThreeDBatchDashboardProps> = ({
    batchJob,
    isBatchRunning,
    onStopBatch,
    onStartBatch,
    onExitBatchMode,
    onOpenImageViewer,
    addToast
}) => {
    const { t } = useLanguage();
    const [isZipping, setIsZipping] = React.useState(false);
    const [copiedTaskId, setCopiedTaskId] = React.useState<string | null>(null);

    const items = batchJob?.items || [];
    const totalCount = batchJob?.totalCount || items.length;
    const completedCount = batchJob?.completedCount || items.filter(it => it.status === 'success').length;
    const runningCount = batchJob?.runningCount || items.filter(it => it.status === 'running' || it.status === 'uploading').length;
    const queuedCount = batchJob?.queuedCount || items.filter(it => it.status === 'queued').length;
    const failedCount = batchJob?.failedCount || items.filter(it => it.status === 'failed' || it.status === 'cancelled').length;
    const percent = batchJob?.progressPercent ?? (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

    const handleCopyId = (taskId: string) => {
        navigator.clipboard.writeText(taskId);
        setCopiedTaskId(taskId);
        if (addToast) addToast(`Task ID "${taskId}" скопирован в буфер!`, 'success');
        setTimeout(() => setCopiedTaskId(null), 2000);
    };

    const handleDownloadSingleGlb = (item: ThreeDBatchItemState) => {
        if (!item.modelUrl) return;
        const filename = format3DAssetFilename(item.packName || batchJob?.assetBaseName || 'Asset', item.packIndex, 'glb', item.completedAt || item.createdAt);
        download3DModelFromUrl(item.modelUrl, filename);
        if (addToast) addToast(`Скачивание модели: ${filename}`, 'info');
    };

    const handleDownloadSingleJson = (item: ThreeDBatchItemState) => {
        if (!item.taskId) return;
        const filename = downloadTaskMetadataJson({
            taskId: item.taskId,
            type: 'multiview_to_3d',
            prompt: item.packName,
            modelVersion: batchJob?.modelVersion,
            status: item.status,
            progress: item.progress,
            modelUrl: item.modelUrl,
            thumbnailUrl: item.thumbnailUrl,
            renderedImageUrl: item.renderedImageUrl,
            createdAt: item.createdAt
        }, item.packName, item.packIndex);
        if (addToast && filename) addToast(`Метаданные сохранены: ${filename}`, 'success');
    };

    const handleDownloadAllZip = async () => {
        if (!batchJob) return;
        setIsZipping(true);
        try {
            await downloadAllBatch3DModelsZip(batchJob, (p, text) => {
                if (p === 100 && addToast) addToast(text, 'success');
            });
        } catch (err: any) {
            console.error('ZIP download error', err);
            if (addToast) addToast(err?.message || 'Ошибка создания ZIP архива', 'error');
        } finally {
            setIsZipping(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-950/90 rounded-lg border border-cyan-800/50 overflow-hidden font-sans select-none">
            {/* Batch Status Header Bar */}
            <div className="p-3 bg-gray-900/95 border-b border-gray-800 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-600/50 text-cyan-300">
                            <Layers className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-gray-100 uppercase tracking-wider">
                                    {batchJob?.name || '3D Batch Mode'}
                                </h3>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    isBatchRunning 
                                        ? 'bg-blue-950/80 text-blue-300 border-blue-600/60 animate-pulse' 
                                        : completedCount === totalCount && totalCount > 0
                                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                                            : 'bg-gray-800 text-gray-300 border-gray-700'
                                }`}>
                                    {isBatchRunning ? '⚡ Генерация в процессе' : completedCount === totalCount && totalCount > 0 ? '✓ Все модели готовы' : 'Готов к запуску'}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                                Батч-обработка паков без нагрузки на WebGL с авто-скачкой GLB и JSON
                            </span>
                        </div>
                    </div>

                    {/* Top Action Buttons */}
                    <div className="flex items-center gap-1.5">
                        {completedCount > 0 && (
                            <button
                                onClick={handleDownloadAllZip}
                                disabled={isZipping}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                                title="Скачать все готовые 3D модели в одном ZIP архиве"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>{isZipping ? 'Архивация...' : `ZIP (${completedCount} шт.)`}</span>
                            </button>
                        )}

                        {isBatchRunning ? (
                            <button
                                onClick={onStopBatch}
                                className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                title="Остановить пакетную генерацию"
                            >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Остановить</span>
                            </button>
                        ) : onStartBatch && items.length > 0 ? (
                            <button
                                onClick={onStartBatch}
                                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                                title="Запустить пакетную генерацию 3D моделей"
                            >
                                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                                <span>Старт Батча</span>
                            </button>
                        ) : null}

                        {onExitBatchMode && (
                            <button
                                onClick={onExitBatchMode}
                                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 text-xs transition-colors"
                                title="Вернуться в режим интерактивного 3D просмотра"
                            >
                                3D Окно
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Bar & Stats Ribbon */}
                <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-300 font-medium">
                                Прогресс: <span className="text-cyan-300 font-mono font-bold">{percent}%</span>
                            </span>
                            <div className="flex items-center gap-2 text-[11px]">
                                <span className="px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 border border-gray-700 font-mono">
                                    Всего: {totalCount}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                                    Готово: {completedCount}
                                </span>
                                {runningCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-mono flex items-center gap-1">
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        <span>В работе: {runningCount}</span>
                                    </span>
                                )}
                                {queuedCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-yellow-950 text-yellow-300 border border-yellow-800/60 font-mono">
                                        В очереди: {queuedCount}
                                    </span>
                                )}
                                {failedCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800/60 font-mono">
                                        Ошибки: {failedCount}
                                    </span>
                                )}
                            </div>
                        </div>

                        <span className="text-[10px] text-gray-400 font-mono">
                            Модель: {batchJob?.modelVersion || 'v3.1'}
                        </span>
                    </div>

                    <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                        <div 
                            className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Batch Items List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-center p-4 border border-dashed border-gray-800 rounded-lg">
                        <Layers className="w-8 h-8 mb-2 text-gray-600" />
                        <span className="text-xs font-medium text-gray-400">Нет паков для пакетной генерации</span>
                        <span className="text-[10px] text-gray-600 mt-0.5">
                            Создайте паки в ноде "3D Batch Prepare" и нажмите "Запустить 3D Batch"
                        </span>
                    </div>
                ) : (
                    items.map((item, idx) => {
                        const isSuccess = item.status === 'success';
                        const isRunning = item.status === 'running' || item.status === 'uploading';
                        const isQueued = item.status === 'queued';
                        const isFailed = item.status === 'failed' || item.status === 'cancelled';
                        const previewSrc = item.renderedImageUrl || item.thumbnailUrl || item.views.front || item.views.left;

                        return (
                            <div
                                key={item.id || `batch-item-${idx}`}
                                className={`p-2 rounded-lg border transition-all flex flex-col gap-2 ${
                                    isSuccess 
                                        ? 'bg-emerald-950/20 border-emerald-800/50 shadow-sm' 
                                        : isRunning 
                                            ? 'bg-blue-950/30 border-blue-600/70 shadow-md ring-1 ring-blue-500/30' 
                                            : isFailed 
                                                ? 'bg-red-950/20 border-red-800/50' 
                                                : 'bg-gray-900/60 border-gray-800'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    {/* Left: Index, Name, Task ID */}
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="text-[11px] font-bold text-gray-400 font-mono">
                                            #{item.packIndex}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-200 truncate" title={item.packName}>
                                            {item.packName}
                                        </span>

                                        {/* Task ID Pill with Copy button */}
                                        {item.taskId ? (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-950 border border-gray-700 text-[10px] font-mono text-cyan-300">
                                                <span className="truncate max-w-[120px]" title={item.taskId}>
                                                    ID: {item.taskId}
                                                </span>
                                                <button
                                                    onClick={() => handleCopyId(item.taskId!)}
                                                    className="text-gray-400 hover:text-white transition-colors"
                                                    title="Скопировать Task ID"
                                                >
                                                    {copiedTaskId === item.taskId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-600 font-mono">
                                                (ожидание task_id...)
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: Status Pill & Actions */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {isSuccess && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                <span>Готово (100%)</span>
                                            </span>
                                        )}
                                        {isRunning && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-700/60 flex items-center gap-1">
                                                <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                                                <span>Генерация {item.progress}%</span>
                                            </span>
                                        )}
                                        {isQueued && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-950/70 text-yellow-300 border border-yellow-800/50 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-yellow-400" />
                                                <span>В очереди</span>
                                            </span>
                                        )}
                                        {isFailed && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-950 text-red-300 border border-red-800/60 flex items-center gap-1" title={item.error}>
                                                <AlertCircle className="w-3 h-3 text-red-400" />
                                                <span>Ошибка</span>
                                            </span>
                                        )}

                                        {/* Actions for finished model */}
                                        {isSuccess && item.modelUrl && (
                                            <button
                                                onClick={() => handleDownloadSingleGlb(item)}
                                                className="p-1 rounded bg-gray-800 hover:bg-emerald-900 text-gray-300 hover:text-emerald-200 border border-gray-700 transition-colors"
                                                title="Скачать .GLB модель на диск"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {item.taskId && (
                                            <button
                                                onClick={() => handleDownloadSingleJson(item)}
                                                className="p-1 rounded bg-gray-800 hover:bg-amber-900 text-gray-300 hover:text-amber-200 border border-gray-700 transition-colors"
                                                title="Скачать JSON метаданные с Task ID"
                                            >
                                                <FileJson className="w-3.5 h-3.5 text-amber-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Mini Thumbnails Strip + Progress Track */}
                                <div className="flex items-center gap-2">
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-black/60 rounded border border-gray-800 w-44 shrink-0">
                                        {(['front', 'back', 'left', 'right'] as const).map(vKey => {
                                            const img = item.views[vKey];
                                            const isMuted = item.mutedViews?.[vKey];
                                            return (
                                                <div key={`${item.id}-${vKey}`} className="w-9 h-9 rounded bg-gray-900 border border-gray-800 overflow-hidden flex items-center justify-center relative">
                                                    {img ? (
                                                        <OptimizedThumbnail
                                                            src={img}
                                                            size={64}
                                                            alt=""
                                                            className={`w-full h-full object-contain ${isMuted ? 'opacity-25 grayscale' : ''}`}
                                                        />
                                                    ) : (
                                                        <span className="text-[8px] text-gray-600">-</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Progress / Status display bar */}
                                    <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                                        {isRunning && (
                                            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className="bg-cyan-500 h-full transition-all duration-300"
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                        )}
                                        {item.error && (
                                            <span className="text-[10px] text-red-300 font-mono truncate">
                                                {item.error}
                                            </span>
                                        )}
                                        {isSuccess && (
                                            <span className="text-[10px] text-emerald-400 font-medium">
                                                ✓ Модель .GLB успешно сгенерирована и сохранена
                                            </span>
                                        )}
                                    </div>

                                    {/* Rendered Preview if available */}
                                    {previewSrc && (
                                        <div 
                                            onClick={() => onOpenImageViewer?.(previewSrc, item.packName)}
                                            className="w-11 h-11 rounded bg-black border border-gray-700 overflow-hidden shrink-0 cursor-pointer hover:border-cyan-400 transition-colors relative group"
                                            title="Посмотреть превью"
                                        >
                                            <img src={previewSrc} alt="" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Eye className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
