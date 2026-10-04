import React from 'react';
import { BatchJobRecord } from '../../types';
import { BatchSortOrder, ViewingJsonlData } from './types';
import { BatchJobCard } from './BatchJobCard';
import { Tooltip } from '../Tooltip';

interface BatchTabProps {
    batchJobs: BatchJobRecord[];
    sortedBatchJobs: BatchJobRecord[];
    isBatchPolling: boolean;
    pollActiveBatchJobs: () => void;
    effectiveFilterMode: string;
    handleDeviceFilterChange: (mode: string) => void;
    effectiveDeviceId: string;
    effectiveDeviceName?: string;
    availableDeviceIds: string[];
    batchSortOrder: BatchSortOrder;
    setBatchSortOrder: React.Dispatch<React.SetStateAction<BatchSortOrder>>;
    clearFinishedBatchJobs?: () => void;
    expandedBatchJobIds: Record<string, boolean>;
    toggleExpandBatchJob: (jobId: string) => void;
    downloadingZipJobId: string | null;
    checkingJobId: string | null;
    fetchingJobIds?: Record<string, boolean>;
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
    getBatchJobJsonl?: (jobId: string) => string | undefined;
    setImageViewer?: (viewer: any) => void;
    addToast?: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    t: (key: string) => string;
}

export const BatchTab: React.FC<BatchTabProps> = ({
    batchJobs,
    sortedBatchJobs,
    isBatchPolling,
    pollActiveBatchJobs,
    effectiveFilterMode,
    handleDeviceFilterChange,
    effectiveDeviceId,
    effectiveDeviceName,
    availableDeviceIds,
    batchSortOrder,
    setBatchSortOrder,
    clearFinishedBatchJobs,
    expandedBatchJobIds,
    toggleExpandBatchJob,
    downloadingZipJobId,
    checkingJobId,
    fetchingJobIds,
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
    return (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950">
            <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-200">
                <div className="font-semibold flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-accent-secondary">
                        <span>⚡</span>
                        <span>{t('batch.title') || 'Gemini Batch API'}</span>
                    </div>
                    <button
                        onClick={() => pollActiveBatchJobs()}
                        disabled={isBatchPolling}
                        className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700 text-[10px] font-medium flex items-center gap-1 transition-colors"
                    >
                        <svg className={`w-3 h-3 ${isBatchPolling ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{isBatchPolling ? (t('batch.checking') || 'Checking...') : (t('batch.pollNow') || 'Poll Now')}</span>
                    </button>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                    {t('batch.modeDesc') || 'Batch requests are processed asynchronously within 24 hours at 50% discount. Results automatically populate your nodes upon completion.'}
                </p>
            </div>

            {batchJobs.length > 0 && (
                <div className="flex flex-col gap-2 p-1 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Device filter selector */}
                        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded px-2 py-1">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                <span>{t('batch.deviceFilter') || 'Устройство'}:</span>
                            </span>
                            <select
                                value={effectiveFilterMode}
                                onChange={(e) => handleDeviceFilterChange(e.target.value)}
                                className="bg-gray-950 border border-gray-700 text-gray-200 text-[11px] rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500"
                            >
                                <option value="current">
                                    {t('batch.currentDevice') || 'Это устройство'} ({effectiveDeviceName ? `${effectiveDeviceName} / ` : ''}{effectiveDeviceId})
                                </option>
                                <option value="all">
                                    {t('batch.allDevices') || 'Все устройства'} ({batchJobs.length})
                                </option>
                                {availableDeviceIds
                                    .filter(id => id !== effectiveDeviceId)
                                    .map(id => (
                                        <option key={id} value={id}>
                                            Устройство: {id}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Tooltip
                                content={batchSortOrder === 'desc' ? (t('batch.sortNewestDesc') || 'Сортировка: Самые новые вверху (В процессе закреплены)') : (t('batch.sortOldestDesc') || 'Сортировка: Сначала старые (В процессе закреплены)')}
                                position="bottom"
                                align="start"
                            >
                                <button
                                    onClick={() => setBatchSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white text-[11px] transition-colors"
                                    title={batchSortOrder === 'desc' ? (t('batch.sortNewestDesc') || 'Сортировка: Самые новые вверху (В процессе закреплены)') : (t('batch.sortOldestDesc') || 'Сортировка: Сначала старые (В процессе закреплены)')}
                                >
                                    <svg className="w-3.5 h-3.5 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                    </svg>
                                    <span className="font-semibold text-accent-secondary">
                                        {batchSortOrder === 'desc' ? (t('batch.sortNewest') || 'Новые') : (t('batch.sortOldest') || 'Старые')}
                                    </span>
                                </button>
                            </Tooltip>

                            {batchJobs.some(j => j.state === 'SUCCEEDED' || j.state === 'FAILED' || j.state === 'CANCELLED') && (
                                <button
                                    onClick={clearFinishedBatchJobs}
                                    className="text-[11px] text-gray-400 hover:text-gray-200 hover:underline transition-colors whitespace-nowrap"
                                >
                                    {t('batch.clearFinished') || 'Очистить'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {sortedBatchJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-center px-4">
                    <svg className="w-10 h-10 mb-2 opacity-30 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">{t('batch.noJobs') || 'No Batch API jobs submitted yet'}</p>
                    <p className="text-xs text-gray-600 mt-1">{t('batch.modeDesc') || 'Enable Batch API mode and generate images in AI Image Editor'}</p>
                </div>
            ) : (
                sortedBatchJobs.map(job => {
                    const jobId = job.id || job.name;
                    return (
                        <BatchJobCard
                            key={jobId}
                            job={job}
                            effectiveDeviceId={effectiveDeviceId}
                            effectiveDeviceName={effectiveDeviceName}
                            isExpanded={!!expandedBatchJobIds[jobId]}
                            onToggleExpand={toggleExpandBatchJob}
                            isDownloadingZip={downloadingZipJobId === jobId}
                            isChecking={checkingJobId === jobId}
                            isFetching={!!fetchingJobIds?.[jobId]}
                            onNodeClick={onNodeClick}
                            onDownloadZip={onDownloadZip}
                            onSendToImageInput={onSendToImageInput}
                            onSendToNoteReferences={onSendToNoteReferences}
                            onSendTo3DPrepare={onSendTo3DPrepare}
                            onDownloadSingleImage={onDownloadSingleImage}
                            onFetchResults={onFetchResults}
                            onCheckStatus={onCheckStatus}
                            onCancelJob={onCancelJob}
                            onRetryJob={onRetryJob}
                            onDeleteJob={onDeleteJob}
                            onDownloadJsonl={onDownloadJsonl}
                            onViewJsonl={onViewJsonl}
                            getBatchJobJsonl={getBatchJobJsonl}
                            setImageViewer={setImageViewer}
                            addToast={addToast}
                            t={t}
                        />
                    );
                })
            )}
        </div>
    );
};
