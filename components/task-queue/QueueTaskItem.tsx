import React from 'react';
import { GenerationTask } from '../../types';
import { QueueStatusBadge } from './TaskQueueBadges';

interface QueueTaskItemProps {
    task: GenerationTask;
    onNodeClick: (nodeId: string, frameIndex?: number) => void;
    onCancel: (taskId: string) => void;
    onRetry: (taskId: string) => void;
    onRemove: (taskId: string) => void;
    setImageViewer?: (viewer: any) => void;
    t: (key: string) => string;
}

export const QueueTaskItem: React.FC<QueueTaskItemProps> = ({
    task,
    onNodeClick,
    onCancel,
    onRetry,
    onRemove,
    setImageViewer,
    t
}) => {
    return (
        <div
            className={`p-3 rounded-lg bg-gray-900 border transition-all ${
                task.status === 'running'
                    ? 'border-blue-600/60 shadow-lg shadow-blue-950/20'
                    : task.status === 'queued'
                    ? 'border-yellow-700/40'
                    : task.status === 'completed'
                    ? 'border-emerald-800/40'
                    : 'border-gray-800 opacity-80'
            }`}
        >
            {/* Task Header Row */}
            <div className="flex items-center justify-between mb-2 gap-2">
                <button
                    onClick={() => onNodeClick(task.nodeId, task.frameIndex)}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:underline truncate text-left flex items-center gap-1.5 flex-wrap"
                    title={t('queue.click_to_go') || 'Click to jump to node'}
                >
                    <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <span className="truncate">{task.nodeTitle || (task.type === 'three_d_gen' ? '3D Generation' : 'Image Editor')}</span>
                    {task.type === 'three_d_gen' && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold text-[10px] uppercase flex items-center gap-1">
                            <span>🧊</span>
                            <span>Tripo 3D</span>
                        </span>
                    )}
                    {task.frameIndex !== undefined && !task.isBatch && task.type !== 'three_d_gen' && (
                        <span className="px-1.5 py-0.2 bg-gray-800 text-gray-300 rounded font-mono text-[10px]">
                            #{task.frameIndex + 1}
                        </span>
                    )}
                    {task.isBatch && (
                        <span className="px-1.5 py-0.2 rounded bg-gray-800 text-accent-secondary border border-gray-700 font-semibold text-[10px] uppercase flex items-center gap-1">
                            <span>Batch API</span>
                            {task.itemCount && task.itemCount > 1 && (
                                <span className="opacity-90 font-normal">({task.itemCount})</span>
                            )}
                        </span>
                    )}
                </button>
                <div>
                    <QueueStatusBadge status={task.status} t={t} />
                </div>
            </div>

            {/* Prompt text */}
            <p className="text-xs text-gray-300 bg-gray-950/60 p-2 rounded border border-gray-800/60 line-clamp-2 select-text font-mono mb-2">
                {task.prompt || 'No prompt specified'}
            </p>

            {/* Result Preview or Error Message */}
            {task.status === 'completed' && (task.thumbnailUrl || task.resultUrl) && (
                <div className="mt-2 space-y-1.5">
                    {(task.thumbnailUrl || (task.resultUrl && (task.resultUrl.startsWith('data:image') || task.resultUrl.startsWith('http')) && !task.resultUrl.endsWith('.glb'))) && (
                        <div
                            className="relative rounded overflow-hidden aspect-video bg-black flex items-center justify-center border border-emerald-900/50 cursor-pointer group"
                            onClick={() => setImageViewer && setImageViewer({
                                sources: [{ src: task.thumbnailUrl || task.resultUrl!, frameNumber: (task.frameIndex ?? 0) + 1, prompt: task.prompt }],
                                initialIndex: 0
                            })}
                        >
                            <img src={task.thumbnailUrl || task.resultUrl} alt="Result" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-xs text-white bg-black/60 px-2.5 py-1 rounded-md shadow flex items-center gap-1 font-sans">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    {t('ui.preview') || 'Preview'}
                                </span>
                            </div>
                        </div>
                    )}

                    {task.type === 'three_d_gen' && task.resultUrl && (
                        <div className="flex items-center justify-between p-2 rounded bg-purple-950/40 border border-purple-900/50">
                            <div className="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
                                <span>🧊</span>
                                <span>3D Model Ready (.GLB)</span>
                            </div>
                            <a
                                href={task.resultUrl}
                                download={`model_${task.id}.glb`}
                                className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-sm flex items-center gap-1 transition-colors"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Download .GLB</span>
                            </a>
                        </div>
                    )}
                </div>
            )}

            {task.error && (
                <div className="mt-2 p-1.5 rounded bg-red-950/50 border border-red-900/50 text-[11px] text-red-300 font-mono">
                    {task.error}
                </div>
            )}

            {/* Footer Actions */}
            <div className="mt-2.5 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
                <span className="font-mono text-[10px]">
                    {new Date(task.createdAt).toLocaleTimeString()}
                </span>
                <div className="flex items-center gap-1.5">
                    {(task.status === 'running' || task.status === 'queued') && (
                        <button
                            onClick={() => onCancel(task.id)}
                            className="px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-900 text-red-200 transition-colors"
                        >
                            {t('queue.cancel') || 'Cancel'}
                        </button>
                    )}

                    {(task.status === 'failed' || task.status === 'cancelled') && (
                        <button
                            onClick={() => onRetry(task.id)}
                            className="px-2 py-0.5 rounded bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 transition-colors"
                        >
                            {t('queue.retry') || 'Retry'}
                        </button>
                    )}

                    <button
                        onClick={() => onRemove(task.id)}
                        className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                        title={t('queue.remove') || 'Remove'}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
