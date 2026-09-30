import React, { useMemo } from 'react';
import { useAppContext } from '../../../contexts/AppContext';

export const BatchApiBanner: React.FC = () => {
    const context = useAppContext();
    const { batchJobs = [], fetchingJobIds = {}, fetchBatchJobResults } = context || {};

    const activeJobs = useMemo(() => {
        return (batchJobs || []).filter(j => j && (j.state === 'PENDING' || j.state === 'RUNNING'));
    }, [batchJobs]);

    const completedJobs = useMemo(() => {
        return (batchJobs || []).filter(j => j && j.state === 'SUCCEEDED');
    }, [batchJobs]);

    const failedJobs = useMemo(() => {
        return (batchJobs || []).filter(j => j && j.state === 'FAILED');
    }, [batchJobs]);

    const isAnyDownloading = useMemo(() => {
        return Object.values(fetchingJobIds || {}).some(Boolean);
    }, [fetchingJobIds]);

    return (
        <div className="h-8 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between px-3 shrink-0 text-xs font-mono select-none">
            {/* Left: Indicator & Status */}
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/80 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${
                        activeJobs.length > 0 
                            ? 'bg-amber-400 animate-ping' 
                            : completedJobs.length > 0 
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                            : 'bg-slate-500'
                    }`} />
                    <span className="font-bold text-[11px] text-slate-300">Batch API</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] truncate">
                    {activeJobs.length > 0 && (
                        <span className="text-amber-400 flex items-center gap-1 font-semibold animate-pulse">
                            <span>⚡ Обработка:</span>
                            <span className="bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800 text-amber-300">
                                {activeJobs.length} {activeJobs.length === 1 ? 'задача' : 'задач'}
                            </span>
                        </span>
                    )}

                    {completedJobs.length > 0 && (
                        <span className="text-emerald-400 flex items-center gap-1">
                            <span>✨ Готово:</span>
                            <span className="bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800 text-emerald-300 font-bold">
                                {completedJobs.length}
                            </span>
                        </span>
                    )}

                    {failedJobs.length > 0 && (
                        <span className="text-rose-400 flex items-center gap-1">
                            <span>✕ Ошибок:</span>
                            <span className="bg-rose-950 px-1.5 py-0.2 rounded border border-rose-800 text-rose-300">
                                {failedJobs.length}
                            </span>
                        </span>
                    )}

                    {activeJobs.length === 0 && completedJobs.length === 0 && failedJobs.length === 0 && (
                        <span className="text-slate-500 text-[11px]">
                            Фоновых задач нет (Ожидание запуска генераций)
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Quick actions */}
            <div className="flex items-center gap-2 shrink-0">
                {completedJobs.length > 0 && fetchBatchJobResults && (
                    <button
                        onClick={() => {
                            completedJobs.forEach(job => {
                                if (!fetchingJobIds?.[job.id]) {
                                    fetchBatchJobResults(job.id, { forceRestore: true });
                                }
                            });
                        }}
                        disabled={isAnyDownloading}
                        className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Скачать результаты завершенных Batch задач"
                    >
                        {isAnyDownloading ? (
                            <>
                                <span className="animate-spin text-xs">⟳</span>
                                <span>Загрузка...</span>
                            </>
                        ) : (
                            <>
                                <span>📥 Скачать все ({completedJobs.length})</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
