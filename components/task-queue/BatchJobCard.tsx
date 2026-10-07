import React, { useEffect, useState } from 'react';
import { acquireBatchJobPayload } from '../../services/batchJobPayload';
import { OptimizedThumbnail } from '../nodes/image-editor/OptimizedThumbnail';
import { BatchJobRecord } from '../../types';
import { BatchStatusBadge } from './TaskQueueBadges';
import { ViewingJsonlData } from './types';

interface BatchJobCardProps {
    job: BatchJobRecord;
    effectiveDeviceId: string;
    effectiveDeviceName?: string;
    isExpanded: boolean;
    onToggleExpand: (jobId: string) => void;
    isDownloadingZip: boolean;
    isChecking: boolean;
    isFetching: boolean;
    onNodeClick: (nodeId: string) => void;
    onDownloadZip: (job: BatchJobRecord) => void;
    onSendToImageInput: (job: BatchJobRecord) => void;
    onSendToNoteReferences: (job: BatchJobRecord) => void;
    onSendTo3DPrepare: (job: BatchJobRecord) => void;
    onDownloadSingleImage: (url: string, index: number, jobId: string) => void;
    onFetchResults: (jobId: string) => void;
    onCheckStatus: (jobId: string) => void;
    onCancelJob: (jobId: string) => void;
    onRetryJob?: (jobId: string) => void;
    onDeleteJob: (jobId: string) => void;
    onDownloadJsonl?: (jobId: string) => void;
    onViewJsonl: (data: ViewingJsonlData) => void;
    getBatchJobJsonl?: (jobId: string) => Promise<string | undefined>;
    setImageViewer?: (viewer: any) => void;
    addToast?: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    t: (key: string) => string;
}

export const BatchJobCard: React.FC<BatchJobCardProps> = ({
    job,
    effectiveDeviceId,
    effectiveDeviceName,
    isExpanded,
    onToggleExpand,
    isDownloadingZip,
    isChecking,
    isFetching,
    onNodeClick,
    onDownloadZip,
    onSendToImageInput,
    onSendToNoteReferences,
    onSendTo3DPrepare,
    onDownloadSingleImage,
    onFetchResults,
    onCheckStatus,
    onCancelJob,
    onRetryJob,
    onDeleteJob,
    onDownloadJsonl,
    onViewJsonl,
    getBatchJobJsonl,
    setImageViewer,
    addToast,
    t
}) => {
    const jobId = job.id || job.name;
    const [payload, setPayload] = useState<BatchJobRecord | null>(null);
    useEffect(() => {
        let cancelled = false;
        setPayload(null);
        if (isExpanded) void acquireBatchJobPayload(job).then(data => {
            if (!cancelled) setPayload(data);
        }).catch(error => { if (!cancelled) addToast?.(String(error), 'error'); });
        return () => { cancelled = true; };
    }, [isExpanded, job]);
    const jobItems = (isExpanded && payload ? payload.items : job.items) || [];
    const totalCount = jobItems.length || 0;
    const completedItems = jobItems.filter(it => !!it?.resultUrl);
    const hasImages = completedItems.length > 0 || (!!job.resultsCached && job.items.some(item => item.status === 'completed'));
    const completedCount = completedItems.length || (job.state === 'SUCCEEDED' ? totalCount : jobItems.filter(it => it?.status === 'completed')?.length || 0);
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (job.state === 'SUCCEEDED' ? 100 : 20);

    return (
        <div
            className={`p-3 rounded-lg bg-gray-900 border transition-all ${
                job.state === 'RUNNING'
                    ? 'border-gray-700 shadow-lg'
                    : job.state === 'PENDING'
                    ? 'border-yellow-700/50 shadow-md shadow-yellow-950/20'
                    : job.state === 'SUCCEEDED'
                    ? 'border-emerald-800/40'
                    : 'border-gray-800 opacity-80'
            }`}
        >
            {/* Job Header Row */}
            <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex flex-col truncate">
                    <div className="flex items-center gap-1.5 truncate">
                        {(job.state === 'RUNNING' || job.state === 'PENDING') && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-800 border border-gray-700 text-accent-secondary flex-shrink-0" title={t('batch.pinnedInProgress') || 'Закреплено: задача в процессе'}>
                                <span>📌</span>
                                <span>{t('batch.inProgress') || 'В процессе'}</span>
                            </span>
                        )}
                        <button
                            onClick={() => onNodeClick(job.nodeId)}
                            className="text-xs font-semibold text-accent-secondary hover:underline truncate text-left"
                            title={t('queue.click_to_go') || 'Click to jump to node'}
                        >
                            <span className="truncate">{job.displayName || job.nodeTitle || 'Batch Job'}</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-mono truncate">
                            ID: {job.name || jobId.slice(0, 16)}
                        </span>
                        {job.deviceId && (
                            <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono border ${
                                    job.deviceId === effectiveDeviceId
                                        ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-400'
                                        : 'bg-gray-800 border-gray-700 text-gray-400'
                                }`}
                                title={`Устройство: ${job.deviceId}`}
                            >
                                <span>📱</span>
                                <span>
                                    {job.deviceId === effectiveDeviceId
                                        ? (effectiveDeviceName ? `${effectiveDeviceName} (Этот ПК)` : `${job.deviceId} (Этот ПК)`)
                                        : job.deviceId}
                                </span>
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <BatchStatusBadge state={job.state} t={t} />
                    {job.resultsCached && <span className="text-[9px] text-emerald-400">{t('batch.cachedLocally')}</span>}
                </div>
            </div>

            {/* Progress Info */}
            <div className="space-y-1 my-2">
                <div className="flex justify-between text-[11px] text-gray-400">
                    <span>
                        {t('batch.jobs') || 'Items'}:{' '}
                        <span className="text-gray-200 font-mono">
                            {hasImages ? `${completedCount}/${totalCount}` : (job.state === 'SUCCEEDED' ? `${totalCount} ${t('batch.readyOnServer') || '(готов на сервере)'}` : `${completedCount}/${totalCount}`)}
                        </span>
                    </span>
                    <span className="truncate max-w-[140px] text-right font-mono text-[10px] text-gray-400">{job.model}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full transition-all duration-300 bg-accent-secondary"
                        style={{
                            width: `${progressPercent}%`
                        }}
                    />
                </div>
            </div>

            {job.error && (
                <div className="mt-2 p-2 rounded bg-red-950/60 border border-red-900/60 text-[11px] text-red-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {job.error}
                </div>
            )}

            {/* On-Demand "Download from Server" Button if SUCCEEDED but images not yet fetched */}
            {job.state === 'SUCCEEDED' && !hasImages && (
                <div className="mt-2.5 pt-2 border-t border-gray-800/60">
                    <button
                        onClick={() => onFetchResults(jobId)}
                        disabled={isFetching}
                        className="w-full py-1.5 px-3 rounded bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                        {isFetching ? (
                            <>
                                <svg className="animate-spin h-3.5 w-3.5 text-accent-secondary" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>{t('batch.fetchingResults') || 'Загрузка результатов...'}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>{t('batch.downloadFromServer') || 'Загрузить с сервера'}</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Batch Action Buttons (ZIP Download, Send to Image Input, Expand Gallery) */}
            {hasImages && (
                <div className="mt-2.5 pt-2 border-t border-gray-800/60 flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => onDownloadZip({ ...job, id: jobId, items: jobItems })}
                        disabled={isDownloadingZip}
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                        title={t('batch.downloadAllZip') || 'Скачать все изображения в ZIP'}
                    >
                        {isDownloadingZip ? (
                            <svg className="animate-spin h-3 w-3 text-accent-secondary" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        )}
                        <span>{isDownloadingZip ? (t('batch.preparingZip') || 'ZIP...') : (t('batch.downloadAllZip') || 'Скачать ZIP')}</span>
                    </button>

                    <button
                        onClick={() => onSendToImageInput({ ...job, id: jobId, items: jobItems })}
                        className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title={t('batch.sendToImageInput') || 'Отправить в узел Image Input (Batch mode)'}
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{t('batch.sendToImageInput') || 'В Image Input'}</span>
                    </button>

                    <button
                        onClick={() => onSendToNoteReferences({ ...job, id: jobId, items: jobItems })}
                        className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title={t('batch.sendToNoteRefTooltip') || 'Отправить сгенерированные изображения в референсы ноды Заметка'}
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{t('batch.sendToNoteRef') || 'В референсы Заметки'}</span>
                    </button>

                    <button
                        onClick={() => onSendTo3DPrepare({ ...job, id: jobId, items: jobItems })}
                        className="px-2 py-1 rounded bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title={t('batch.sendTo3DPrepareTooltip') || 'Отправить сгенерированные изображения во вход ноды 3D Batch Prepare'}
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>{t('batch.sendTo3DPrepare') || 'В 3D Prepare'}</span>
                    </button>

                    <button
                        onClick={() => onToggleExpand(jobId)}
                        className="ml-auto px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                        <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>
                            {isExpanded
                                ? (t('node.action.hideImages') || 'Скрыть')
                                : (t('batch.viewGeneratedImages') || 'Изображения ({count})').replace('{count}', String(completedCount))}
                        </span>
                    </button>
                </div>
            )}

            {/* Expandable Image Gallery */}
            {isExpanded && hasImages && (
                <div className="mt-2 p-2 bg-gray-950/80 rounded-md border border-gray-800/80 max-h-56 overflow-y-auto space-y-1.5">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                        {completedItems.map((item, idx) => {
                            const frameNum = item.frameIndex !== undefined ? item.frameIndex + 1 : idx + 1;
                            return (
                                <div
                                    key={item.id || `item-${idx}`}
                                    className="group relative aspect-square rounded bg-gray-900 border border-gray-750 overflow-hidden cursor-pointer hover:border-accent-secondary transition-all shadow-sm"
                                    onClick={() => setImageViewer?.({
                                        sources: completedItems.map((it, i) => ({
                                            src: it.resultUrl!,
                                            frameNumber: it.frameIndex !== undefined ? it.frameIndex + 1 : i + 1,
                                            prompt: it.prompt,
                                            model: job.model
                                        })),
                                        initialIndex: idx
                                    })}
                                    title={item.prompt || `Кадр #${frameNum}`}
                                >
                                    <OptimizedThumbnail size={128}
                                        src={item.resultUrl!}
                                        alt={`Batch Frame ${frameNum}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                    
                                    {/* Frame Badge */}
                                    <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/70 text-[9px] font-mono text-gray-200 backdrop-blur-xs">
                                        #{frameNum}
                                    </div>

                                    {/* Quick Single Download Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDownloadSingleImage(item.resultUrl!, idx, job.id);
                                            }}
                                            className="p-1 rounded-full bg-gray-900/90 text-gray-200 hover:text-white hover:bg-accent-secondary transition-colors shadow"
                                            title={t('node.action.download') || 'Скачать'}
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                                onClick={() => onCheckStatus(jobId)}
                                disabled={isChecking}
                                className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700 transition-colors flex items-center gap-1 text-[10px]"
                            >
                                {isChecking && (
                                    <svg className="animate-spin h-2.5 w-2.5 text-accent-secondary" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                <span>{t('batch.pollNow') || 'Check'}</span>
                            </button>
                            <button
                                onClick={() => onCancelJob(jobId)}
                                className="px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-900 text-red-200 transition-colors text-[10px]"
                            >
                                {t('queue.cancel') || 'Cancel'}
                            </button>
                        </>
                    )}

                    {job.state === 'FAILED' && onRetryJob && (
                        <button
                            onClick={() => onRetryJob(jobId)}
                            className="px-2 py-0.5 rounded bg-blue-900/50 hover:bg-blue-800 text-blue-200 transition-colors flex items-center gap-1 text-[10px]"
                            title={t('queue.retry') || 'Retry'}
                        >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>{t('queue.retry') || 'Retry'}</span>
                        </button>
                    )}

                    {/* Download / View JSONL button */}
                    <button
                        onClick={() => {
                            if (onDownloadJsonl) {
                                onDownloadJsonl(jobId);
                            }
                        }}
                        className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700 transition-colors flex items-center gap-1 text-[10px]"
                        title="Скачать JSONL файл этого запроса"
                    >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>JSONL</span>
                    </button>

                    <button
                        onClick={async () => {
                            let content: string | undefined;
                            try { content = getBatchJobJsonl ? await getBatchJobJsonl(jobId) : job.rawJsonl; }
                            catch (error) { addToast?.(String(error), 'error'); return; }
                            if (content) {
                                onViewJsonl({
                                    id: jobId,
                                    content,
                                    name: job.displayName || job.name || jobId
                                });
                            } else {
                                addToast?.('JSONL-файл не найден для этой задачи', 'info');
                            }
                        }}
                        className="px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors text-[10px]"
                        title="Просмотреть и скопировать строку JSONL"
                    >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>

                    <button
                        onClick={() => onDeleteJob(jobId)}
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
