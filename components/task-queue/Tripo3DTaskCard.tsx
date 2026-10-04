import React from 'react';
import { TripoRecentTask } from '../../services/tripoService';
import { Box, Copy, Loader2, RefreshCw, X, Eye, Download, FileJson } from 'lucide-react';

interface Tripo3DTaskCardProps {
    task: TripoRecentTask;
    onRefresh: (taskId: string) => void;
    onRemove: (taskId: string) => void;
    onDownloadModel: (modelUrl: string, prompt?: string, taskId?: string) => void;
    onDownloadPreview: (previewUrl: string, prompt?: string, taskId?: string) => void;
    onDownloadJson: (task: TripoRecentTask) => void;
    onLoadIntoNode: (task: TripoRecentTask) => void;
    setImageViewer?: (viewer: any) => void;
    addToast?: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const Tripo3DTaskCard: React.FC<Tripo3DTaskCardProps> = ({
    task,
    onRefresh,
    onRemove,
    onDownloadModel,
    onDownloadPreview,
    onDownloadJson,
    onLoadIntoNode,
    setImageViewer,
    addToast
}) => {
    const previewSrc = task.renderedImageUrl || task.thumbnailUrl;
    const isSuccess = task.status === 'success';
    const isRunning = task.status === 'running' || task.status === 'queued';
    const isFailed = task.status === 'failed' || task.status === 'cancelled';

    return (
        <div
            className={`p-3 rounded-lg bg-gray-900 border transition-all ${
                isSuccess
                    ? 'border-purple-900/50 shadow-md shadow-purple-950/20'
                    : isRunning
                    ? 'border-blue-700/60 animate-pulse'
                    : isFailed
                    ? 'border-red-900/50 opacity-80'
                    : 'border-gray-800'
            }`}
        >
            {/* Card Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-col truncate">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold text-[10px] flex items-center gap-1">
                            <span>🧊</span>
                            <span>{task.type === 'texture_model' ? 'Retexture' : '3D Model'}</span>
                        </span>
                        <div className="flex items-center gap-1 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800 text-[10px] font-mono text-gray-300">
                            <span className="truncate max-w-[130px]" title={task.taskId}>
                                {task.taskId}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(task.taskId);
                                    addToast?.(`Task ID "${task.taskId}" скопирован!`, 'success');
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                                title="Скопировать Task ID"
                            >
                                <Copy className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-gray-200 mt-1 line-clamp-2">
                        {task.prompt || '3D generation without prompt'}
                    </span>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isSuccess && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                            <span>✓</span>
                            <span>Готово</span>
                        </span>
                    )}
                    {isRunning && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/60 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                            <span>{task.progress ? `${task.progress}%` : 'Генерация...'}</span>
                        </span>
                    )}
                    {isFailed && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/80 text-red-300 border border-red-800/60 flex items-center gap-1">
                            <span>✕</span>
                            <span>Ошибка</span>
                        </span>
                    )}

                    <button
                        onClick={() => onRefresh(task.taskId)}
                        className="p-1 rounded text-gray-400 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                        title="Запросить свежий статус из Tripo API"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={() => onRemove(task.taskId)}
                        className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                        title="Закрыть / Удалить панель модели"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Preview Thumbnail and Model Info */}
            <div className="flex gap-3 my-2 bg-gray-950/70 p-2 rounded-lg border border-gray-800/80">
                {/* Preview Box */}
                <div
                    className="w-24 h-24 rounded-md bg-black/80 border border-purple-900/40 overflow-hidden flex items-center justify-center flex-shrink-0 relative group cursor-pointer"
                    onClick={() => {
                        if (previewSrc && setImageViewer) {
                            setImageViewer({
                                sources: [{ src: previewSrc, frameNumber: 1, prompt: task.prompt, model: 'Tripo 3D' }],
                                initialIndex: 0
                            });
                        }
                    }}
                >
                    {previewSrc ? (
                        <>
                            <img
                                src={previewSrc}
                                alt="3D Preview"
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-600 gap-1">
                            <Box className="w-6 h-6 text-purple-400/50" />
                            <span className="text-[9px] text-gray-500">3D Asset</span>
                        </div>
                    )}
                </div>

                {/* Meta details */}
                <div className="flex-1 flex flex-col justify-between text-[11px] text-gray-300">
                    <div className="space-y-1 font-mono text-[10px]">
                        <div className="flex justify-between text-gray-400">
                            <span>Дата создания:</span>
                            <span className="text-gray-200">{new Date(task.createdAt).toLocaleString()}</span>
                        </div>
                        {task.creditsConsumed !== undefined && (
                            <div className="flex justify-between text-gray-400">
                                <span>Потрачено:</span>
                                <span className="text-yellow-400 font-semibold">{task.creditsConsumed} кр.</span>
                            </div>
                        )}
                        {task.modelUrl && (
                            <div className="flex justify-between text-gray-400">
                                <span>Формат файла:</span>
                                <span className="text-purple-300 font-semibold">glTF / .GLB</span>
                            </div>
                        )}
                    </div>

                    {task.error && (
                        <div className="p-1 rounded bg-red-950/60 border border-red-900/60 text-[10px] text-red-300">
                            {task.error}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons for this 3D Model */}
            <div className="mt-2.5 pt-2 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                    {task.modelUrl && (
                        <button
                            onClick={() => onDownloadModel(task.modelUrl!, task.prompt, task.taskId)}
                            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1 transition-colors"
                            title="Скачать файл 3D модели (.GLB)"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Скачать .GLB</span>
                        </button>
                    )}

                    {previewSrc && (
                        <button
                            onClick={() => onDownloadPreview(previewSrc, task.prompt, task.taskId)}
                            className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-medium flex items-center gap-1 transition-colors"
                            title="Скачать изображение превью"
                        >
                            <Download className="w-3 h-3 text-cyan-400" />
                            <span>Превью</span>
                        </button>
                    )}

                    <button
                        onClick={() => onDownloadJson(task)}
                        className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-700/60 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Скачать JSON метаданные и Task ID этой генерации"
                    >
                        <FileJson className="w-3 h-3 text-amber-400" />
                        <span>JSON</span>
                    </button>

                    {task.modelUrl && (
                        <button
                            onClick={() => onLoadIntoNode(task)}
                            className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium flex items-center gap-1 transition-colors"
                            title="Загрузить эту 3D модель в узел 3D Generation на холсте"
                        >
                            <Box className="w-3 h-3" />
                            <span>В узел 3D</span>
                        </button>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={() => onRemove(task.taskId)}
                    className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-xs transition-colors flex items-center gap-1 ml-auto"
                    title="Закрыть эту карточку"
                >
                    <X className="w-3 h-3" />
                    <span>Закрыть</span>
                </button>
            </div>
        </div>
    );
};
