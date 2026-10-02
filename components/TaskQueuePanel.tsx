import React, { useState, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { useAppContext } from '../contexts/AppContext';
import { TaskStatus, BatchJobRecord, BatchJobState, NodeType } from '../types';
import { ImageBatchItem } from './nodes/image-input/types';
import { generateThumbnail } from '../utils/imageUtils';
import { CustomCheckbox } from './CustomCheckbox';
import { Tooltip } from './Tooltip';
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
    useTripoBalance, 
    useTripoEnabled, 
    getTripoRecentTasks, 
    removeTripoRecentTask, 
    clearTripoRecentTasks, 
    fetchTripoRecentTasks, 
    importTripoTaskById,
    queryTripoTasksBatch,
    parseTaskJsonFiles,
    exportAllTasksToJson,
    downloadTaskMetadataJson,
    TripoRecentTask, 
    TRIPO_TASKS_CHANGE_EVENT 
} from '../services/tripoService';
import { 
    ThreeDBatchJob,
    getStored3DBatchJobs,
    deleteStored3DBatchJob,
    downloadAllBatch3DModelsZip,
    downloadAllBatchMetadataJsonZip,
    THREED_BATCH_CHANGE_EVENT
} from '../services/tripoBatchService';
import { OptimizedThumbnail } from './nodes/image-editor/OptimizedThumbnail';
import { 
    Box, Sparkles, Zap, Download, RefreshCw, Trash2, ExternalLink, Eye, X, Layers, 
    Loader2, Image as ImageIcon, Plus, Copy, Check, FileJson, UploadCloud, ArrowDownCircle, 
    FileText, ListFilter, FolderDown
} from 'lucide-react';

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

    const [activeTab, setActiveTab] = useState<'queue' | 'batch' | 'threed'>('queue');
    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
    const [queueTypeFilter, setQueueTypeFilter] = useState<'all' | 'images' | 'threed'>('all');
    const [threedStatusFilter, setThreedStatusFilter] = useState<'all' | 'success' | 'running' | 'failed'>('all');
    const [fetchingTasksLimit, setFetchingTasksLimit] = useState<number | null>(null);
    const [recent3dTasks, setRecent3dTasks] = useState<TripoRecentTask[]>(() => getTripoRecentTasks());
    const [manualTaskId, setManualTaskId] = useState('');
    const [isImportingTaskId, setIsImportingTaskId] = useState(false);
    const [showManualImport, setShowManualImport] = useState(false);
    const [showBatchPasteModal, setShowBatchPasteModal] = useState(false);
    const [batchPasteText, setBatchPasteText] = useState('');
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const singleJsonInputRef = React.useRef<HTMLInputElement>(null);
    const batchJsonInputRef = React.useRef<HTMLInputElement>(null);
    const { balance: tripoBalance, loading: isTripoBalanceLoading, refreshBalance: refreshTripoBalance } = useTripoBalance();
    const isTripoConfigured = useTripoEnabled();

    const [batchSortOrder, setBatchSortOrder] = useState<'desc' | 'asc'>('desc');
    const [checkingJobId, setCheckingJobId] = useState<string | null>(null);
    const [expandedBatchJobIds, setExpandedBatchJobIds] = useState<Record<string, boolean>>({});
    const [downloadingZipJobId, setDownloadingZipJobId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [viewingJsonl, setViewingJsonl] = useState<{ id: string; content: string; name: string } | null>(null);
    const [copiedJsonl, setCopiedJsonl] = useState(false);
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
    // Within groups, sorted by createdAt / updatedAt according to batchSortOrder ('desc' = newest first).
    // Filtered by device filter (current device vs all devices vs specific device ID).
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
            // Append to existing Note node
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
                // Set full size image for existing and new references
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
            // Create a new Note Node centered on canvas
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

        // Find target BatchPrepare node (prefer currently selected, or first existing)
        const batchPrepNodes = (nodes || []).filter(n => n.type === NodeType.BATCH_PREPARE);
        const selectedBatchPrepNode = batchPrepNodes.find(n => (selectedNodeIds || []).includes(n.id));
        const targetBatchPrepNode = selectedBatchPrepNode || batchPrepNodes[0];

        if (targetBatchPrepNode) {
            // Append to existing BatchPrepare node
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
            // Create a new 3D Batch Prepare node centered on canvas
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

        // Split by whitespace, commas, semicolons, newlines
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

    const filteredTasks = tasks.filter(task => {
        if (filter === 'active' && task.status !== 'running' && task.status !== 'queued') return false;
        if (filter === 'completed' && task.status !== 'completed') return false;
        if (filter === 'failed' && task.status !== 'failed' && task.status !== 'cancelled') return false;

        if (queueTypeFilter === 'images' && task.type === 'three_d_gen') return false;
        if (queueTypeFilter === 'threed' && task.type !== 'three_d_gen') return false;
        return true;
    });

    const filtered3dTasks = recent3dTasks.filter(task => {
        if (threedStatusFilter === 'success') return task.status === 'success';
        if (threedStatusFilter === 'running') return task.status === 'running' || task.status === 'queued';
        if (threedStatusFilter === 'failed') return task.status === 'failed' || task.status === 'cancelled';
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
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-accent-secondary border border-gray-700">
                        <span className="w-2 h-2 rounded-full bg-accent-secondary animate-pulse"></span>
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
        <div 
            className={`fixed right-0 w-80 sm:w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-30 flex flex-col font-sans transition-transform duration-300 ease-in-out ${isTaskQueuePanelOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
            style={{
                top: 'var(--app-header-height, 76px)',
                height: 'calc(100vh - var(--app-header-height, 76px))'
            }}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-sm z-10 sticky top-0 select-none">
                <div className="flex items-center gap-2 select-none">
                    <div className={`w-2.5 h-2.5 rounded-full ${isBatchMode ? 'bg-accent-secondary animate-pulse' : 'bg-accent-text animate-pulse'}`}></div>
                    <h2 className="text-gray-100 font-semibold text-base flex items-center gap-1.5">
                        <span>{t('queue.title') || 'Task Queue & Batch'}</span>
                    </h2>
                    <button
                        onClick={() => setIsSettingsOpen(prev => !prev)}
                        className={`p-1 rounded-md transition-colors ${
                            isSettingsOpen 
                                ? 'text-accent-secondary bg-gray-800 ring-1 ring-gray-700' 
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
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
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

                    {/* Device & Batch Isolation Settings */}
                    <div className="flex flex-col gap-2.5 p-2.5 rounded-lg bg-gray-950/70 border border-gray-800/80">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-200 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>{t('queue.deviceIsolation') || 'Устройство и изоляция батчей'}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                                {effectiveDeviceId}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <div className="flex-1 flex flex-col">
                                <label className="text-[10px] text-gray-400 mb-0.5">{t('queue.deviceNameLabel') || 'Имя устройства'}</label>
                                <input
                                    type="text"
                                    value={effectiveDeviceName || ''}
                                    onChange={(e) => handleDeviceNameChange(e.target.value)}
                                    placeholder="например: Домашний ПК, Mac"
                                    className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div className="flex flex-col justify-end pt-3.5">
                                <button
                                    onClick={handleRegenerateId}
                                    className="px-2 py-1 text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
                                    title={t('queue.regenerateDeviceId') || 'Сгенерировать новый универсальный ID устройства'}
                                >
                                    {t('queue.newId') || 'Новый ID'}
                                </button>
                            </div>
                        </div>

                        <label className="flex items-start gap-2.5 cursor-pointer select-none group pt-0.5">
                            <CustomCheckbox
                                checked={effectiveIsolationEnabled}
                                onChange={(val) => handleToggleIsolation(val)}
                            />
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors">
                                    {t('queue.enableDeviceIsolation') || 'Изоляция батчей по ID устройства'}
                                </span>
                                <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                                    {t('queue.enableDeviceIsolationDesc') || 'Не синхронизировать и не импортировать чужие батчи при общем API ключе'}
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
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-accent-secondary border border-gray-700 font-mono">
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
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-secondary"></div>
                    </label>
                </div>
            </div>

            {/* Main Tabs Navigation (Queue vs Batch Jobs vs 3D Models) */}
            <div className="flex border-b border-gray-800 bg-gray-950/80 px-2 pt-1 gap-1 select-none">
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
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
                    className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === 'batch'
                            ? 'border-accent-secondary text-white bg-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                    }`}
                >
                    <svg className="w-3.5 h-3.5 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>{t('batch.panelTitle') || 'Batch'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
                        {sortedBatchJobs.length}
                    </span>
                    {activeBatchJobsCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-accent-secondary animate-pulse"></span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('threed')}
                    className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === 'threed'
                            ? 'border-purple-500 text-white bg-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                    }`}
                >
                    <Box className="w-3.5 h-3.5 text-purple-400" />
                    <span>3D Models</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
                        {recent3dTasks.length}
                    </span>
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
                                        <div>{getStatusBadge(task.status)}</div>
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
                                                    onClick={() => handleNodeClick(job.nodeId)}
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
                                                onClick={() => fetchBatchJobResults(jobId)}
                                                disabled={isFetchingThisJob}
                                                className="w-full py-1.5 px-3 rounded bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                                            >
                                                {isFetchingThisJob ? (
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
                                                onClick={() => handleDownloadBatchZip({ ...job, id: jobId, items: jobItems })}
                                                disabled={isDownloadingThisZip}
                                                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                                                title={t('batch.downloadAllZip') || 'Скачать все изображения в ZIP'}
                                            >
                                                {isDownloadingThisZip ? (
                                                    <svg className="animate-spin h-3 w-3 text-accent-secondary" viewBox="0 0 24 24">
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
                                                onClick={() => handleSendToNoteReferences({ ...job, id: jobId, items: jobItems })}
                                                className="px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                                title={t('batch.sendToNoteRefTooltip') || 'Отправить сгенерированные изображения в референсы ноды Заметка'}
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                <span>{t('batch.sendToNoteRef') || 'В референсы Заметки'}</span>
                                            </button>

                                            <button
                                                onClick={() => handleSendTo3DBatchPrepare({ ...job, id: jobId, items: jobItems })}
                                                className="px-2 py-1 rounded bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                                title={t('batch.sendTo3DPrepareTooltip') || 'Отправить сгенерированные изображения во вход ноды 3D Batch Prepare'}
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                                <span>{t('batch.sendTo3DPrepare') || 'В 3D Prepare'}</span>
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
                                                        onClick={() => handleCheckBatchStatus(jobId)}
                                                        disabled={checkingJobId === jobId}
                                                        className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700 transition-colors flex items-center gap-1 text-[10px]"
                                                    >
                                                        {checkingJobId === jobId && (
                                                            <svg className="animate-spin h-2.5 w-2.5 text-accent-secondary" viewBox="0 0 24 24">
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

                                            {job.state === 'FAILED' && retryBatchJob && (
                                                <button
                                                    onClick={() => retryBatchJob(jobId)}
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
                                                    if (downloadBatchJsonl) {
                                                        downloadBatchJsonl(jobId);
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
                                                onClick={() => {
                                                    const content = getBatchJobJsonl ? getBatchJobJsonl(jobId) : job.rawJsonl;
                                                    if (content) {
                                                        setViewingJsonl({
                                                             id: jobId,
                                                             content,
                                                             name: job.displayName || job.name || jobId
                                                        });
                                                        setCopiedJsonl(false);
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

            {/* TAB CONTENT: 3D MODELS (TRIPO 3D) */}
            {activeTab === 'threed' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950">
                    {/* Top Credit Balance Card (Positioned Above Tripo AI 3D Title) */}
                    <div className="p-3 rounded-lg bg-gray-900 border border-yellow-700/40 text-xs text-gray-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md bg-yellow-950/80 border border-yellow-700/60 text-yellow-400 flex items-center justify-center">
                                <Zap className={`w-4 h-4 text-yellow-400 ${isTripoBalanceLoading ? 'animate-spin' : ''}`} />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-semibold text-yellow-500 tracking-wider">
                                    Баланс Tripo AI
                                </div>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-base font-bold text-yellow-300 font-mono tracking-tight">
                                        {tripoBalance !== null ? tripoBalance : (isTripoBalanceLoading ? '...' : '—')}
                                    </span>
                                    <span className="text-xs text-yellow-400/90 font-medium">кредитов</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => refreshTripoBalance()}
                                disabled={isTripoBalanceLoading}
                                className="px-2.5 py-1.5 rounded-md bg-yellow-950/60 hover:bg-yellow-900/80 text-yellow-300 border border-yellow-700/60 hover:border-yellow-500 transition-all text-xs font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                                title="Обновить баланс кредитов Tripo 3D"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isTripoBalanceLoading ? 'animate-spin' : ''}`} />
                                <span>Обновить</span>
                            </button>
                        </div>
                    </div>

                    {/* Tripo AI 3D Models Title Header & Fetch/Import Banner */}
                    <div className="p-3 rounded-lg bg-gray-900 border border-purple-900/40 text-xs text-gray-200 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-purple-950/80 border border-purple-800/60 text-purple-300 flex items-center justify-center">
                                    <Box className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-100 flex items-center gap-1.5">
                                        <span>Tripo AI • 3D Модели</span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                                            v3.1 / v2.5
                                        </span>
                                    </h4>
                                    <p className="text-[10px] text-gray-400">
                                        Запрос моделей по Task ID, пакетный импорт JSON и скачивание .GLB
                                    </p>
                                </div>
                            </div>

                            {/* Global Actions */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handleExportAll3dTasks}
                                    disabled={recent3dTasks.length === 0}
                                    className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
                                    title="Экспортировать все сохранённые 3D задачи в файл бэкапа JSON"
                                >
                                    <FolderDown className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Экспорт в JSON</span>
                                </button>
                                <button
                                    onClick={() => handleFetchRecentGenerations(100)}
                                    disabled={fetchingTasksLimit !== null}
                                    className="px-2 py-1 rounded bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-800/60 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                                    title="Обновить статусы и ссылки для всех задач"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingTasksLimit !== null ? 'animate-spin' : ''}`} />
                                    <span>Обновить все</span>
                                </button>
                            </div>
                        </div>

                        {/* Hidden File Inputs for JSON Import */}
                        <input
                            ref={singleJsonInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleUploadSingleJson}
                            className="hidden"
                        />
                        <input
                            ref={batchJsonInputRef}
                            type="file"
                            accept=".json"
                            multiple
                            onChange={handleUploadBatchJsons}
                            className="hidden"
                        />

                        {/* Action Buttons Toolbar: By ID, Single JSON, Batch JSON, Paste IDs */}
                        <div className="pt-2 border-t border-gray-800/80 flex flex-wrap items-center gap-1.5">
                            <button
                                onClick={() => setShowManualImport(prev => !prev)}
                                className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 border shadow-sm ${
                                    showManualImport 
                                        ? 'bg-purple-800 text-white border-purple-400' 
                                        : 'bg-purple-950/80 hover:bg-purple-900 text-purple-200 border-purple-800/80'
                                }`}
                                title="Запросить готовую модель по конкретному Task ID из Tripo API"
                            >
                                <ArrowDownCircle className="w-3.5 h-3.5 text-purple-300" />
                                <span>Запрос по Task ID</span>
                            </button>

                            <button
                                onClick={() => singleJsonInputRef.current?.click()}
                                disabled={isBatchProcessing}
                                className="px-2.5 py-1.5 rounded text-xs font-medium bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/60 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                title="Выбрать сохранённый JSON файл задачи (3D_Model_...json)"
                            >
                                <FileJson className="w-3.5 h-3.5 text-amber-400" />
                                <span>Выбрать JSON задачи</span>
                            </button>

                            <button
                                onClick={() => batchJsonInputRef.current?.click()}
                                disabled={isBatchProcessing}
                                className="px-2.5 py-1.5 rounded text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                title="Пакетная загрузка: выбрать сразу несколько сохранённых JSON файлов задач"
                            >
                                <UploadCloud className="w-3.5 h-3.5 text-indigo-300" />
                                <span>Пакетная загрузка JSON</span>
                            </button>

                            <button
                                onClick={() => setShowBatchPasteModal(true)}
                                className="px-2.5 py-1.5 rounded text-xs font-medium bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-700/60 transition-all flex items-center gap-1.5 shadow-sm"
                                title="Вставить список из нескольких Task IDs для массового запроса"
                            >
                                <FileText className="w-3.5 h-3.5 text-cyan-300" />
                                <span>Вставить список ID</span>
                            </button>
                        </div>

                        {/* Collapsible Manual Task ID Input */}
                        {showManualImport && (
                            <div className="p-2.5 rounded-lg bg-gray-950 border border-purple-700/60 flex items-center gap-2 animate-fadeIn">
                                <input
                                    type="text"
                                    placeholder="Вставьте Task ID (напр. task_xxxxxxxx или tripo_...)..."
                                    value={manualTaskId}
                                    onChange={(e) => setManualTaskId(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleImportTask();
                                    }}
                                    className="flex-1 bg-gray-900 border border-gray-700 text-xs px-2.5 py-1.5 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                                />
                                <button
                                    onClick={() => handleImportTask()}
                                    disabled={isImportingTaskId || !manualTaskId.trim()}
                                    className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {isImportingTaskId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    <span>Запросить модель</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Filter Pills & Toolbar for 3D Models */}
                    <div className="p-2 border-b border-gray-800 bg-gray-900/60 flex flex-wrap gap-1.5 items-center justify-between">
                        <div className="flex gap-1 bg-gray-950 p-0.5 rounded-lg border border-gray-800 text-xs">
                            <button
                                onClick={() => setThreedStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    threedStatusFilter === 'all' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Все ({recent3dTasks.length})
                            </button>
                            <button
                                onClick={() => setThreedStatusFilter('success')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    threedStatusFilter === 'success' ? 'bg-emerald-700 text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Готовые ({recent3dTasks.filter(t => t.status === 'success').length})
                            </button>
                            <button
                                onClick={() => setThreedStatusFilter('running')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    threedStatusFilter === 'running' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                В процессе ({recent3dTasks.filter(t => t.status === 'running' || t.status === 'queued').length})
                            </button>
                            <button
                                onClick={() => setThreedStatusFilter('failed')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    threedStatusFilter === 'failed' ? 'bg-red-700 text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Ошибки ({recent3dTasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length})
                            </button>
                        </div>

                        {recent3dTasks.length > 0 && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Очистить локальный список недавних 3D генераций?')) {
                                        clearTripoRecentTasks();
                                        setRecent3dTasks([]);
                                    }
                                }}
                                className="text-xs text-gray-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors flex items-center gap-1"
                                title="Очистить локальный список"
                            >
                                <Trash2 className="w-3 h-3" />
                                <span>Очистить список</span>
                            </button>
                        )}
                    </div>

                    {/* 3D Batch Generation Master Jobs Section */}
                    {threeDBatchJobs.length > 0 && (
                        <div className="space-y-3 pb-2 border-b border-gray-800">
                            <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1">
                                <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>Пакетные задачи 3D ({threeDBatchJobs.length})</span>
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {threeDBatchJobs.filter(j => j.status === 'running' || j.status === 'queued').length > 0
                                        ? '⚡ Выполняется генерация...'
                                        : 'Все задачи завершены'}
                                </span>
                            </div>

                            {threeDBatchJobs.map(job => {
                                const isExpanded = !!expanded3DBatchIds[job.id];
                                const isRunning = job.status === 'running' || job.status === 'queued';
                                const isSuccess = job.status === 'completed';
                                const isFailed = job.status === 'failed';
                                const readyCount = job.items.filter(i => i.status === 'success').length;
                                const runningCount = job.items.filter(i => i.status === 'running' || i.status === 'uploading').length;
                                const queuedCount = job.items.filter(i => i.status === 'queued').length;
                                const errorCount = job.items.filter(i => i.status === 'failed').length;

                                return (
                                    <div
                                        key={job.id}
                                        className={`rounded-xl border transition-all overflow-hidden ${
                                            isRunning
                                                ? 'bg-gradient-to-b from-purple-950/40 to-gray-900 border-purple-600/80 shadow-lg shadow-purple-950/30'
                                                : isSuccess
                                                ? 'bg-gray-900 border-emerald-900/60 shadow-md shadow-emerald-950/20'
                                                : 'bg-gray-900 border-gray-800'
                                        }`}
                                    >
                                        {/* Master Batch Header */}
                                        <div className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-bold text-gray-100 truncate">
                                                            {job.name || job.assetBaseName || '3D Batch Job'}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                                                            isRunning
                                                                ? 'bg-blue-950 text-blue-300 border-blue-700/60 animate-pulse'
                                                                : isSuccess
                                                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                                                : 'bg-red-950 text-red-300 border-red-700/60'
                                                        }`}>
                                                            {isRunning && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                                            {isSuccess && <Check className="w-2.5 h-2.5" />}
                                                            {isFailed && <X className="w-2.5 h-2.5" />}
                                                            <span>{isRunning ? 'ГЕНЕРАЦИЯ' : isSuccess ? 'ГОТОВО' : 'ОШИБКА'}</span>
                                                        </span>
                                                        <span className="text-[10px] font-mono text-gray-500">
                                                            ID: {job.id.slice(-8)}
                                                        </span>
                                                    </div>

                                                    <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-3">
                                                        <span>Создан: {new Date(job.createdAt).toLocaleTimeString()}</span>
                                                        <span>•</span>
                                                        <span>Всего паков: <strong className="text-gray-200">{job.totalCount}</strong></span>
                                                    </div>
                                                </div>

                                                {/* Master Batch Actions */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {isSuccess && readyCount > 0 && (
                                                        <button
                                                            onClick={async () => {
                                                                setDownloading3DZipId(job.id);
                                                                try {
                                                                    await downloadAllBatch3DModelsZip(job);
                                                                    addToast?.(`Архив моделей для "${job.name}" успешно скачан!`, 'success');
                                                                } catch (err: any) {
                                                                    addToast?.(`Ошибка скачивания: ${err?.message || err}`, 'error');
                                                                } finally {
                                                                    setDownloading3DZipId(null);
                                                                }
                                                            }}
                                                            disabled={downloading3DZipId === job.id}
                                                            className="px-2.5 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                                                            title="Скачать все сгенерированные 3D модели одним .ZIP архивом"
                                                        >
                                                            {downloading3DZipId === job.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Download className="w-3.5 h-3.5" />
                                                            )}
                                                            <span>Скачать все .GLB (ZIP)</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => downloadAllBatchMetadataJsonZip(job)}
                                                        className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 transition-colors"
                                                        title="Экспортировать метаданные и Task ID всех задач в JSON ZIP"
                                                    >
                                                        <FileJson className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Удалить запись пакета "${job.name}"?`)) {
                                                                deleteStored3DBatchJob(job.id);
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-md text-gray-500 hover:text-red-300 hover:bg-gray-800 transition-colors"
                                                        title="Удалить пакет из истории"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Progress Bar & Counters */}
                                            <div className="mt-2.5 space-y-1.5">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-purple-300">
                                                            {job.progressPercent}% выполнено
                                                        </span>
                                                        <span className="text-gray-500">|</span>
                                                        <span className="text-emerald-400 font-medium">{readyCount} готово</span>
                                                        <span className="text-blue-400 font-medium">{runningCount} в процессе</span>
                                                        {queuedCount > 0 && <span className="text-purple-400">{queuedCount} в очереди</span>}
                                                        {errorCount > 0 && <span className="text-red-400 font-medium">{errorCount} с ошибкой</span>}
                                                    </div>
                                                    <button
                                                        onClick={() => setExpanded3DBatchIds(p => ({ ...p, [job.id]: !p[job.id] }))}
                                                        className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                                                    >
                                                        <span>{isExpanded ? 'Свернуть паки' : `Развернуть (${job.items.length})`}</span>
                                                    </button>
                                                </div>

                                                <div className="h-1.5 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                                                    <div
                                                        className={`h-full transition-all duration-300 ${
                                                            isSuccess
                                                                ? 'bg-emerald-500'
                                                                : isRunning
                                                                ? 'bg-gradient-to-r from-purple-500 to-cyan-400'
                                                                : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${job.progressPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expandable List of Individual Tasks inside Master Batch */}
                                        {isExpanded && (
                                            <div className="p-3 pt-0 border-t border-gray-800/80 bg-gray-950/60 space-y-2">
                                                <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider pt-2">
                                                    Содержимое пакета ({job.items.length} моделей):
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
                                                    {job.items.map((item, idx) => {
                                                        const preview = item.renderedImageUrl || item.thumbnailUrl || item.views.front || item.views.back;
                                                        const itRunning = item.status === 'running' || item.status === 'uploading' || item.status === 'queued';
                                                        const itSuccess = item.status === 'success';
                                                        const itFailed = item.status === 'failed';

                                                        return (
                                                            <div
                                                                key={item.id || idx}
                                                                className={`p-2 rounded-lg bg-gray-900 border flex items-center gap-2.5 transition-all ${
                                                                    itSuccess
                                                                        ? 'border-emerald-900/50'
                                                                        : itRunning
                                                                        ? 'border-purple-600/60 animate-pulse'
                                                                        : itFailed
                                                                        ? 'border-red-900/50'
                                                                        : 'border-gray-800'
                                                                }`}
                                                            >
                                                                {/* Thumbnail Preview */}
                                                                <div className="w-12 h-12 rounded bg-black flex-shrink-0 relative overflow-hidden border border-gray-800 flex items-center justify-center">
                                                                    {preview ? (
                                                                        <img src={preview} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Box className="w-5 h-5 text-gray-600" />
                                                                    )}
                                                                    {itRunning && (
                                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Item Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className="font-medium text-gray-200 text-[11px] truncate">
                                                                            #{idx + 1} {item.packName}
                                                                        </span>
                                                                        <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                                                            itSuccess ? 'bg-emerald-950 text-emerald-300' :
                                                                            itRunning ? 'bg-blue-950 text-blue-300' :
                                                                            itFailed ? 'bg-red-950 text-red-300' : 'bg-gray-800 text-gray-400'
                                                                        }`}>
                                                                            {itSuccess ? '100%' : itRunning ? `${item.progress}%` : itFailed ? 'ERR' : 'WAIT'}
                                                                        </span>
                                                                    </div>

                                                                    {item.taskId && (
                                                                        <div className="flex items-center gap-1 text-[9px] font-mono text-gray-400 mt-0.5">
                                                                            <span className="truncate max-w-[120px]">{item.taskId}</span>
                                                                            <button
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(item.taskId!);
                                                                                    addToast?.('Task ID скопирован!', 'success');
                                                                                }}
                                                                                className="hover:text-purple-300"
                                                                                title="Скопировать Task ID"
                                                                            >
                                                                                <Copy className="w-2.5 h-2.5" />
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {/* Item Action Buttons */}
                                                                    {itSuccess && item.modelUrl && (
                                                                        <div className="flex items-center gap-1.5 mt-1">
                                                                            <a
                                                                                href={item.modelUrl}
                                                                                download={`${job.assetBaseName || 'Model'}_${idx + 1}.glb`}
                                                                                className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[9px] font-medium flex items-center gap-0.5"
                                                                            >
                                                                                <Download className="w-2.5 h-2.5" />
                                                                                <span>.GLB</span>
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 3D Models Cards List */}
                    <div className="space-y-3">
                        {filtered3dTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-center px-4 rounded-lg border border-dashed border-gray-800 bg-gray-950/40">
                                <Box className="w-10 h-10 mb-2 opacity-30 text-purple-400" />
                                <p className="text-sm font-medium text-gray-400">Нет сохраненных 3D моделей</p>
                                <p className="text-xs text-gray-600 mt-1 max-w-xs">
                                    Нажмите кнопку "Запросить 5 / 10 / 15 последних" выше или создайте новую модель в узле 3D Generation.
                                </p>
                            </div>
                        ) : (
                            filtered3dTasks.map(task => {
                                const previewSrc = task.renderedImageUrl || task.thumbnailUrl;
                                const isSuccess = task.status === 'success';
                                const isRunning = task.status === 'running' || task.status === 'queued';
                                const isFailed = task.status === 'failed' || task.status === 'cancelled';

                                return (
                                    <div
                                        key={task.taskId}
                                        className={`p-3 rounded-lg bg-gray-900 border transition-all ${
                                            isSuccess
                                                ? 'border-purple-900/50 shadow-md shadow-purple-950/20'
                                                : isRunning
                                                ? 'border-blue-700/60 animate-pulse'
                                                : isFailed
                                                ? 'border-red-900/50 opacity-80'
                                                : 'border-gray-800'
                                        }`}
                                    >
                                         {/* Card Header */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex flex-col truncate">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold text-[10px] flex items-center gap-1">
                                                        <span>🧊</span>
                                                        <span>{task.type === 'texture_model' ? 'Retexture' : '3D Model'}</span>
                                                    </span>
                                                    <div className="flex items-center gap-1 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800 text-[10px] font-mono text-gray-300">
                                                        <span className="truncate max-w-[130px]" title={task.taskId}>
                                                            {task.taskId}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(task.taskId);
                                                                addToast?.(`Task ID "${task.taskId}" скопирован!`, 'success');
                                                            }}
                                                            className="text-gray-400 hover:text-white transition-colors"
                                                            title="Скопировать Task ID"
                                                        >
                                                            <Copy className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-gray-200 mt-1 line-clamp-2">
                                                    {task.prompt || '3D generation without prompt'}
                                                </span>
                                            </div>

                                            {/* Status Badge & Actions */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {isSuccess && (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                                                        <span>✓</span>
                                                        <span>Готово</span>
                                                    </span>
                                                )}
                                                {isRunning && (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/60 flex items-center gap-1">
                                                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                                                        <span>{task.progress ? `${task.progress}%` : 'Генерация...'}</span>
                                                    </span>
                                                )}
                                                {isFailed && (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/80 text-red-300 border border-red-800/60 flex items-center gap-1">
                                                        <span>✕</span>
                                                        <span>Ошибка</span>
                                                    </span>
                                                )}

                                                <button
                                                    onClick={() => handleRefreshSingleTask(task.taskId)}
                                                    className="p-1 rounded text-gray-400 hover:text-cyan-300 hover:bg-gray-800 transition-colors"
                                                    title="Запросить свежий статус из Tripo API"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        removeTripoRecentTask(task.taskId);
                                                        setRecent3dTasks(prev => prev.filter(t => t.taskId !== task.taskId));
                                                    }}
                                                    className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                                                    title="Закрыть / Удалить панель модели"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Preview Thumbnail and Model Info */}
                                        <div className="flex gap-3 my-2 bg-gray-950/70 p-2 rounded-lg border border-gray-800/80">
                                            {/* Preview Box */}
                                            <div
                                                className="w-24 h-24 rounded-md bg-black/80 border border-purple-900/40 overflow-hidden flex items-center justify-center flex-shrink-0 relative group cursor-pointer"
                                                onClick={() => {
                                                    if (previewSrc && setImageViewer) {
                                                        setImageViewer({
                                                             sources: [{ src: previewSrc, frameNumber: 1, prompt: task.prompt, model: 'Tripo 3D' }],
                                                            initialIndex: 0
                                                        });
                                                    }
                                                }}
                                            >
                                                {previewSrc ? (
                                                    <>
                                                        <img
                                                            src={previewSrc}
                                                            alt="3D Preview"
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Eye className="w-4 h-4 text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-gray-600 gap-1">
                                                        <Box className="w-6 h-6 text-purple-400/50" />
                                                        <span className="text-[9px] text-gray-500">3D Asset</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Meta details */}
                                            <div className="flex-1 flex flex-col justify-between text-[11px] text-gray-300">
                                                <div className="space-y-1 font-mono text-[10px]">
                                                    <div className="flex justify-between text-gray-400">
                                                        <span>Дата создания:</span>
                                                        <span className="text-gray-200">{new Date(task.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    {task.creditsConsumed !== undefined && (
                                                        <div className="flex justify-between text-gray-400">
                                                            <span>Потрачено:</span>
                                                            <span className="text-yellow-400 font-semibold">{task.creditsConsumed} кр.</span>
                                                        </div>
                                                    )}
                                                    {task.modelUrl && (
                                                        <div className="flex justify-between text-gray-400">
                                                            <span>Формат файла:</span>
                                                            <span className="text-purple-300 font-semibold">glTF / .GLB</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {task.error && (
                                                    <div className="p-1 rounded bg-red-950/60 border border-red-900/60 text-[10px] text-red-300">
                                                        {task.error}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons for this 3D Model */}
                                        <div className="mt-2.5 pt-2 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-1.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {task.modelUrl && (
                                                    <button
                                                        onClick={() => handleDownload3dModel(task.modelUrl!, task.prompt, task.taskId)}
                                                        className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1 transition-colors"
                                                        title="Скачать файл 3D модели (.GLB)"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        <span>Скачать .GLB</span>
                                                    </button>
                                                )}

                                                {previewSrc && (
                                                    <button
                                                        onClick={() => handleDownload3dPreview(previewSrc, task.prompt, task.taskId)}
                                                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-medium flex items-center gap-1 transition-colors"
                                                        title="Скачать изображение превью"
                                                    >
                                                        <Download className="w-3 h-3 text-cyan-400" />
                                                        <span>Превью</span>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDownloadTaskJson(task)}
                                                    className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-700/60 text-xs font-medium flex items-center gap-1 transition-colors"
                                                    title="Скачать JSON метаданные и Task ID этой генерации"
                                                >
                                                    <FileJson className="w-3 h-3 text-amber-400" />
                                                    <span>JSON</span>
                                                </button>

                                                {task.modelUrl && (
                                                    <button
                                                        onClick={() => handleLoadModelIntoNode(task)}
                                                        className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium flex items-center gap-1 transition-colors"
                                                        title="Загрузить эту 3D модель в узел 3D Generation на холсте"
                                                    >
                                                        <Box className="w-3 h-3" />
                                                        <span>В узел 3D</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Close Button */}
                                            <button
                                                onClick={() => {
                                                    removeTripoRecentTask(task.taskId);
                                                    setRecent3dTasks(prev => prev.filter(t => t.taskId !== task.taskId));
                                                }}
                                                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-xs transition-colors flex items-center gap-1 ml-auto"
                                                title="Закрыть эту карточку"
                                            >
                                                <X className="w-3 h-3" />
                                                <span>Закрыть</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* JSONL Inspector Modal */}
            {viewingJsonl && (
                <div 
                    className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setViewingJsonl(null)}
                >
                    <div 
                        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/60">
                            <div className="flex items-center gap-2 truncate">
                                <span className="text-accent-secondary font-mono text-sm">📄</span>
                                <h3 className="text-sm font-semibold text-gray-100">
                                    JSONL Batch Request
                                </h3>
                                <span className="text-xs text-gray-500 font-mono truncate">
                                    ({viewingJsonl.name})
                                </span>
                            </div>
                            <button
                                onClick={() => setViewingJsonl(null)}
                                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 flex-1 overflow-y-auto font-mono text-xs leading-relaxed space-y-3">
                            <p className="text-gray-400 text-[11px]">
                                Фактическая строка JSONL, отправляемая в OpenAI Batch API (endpoint /v1/images/edits или /v1/images/generations):
                            </p>
                            <div className="relative">
                                <pre className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-accent-secondary text-[11px] overflow-x-auto whitespace-pre-wrap break-all max-h-96 select-all">
                                    {viewingJsonl.content}
                                </pre>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-950/40">
                            <button
                                onClick={() => {
                                    if (downloadBatchJsonl) {
                                        downloadBatchJsonl(viewingJsonl.id);
                                    }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Скачать .jsonl</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(viewingJsonl.content);
                                        setCopiedJsonl(true);
                                        if (addToast) addToast('Строка JSONL скопирована в буфер обмена!', 'success');
                                        setTimeout(() => setCopiedJsonl(false), 2000);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                        copiedJsonl 
                                            ? 'bg-accent-secondary text-white' 
                                            : 'bg-gray-800 hover:bg-gray-700 text-accent-secondary border border-gray-700'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    <span>{copiedJsonl ? 'Скопировано!' : 'Копировать JSONL'}</span>
                                </button>
                                <button
                                    onClick={() => setViewingJsonl(null)}
                                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Batch Task IDs Paste Modal */}
            {showBatchPasteModal && (
                <div 
                    className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowBatchPasteModal(false)}
                >
                    <div 
                        className="bg-gray-900 border border-purple-800/80 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden text-gray-200 animate-fadeIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80">
                            <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                    <FileText className="w-4 h-4" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-100">
                                        Массовый запрос моделей по Task IDs
                                    </h3>
                                    <p className="text-[10px] text-gray-400">
                                        Вставьте список Task ID через перевод строки, пробел или запятую
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBatchPasteModal(false)}
                                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-3">
                            <textarea
                                value={batchPasteText}
                                onChange={(e) => setBatchPasteText(e.target.value)}
                                placeholder="task_8708c9f0-c5b5-4b19-b6eb-95fb31336bb3&#10;task_12345678-abcd-ef01-2345-6789abcdef01&#10;..."
                                rows={6}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                            />
                            <div className="text-[11px] text-gray-400 flex items-center justify-between">
                                <span>API Endpoint: <code className="text-purple-300">POST /v3/tasks/list</code></span>
                                <span>Распознано: {batchPasteText.split(/[\s,;\n\r]+/).filter(Boolean).length} ID</span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-950/60">
                            <button
                                onClick={() => {
                                    setBatchPasteText('');
                                    setShowBatchPasteModal(false);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
                            >
                                Отмена
                            </button>

                            <button
                                onClick={handleBatchPasteSubmit}
                                disabled={isBatchProcessing || !batchPasteText.trim()}
                                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isBatchProcessing ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Запрос...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Запросить все модели</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

