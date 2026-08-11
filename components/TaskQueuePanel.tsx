import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TaskStatus } from '../types';

export const TaskQueuePanel: React.FC = () => {
    const context = useAppContext();
    if (!context) return null;

    const {
        tasks,
        isTaskQueuePanelOpen,
        setIsTaskQueuePanelOpen,
        cancelTask,
        retryTask,
        clearCompletedTasks,
        removeTask,
        selectNode,
        handleNavigateToNodeFrame,
        t
    } = context;

    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

    if (!isTaskQueuePanelOpen) return null;

    const filteredTasks = tasks.filter(task => {
        if (filter === 'active') return task.status === 'running' || task.status === 'queued';
        if (filter === 'completed') return task.status === 'completed';
        if (filter === 'failed') return task.status === 'failed' || task.status === 'cancelled';
        return true;
    });

    const runningCount = tasks.filter(t => t.status === 'running').length;
    const queuedCount = tasks.filter(t => t.status === 'queued').length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const failedCount = tasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length;

    const getStatusBadge = (status: TaskStatus) => {
        switch (status) {
            case 'running':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700/50">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                        {t('queue.running') || 'Running'}
                    </span>
                );
            case 'queued':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/40 text-yellow-300 border border-yellow-700/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        {t('queue.queued') || 'Queued'}
                    </span>
                );
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                        ✓ {t('queue.completed') || 'Completed'}
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/40 text-red-300 border border-red-700/40">
                        ✕ {t('queue.failed') || 'Failed'}
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                        ⊘ {t('queue.cancelled') || 'Cancelled'}
                    </span>
                );
        }
    };

    const handleNodeClick = (nodeId: string, frameIndex?: number) => {
        if (frameIndex !== undefined && handleNavigateToNodeFrame) {
            handleNavigateToNodeFrame(nodeId, frameIndex);
        } else if (selectNode) {
            selectNode(nodeId);
        }
    };

    return (
        <div className="fixed top-0 right-0 bottom-0 w-80 sm:w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-[200] flex flex-col font-sans">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
                    <h2 className="text-gray-100 font-semibold text-base">
                        {t('queue.title') || 'Task Queue'}
                    </h2>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-300 font-mono">
                        {tasks.length}
                    </span>
                </div>
                <button
                    onClick={() => setIsTaskQueuePanelOpen(false)}
                    className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-gray-950 border-b border-gray-800 text-center text-xs">
                <div className="p-1.5 rounded bg-blue-950/40 border border-blue-900/30">
                    <div className="text-blue-400 font-bold">{runningCount}</div>
                    <div className="text-gray-400 text-[10px]">{t('queue.running') || 'Running'}</div>
                </div>
                <div className="p-1.5 rounded bg-yellow-950/40 border border-yellow-900/30">
                    <div className="text-yellow-400 font-bold">{queuedCount}</div>
                    <div className="text-gray-400 text-[10px]">{t('queue.queued') || 'Queued'}</div>
                </div>
                <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-900/30">
                    <div className="text-emerald-400 font-bold">{completedCount}</div>
                    <div className="text-gray-400 text-[10px]">{t('queue.completed') || 'Done'}</div>
                </div>
                <div className="p-1.5 rounded bg-red-950/40 border border-red-900/30">
                    <div className="text-red-400 font-bold">{failedCount}</div>
                    <div className="text-gray-400 text-[10px]">{t('queue.failed') || 'Failed'}</div>
                </div>
            </div>

            {/* Filter Tabs & Toolbar */}
            <div className="p-2 border-b border-gray-800 bg-gray-900/60 flex flex-wrap gap-1.5 items-center justify-between">
                <div className="flex gap-1 bg-gray-950 p-0.5 rounded-lg border border-gray-800 text-xs">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filter === 'all' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        {t('queue.filter_all') || 'All'} ({tasks.length})
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filter === 'active' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        {t('queue.filter_active') || 'Active'} ({runningCount + queuedCount})
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filter === 'completed' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        {t('queue.filter_completed') || 'Done'} ({completedCount})
                    </button>
                </div>

                {completedCount + failedCount > 0 && (
                    <button
                        onClick={clearCompletedTasks}
                        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                        title={t('queue.clear_completed') || 'Clear finished tasks'}
                    >
                        {t('queue.clear') || 'Clear Finished'}
                    </button>
                )}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950">
                {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-center px-4">
                        <svg className="w-10 h-10 mb-2 opacity-30 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="text-sm">{t('queue.empty') || 'No tasks in queue'}</p>
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div
                            key={task.id}
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
                                    onClick={() => handleNodeClick(task.nodeId, task.frameIndex)}
                                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:underline truncate text-left flex items-center gap-1.5"
                                    title={t('queue.click_to_go') || 'Click to jump to node'}
                                >
                                    <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                    </svg>
                                    <span className="truncate">{task.nodeTitle || 'Image Editor'}</span>
                                    {task.frameIndex !== undefined && (
                                        <span className="px-1.5 py-0.2 bg-gray-800 text-gray-300 rounded font-mono text-[10px]">
                                            #{task.frameIndex + 1}
                                        </span>
                                    )}
                                </button>
                                <div>{getStatusBadge(task.status)}</div>
                            </div>

                            {/* Prompt text */}
                            <p className="text-xs text-gray-300 bg-gray-950/60 p-2 rounded border border-gray-800/60 line-clamp-2 select-text font-mono mb-2">
                                {task.prompt || 'No prompt specified'}
                            </p>

                            {/* Result Preview or Error Message */}
                            {task.status === 'completed' && task.resultUrl && (
                                <div className="mt-2 relative rounded overflow-hidden aspect-video bg-black flex items-center justify-center border border-emerald-900/50">
                                    <img src={task.resultUrl} alt="Result" className="w-full h-full object-contain" />
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
                                            onClick={() => cancelTask(task.id)}
                                            className="px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-900 text-red-200 transition-colors"
                                        >
                                            {t('queue.cancel') || 'Cancel'}
                                        </button>
                                    )}

                                    {(task.status === 'failed' || task.status === 'cancelled') && (
                                        <button
                                            onClick={() => retryTask(task.id)}
                                            className="px-2 py-0.5 rounded bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 transition-colors"
                                        >
                                            {t('queue.retry') || 'Retry'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => removeTask(task.id)}
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
                    ))
                )}
            </div>
        </div>
    );
};
