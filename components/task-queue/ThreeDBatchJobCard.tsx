import React from 'react';
import { ThreeDBatchJob } from '../../services/tripoBatchService';
import { Loader2, Check, X, Download, FileJson, Trash2, Box, Copy } from 'lucide-react';

interface ThreeDBatchJobCardProps {
    job: ThreeDBatchJob;
    isExpanded: boolean;
    onToggleExpand: () => void;
    isDownloadingZip: boolean;
    onDownloadAll3DModelsZip: (job: ThreeDBatchJob) => Promise<void>;
    onDownloadMetadataJsonZip: (job: ThreeDBatchJob) => void;
    onDeleteJob: (jobId: string) => void;
    addToast?: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const ThreeDBatchJobCard: React.FC<ThreeDBatchJobCardProps> = ({
    job,
    isExpanded,
    onToggleExpand,
    isDownloadingZip,
    onDownloadAll3DModelsZip,
    onDownloadMetadataJsonZip,
    onDeleteJob,
    addToast
}) => {
    const isRunning = job.status === 'running' || job.status === 'queued';
    const isSuccess = job.status === 'completed';
    const isFailed = job.status === 'failed';
    const readyCount = job.items.filter(i => i.status === 'success').length;
    const runningCount = job.items.filter(i => i.status === 'running' || i.status === 'uploading').length;
    const queuedCount = job.items.filter(i => i.status === 'queued').length;
    const errorCount = job.items.filter(i => i.status === 'failed').length;

    return (
        <div
            className={`rounded-xl border transition-all overflow-hidden ${
                isRunning
                    ? 'bg-gradient-to-b from-purple-950/40 to-gray-900 border-purple-600/80 shadow-lg shadow-purple-950/30'
                    : isSuccess
                    ? 'bg-gray-900 border-emerald-900/60 shadow-md shadow-emerald-950/20'
                    : 'bg-gray-900 border-gray-800'
            }`}
        >
            {/* Master Batch Header */}
            <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-100 truncate">
                                {job.name || job.assetBaseName || '3D Batch Job'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                                isRunning
                                    ? 'bg-blue-950 text-blue-300 border-blue-700/60 animate-pulse'
                                    : isSuccess
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                    : 'bg-red-950 text-red-300 border-red-700/60'
                            }`}>
                                {isRunning && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                {isSuccess && <Check className="w-2.5 h-2.5" />}
                                {isFailed && <X className="w-2.5 h-2.5" />}
                                <span>{isRunning ? 'ГЕНЕРАЦИЯ' : isSuccess ? 'ГОТОВО' : 'ОШИБКА'}</span>
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">
                                ID: {job.id.slice(-8)}
                            </span>
                        </div>

                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-3">
                            <span>Создан: {new Date(job.createdAt).toLocaleTimeString()}</span>
                            <span>•</span>
                            <span>Всего паков: <strong className="text-gray-200">{job.totalCount}</strong></span>
                        </div>
                    </div>

                    {/* Master Batch Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isSuccess && readyCount > 0 && (
                            <button
                                onClick={async () => {
                                    try {
                                        await onDownloadAll3DModelsZip(job);
                                    } catch (err: any) {
                                        addToast?.(`Ошибка скачивания: ${err?.message || err}`, 'error');
                                    }
                                }}
                                disabled={isDownloadingZip}
                                className="px-2.5 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                                title="Скачать все сгенерированные 3D модели одним .ZIP архивом"
                            >
                                {isDownloadingZip ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Download className="w-3.5 h-3.5" />
                                )}
                                <span>Скачать все .GLB (ZIP)</span>
                            </button>
                        )}

                        <button
                            onClick={() => onDownloadMetadataJsonZip(job)}
                            className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 transition-colors"
                            title="Экспортировать метаданные и Task ID всех задач в JSON ZIP"
                        >
                            <FileJson className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={() => {
                                if (window.confirm(`Удалить запись пакета "${job.name}"?`)) {
                                    onDeleteJob(job.id);
                                }
                            }}
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-300 hover:bg-gray-800 transition-colors"
                            title="Удалить пакет из истории"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Progress Bar & Counters */}
                <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-purple-300">
                                {job.progressPercent}% выполнено
                            </span>
                            <span className="text-gray-500">|</span>
                            <span className="text-emerald-400 font-medium">{readyCount} готово</span>
                            <span className="text-blue-400 font-medium">{runningCount} в процессе</span>
                            {queuedCount > 0 && <span className="text-purple-400">{queuedCount} в очереди</span>}
                            {errorCount > 0 && <span className="text-red-400 font-medium">{errorCount} с ошибкой</span>}
                        </div>
                        <button
                            onClick={onToggleExpand}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                        >
                            <span>{isExpanded ? 'Свернуть паки' : `Развернуть (${job.items.length})`}</span>
                        </button>
                    </div>

                    <div className="h-1.5 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                        <div
                            className={`h-full transition-all duration-300 ${
                                isSuccess
                                    ? 'bg-emerald-500'
                                    : isRunning
                                    ? 'bg-gradient-to-r from-purple-500 to-cyan-400'
                                    : 'bg-red-500'
                            }`}
                            style={{ width: `${job.progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Expandable List of Individual Tasks inside Master Batch */}
            {isExpanded && (
                <div className="p-3 pt-0 border-t border-gray-800/80 bg-gray-950/60 space-y-2">
                    <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider pt-2">
                        Содержимое пакета ({job.items.length} моделей):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                        {job.items.map((item, idx) => {
                            const preview = item.renderedImageUrl || item.thumbnailUrl || item.views.front || item.views.back;
                            const itRunning = item.status === 'running' || item.status === 'uploading' || item.status === 'queued';
                            const itSuccess = item.status === 'success';
                            const itFailed = item.status === 'failed';

                            return (
                                <div
                                    key={item.id || idx}
                                    className={`p-2 rounded-lg bg-gray-900 border flex items-center gap-2.5 transition-all ${
                                        itSuccess
                                            ? 'border-emerald-900/50'
                                            : itRunning
                                            ? 'border-purple-600/60 animate-pulse'
                                            : itFailed
                                            ? 'border-red-900/50'
                                            : 'border-gray-800'
                                    }`}
                                >
                                    {/* Thumbnail Preview */}
                                    <div className="w-12 h-12 rounded bg-black flex-shrink-0 relative overflow-hidden border border-gray-800 flex items-center justify-center">
                                        {preview ? (
                                            <img src={preview} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Box className="w-5 h-5 text-gray-600" />
                                        )}
                                        {itRunning && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Item Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-medium text-gray-200 text-[11px] truncate">
                                                #{idx + 1} {item.packName}
                                            </span>
                                            <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                                itSuccess ? 'bg-emerald-950 text-emerald-300' :
                                                itRunning ? 'bg-blue-950 text-blue-300' :
                                                itFailed ? 'bg-red-950 text-red-300' : 'bg-gray-800 text-gray-400'
                                            }`}>
                                                {itSuccess ? '100%' : itRunning ? `${item.progress}%` : itFailed ? 'ERR' : 'WAIT'}
                                            </span>
                                        </div>

                                        {item.taskId && (
                                            <div className="flex items-center gap-1 text-[9px] font-mono text-gray-400 mt-0.5">
                                                <span className="truncate max-w-[120px]">{item.taskId}</span>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(item.taskId!);
                                                        addToast?.('Task ID скопирован!', 'success');
                                                    }}
                                                    className="hover:text-purple-300"
                                                    title="Скопировать Task ID"
                                                >
                                                    <Copy className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Item Action Buttons */}
                                        {itSuccess && item.modelUrl && (
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <a
                                                    href={item.modelUrl}
                                                    download={`${job.assetBaseName || 'Model'}_${idx + 1}.glb`}
                                                    className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[9px] font-medium flex items-center gap-0.5"
                                                >
                                                    <Download className="w-2.5 h-2.5" />
                                                    <span>.GLB</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
