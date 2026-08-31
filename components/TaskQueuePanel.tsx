import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TaskStatus, BatchJobRecord, BatchJobState } from '../types';

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
        setImageViewer,
        isBatchMode,
        setIsBatchMode,
        batchJobs,
        checkBatchJob,
        cancelBatchJob,
        deleteBatchJob,
        clearFinishedBatchJobs,
        pollActiveBatchJobs,
        isBatchPolling,
        t
    } = context;

    const [activeTab, setActiveTab] = useState<'queue' | 'batch'>('queue');
    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
    const [checkingJobId, setCheckingJobId] = useState<string | null>(null);

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

    const activeBatchJobsCount = batchJobs.filter(j => j.state === 'RUNNING' || j.state === 'PENDING').length;

    const handleCheckBatchStatus = async (jobId: string) => {
        setCheckingJobId(jobId);
        try {
            await checkBatchJob(jobId);
        } finally {
            setCheckingJobId(null);
        }
    };

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

    const getBatchStatusBadge = (state: BatchJobState) => {
        switch (state) {
            case 'RUNNING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-300 border border-amber-700/50">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        {t('batch.running') || 'Processing (Batch)'}
                    </span>
                );
            case 'PENDING':
            case 'UNSPECIFIED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/40 text-yellow-300 border border-yellow-700/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        {t('batch.pending') || 'Batch Queued'}
                    </span>
                );
            case 'SUCCEEDED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                        ✓ {t('batch.succeeded') || 'Completed'}
                    </span>
                );
            case 'FAILED':
            case 'EXPIRED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/40 text-red-300 border border-red-700/40">
                        ✕ {t('batch.failed') || 'Failed'}
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                        ⊘ {t('batch.cancelled') || 'Cancelled'}
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
        <div className={`fixed top-0 right-0 bottom-0 w-80 sm:w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-[200] flex flex-col font-sans transition-transform duration-300 ease-in-out ${isTaskQueuePanelOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isBatchMode ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400 animate-pulse'}`}></div>
                    <h2 className="text-gray-100 font-semibold text-base">
                        {t('queue.title') || 'Task Queue & Batch'}
                    </h2>
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

            {/* Centralized Mode Switcher Banner */}
            <div className="p-3 bg-gray-950 border-b border-gray-800">
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900 border border-gray-800">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-200">
                                {t('batch.mode') || 'Batch API Mode'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60 font-mono">
                                -50% Cost
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                            {isBatchMode 
                                ? (t('batch.statusDelayed') || 'Delayed ~24h (Half price)') 
                                : (t('batch.statusImmediate') || 'Standard real-time execution')}
                        </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!isBatchMode}
                            onChange={(e) => setIsBatchMode(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                </div>
            </div>

            {/* Main Tabs Navigation (Queue vs Batch Jobs) */}
            <div className="grid grid-cols-2 p-1.5 bg-gray-950 border-b border-gray-800 text-xs font-medium">
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                        activeTab === 'queue' ? 'bg-cyan-700 text-white font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                    }`}
                >
                    <span>{t('queue.title') || 'Queue'}</span>
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-gray-800/80 font-mono">
                        {tasks.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('batch')}
                    className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                        activeTab === 'batch' ? 'bg-amber-600 text-white font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                    }`}
                >
                    <span>{t('batch.panelTitle') || 'Batch Jobs'}</span>
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-gray-800/80 font-mono">
                        {batchJobs.length}
                    </span>
                    {activeBatchJobsCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    )}
                </button>
            </div>

            {/* TAB CONTENT: REALTIME QUEUE */}
            {activeTab === 'queue' && (
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
                                        <div
                                            className="mt-2 relative rounded overflow-hidden aspect-video bg-black flex items-center justify-center border border-emerald-900/50 cursor-pointer group"
                                            onClick={() => setImageViewer && setImageViewer({
                                                sources: [{ src: task.resultUrl!, frameNumber: (task.frameIndex ?? 0) + 1, prompt: task.prompt }],
                                                initialIndex: 0
                                            })}
                                        >
                                            <img src={task.resultUrl} alt="Result" className="w-full h-full object-contain" />
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
                </>
            )}

            {/* TAB CONTENT: BATCH API JOBS */}
            {activeTab === 'batch' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950">
                    <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
                        <div className="font-semibold flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                                <span>⚡</span>
                                <span>{t('batch.title') || 'Gemini Batch API'}</span>
                            </div>
                            <button
                                onClick={() => pollActiveBatchJobs()}
                                disabled={isBatchPolling}
                                className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[10px] font-medium flex items-center gap-1 transition-colors"
                            >
                                <svg className={`w-3 h-3 ${isBatchPolling ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>{isBatchPolling ? (t('batch.checking') || 'Checking...') : (t('batch.pollNow') || 'Poll Now')}</span>
                            </button>
                        </div>
                        <p className="text-[11px] text-amber-300/80 leading-relaxed">
                            {t('batch.modeDesc') || 'Batch requests are processed asynchronously within 24 hours at 50% discount. Results automatically populate your nodes upon completion.'}
                        </p>
                    </div>

                    {batchJobs.some(j => j.state === 'SUCCEEDED' || j.state === 'FAILED' || j.state === 'CANCELLED') && (
                        <div className="flex justify-end">
                            <button
                                onClick={clearFinishedBatchJobs}
                                className="text-[11px] text-gray-400 hover:text-gray-200 hover:underline transition-colors"
                            >
                                {t('batch.clearFinished') || 'Clear Finished Jobs'}
                            </button>
                        </div>
                    )}

                    {batchJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-center px-4">
                            <svg className="w-10 h-10 mb-2 opacity-30 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm">{t('batch.noJobs') || 'No Batch API jobs submitted yet'}</p>
                            <p className="text-xs text-gray-600 mt-1">{t('batch.modeDesc') || 'Enable Batch API mode and generate images in AI Image Editor'}</p>
                        </div>
                    ) : (
                        batchJobs.map(job => {
                            const totalCount = job.items?.length || 0;
                            const completedCount = job.items?.filter(it => it.status === 'completed')?.length || (job.state === 'SUCCEEDED' ? totalCount : 0);
                            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (job.state === 'SUCCEEDED' ? 100 : 20);

                            return (
                                <div
                                    key={job.id}
                                    className={`p-3 rounded-lg bg-gray-900 border transition-all ${
                                        job.state === 'RUNNING'
                                            ? 'border-amber-600/60 shadow-lg shadow-amber-950/20'
                                            : job.state === 'PENDING'
                                            ? 'border-yellow-700/40'
                                            : job.state === 'SUCCEEDED'
                                            ? 'border-emerald-800/40'
                                            : 'border-gray-800 opacity-80'
                                    }`}
                                >
                                    {/* Job Header Row */}
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <div className="flex flex-col truncate">
                                            <button
                                                onClick={() => handleNodeClick(job.nodeId)}
                                                className="text-xs font-semibold text-amber-300 hover:text-amber-200 hover:underline truncate text-left flex items-center gap-1.5"
                                                title={t('queue.click_to_go') || 'Click to jump to node'}
                                            >
                                                <span className="truncate">{job.displayName || job.nodeTitle || 'Batch Job'}</span>
                                            </button>
                                            <span className="text-[10px] text-gray-500 font-mono truncate">
                                                ID: {job.name || job.id.slice(0, 16)}
                                            </span>
                                        </div>
                                        <div>{getBatchStatusBadge(job.state)}</div>
                                    </div>

                                    {/* Progress Info */}
                                    <div className="space-y-1 my-2">
                                        <div className="flex justify-between text-[11px] text-gray-400">
                                            <span>{t('batch.jobs') || 'Items'}: <span className="text-gray-200 font-mono">{completedCount}/{totalCount}</span></span>
                                            <span className="truncate max-w-[140px] text-right font-mono text-[10px] text-gray-400">{job.model}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    job.state === 'SUCCEEDED' ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`}
                                                style={{
                                                    width: `${progressPercent}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {job.error && (
                                        <div className="mt-2 p-1.5 rounded bg-red-950/50 border border-red-900/50 text-[11px] text-red-300 font-mono">
                                            {job.error}
                                        </div>
                                    )}

                                    {/* Footer & Actions */}
                                    <div className="mt-2.5 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
                                        <span className="font-mono text-[10px]">
                                            {new Date(job.createdAt).toLocaleTimeString()}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {(job.state === 'RUNNING' || job.state === 'PENDING') && (
                                                <>
                                                    <button
                                                        onClick={() => handleCheckBatchStatus(job.id)}
                                                        disabled={checkingJobId === job.id}
                                                        className="px-2 py-0.5 rounded bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 transition-colors flex items-center gap-1 text-[10px]"
                                                    >
                                                        {checkingJobId === job.id && (
                                                            <svg className="animate-spin h-2.5 w-2.5 text-amber-300" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                        )}
                                                        <span>{t('batch.pollNow') || 'Check'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => cancelBatchJob(job.id)}
                                                        className="px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-900 text-red-200 transition-colors text-[10px]"
                                                    >
                                                        {t('queue.cancel') || 'Cancel'}
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                onClick={() => deleteBatchJob(job.id)}
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
                        })
                    )}
                </div>
            )}
        </div>
    );
};

