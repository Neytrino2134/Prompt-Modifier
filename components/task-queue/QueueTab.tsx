import React from 'react';
import { GenerationTask } from '../../types';
import { QueueFilter, QueueTypeFilter } from './types';
import { QueueTaskItem } from './QueueTaskItem';
import { Image as ImageIcon, Box } from 'lucide-react';

interface QueueTabProps {
    tasks: GenerationTask[];
    filter: QueueFilter;
    setFilter: (f: QueueFilter) => void;
    queueTypeFilter: QueueTypeFilter;
    setQueueTypeFilter: (tf: QueueTypeFilter) => void;
    runningCount: number;
    queuedCount: number;
    completedCount: number;
    failedCount: number;
    clearCompletedTasks?: () => void;
    onNodeClick: (nodeId: string, frameIndex?: number) => void;
    onCancelTask: (taskId: string) => void;
    onRetryTask: (taskId: string) => void;
    onRemoveTask: (taskId: string) => void;
    setImageViewer?: (viewer: any) => void;
    t: (key: string) => string;
}

export const QueueTab: React.FC<QueueTabProps> = ({
    tasks,
    filter,
    setFilter,
    queueTypeFilter,
    setQueueTypeFilter,
    runningCount,
    queuedCount,
    completedCount,
    failedCount,
    clearCompletedTasks,
    onNodeClick,
    onCancelTask,
    onRetryTask,
    onRemoveTask,
    setImageViewer,
    t
}) => {
    const filteredTasks = tasks.filter(task => {
        if (filter === 'active' && task.status !== 'running' && task.status !== 'queued') return false;
        if (filter === 'completed' && task.status !== 'completed') return false;
        if (filter === 'failed' && task.status !== 'failed' && task.status !== 'cancelled') return false;

        if (queueTypeFilter === 'images' && task.type === 'three_d_gen') return false;
        if (queueTypeFilter === 'threed' && task.type !== 'three_d_gen') return false;
        return true;
    });

    return (
        <>
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

            {/* Filter Tabs & Type Selector Toolbar */}
            <div className="p-2 border-b border-gray-800 bg-gray-900/60 flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5 items-center justify-between">
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

                {/* Queue Item Type Filter: All vs Images vs 3D Models */}
                <div className="flex items-center justify-between gap-1 text-xs pt-1 border-t border-gray-800/60">
                    <span className="text-[10px] text-gray-400 font-medium">Тип задач:</span>
                    <div className="flex gap-1 bg-gray-950 p-0.5 rounded-md border border-gray-800 text-[11px]">
                        <button
                            onClick={() => setQueueTypeFilter('all')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors ${queueTypeFilter === 'all' ? 'bg-gray-700 text-white shadow-xs' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Все ({tasks.length})
                        </button>
                        <button
                            onClick={() => setQueueTypeFilter('images')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${queueTypeFilter === 'images' ? 'bg-cyan-700 text-white shadow-xs' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <ImageIcon className="w-3 h-3" />
                            <span>Изображения</span>
                        </button>
                        <button
                            onClick={() => setQueueTypeFilter('threed')}
                            className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 ${queueTypeFilter === 'threed' ? 'bg-purple-700 text-white shadow-xs' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <Box className="w-3 h-3" />
                            <span>3D Модели</span>
                        </button>
                    </div>
                </div>
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
                        <QueueTaskItem
                            key={task.id}
                            task={task}
                            onNodeClick={onNodeClick}
                            onCancel={onCancelTask}
                            onRetry={onRetryTask}
                            onRemove={onRemoveTask}
                            setImageViewer={setImageViewer}
                            t={t}
                        />
                    ))
                )}
            </div>
        </>
    );
};
