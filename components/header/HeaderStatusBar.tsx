import React from 'react';
import { QueueStats, BatchStats } from './types';

interface HeaderStatusBarProps {
    isStatusBarOpen: boolean;
    queueStats: QueueStats;
    batchStats: BatchStats;
    openTaskQueueTab: (tab: 'queue' | 'batch') => void;
    pollActiveBatchJobs?: () => void;
    isBatchPolling?: boolean;
    isAutoSaving?: boolean;
    showSavedState: boolean;
    secondsToSave: number | null;
    handleTitleBarDoubleClick: (e: React.MouseEvent) => void;
    t: (key: any, options?: any) => string;
}

export const HeaderStatusBar: React.FC<HeaderStatusBarProps> = ({
    isStatusBarOpen,
    queueStats,
    batchStats,
    openTaskQueueTab,
    pollActiveBatchJobs,
    isBatchPolling,
    isAutoSaving,
    showSavedState,
    secondsToSave,
    handleTitleBarDoubleClick,
    t
}) => {
    if (!isStatusBarOpen) return null;

    return (
        <div
            onDoubleClick={handleTitleBarDoubleClick}
            className="relative z-20 w-full bg-transparent px-3 py-1 flex items-center justify-between text-xs gap-3 overflow-x-auto hide-scrollbar app-region-drag select-none"
        >
            {/* Mode 1: Real-time Generation Queue Section */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => openTaskQueueTab('queue')}
                className={`flex items-center gap-2.5 px-2.5 py-1 rounded-md cursor-pointer transition-all border app-region-no-drag ${
                    queueStats.running > 0
                        ? 'bg-cyan-950/40 border-cyan-500/40 hover:bg-cyan-950/60 shadow-sm'
                        : 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800 hover:border-gray-600'
                }`}
                title={`${t('titlebar.statusRealtime')}: ${t('queue.title')}`}
            >
                {/* Running Indicator Icon */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {queueStats.running > 0 ? (
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                        </div>
                    ) : (
                        <span className="text-cyan-400 font-bold text-xs">⚡</span>
                    )}
                    <span className="font-semibold text-gray-200 whitespace-nowrap">
                        {t('titlebar.statusRealtime') || 'Генерация (Очередь)'}
                    </span>
                </div>

                {/* Live Task Counters */}
                <div className="flex items-center gap-1.5">
                    {queueStats.running > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse whitespace-nowrap">
                            {t('titlebar.realtimeRunning', { count: queueStats.running }) || `${queueStats.running} выполняется`}
                        </span>
                    ) : null}

                    {queueStats.queued > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                            {t('titlebar.realtimeQueued', { count: queueStats.queued }) || `${queueStats.queued} в очереди`}
                        </span>
                    )}

                    {queueStats.completed > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                            {t('titlebar.realtimeCompleted', { count: queueStats.completed }) || `${queueStats.completed} готово`}
                        </span>
                    )}

                    {queueStats.failed > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap">
                            {t('titlebar.realtimeFailed', { count: queueStats.failed }) || `${queueStats.failed} ошибок`}
                        </span>
                    )}

                    {queueStats.running === 0 && queueStats.queued === 0 && queueStats.completed === 0 && queueStats.failed === 0 && (
                        <span className="text-gray-400 text-[11px] whitespace-nowrap">
                            {t('titlebar.realtimeIdle') || 'Очередь свободна'}
                        </span>
                    )}
                </div>

                {/* Active Task Name Snippet */}
                {queueStats.currentRunningTask && (
                    <div className="hidden lg:flex items-center gap-1 max-w-[200px] xl:max-w-[280px] pl-1.5 border-l border-cyan-800/40">
                        <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold flex-shrink-0">
                            {queueStats.currentRunningTask.nodeTitle || 'Node'}:
                        </span>
                        <span className="text-[11px] text-gray-300 truncate font-mono">
                            {queueStats.currentRunningTask.prompt || queueStats.currentRunningTask.id}
                        </span>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-800 flex-shrink-0"></div>

            {/* Mode 2: Deferred Batch API Section */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => openTaskQueueTab('batch')}
                className={`flex items-center gap-2.5 px-2.5 py-1 rounded-md cursor-pointer transition-all border app-region-no-drag ${
                    batchStats.activeJobs > 0 || batchStats.readyToDownload > 0
                        ? 'bg-gray-800/90 border-gray-700 hover:bg-gray-800 hover:border-gray-600 shadow-sm'
                        : 'bg-gray-800/70 border-gray-700/60 hover:bg-gray-800 hover:border-gray-600'
                }`}
                title={`${t('titlebar.statusBatch')}: ${t('batch.title')}`}
            >
                {/* Batch Indicator Icon */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {batchStats.activeJobs > 0 ? (
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-secondary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-secondary"></span>
                        </div>
                    ) : (
                        <span className="text-accent-secondary font-bold text-xs">📦</span>
                    )}
                    <span className="font-semibold text-gray-200 whitespace-nowrap">
                        {t('titlebar.statusBatch') || 'Отложенный Batch API'}
                    </span>
                </div>

                {/* Batch Status Metrics */}
                <div className="flex items-center gap-1.5">
                    {batchStats.activeJobs > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-900 text-accent-secondary border border-gray-700 animate-pulse whitespace-nowrap">
                            {t('titlebar.batchRunning', { count: batchStats.activeJobs }) || `${batchStats.activeJobs} в обработке`} ({batchStats.totalItems} кадр.)
                        </span>
                    ) : null}

                    {batchStats.readyToDownload > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 animate-bounce whitespace-nowrap flex items-center gap-1">
                            <span>⬇</span>
                            <span>{t('titlebar.batchReady', { count: batchStats.readyToDownload }) || `${batchStats.readyToDownload} готово к загрузке`}</span>
                        </span>
                    )}

                    {batchStats.activeJobs === 0 && batchStats.readyToDownload === 0 && (
                        <span className="text-gray-400 text-[11px] whitespace-nowrap">
                            {t('titlebar.batchIdle') || 'Нет активных пакетов'}
                        </span>
                    )}
                </div>

                {/* Manual Server Poll Trigger */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (pollActiveBatchJobs) pollActiveBatchJobs();
                    }}
                    disabled={isBatchPolling}
                    className={`p-1 rounded hover:bg-gray-700 text-accent-secondary transition-colors ${isBatchPolling ? 'animate-spin opacity-75' : ''}`}
                    title={t('batch.pollNow') || 'Проверить статус на сервере'}
                    aria-label={t('batch.pollNow') || 'Проверить статус'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </div>

            {/* Right Area: Auto-Save Status Pill */}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0 app-region-no-drag">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-gray-800/80 border border-gray-700/60">
                    {isAutoSaving ? (
                        <>
                            <div className="h-2 w-2 rounded-full bg-accent animate-ping"></div>
                            <span className="text-[10px] font-mono text-accent-text">{t('system.saving') || 'Saving...'}</span>
                        </>
                    ) : showSavedState ? (
                        <>
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-mono text-emerald-400">{t('system.saved') || 'Saved'}</span>
                        </>
                    ) : (
                        <>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-mono text-gray-400">
                                 {secondsToSave !== null ? `Auto-save: ${secondsToSave}s` : 'Saved'}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
