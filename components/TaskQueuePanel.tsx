import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import { useAppContext } from '../contexts/AppContext';
import { TaskStatus, BatchJobRecord, BatchJobState, NodeType } from '../types';
import { ImageBatchItem } from './nodes/image-input/types';
import { generateThumbnail } from '../utils/imageUtils';
import { CustomCheckbox } from './CustomCheckbox';

export const TaskQueuePanel: React.FC = () => {
    const context = useAppContext();
    if (!context) return null;

    const {
        tasks,
        isTaskQueuePanelOpen,
        setIsTaskQueuePanelOpen,
        setIsHistoryPanelOpen,
        cancelTask,
        retryTask,
        clearCompletedTasks,
        removeTask,
        selectNode,
        handleNavigateToNodeFrame,
        setImageViewer,
        setFullSizeImage,
        handleValueChange,
        isBatchMode,
        setIsBatchMode,
        restoreFinishedCards,
        setRestoreFinishedCards,
        restoreFailedCards,
        setRestoreFailedCards,
        batchJobs,
        checkBatchJob,
        fetchBatchJobResults,
        fetchingJobIds,
        cancelBatchJob,
        deleteBatchJob,
        clearFinishedBatchJobs,
        clearAllBatchJobs,
        pollActiveBatchJobs,
        isBatchPolling,
        onAddNode,
        viewTransform,
        addToast,
        t
    } = context;

    const [activeTab, setActiveTab] = useState<'queue' | 'batch'>('queue');
    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
    const [batchSortOrder, setBatchSortOrder] = useState<'desc' | 'asc'>('desc');
    const [checkingJobId, setCheckingJobId] = useState<string | null>(null);
    const [expandedBatchJobIds, setExpandedBatchJobIds] = useState<Record<string, boolean>>({});
    const [downloadingZipJobId, setDownloadingZipJobId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Sort batch jobs: In-progress (RUNNING or PENDING) are strictly PINNED on top.
    // Within groups, sorted by createdAt / updatedAt according to batchSortOrder ('desc' = newest first).
    const sortedBatchJobs = useMemo(() => {
        if (!Array.isArray(batchJobs)) return [];
        const safeJobs = batchJobs
            .filter(j => j && typeof j === 'object' && (j.id || j.name))
            .map(j => ({
                ...j,
                id: j.id || j.name,
                items: Array.isArray(j.items) ? j.items.filter(Boolean) : [],
                state: j.state || 'UNSPECIFIED'
            } as BatchJobRecord));
        return safeJobs.sort((a, b) => {
            const aInProgress = a.state === 'RUNNING' || a.state === 'PENDING';
            const bInProgress = b.state === 'RUNNING' || b.state === 'PENDING';

            // 1. Pinned on top: In-progress tasks ALWAYS come first
            if (aInProgress && !bInProgress) return -1;
            if (!aInProgress && bInProgress) return 1;

            // 2. Sort by date (newest first for 'desc')
            const aTime = a.createdAt || a.updatedAt || 0;
            const bTime = b.createdAt || b.updatedAt || 0;

            if (batchSortOrder === 'desc') {
                return bTime - aTime;
            } else {
                return aTime - bTime;
            }
        });
    }, [batchJobs, batchSortOrder]);

    const toggleExpandBatchJob = (jobId: string) => {
        setExpandedBatchJobIds(prev => ({ ...prev, [jobId]: !prev[jobId] }));
    };

    const handleDownloadSingleImage = (url: string, index: number, jobId: string) => {
        let ext = 'png';
        if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) ext = 'jpg';
        else if (url.startsWith('data:image/webp')) ext = 'webp';

        const filename = `Batch_${jobId.slice(-6)}_frame_${String(index + 1).padStart(3, '0')}.${ext}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadBatchZip = async (job: BatchJobRecord) => {
        const itemsWithImages = (job.items || []).filter(it => !!it.resultUrl);
        if (itemsWithImages.length === 0) {
            addToast?.(t('batch.noImages') || 'Нет сгенерированных изображений для скачивания', 'info');
            return;
        }

        setDownloadingZipJobId(job.id);
        try {
            const JSZipConstructor = (JSZip as any).default || JSZip;
            const zip = new JSZipConstructor();
            let addedCount = 0;

            for (let i = 0; i < itemsWithImages.length; i++) {
                const item = itemsWithImages[i];
                const src = item.resultUrl!;
                const frameNum = item.frameIndex !== undefined ? item.frameIndex + 1 : i + 1;
                const paddedFrame = String(frameNum).padStart(3, '0');
                
                let ext = 'png';
                if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) ext = 'jpg';
                else if (src.startsWith('data:image/webp')) ext = 'webp';

                const filename = `Batch_${(job.displayName || job.id).replace(/[^a-zA-Z0-9_-]/g, '_')}_frame_${paddedFrame}.${ext}`;

                try {
                    if (src.startsWith('data:')) {
                        const base64Data = src.split(',')[1];
                        zip.file(filename, base64Data, { base64: true });
                        addedCount++;
                    } else {
                        const res = await fetch(src);
                        const blob = await res.blob();
                        zip.file(filename, blob);
                        addedCount++;
                    }
                } catch (err) {
                    console.error(`Failed to pack image ${filename}:`, err);
                }
            }

            if (addedCount === 0) {
                addToast?.('Не удалось добавить изображения в архив', 'error');
                return;
            }

            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
            const dateStr = new Date().toISOString().split('T')[0];
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `Batch_${(job.displayName || job.id).replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStr}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            addToast?.(t('toast.downloadSuccess') || 'Архив ZIP успешно скачан!', 'success');
        } catch (e: any) {
            console.error('Error generating Batch ZIP:', e);
            addToast?.(`Ошибка скачивания архива: ${e?.message || e}`, 'error');
        } finally {
            setDownloadingZipJobId(null);
        }
    };

    const handleSendToBatchInput = async (job: BatchJobRecord) => {
        const itemsWithImages = (job.items || []).filter(it => !!it.resultUrl);
        if (itemsWithImages.length === 0) {
            addToast?.(t('batch.noImages') || 'Нет сгенерированных изображений для отправки', 'info');
            return;
        }

        const batchFiles: ImageBatchItem[] = itemsWithImages.map((it, idx) => {
            const frameNum = it.frameIndex !== undefined ? it.frameIndex + 1 : idx + 1;
            const paddedFrame = String(frameNum).padStart(3, '0');
            return {
                id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                name: `Batch_Frame_${paddedFrame}.png`,
                dataUrl: it.resultUrl!
            };
        });

        const firstImage = batchFiles[0]?.dataUrl || null;
        let thumb = firstImage;
        if (firstImage) {
            try {
                thumb = await generateThumbnail(firstImage, 256, 256);
            } catch { }
        }

        const initialValue = JSON.stringify({
            image: thumb,
            mode: 'batch',
            batchFiles: batchFiles,
            batchConfig: {
                subMode: 'grid',
                includeOriginal: false
            },
            grid: {
                cols: 2,
                rows: 2,
                bounds: { x: 0, y: 0, width: 1, height: 1 }
            }
        });

        // Calculate canvas center point
        const scale = viewTransform?.scale || 1;
        const centerPos = {
            x: (- (viewTransform?.translate?.x || 0) + window.innerWidth / 2) / scale,
            y: (- (viewTransform?.translate?.y || 0) + window.innerHeight / 2) / scale
        };

        if (onAddNode) {
            const newNodeId = onAddNode(
                NodeType.IMAGE_INPUT,
                centerPos,
                `${job.displayName || 'Batch'} - Input`,
                { centerNode: true, initialValue }
            );

            if (handleValueChange && newNodeId) {
                handleValueChange(newNodeId, initialValue);
            }

            if (setFullSizeImage && newNodeId) {
                batchFiles.forEach((file, idx) => {
                    setFullSizeImage(newNodeId, idx, file.dataUrl);
                });
            }

            if (newNodeId) {
                if (selectNode) selectNode(newNodeId);
                if (handleNavigateToNodeFrame) handleNavigateToNodeFrame(newNodeId, 0);
            }

            const msg = (t('batch.sendToImageInputToast') || 'Создан узел Image Input с {count} изображениями из пакета')
                .replace('{count}', String(batchFiles.length));
            addToast?.(msg, 'success');
        }
    };

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

    const activeBatchJobsCount = (batchJobs || []).filter(j => j && (j.state === 'RUNNING' || j.state === 'PENDING')).length;

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
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-sm z-10 sticky top-0 select-none">
                <div className="flex items-center gap-2 select-none">
                    <div className={`w-2.5 h-2.5 rounded-full ${isBatchMode ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400 animate-pulse'}`}></div>
                    <h2 className="text-gray-100 font-semibold text-base flex items-center gap-1.5">
                        <span>{t('queue.title') || 'Task Queue & Batch'}</span>
                    </h2>
                    <button
                        onClick={() => setIsSettingsOpen(prev => !prev)}
                        className={`p-1 rounded-md transition-colors ${
                            isSettingsOpen 
                                ? 'text-amber-300 bg-gray-800 ring-1 ring-amber-500/50' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
                        }`}
                        title={t('queue.settings') || 'Settings'}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-1.5 select-none">
                    <button
                        onClick={() => {
                            setIsTaskQueuePanelOpen(false);
                            setIsHistoryPanelOpen?.(true);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-md transition-colors flex items-center gap-1.5"
                        title={t('ui.to_history') || 'To History'}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{t('ui.to_history') || 'To History'}</span>
                    </button>

                    <button
                        onClick={() => setIsTaskQueuePanelOpen(false)}
                        className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Settings Dropdown Panel */}
            {isSettingsOpen && (
                <div className="p-3.5 border-b border-gray-800 bg-gray-900 shadow-inner flex flex-col gap-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                            </svg>
                            <span>{t('queue.settings') || 'Настройки очереди и пакетов'}</span>
                        </span>
                        <button
                            onClick={() => setIsSettingsOpen(false)}
                            className="text-gray-400 hover:text-white text-xs px-1 rounded hover:bg-gray-800"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Restore Cards Options */}
                    <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-gray-950/70 border border-gray-800/80">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                            <CustomCheckbox
                                checked={restoreFinishedCards ?? true}
                                onChange={(val) => setRestoreFinishedCards?.(val)}
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors">
                                    {t('queue.restoreFinishedCards') || 'Restore finished cards'}
                                </span>
                                <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                                    {t('queue.restoreFinishedCardsDesc') || 'При проверке статуса переносит готовые изображения в карточки на холсте'}
                                </span>
                            </div>
                        </label>

                        <div className="border-t border-gray-800/60 my-0.5"></div>

                        <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                            <CustomCheckbox
                                checked={restoreFailedCards ?? true}
                                onChange={(val) => setRestoreFailedCards?.(val)}
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors">
                                    {t('queue.restoreFailedCards') || 'Restore failed cards'}
                                </span>
                                <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                                    {t('queue.restoreFailedCardsDesc') || 'При ошибке генерации переводит карточки на холсте в состояние ошибки'}
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className="flex flex-col gap-2">
                        {/* Clear all Batch jobs button */}
                        <button
                            onClick={() => {
                                const confirmMsg = t('batch.confirmClearAll') || 'Вы уверены, что хотите удалить ВСЕ Batch задачи? Это действие необратимо.';
                                if (window.confirm(confirmMsg)) {
                                    clearAllBatchJobs?.();
                                    setIsSettingsOpen(false);
                                }
                            }}
                            className="w-full py-2 px-3 bg-red-950/60 hover:bg-red-900/80 border border-red-800/70 text-red-200 hover:text-white rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
                            title={t('batch.clearAllBatchJobsDesc') || 'Удаляет все пакетные задачи из памяти и локального хранилища'}
                        >
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>{t('batch.clearAllBatchJobs') || 'Очистить все Batch jobs'}</span>
                        </button>

                        {tasks.length > 0 && (
                            <button
                                onClick={() => {
                                    clearCompletedTasks?.();
                                    setIsSettingsOpen(false);
                                }}
                                className="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <span>{t('queue.clearCompleted') || 'Очистить завершенные задачи'}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Centralized Mode Switcher Banner */}
            <div className="p-3 bg-gray-950 border-b border-gray-800 select-none">
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
            <div className="flex border-b border-gray-800 bg-gray-950/80 px-2 pt-1 gap-1 select-none">
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === 'queue'
                            ? 'border-accent text-white bg-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                    }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>{t('queue.title') || 'Queue'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
                        {tasks.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('batch')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === 'batch'
                            ? 'border-accent text-white bg-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                    }`}
                >
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>{t('batch.panelTitle') || 'Batch Jobs'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
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
                                            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:underline truncate text-left flex items-center gap-1.5 flex-wrap"
                                            title={t('queue.click_to_go') || 'Click to jump to node'}
                                        >
                                            <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                            </svg>
                                            <span className="truncate">{task.nodeTitle || 'Image Editor'}</span>
                                            {task.frameIndex !== undefined && !task.isBatch && (
                                                <span className="px-1.5 py-0.2 bg-gray-800 text-gray-300 rounded font-mono text-[10px]">
                                                    #{task.frameIndex + 1}
                                                </span>
                                            )}
                                            {task.isBatch && (
                                                <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold text-[10px] uppercase flex items-center gap-1">
                                                    <span>Batch API</span>
                                                    {task.itemCount && task.itemCount > 1 && (
                                                        <span className="opacity-90 font-normal">({task.itemCount})</span>
                                                    )}
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

                    {batchJobs.length > 0 && (
                        <div className="flex items-center justify-between gap-2 px-1 text-xs">
                            <button
                                onClick={() => setBatchSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white text-[11px] transition-colors"
                                title={batchSortOrder === 'desc' ? (t('batch.sortNewestDesc') || 'Сортировка: Самые новые вверху (В процессе закреплены)') : (t('batch.sortOldestDesc') || 'Сортировка: Сначала старые (В процессе закреплены)')}
                            >
                                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                </svg>
                                <span>{t('batch.sortByDate') || 'Сортировка по дате'}:</span>
                                <span className="font-semibold text-amber-300">
                                    {batchSortOrder === 'desc' ? (t('batch.sortNewest') || 'Новые вверху') : (t('batch.sortOldest') || 'Старые вверху')}
                                </span>
                            </button>

                            {batchJobs.some(j => j.state === 'SUCCEEDED' || j.state === 'FAILED' || j.state === 'CANCELLED') && (
                                <button
                                    onClick={clearFinishedBatchJobs}
                                    className="text-[11px] text-gray-400 hover:text-gray-200 hover:underline transition-colors"
                                >
                                    {t('batch.clearFinished') || 'Очистить завершенные'}
                                </button>
                            )}
                        </div>
                    )}

                    {sortedBatchJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-center px-4">
                            <svg className="w-10 h-10 mb-2 opacity-30 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm">{t('batch.noJobs') || 'No Batch API jobs submitted yet'}</p>
                            <p className="text-xs text-gray-600 mt-1">{t('batch.modeDesc') || 'Enable Batch API mode and generate images in AI Image Editor'}</p>
                        </div>
                    ) : (
                        sortedBatchJobs.map(job => {
                            const jobId = job.id || job.name;
                            const jobItems = Array.isArray(job.items) ? job.items : [];
                            const totalCount = jobItems.length || 0;
                            const completedItems = jobItems.filter(it => !!it?.resultUrl);
                            const hasImages = completedItems.length > 0;
                            const isFetchingThisJob = !!fetchingJobIds?.[jobId];
                            const completedCount = completedItems.length || (job.state === 'SUCCEEDED' ? totalCount : jobItems.filter(it => it?.status === 'completed')?.length || 0);
                            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : (job.state === 'SUCCEEDED' ? 100 : 20);
                            const isExpanded = !!expandedBatchJobIds[jobId];
                            const isDownloadingThisZip = downloadingZipJobId === jobId;

                            return (
                                <div
                                    key={jobId}
                                    className={`p-3 rounded-lg bg-gray-900 border transition-all ${
                                        job.state === 'RUNNING'
                                            ? 'border-amber-600/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
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
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-950/80 border border-amber-800/80 text-amber-300 flex-shrink-0" title={t('batch.pinnedInProgress') || 'Закреплено: задача в процессе'}>
                                                        <span>📌</span>
                                                        <span>{t('batch.inProgress') || 'В процессе'}</span>
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleNodeClick(job.nodeId)}
                                                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 hover:underline truncate text-left"
                                                    title={t('queue.click_to_go') || 'Click to jump to node'}
                                                >
                                                    <span className="truncate">{job.displayName || job.nodeTitle || 'Batch Job'}</span>
                                                </button>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-mono truncate">
                                                ID: {job.name || jobId.slice(0, 16)}
                                            </span>
                                        </div>
                                        <div>{getBatchStatusBadge(job.state)}</div>
                                    </div>

                                    {/* Progress Info */}
                                    <div className="space-y-1 my-2">
                                        <div className="flex justify-between text-[11px] text-gray-400">
                                            <span>
                                                {t('batch.jobs') || 'Items'}:{' '}
                                                <span className="text-gray-200 font-mono">
                                                    {hasImages ? `${completedItems.length}/${totalCount}` : (job.state === 'SUCCEEDED' ? `${totalCount} ${t('batch.readyOnServer') || '(готов на сервере)'}` : `${completedCount}/${totalCount}`)}
                                                </span>
                                            </span>
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

                                    {/* On-Demand "Download from Server" Button if SUCCEEDED but images not yet fetched */}
                                    {job.state === 'SUCCEEDED' && !hasImages && (
                                        <div className="mt-2.5 pt-2 border-t border-gray-800/60">
                                            <button
                                                onClick={() => fetchBatchJobResults(jobId)}
                                                disabled={isFetchingThisJob}
                                                className="w-full py-1.5 px-3 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                                            >
                                                {isFetchingThisJob ? (
                                                    <>
                                                        <svg className="animate-spin h-3.5 w-3.5 text-emerald-300" viewBox="0 0 24 24">
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
                                                onClick={() => handleDownloadBatchZip({ ...job, id: jobId, items: jobItems })}
                                                disabled={isDownloadingThisZip}
                                                className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                                                title={t('batch.downloadAllZip') || 'Скачать все изображения в ZIP'}
                                            >
                                                {isDownloadingThisZip ? (
                                                    <svg className="animate-spin h-3 w-3 text-amber-300" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                )}
                                                <span>{isDownloadingThisZip ? (t('batch.preparingZip') || 'ZIP...') : (t('batch.downloadAllZip') || 'Скачать ZIP')}</span>
                                            </button>

                                            <button
                                                onClick={() => handleSendToBatchInput({ ...job, id: jobId, items: jobItems })}
                                                className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                                title={t('batch.sendToImageInput') || 'Отправить в узел Image Input (Batch mode)'}
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>{t('batch.sendToImageInput') || 'В Image Input'}</span>
                                            </button>

                                            <button
                                                onClick={() => toggleExpandBatchJob(jobId)}
                                                className="ml-auto px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                            >
                                                <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                                <span>
                                                    {isExpanded
                                                        ? (t('node.action.hideImages') || 'Скрыть')
                                                        : (t('batch.viewGeneratedImages') || 'Изображения ({count})').replace('{count}', String(completedItems.length))}
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
                                                            className="group relative aspect-square rounded bg-gray-900 border border-gray-700/60 overflow-hidden cursor-pointer hover:border-amber-500/80 transition-all shadow-sm"
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
                                                            <img
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
                                                                        handleDownloadSingleImage(item.resultUrl!, idx, job.id);
                                                                    }}
                                                                    className="p-1 rounded-full bg-gray-900/90 text-gray-200 hover:text-white hover:bg-amber-600 transition-colors shadow"
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
                                                        onClick={() => handleCheckBatchStatus(jobId)}
                                                        disabled={checkingJobId === jobId}
                                                        className="px-2 py-0.5 rounded bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 transition-colors flex items-center gap-1 text-[10px]"
                                                    >
                                                        {checkingJobId === jobId && (
                                                            <svg className="animate-spin h-2.5 w-2.5 text-amber-300" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                        )}
                                                        <span>{t('batch.pollNow') || 'Check'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => cancelBatchJob(jobId)}
                                                        className="px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-900 text-red-200 transition-colors text-[10px]"
                                                    >
                                                        {t('queue.cancel') || 'Cancel'}
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                onClick={() => deleteBatchJob(jobId)}
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

