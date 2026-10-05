import React, { useState, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { useAppContext } from '../contexts/AppContext';
import { BatchJobRecord, NodeType } from '../types';
import { ImageBatchItem } from './nodes/image-input/types';
import { generateThumbnail } from '../utils/imageUtils';
import { 
    matchesDeviceFilter, 
    getDeviceId, 
    getDeviceName, 
    setDeviceId as fallbackSetDeviceId, 
    setDeviceName as fallbackSetDeviceName, 
    regenerateDeviceId as fallbackRegenerateDeviceId, 
    isDeviceIsolationEnabled, 
    setDeviceIsolationEnabled as fallbackSetDeviceIsolationEnabled, 
    getDeviceFilterMode, 
    setDeviceFilterMode as fallbackSetDeviceFilterMode 
} from '../utils/deviceId';
import { 
    getTripoRecentTasks, 
    removeTripoRecentTask, 
    fetchTripoRecentTasks, 
    importTripoTaskById,
    queryTripoTasksBatch,
    parseTaskJsonFiles,
    exportAllTasksToJson,
    downloadTaskMetadataJson,
    TripoRecentTask, 
    TRIPO_TASKS_CHANGE_EVENT 
} from '../services/tripoService';
import { useTripoBalance } from '../hooks/useTripoBalance';
import { 
    ThreeDBatchJob,
    getStored3DBatchJobs,
    deleteStored3DBatchJob,
    downloadAllBatch3DModelsZip,
    downloadAllBatchMetadataJsonZip,
    THREED_BATCH_CHANGE_EVENT
} from '../services/tripoBatchService';

import { 
    TaskQueueTab, 
    QueueFilter, 
    QueueTypeFilter, 
    ThreedStatusFilter, 
    BatchSortOrder, 
    ViewingJsonlData 
} from './task-queue/types';
import { TaskQueueHeader } from './task-queue/TaskQueueHeader';
import { TaskQueueSettings } from './task-queue/TaskQueueSettings';
import { QueueTab } from './task-queue/QueueTab';
import { BatchTab } from './task-queue/BatchTab';
import { Tripo3DTab } from './task-queue/Tripo3DTab';
import { JsonlInspectorModal } from './task-queue/JsonlInspectorModal';
import { BatchPasteIdsModal } from './task-queue/BatchPasteIdsModal';

export const TaskQueuePanel: React.FC = () => {
    const context = useAppContext();
    if (!context) return null;

    const {
        nodes,
        selectedNodeIds,
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
        autoDownloadFromServer,
        setAutoDownloadFromServer,
        clearUnusedBatchCache,
        isCleaningBatchCache,
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
        retryBatchJob,
        clearFinishedBatchJobs,
        clearAllBatchJobs,
        getBatchJobJsonl,
        downloadBatchJsonl,
        pollActiveBatchJobs,
        isBatchPolling,
        onAddNode,
        viewTransform,
        addToast,
        deviceId,
        deviceName,
        setDeviceId: contextSetDeviceId,
        setDeviceName: contextSetDeviceName,
        regenerateDeviceId: contextRegenerateDeviceId,
        deviceIsolationEnabled,
        setDeviceIsolationEnabled: contextSetDeviceIsolationEnabled,
        deviceFilterMode,
        setDeviceFilterMode: contextSetDeviceFilterMode,
        t
    } = context;

    const [activeTab, setActiveTab] = useState<TaskQueueTab>('queue');
    const [filter, setFilter] = useState<QueueFilter>('all');
    const [queueTypeFilter, setQueueTypeFilter] = useState<QueueTypeFilter>('all');
    const [threedStatusFilter, setThreedStatusFilter] = useState<ThreedStatusFilter>('all');
    const [fetchingTasksLimit, setFetchingTasksLimit] = useState<number | null>(null);
    const [recent3dTasks, setRecent3dTasks] = useState<TripoRecentTask[]>(() => getTripoRecentTasks());
    const [manualTaskId, setManualTaskId] = useState('');
    const [isImportingTaskId, setIsImportingTaskId] = useState(false);
    const [showManualImport, setShowManualImport] = useState(false);
    const [showBatchPasteModal, setShowBatchPasteModal] = useState(false);
    const [batchPasteText, setBatchPasteText] = useState('');
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const { balance: tripoBalance, loading: isTripoBalanceLoading, refreshBalance: refreshTripoBalance } = useTripoBalance();

    const [batchSortOrder, setBatchSortOrder] = useState<BatchSortOrder>('desc');
    const [checkingJobId, setCheckingJobId] = useState<string | null>(null);
    const [expandedBatchJobIds, setExpandedBatchJobIds] = useState<Record<string, boolean>>({});
    const [downloadingZipJobId, setDownloadingZipJobId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [viewingJsonl, setViewingJsonl] = useState<ViewingJsonlData | null>(null);
    const [threeDBatchJobs, setThreeDBatchJobs] = useState<ThreeDBatchJob[]>(() => getStored3DBatchJobs());
    const [expanded3DBatchIds, setExpanded3DBatchIds] = useState<Record<string, boolean>>({});
    const [downloading3DZipId, setDownloading3DZipId] = useState<string | null>(null);

    // Sync recent 3D tasks with event updates
    useEffect(() => {
        const handleTasksUpdate = (e: any) => {
            if (Array.isArray(e.detail)) {
                setRecent3dTasks(e.detail);
            } else {
                setRecent3dTasks(getTripoRecentTasks());
            }
        };
        window.addEventListener(TRIPO_TASKS_CHANGE_EVENT, handleTasksUpdate);
        return () => window.removeEventListener(TRIPO_TASKS_CHANGE_EVENT, handleTasksUpdate);
    }, []);

    // Sync 3D batch jobs with event updates
    useEffect(() => {
        const handle3DBatchUpdate = (e: any) => {
            if (Array.isArray(e.detail)) {
                setThreeDBatchJobs(e.detail);
            } else {
                setThreeDBatchJobs(getStored3DBatchJobs());
            }
        };
        window.addEventListener(THREED_BATCH_CHANGE_EVENT, handle3DBatchUpdate);
        return () => window.removeEventListener(THREED_BATCH_CHANGE_EVENT, handle3DBatchUpdate);
    }, []);

    const effectiveDeviceId = deviceId || getDeviceId();
    const effectiveDeviceName = deviceName ?? getDeviceName();
    const effectiveIsolationEnabled = deviceIsolationEnabled ?? isDeviceIsolationEnabled();
    const effectiveFilterMode = deviceFilterMode || getDeviceFilterMode();

    const handleToggleIsolation = (val: boolean) => {
        if (contextSetDeviceIsolationEnabled) {
            contextSetDeviceIsolationEnabled(val);
        } else {
            fallbackSetDeviceIsolationEnabled(val);
        }
    };

    const handleDeviceNameChange = (val: string) => {
        if (contextSetDeviceName) {
            contextSetDeviceName(val);
        } else {
            fallbackSetDeviceName(val);
        }
    };

    const handleRegenerateId = () => {
        let newId: string;
        if (contextRegenerateDeviceId) {
            newId = contextRegenerateDeviceId();
        } else {
            newId = fallbackRegenerateDeviceId();
        }
        if (addToast) {
            addToast(`Новый Device ID: ${newId}`, 'success');
        }
    };

    const handleDeviceFilterChange = (mode: string) => {
        if (contextSetDeviceFilterMode) {
            contextSetDeviceFilterMode(mode);
        } else {
            fallbackSetDeviceFilterMode(mode);
        }
    };

    const availableDeviceIds = useMemo(() => {
        if (!Array.isArray(batchJobs)) return [];
        const set = new Set<string>();
        batchJobs.forEach(j => {
            if (j && j.deviceId && typeof j.deviceId === 'string') {
                set.add(j.deviceId);
            }
        });
        return Array.from(set);
    }, [batchJobs]);

    // Listen for custom open-task-queue event to select the specific tab (queue, batch, or threed)
    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail?.tab && (e.detail.tab === 'queue' || e.detail.tab === 'batch' || e.detail.tab === 'threed')) {
                setActiveTab(e.detail.tab);
            }
        };
        window.addEventListener('open-task-queue', handler);
        return () => window.removeEventListener('open-task-queue', handler);
    }, []);

    // Sort batch jobs: In-progress (RUNNING or PENDING) are strictly PINNED on top.
    const sortedBatchJobs = useMemo(() => {
        if (!Array.isArray(batchJobs)) return [];
        const safeJobs = batchJobs
            .filter(j => j && typeof j === 'object' && (j.id || j.name))
            .filter(j => {
                if (effectiveIsolationEnabled) {
                    if (j.deviceId && j.deviceId !== effectiveDeviceId) return false;
                    return true;
                }
                return matchesDeviceFilter(j.deviceId, effectiveDeviceId, effectiveFilterMode);
            })
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
    }, [batchJobs, batchSortOrder, effectiveDeviceId, effectiveIsolationEnabled, effectiveFilterMode]);

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

    const handleSendToNoteReferences = async (job: BatchJobRecord) => {
        const itemsWithImages = (job.items || []).filter(it => !!it.resultUrl);
        if (itemsWithImages.length === 0) {
            addToast?.(t('batch.noImages') || 'Нет сгенерированных изображений для отправки', 'info');
            return;
        }

        // Find target Note node (prefer currently selected Note node, or first existing Note node)
        const noteNodes = (nodes || []).filter(n => n.type === NodeType.NOTE);
        const selectedNoteNode = noteNodes.find(n => (selectedNodeIds || []).includes(n.id));
        const targetNoteNode = selectedNoteNode || noteNodes[0];

        const newRefItems = await Promise.all(itemsWithImages.map(async (it, idx) => {
            const frameNum = it.frameIndex !== undefined ? it.frameIndex + 1 : idx + 1;
            let thumb = it.resultUrl!;
            try {
                thumb = await generateThumbnail(it.resultUrl!, 128, 128);
            } catch {}
            return {
                id: `ref-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                image: thumb,
                fullImage: it.resultUrl!,
                caption: it.prompt || `Batch #${frameNum}`
            };
        }));

        if (targetNoteNode) {
            let existingData: any = { text: '', references: [], activeTab: 'reference', isMinimal: false, style: {} };
            try {
                const parsed = JSON.parse(targetNoteNode.value || '{}');
                if (typeof parsed === 'object' && parsed !== null) {
                    existingData = {
                        ...existingData,
                        ...parsed,
                        references: Array.isArray(parsed.references) ? parsed.references : []
                    };
                }
            } catch { }

            const cleanRefItems = newRefItems.map(({ fullImage, ...r }) => r);
            const updatedReferences = [...existingData.references, ...cleanRefItems];
            const updatedValue = JSON.stringify({
                ...existingData,
                references: updatedReferences,
                activeTab: 'reference'
            });

            if (handleValueChange) {
                handleValueChange(targetNoteNode.id, updatedValue);
            }

            if (setFullSizeImage) {
                const startIndex = existingData.references.length;
                newRefItems.forEach((ref, idx) => {
                    if (ref.fullImage) {
                        setFullSizeImage(targetNoteNode.id, startIndex + idx, ref.fullImage);
                    }
                });
            }

            if (selectNode) selectNode(targetNoteNode.id);
            if (handleNavigateToNodeFrame) handleNavigateToNodeFrame(targetNoteNode.id, 0);

            const msg = `Добавлено ${newRefItems.length} изображений в референсы узла "${targetNoteNode.title || 'Заметка'}"`;
            addToast?.(msg, 'success');
        } else {
            const cleanRefItems = newRefItems.map(({ fullImage, ...r }) => r);
            const initialValue = JSON.stringify({
                text: '',
                references: cleanRefItems,
                activeTab: 'reference',
                isMinimal: false,
                style: {
                    fontSize: 14,
                    color: '#ffffff',
                    isBold: false,
                    isItalic: false,
                    textAlign: 'left'
                }
            });

            const scale = viewTransform?.scale || 1;
            const centerPos = {
                x: (- (viewTransform?.translate?.x || 0) + window.innerWidth / 2) / scale,
                y: (- (viewTransform?.translate?.y || 0) + window.innerHeight / 2) / scale
            };

            if (onAddNode) {
                const newNodeId = onAddNode(
                    NodeType.NOTE,
                    centerPos,
                    `${job.displayName || 'Batch'} - Референсы`,
                    { centerNode: true, initialValue }
                );

                if (handleValueChange && newNodeId) {
                    handleValueChange(newNodeId, initialValue);
                }

                if (setFullSizeImage && newNodeId) {
                    newRefItems.forEach((ref, idx) => {
                        if (ref.fullImage) {
                            setFullSizeImage(newNodeId, idx, ref.fullImage);
                        }
                    });
                }

                if (newNodeId) {
                    if (selectNode) selectNode(newNodeId);
                    if (handleNavigateToNodeFrame) handleNavigateToNodeFrame(newNodeId, 0);
                }

                const msg = `Создан узел Заметка с ${newRefItems.length} референсами из пакета`;
                addToast?.(msg, 'success');
            }
        }
    };

    const handleSendTo3DBatchPrepare = async (job: BatchJobRecord) => {
        const itemsWithImages = (job.items || []).filter(it => !!it.resultUrl);
        if (itemsWithImages.length === 0) {
            addToast?.(t('batch.noImages') || 'Нет сгенерированных изображений для отправки', 'info');
            return;
        }

        const newImageUrls = itemsWithImages.map(it => it.resultUrl!);

        const batchPrepNodes = (nodes || []).filter(n => n.type === NodeType.BATCH_PREPARE);
        const selectedBatchPrepNode = batchPrepNodes.find(n => (selectedNodeIds || []).includes(n.id));
        const targetBatchPrepNode = selectedBatchPrepNode || batchPrepNodes[0];

        if (targetBatchPrepNode) {
            let existingState: any = {
                inputImages: [],
                selectedInputIndex: 0,
                gridConfig: { preset: '1x4', cols: 4, rows: 1, borderWidth: 0, borderMode: 'inner', enableBorder: false, bounds: { x: 0, y: 0, width: 1, height: 1 }, customDividers: true },
                slicedImages: [],
                selectedSliceIndex: null,
                activeViews: { front: null, back: null, left: null, right: null },
                mutedViews: { front: false, back: false, left: false, right: false },
                autoSendToViews: true,
                activePackId: null,
                packs: []
            };

            try {
                const parsed = JSON.parse(targetBatchPrepNode.value || '{}');
                if (typeof parsed === 'object' && parsed !== null) {
                    existingState = {
                        ...existingState,
                        ...parsed,
                        inputImages: Array.isArray(parsed.inputImages) ? parsed.inputImages : []
                    };
                }
            } catch { }

            const updatedInputImages = [...newImageUrls, ...existingState.inputImages];
            const updatedValue = JSON.stringify({
                ...existingState,
                inputImages: updatedInputImages,
                selectedInputIndex: 0
            });

            if (handleValueChange) {
                handleValueChange(targetBatchPrepNode.id, updatedValue);
            }

            if (selectNode) selectNode(targetBatchPrepNode.id);
            if (handleNavigateToNodeFrame) handleNavigateToNodeFrame(targetBatchPrepNode.id, 0);

            const msg = `Добавлено ${newImageUrls.length} изображений во вход узла "${targetBatchPrepNode.title || '3D Batch Prepare'}"`;
            addToast?.(msg, 'success');
        } else {
            const initialValue = JSON.stringify({
                inputImages: newImageUrls,
                selectedInputIndex: 0,
                gridConfig: {
                    preset: '1x4',
                    cols: 4,
                    rows: 1,
                    borderWidth: 0,
                    borderMode: 'inner',
                    enableBorder: false,
                    bounds: { x: 0, y: 0, width: 1, height: 1 },
                    customDividers: true
                },
                slicedImages: [],
                selectedSliceIndex: null,
                activeViews: {
                    front: newImageUrls[0] || null,
                    back: newImageUrls[1] || null,
                    left: newImageUrls[2] || null,
                    right: newImageUrls[3] || null
                },
                mutedViews: {
                    front: false,
                    back: false,
                    left: false,
                    right: false
                },
                autoSendToViews: true,
                activePackId: null,
                packs: []
            });

            const scale = viewTransform?.scale || 1;
            const centerPos = {
                x: (- (viewTransform?.translate?.x || 0) + window.innerWidth / 2) / scale,
                y: (- (viewTransform?.translate?.y || 0) + window.innerHeight / 2) / scale
            };

            if (onAddNode) {
                const newNodeId = onAddNode(
                    NodeType.BATCH_PREPARE,
                    centerPos,
                    `${job.displayName || 'Batch'} - 3D Prepare`,
                    { centerNode: true, initialValue }
                );

                if (handleValueChange && newNodeId) {
                    handleValueChange(newNodeId, initialValue);
                }

                if (newNodeId) {
                    if (selectNode) selectNode(newNodeId);
                    if (handleNavigateToNodeFrame) handleNavigateToNodeFrame(newNodeId, 0);
                }

                const msg = `Создан узел 3D Batch Prepare с ${newImageUrls.length} изображениями на входе`;
                addToast?.(msg, 'success');
            }
        }
    };

    const handleFetchRecentGenerations = async (limit: number) => {
        setFetchingTasksLimit(limit);
        try {
            const list = await fetchTripoRecentTasks(limit);
            setRecent3dTasks(list);
            if (list.length > 0) {
                addToast?.(`Загружено ${list.length} недавних 3D генераций`, 'success');
            } else {
                addToast?.(`В локальном журнале пока нет 3D генераций. Создайте модель в узле 3D Generation или импортируйте по Task ID`, 'info');
            }
        } catch (err: any) {
            addToast?.(`Ошибка загрузки генераций: ${err?.message || err}`, 'error');
        } finally {
            setFetchingTasksLimit(null);
        }
    };

    const handleImportTask = async (customId?: string) => {
        const id = (customId || manualTaskId).trim();
        if (!id) return;
        setIsImportingTaskId(true);
        try {
            const task = await importTripoTaskById(id);
            if (task) {
                setRecent3dTasks(getTripoRecentTasks());
                if (!customId) {
                    setManualTaskId('');
                    setShowManualImport(false);
                }
                addToast?.(`3D модель с Task ID "${id.slice(0, 12)}..." успешно импортирована!`, 'success');
            }
        } catch (err: any) {
            addToast?.(`Ошибка импорта Task ID: ${err?.message || err}`, 'error');
        } finally {
            setIsImportingTaskId(false);
        }
    };

    const handleUploadSingleJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsBatchProcessing(true);
        try {
            const results = await parseTaskJsonFiles([file]);
            setRecent3dTasks(getTripoRecentTasks());
            if (results.length > 0) {
                addToast?.(`JSON файл задачи "${file.name}" загружен! Получено моделей: ${results.length}`, 'success');
            } else {
                addToast?.(`В файле "${file.name}" не обнаружен task_id`, 'error');
            }
        } catch (err: any) {
            addToast?.(`Ошибка чтения JSON: ${err?.message || err}`, 'error');
        } finally {
            setIsBatchProcessing(false);
            e.target.value = '';
        }
    };

    const handleUploadBatchJsons = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsBatchProcessing(true);
        try {
            const fileCount = files.length;
            const results = await parseTaskJsonFiles(files);
            setRecent3dTasks(getTripoRecentTasks());
            addToast?.(`Пакетная обработка: прочитано ${fileCount} файлов, загружено ${results.length} задач`, 'success');
        } catch (err: any) {
            addToast?.(`Ошибка пакетной загрузки JSON: ${err?.message || err}`, 'error');
        } finally {
            setIsBatchProcessing(false);
            e.target.value = '';
        }
    };

    const handleBatchPasteSubmit = async () => {
        const raw = batchPasteText.trim();
        if (!raw) return;

        const ids = raw.split(/[\s,;\n\r]+/).map(s => s.trim()).filter(Boolean);
        if (ids.length === 0) {
            addToast?.('Не найдено корректных Task ID в тексте', 'info');
            return;
        }

        setIsBatchProcessing(true);
        try {
            const results = await queryTripoTasksBatch(ids);
            setRecent3dTasks(getTripoRecentTasks());
            setBatchPasteText('');
            setShowBatchPasteModal(false);
            addToast?.(`Пакетный запрос завершён: получено ${results.length} из ${ids.length} задач`, 'success');
        } catch (err: any) {
            addToast?.(`Ошибка пакетного запроса Task IDs: ${err?.message || err}`, 'error');
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const handleRefreshSingleTask = async (taskId: string) => {
        try {
            const updated = await importTripoTaskById(taskId);
            if (updated) {
                setRecent3dTasks(getTripoRecentTasks());
                addToast?.(`Статус задачи "${taskId.slice(0, 10)}..." обновлен: ${updated.status}`, 'success');
            }
        } catch (err: any) {
            addToast?.(`Ошибка обновления задачи: ${err?.message || err}`, 'error');
        }
    };

    const handleDownloadTaskJson = (task: TripoRecentTask) => {
        const filename = downloadTaskMetadataJson(task, task.prompt, task.taskId);
        if (filename) {
            addToast?.(`JSON метаданные скачаны: ${filename}`, 'info');
        }
    };

    const handleExportAll3dTasks = () => {
        if (recent3dTasks.length === 0) {
            addToast?.('Нет сохранённых 3D задач для экспорта', 'info');
            return;
        }
        exportAllTasksToJson();
        addToast?.(`Экспортировано ${recent3dTasks.length} 3D задач в файл бэкапа JSON`, 'success');
    };

    const handleDownload3dModel = (modelUrl: string, prompt?: string, taskId?: string) => {
        const filename = `${(prompt || 'model').slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_')}_${taskId ? taskId.slice(0, 8) : Date.now()}.glb`;
        const a = document.createElement('a');
        a.href = modelUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast?.(`Скачивание 3D модели: ${filename}`, 'info');
    };

    const handleDownload3dPreview = (previewUrl: string, prompt?: string, taskId?: string) => {
        const filename = `${(prompt || 'render').slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_')}_${taskId ? taskId.slice(0, 8) : Date.now()}.png`;
        const a = document.createElement('a');
        a.href = previewUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast?.(`Скачивание превью: ${filename}`, 'info');
    };

    const handleLoadModelIntoNode = (modelItem: TripoRecentTask) => {
        const target3dNode = nodes.find(n => n.type === NodeType.THREE_D_GENERATOR && selectedNodeIds.includes(n.id)) ||
                             nodes.find(n => n.type === NodeType.THREE_D_GENERATOR);

        if (target3dNode) {
            let existingState: any = {};
            try {
                existingState = JSON.parse(target3dNode.value || '{}');
            } catch {}
            const updatedValue = JSON.stringify({
                ...existingState,
                modelUrl: modelItem.modelUrl,
                thumbnailUrl: modelItem.thumbnailUrl,
                renderedImageUrl: modelItem.renderedImageUrl,
                prompt: modelItem.prompt || existingState.prompt,
                status: 'success',
                progress: 100
            });
            if (handleValueChange) {
                handleValueChange(target3dNode.id, updatedValue);
            }
            if (selectNode) selectNode(target3dNode.id);
            addToast?.(`3D модель загружена в узел "${target3dNode.title || '3D Generation'}"`, 'success');
        } else {
            const initialValue = JSON.stringify({
                mode: 'multiview_to_3d',
                modelUrl: modelItem.modelUrl,
                thumbnailUrl: modelItem.thumbnailUrl,
                renderedImageUrl: modelItem.renderedImageUrl,
                prompt: modelItem.prompt || '',
                status: 'success',
                progress: 100,
                activeTab: 'preview3d',
                multiview: { front: null, left: null, back: null, right: null },
                image: null
            });
            const scale = viewTransform?.scale || 1;
            const centerPos = {
                x: (- (viewTransform?.translate?.x || 0) + window.innerWidth / 2) / scale,
                y: (- (viewTransform?.translate?.y || 0) + window.innerHeight / 2) / scale
            };
            if (onAddNode) {
                const newNodeId = onAddNode(
                    NodeType.THREE_D_GENERATOR,
                    centerPos,
                    modelItem.prompt ? `3D - ${modelItem.prompt.slice(0, 20)}` : '3D Generation',
                    { centerNode: true, initialValue }
                );
                if (handleValueChange && newNodeId) {
                    handleValueChange(newNodeId, initialValue);
                }
                if (newNodeId && selectNode) selectNode(newNodeId);
                addToast?.('Создан узел 3D Generation с загруженной моделью', 'success');
            }
        }
    };

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

    const handleNodeClick = (nodeId: string, frameIndex?: number) => {
        if (frameIndex !== undefined && handleNavigateToNodeFrame) {
            handleNavigateToNodeFrame(nodeId, frameIndex);
        } else if (selectNode) {
            selectNode(nodeId);
        }
    };

    return (
        <div 
            className={`fixed right-0 w-80 sm:w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-30 flex flex-col font-sans transition-transform duration-300 ease-in-out ${isTaskQueuePanelOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
            style={{
                top: 'var(--app-header-height, 76px)',
                height: 'calc(100vh - var(--app-header-height, 76px))'
            }}
        >
            <TaskQueueHeader
                isBatchMode={isBatchMode}
                setIsBatchMode={setIsBatchMode}
                isSettingsOpen={isSettingsOpen}
                setIsSettingsOpen={setIsSettingsOpen}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tasksCount={tasks.length}
                batchJobsCount={sortedBatchJobs.length}
                activeBatchJobsCount={activeBatchJobsCount}
                recent3dTasksCount={recent3dTasks.length}
                onClose={() => setIsTaskQueuePanelOpen(false)}
                onOpenHistory={() => {
                    setIsTaskQueuePanelOpen(false);
                    setIsHistoryPanelOpen?.(true);
                }}
                t={t}
            />

            {isSettingsOpen && (
                <TaskQueueSettings
                    autoDownloadFromServer={autoDownloadFromServer}
                    setAutoDownloadFromServer={setAutoDownloadFromServer}
                    clearUnusedBatchCache={clearUnusedBatchCache}
                    isCleaningBatchCache={isCleaningBatchCache}
                    restoreFinishedCards={restoreFinishedCards}
                    setRestoreFinishedCards={setRestoreFinishedCards}
                    restoreFailedCards={restoreFailedCards}
                    setRestoreFailedCards={setRestoreFailedCards}
                    effectiveDeviceId={effectiveDeviceId}
                    effectiveDeviceName={effectiveDeviceName}
                    handleDeviceNameChange={handleDeviceNameChange}
                    handleRegenerateId={handleRegenerateId}
                    effectiveIsolationEnabled={effectiveIsolationEnabled}
                    handleToggleIsolation={handleToggleIsolation}
                    clearAllBatchJobs={clearAllBatchJobs}
                    clearCompletedTasks={clearCompletedTasks}
                    hasTasks={tasks.length > 0}
                    onClose={() => setIsSettingsOpen(false)}
                    addToast={addToast}
                    t={t}
                />
            )}

            {activeTab === 'queue' && (
                <QueueTab
                    tasks={tasks}
                    filter={filter}
                    setFilter={setFilter}
                    queueTypeFilter={queueTypeFilter}
                    setQueueTypeFilter={setQueueTypeFilter}
                    runningCount={runningCount}
                    queuedCount={queuedCount}
                    completedCount={completedCount}
                    failedCount={failedCount}
                    clearCompletedTasks={clearCompletedTasks}
                    onNodeClick={handleNodeClick}
                    onCancelTask={cancelTask}
                    onRetryTask={retryTask}
                    onRemoveTask={removeTask}
                    setImageViewer={setImageViewer}
                    t={t}
                />
            )}

            {activeTab === 'batch' && (
                <BatchTab
                    batchJobs={batchJobs}
                    sortedBatchJobs={sortedBatchJobs}
                    isBatchPolling={isBatchPolling}
                    pollActiveBatchJobs={pollActiveBatchJobs}
                    effectiveFilterMode={effectiveFilterMode}
                    handleDeviceFilterChange={handleDeviceFilterChange}
                    effectiveDeviceId={effectiveDeviceId}
                    effectiveDeviceName={effectiveDeviceName}
                    availableDeviceIds={availableDeviceIds}
                    batchSortOrder={batchSortOrder}
                    setBatchSortOrder={setBatchSortOrder}
                    clearFinishedBatchJobs={clearFinishedBatchJobs}
                    expandedBatchJobIds={expandedBatchJobIds}
                    toggleExpandBatchJob={toggleExpandBatchJob}
                    downloadingZipJobId={downloadingZipJobId}
                    checkingJobId={checkingJobId}
                    fetchingJobIds={fetchingJobIds}
                    onNodeClick={handleNodeClick}
                    onDownloadZip={handleDownloadBatchZip}
                    onSendToImageInput={handleSendToBatchInput}
                    onSendToNoteReferences={handleSendToNoteReferences}
                    onSendTo3DPrepare={handleSendTo3DBatchPrepare}
                    onDownloadSingleImage={handleDownloadSingleImage}
                    onFetchResults={fetchBatchJobResults}
                    onCheckStatus={handleCheckBatchStatus}
                    onCancelJob={cancelBatchJob}
                    onRetryJob={retryBatchJob}
                    onDeleteJob={deleteBatchJob}
                    onDownloadJsonl={downloadBatchJsonl}
                    onViewJsonl={setViewingJsonl}
                    getBatchJobJsonl={getBatchJobJsonl}
                    setImageViewer={setImageViewer}
                    addToast={addToast}
                    t={t}
                />
            )}

            {activeTab === 'threed' && (
                <Tripo3DTab
                    tripoBalance={tripoBalance}
                    isTripoBalanceLoading={isTripoBalanceLoading}
                    refreshTripoBalance={refreshTripoBalance}
                    recent3dTasks={recent3dTasks}
                    setRecent3dTasks={setRecent3dTasks}
                    threeDBatchJobs={threeDBatchJobs}
                    threedStatusFilter={threedStatusFilter}
                    setThreedStatusFilter={setThreedStatusFilter}
                    fetchingTasksLimit={fetchingTasksLimit}
                    showManualImport={showManualImport}
                    setShowManualImport={setShowManualImport}
                    manualTaskId={manualTaskId}
                    setManualTaskId={setManualTaskId}
                    isImportingTaskId={isImportingTaskId}
                    isBatchProcessing={isBatchProcessing}
                    expanded3DBatchIds={expanded3DBatchIds}
                    setExpanded3DBatchIds={setExpanded3DBatchIds}
                    downloading3DZipId={downloading3DZipId}
                    onFetchRecentGenerations={handleFetchRecentGenerations}
                    onExportAll3dTasks={handleExportAll3dTasks}
                    onImportTask={handleImportTask}
                    onUploadSingleJson={handleUploadSingleJson}
                    onUploadBatchJsons={handleUploadBatchJsons}
                    onOpenBatchPasteModal={() => setShowBatchPasteModal(true)}
                    onDownloadAll3DModelsZip={downloadAllBatch3DModelsZip}
                    onDownloadMetadataJsonZip={downloadAllBatchMetadataJsonZip}
                    onDelete3DBatchJob={(jobId) => deleteStored3DBatchJob(jobId)}
                    onRefreshSingleTask={handleRefreshSingleTask}
                    onRemoveSingleTask={(taskId) => {
                        removeTripoRecentTask(taskId);
                        setRecent3dTasks(prev => prev.filter(t => t.taskId !== taskId));
                    }}
                    onDownload3dModel={handleDownload3dModel}
                    onDownload3dPreview={handleDownload3dPreview}
                    onDownloadTaskJson={handleDownloadTaskJson}
                    onLoadModelIntoNode={handleLoadModelIntoNode}
                    setImageViewer={setImageViewer}
                    addToast={addToast}
                />
            )}

            {viewingJsonl && (
                <JsonlInspectorModal
                    viewingJsonl={viewingJsonl}
                    onClose={() => setViewingJsonl(null)}
                    downloadBatchJsonl={downloadBatchJsonl}
                    addToast={addToast}
                />
            )}

            {showBatchPasteModal && (
                <BatchPasteIdsModal
                    batchPasteText={batchPasteText}
                    setBatchPasteText={setBatchPasteText}
                    isBatchProcessing={isBatchProcessing}
                    onSubmit={handleBatchPasteSubmit}
                    onClose={() => setShowBatchPasteModal(false)}
                />
            )}
        </div>
    );
};
