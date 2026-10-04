import { useState, useEffect, useCallback, useRef } from 'react';
import { BatchJobRecord, BatchJobItem, BatchJobState, TaskStatus, ToastType, Node, NodeType } from '../types';
import { 
    createBatchImageJob, 
    getBatchJobStatus, 
    cancelBatchJobService, 
    extractImagesFromBatchJob,
    listAllRemoteBatchJobs,
    BatchRequestItemInput
} from '../services/geminiService';
import { 
    clearAllOpenAiBatches, 
    deleteStoredOpenAiBatch, 
    getStoredOpenAiBatchJsonl, 
    generateOpenAiBatchJsonl, 
    downloadJsonlFile 
} from '../services/openaiService';
import { generateThumbnail, cropImageTo169 } from '../utils/imageUtils';
import { recordGenerationEvent } from '../utils/generationStats';
import { addMetadataToPNG } from '../utils/pngMetadata';
import { batchResultKey, readBatchArchive, writeBatchArchive, clearUnusedBatchArchives, imageHashes } from '../services/batchResultsCache';
import { collectCacheReferences } from '../utils/cacheReferences';
import { 
    playBatchSuccessSound, 
    playBatchErrorSound 
} from '../services/soundNotificationService';
import { 
    getDeviceId, 
    setDeviceId, 
    regenerateDeviceId, 
    getDeviceName, 
    setDeviceName, 
    isDeviceIsolationEnabled, 
    setDeviceIsolationEnabled, 
    getDeviceFilterMode, 
    setDeviceFilterMode, 
    formatWithDeviceTag, 
    extractDeviceId, 
    DEVICE_CONFIG_CHANGED_EVENT 
} from '../utils/deviceId';

const STORAGE_KEY_BATCH_JOBS = 'gemini_batch_jobs_v1';
const STORAGE_KEY_AUTO_DOWNLOAD = 'task_queue_auto_download_from_server';
const STORAGE_KEY_BATCH_MODE = 'settings_isBatchMode';
const STORAGE_KEY_RESTORE_FINISHED_CARDS = 'task_queue_restore_finished_cards';
const STORAGE_KEY_RESTORE_FAILED_CARDS = 'task_queue_restore_failed_cards';

export interface UseBatchManagerProps {
    getCacheProtection?: () => Promise<unknown[]>;
    getTargetNode?: (tabId: string, nodeId: string) => Node | undefined;
    updateNodeInStorage?: (tabId: string, nodeId: string, updater: (nodeVal: any) => any, cacheData?: { frame: number; url: string }) => void;
    setFullSizeImage?: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    addToHistory?: (imageUrl: string, prompt: string, model: string, meta?: any) => void;
    addToast?: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
    enqueueTask?: (options: any) => string;
    updateTaskByBatchJob?: (batchJobIdOrName: string, patch: Partial<any>) => void;
    completeBatchTasksForNode?: (nodeId: string, resultUrl?: string) => void;
    triggerAutoSave?: () => Promise<void> | void;
    t?: (key: string) => string;
}

export const useBatchManager = ({
    getCacheProtection,
    getTargetNode,
    updateNodeInStorage,
    setFullSizeImage,
    addToHistory,
    addToast,
    enqueueTask,
    updateTaskByBatchJob,
    completeBatchTasksForNode,
    triggerAutoSave,
    t
}: UseBatchManagerProps = {}) => {
    // State to track node IDs that are currently forming/submitting a batch request
    const [formingBatchNodeIds, setFormingBatchNodeIds] = useState<string[]>([]);
    const formingBatchNodeIdsRef = useRef<string[]>([]);
    formingBatchNodeIdsRef.current = formingBatchNodeIds;
    const formingAbortControllersRef = useRef<Map<string, AbortController>>(new Map());

    const registerFormingBatch = useCallback((nodeId: string, controller?: AbortController) => {
        if (controller) {
            formingAbortControllersRef.current.set(nodeId, controller);
        }
        setFormingBatchNodeIds(prev => prev.includes(nodeId) ? prev : [...prev, nodeId]);
    }, []);

    const unregisterFormingBatch = useCallback((nodeId: string) => {
        formingAbortControllersRef.current.delete(nodeId);
        setFormingBatchNodeIds(prev => prev.filter(id => id !== nodeId));
    }, []);

    const cancelFormingBatch = useCallback((nodeId: string) => {
        const controller = formingAbortControllersRef.current.get(nodeId);
        if (controller) {
            controller.abort();
            formingAbortControllersRef.current.delete(nodeId);
        }
        setFormingBatchNodeIds(prev => prev.filter(id => id !== nodeId));
    }, []);

    // 1. Centralized Batch Mode State (synced with localStorage)
    const [isBatchMode, setIsBatchModeState] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_BATCH_MODE) === 'true';
        } catch {
            return false;
        }
    });

    const setIsBatchMode = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
        setIsBatchModeState(prev => {
            const next = typeof val === 'function' ? val(prev) : val;
            try {
                localStorage.setItem(STORAGE_KEY_BATCH_MODE, String(next));
            } catch (e) {
                console.error("Failed to save batch mode state", e);
            }
            return next;
        });
    }, []);

    const [autoDownloadFromServer, setAutoDownloadFromServerState] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY_AUTO_DOWNLOAD) !== 'false'; }
        catch { return true; }
    });
    const autoDownloadFromServerRef = useRef(autoDownloadFromServer);
    autoDownloadFromServerRef.current = autoDownloadFromServer;
    const setAutoDownloadFromServer = useCallback((enabled: boolean) => {
        autoDownloadFromServerRef.current = enabled;
        setAutoDownloadFromServerState(enabled);
        try { localStorage.setItem(STORAGE_KEY_AUTO_DOWNLOAD, String(enabled)); } catch { }
    }, []);

    // 1b. Restore finished/failed cards settings (synced with localStorage)
    const [restoreFinishedCards, setRestoreFinishedCardsState] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_RESTORE_FINISHED_CARDS);
            return saved !== 'false'; // Default to true
        } catch {
            return true;
        }
    });
    const restoreFinishedCardsRef = useRef(restoreFinishedCards);
    restoreFinishedCardsRef.current = restoreFinishedCards;

    const setRestoreFinishedCards = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
        setRestoreFinishedCardsState(prev => {
            const next = typeof val === 'function' ? val(prev) : val;
            try {
                localStorage.setItem(STORAGE_KEY_RESTORE_FINISHED_CARDS, String(next));
            } catch (e) {
                console.error("Failed to save restoreFinishedCards setting", e);
            }
            return next;
        });
    }, []);

    const [restoreFailedCards, setRestoreFailedCardsState] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_RESTORE_FAILED_CARDS);
            return saved !== 'false'; // Default to true
        } catch {
            return true;
        }
    });
    const restoreFailedCardsRef = useRef(restoreFailedCards);
    restoreFailedCardsRef.current = restoreFailedCards;

    const setRestoreFailedCards = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
        setRestoreFailedCardsState(prev => {
            const next = typeof val === 'function' ? val(prev) : val;
            try {
                localStorage.setItem(STORAGE_KEY_RESTORE_FAILED_CARDS, String(next));
            } catch (e) {
                console.error("Failed to save restoreFailedCards setting", e);
            }
            return next;
        });
    }, []);

    // Device ID and Isolation states
    const [deviceId, setDeviceIdState] = useState<string>(() => getDeviceId());
    const [deviceName, setDeviceNameState] = useState<string>(() => getDeviceName());
    const [deviceIsolationEnabled, setDeviceIsolationEnabledState] = useState<boolean>(() => isDeviceIsolationEnabled());
    const [deviceFilterMode, setDeviceFilterModeState] = useState<string>(() => getDeviceFilterMode());

    useEffect(() => {
        const handleConfigChange = (e: any) => {
            if (e.detail) {
                if (e.detail.deviceId !== undefined) setDeviceIdState(e.detail.deviceId);
                if (e.detail.deviceName !== undefined) setDeviceNameState(e.detail.deviceName);
                if (e.detail.isolationEnabled !== undefined) setDeviceIsolationEnabledState(e.detail.isolationEnabled);
                if (e.detail.filterMode !== undefined) setDeviceFilterModeState(e.detail.filterMode);
            }
        };
        window.addEventListener(DEVICE_CONFIG_CHANGED_EVENT, handleConfigChange);
        return () => window.removeEventListener(DEVICE_CONFIG_CHANGED_EVENT, handleConfigChange);
    }, []);

    const updateDeviceId = useCallback((newId: string) => {
        setDeviceId(newId);
        setDeviceIdState(newId);
    }, []);

    const updateDeviceName = useCallback((name: string) => {
        setDeviceName(name);
        setDeviceNameState(name);
    }, []);

    const regenDeviceId = useCallback(() => {
        const newId = regenerateDeviceId();
        setDeviceIdState(newId);
        return newId;
    }, []);

    const updateDeviceIsolationEnabled = useCallback((enabled: boolean) => {
        setDeviceIsolationEnabled(enabled);
        setDeviceIsolationEnabledState(enabled);
    }, []);

    const updateDeviceFilterMode = useCallback((mode: string) => {
        setDeviceFilterMode(mode);
        setDeviceFilterModeState(mode);
    }, []);

    // 2. Persistent Batch Jobs State with strict filtering to prevent corrupt objects
    const [batchJobs, setBatchJobs] = useState<BatchJobRecord[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_BATCH_JOBS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed.filter(j => j && typeof j === 'object' && (j.id || j.name) && Array.isArray(j.items));
                }
            }
        } catch (e) {
            console.error("Failed to load batch jobs from storage", e);
        }
        return [];
    });

    const batchJobsRef = useRef<BatchJobRecord[]>(batchJobs);
    batchJobsRef.current = batchJobs;

    const [isPolling, setIsPolling] = useState<boolean>(false);
    const [fetchingJobIds, setFetchingJobIds] = useState<{ [jobId: string]: boolean }>({});
    const [isCleaningBatchCache, setIsCleaningBatchCache] = useState(false);
    const cleaningBatchCacheRef = useRef(false);
    const fetchingJobIdsRef = useRef(fetchingJobIds);
    fetchingJobIdsRef.current = fetchingJobIds;

    // Save batch jobs to localStorage whenever changed
    const persistBatchJobs = useCallback((updater: (prev: BatchJobRecord[]) => BatchJobRecord[]) => {
        setBatchJobs(prev => {
            const next = updater(prev);
            batchJobsRef.current = next;
            try {
                // Large binary responses live in durable archives, not 5 MB localStorage.
                const metadata = next.map(job => job.resultsCached ? {
                    ...job,
                    rawJsonl: undefined,
                    items: job.items.map(({ resultUrl, resultThumbnail, images, ...item }) => item)
                } : job);
                localStorage.setItem(STORAGE_KEY_BATCH_JOBS, JSON.stringify(metadata));
            } catch (e) {
                console.error("Failed to persist batch jobs", e);
            }
            return next;
        });
    }, []);

    const storeResults = useCallback(async (job: BatchJobRecord, items: BatchJobItem[]) => {
        try {
            const sourceKeys = job.name?.startsWith('openai_')
                ? [`openai-output:${job.name}`] : [];
            await writeBatchArchive(batchResultKey(job), { items, rawJsonl: job.rawJsonl },
                items.flatMap(item => [item.resultUrl, item.resultThumbnail].filter((url): url is string => !!url)), sourceKeys);
            return true;
        } catch (error) {
            console.warn('Failed to persist batch results:', error);
            addToast?.(t?.('batch.cacheSaveFailed') || 'Could not save batch results locally. They remain available in this session.', 'warning');
            return false;
        }
    }, [addToast, t]);

    // Hydrate results without calling any provider or replaying node autosaves.
    useEffect(() => {
        let cancelled = false;
        const initialJobs = batchJobsRef.current;
        (async () => {
            for (const job of initialJobs) {
                try {
                    let archived = await readBatchArchive<{ items: BatchJobItem[]; rawJsonl?: string }>(batchResultKey(job));
                    if (!archived && job.items.some(item => !!item.resultUrl)) {
                        if (await storeResults(job, job.items)) archived = { items: job.items, rawJsonl: job.rawJsonl };
                    }
                    if (cancelled || !archived || !Array.isArray(archived.items)) continue;
                    persistBatchJobs(prev => prev.map(current => current.id === job.id ? {
                        ...current, resultsCached: true, rawJsonl: archived!.rawJsonl ?? current.rawJsonl,
                        items: archived!.items.map(item => ({ ...current.items.find(old => old.id === item.id), ...item, savedToDisk: current.items.find(old => old.id === item.id)?.savedToDisk ?? item.savedToDisk }))
                    } : current));
                } catch (error) { console.warn('Could not load local batch archive:', error); }
            }
        })();
        return () => { cancelled = true; };
    }, [persistBatchJobs, storeResults]);

    const clearUnusedBatchCache = useCallback(async () => {
        if (cleaningBatchCacheRef.current) return;
        cleaningBatchCacheRef.current = true;
        setIsCleaningBatchCache(true);
        try {
            const before = Date.now();
            if (!getCacheProtection) throw new Error('Cache protection sources are unavailable');
            const roots = await getCacheProtection();
            const references = collectCacheReferences(roots);
            for (const job of batchJobsRef.current) {
                references.keys.add(batchResultKey(job));
                references.keys.add(`results:${job.id}`);
                if (job.name?.startsWith('openai_')) references.keys.add(`openai-output:${job.name}`);
            }
            const result = await clearUnusedBatchArchives({ before, keys: [...references.keys], imageHashes: await imageHashes(references.images) });
            addToast?.((t?.('batch.cacheCleared') || 'Removed {count} unused archives ({size} MB).')
                .replace('{count}', String(result.removed)).replace('{size}', (result.bytes / 1024 / 1024).toFixed(1)), 'info');
            if (result.skipped) addToast?.(t?.('batch.cacheSkipped') || 'Unreadable archives were retained for recovery.', 'warning');
            return result;
        } catch (error) {
            console.error('Batch cache cleanup failed:', error);
            addToast?.(t?.('batch.cacheCleanupFailed') || 'Could not check cache references. Cleanup was stopped.', 'error');
        } finally { cleaningBatchCacheRef.current = false; setIsCleaningBatchCache(false); }
    }, [getCacheProtection, addToast, t]);

    // Map SDK JobState string to BatchJobState
    const mapSdkState = (sdkState: string): BatchJobState => {
        const s = String(sdkState || '').toUpperCase();
        if (s.includes('SUCCEEDED') || s.includes('SUCCESS') || s === 'JOB_STATE_SUCCEEDED') return 'SUCCEEDED';
        if (s.includes('FAILED') || s === 'JOB_STATE_FAILED') return 'FAILED';
        if (s.includes('CANCELLED') || s.includes('CANCELED') || s === 'JOB_STATE_CANCELLED') return 'CANCELLED';
        if (s.includes('EXPIRED') || s === 'JOB_STATE_EXPIRED') return 'EXPIRED';
        if (s.includes('RUNNING') || s === 'JOB_STATE_RUNNING') return 'RUNNING';
        if (s.includes('PENDING') || s === 'JOB_STATE_PENDING') return 'PENDING';
        return 'PENDING';
    };

    const extractBatchPromptText = (req: any, idx: number): string => {
        const geminiPrompt = req?.contents?.[0]?.parts?.find((p: any) => p?.text)?.text;
        if (geminiPrompt) return geminiPrompt;

        const responseInput = req?.body?.input ?? req?.input;
        if (typeof responseInput === 'string' && responseInput.trim()) return responseInput;
        if (Array.isArray(responseInput)) {
            for (const inputItem of responseInput) {
                const content = Array.isArray(inputItem?.content) ? inputItem.content : [];
                const textPart = content.find((p: any) => p?.type === 'input_text' && p?.text);
                if (textPart?.text) return textPart.text;
            }
        }

        return `Batch Item #${idx + 1}`;
    };

    const extractBatchAspectRatio = (req: any): string | undefined => {
        return req?.config?.imageConfig?.aspectRatio || req?.body?.metadata?.aspectRatio;
    };

    const extractBatchResolution = (req: any): string | undefined => {
        return req?.config?.imageConfig?.imageSize || req?.body?.tools?.[0]?.size || req?.body?.metadata?.size;
    };

    // 3. Explicit on-demand Download of Completed Batch Job Results from Server
    const fetchBatchJobResults = useCallback(async (jobIdOrName: string, options?: { forceRestore?: boolean }) => {
        const foundJob = batchJobsRef.current.find(j => j.id === jobIdOrName || j.name === jobIdOrName);
        if (!foundJob) {
            console.warn(`Job not found for results fetch: ${jobIdOrName}`);
            return;
        }
        let job: BatchJobRecord = foundJob;

        const targetJobId = job.id;
        if (fetchingJobIdsRef.current[targetJobId]) return;
        fetchingJobIdsRef.current[targetJobId] = true;
        setFetchingJobIds(prev => ({ ...prev, [targetJobId]: true }));

        // Resolve settings from the destination node, including inactive tabs.
        let targetNode = job.tabId ? getTargetNode?.(job.tabId, job.nodeId) : undefined;
        let targetState: any = {};
        try { targetState = JSON.parse(targetNode?.value || '{}'); } catch { }
        let isEditor = targetNode?.type === NodeType.IMAGE_EDITOR;
        let autoInsert = !isEditor || (targetState.autoInsertResults ?? targetState.autoDownload ?? true);
        let shouldRestore = !!targetNode && (options?.forceRestore !== undefined
            ? options.forceRestore
            : (restoreFinishedCardsRef.current && autoInsert));
        const refreshTarget = () => {
            targetNode = job.tabId ? getTargetNode?.(job.tabId, job.nodeId) : undefined;
            targetState = {};
            try { targetState = JSON.parse(targetNode?.value || '{}'); } catch { }
            isEditor = targetNode?.type === NodeType.IMAGE_EDITOR;
            autoInsert = !isEditor || (targetState.autoInsertResults ?? targetState.autoDownload ?? true);
            shouldRestore = !!targetNode && !!updateNodeInStorage && (options?.forceRestore !== undefined
                ? options.forceRestore : (restoreFinishedCardsRef.current && autoInsert));
        };
        const saveInsertedImage = (item: BatchJobItem, url: string, frame: number, prompt: string) => {
            const enabled = isEditor ? (targetState.autoSaveImages ?? true)
                : targetNode?.type === NodeType.IMAGE_OUTPUT && !!targetNode.autoDownload;
            if (!shouldRestore || !enabled || item.savedToDisk) return;
            try {
                const link = document.createElement('a');
                link.href = url.startsWith('data:image/png') ? addMetadataToPNG(url, 'prompt', prompt) : url;
                const now = new Date();
                const date = now.toISOString().split('T')[0];
                const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
                link.download = `Image_${String(frame).padStart(3, '0')}_${date}_${time}.png`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                item.savedToDisk = true;
            } catch (error) { console.warn('Saving inserted batch image failed:', error); }
        };

        try {
            // Read the local archive before contacting the server, even while
            // background hydration is still running after application startup.
            try {
                const archived = await readBatchArchive<{ items: BatchJobItem[]; rawJsonl?: string }>(batchResultKey(job));
                if (archived && Array.isArray(archived.items)) job = {
                    ...job, resultsCached: true, rawJsonl: archived.rawJsonl ?? job.rawJsonl,
                    items: archived.items.map(item => ({ ...job.items.find(old => old.id === item.id), ...item, savedToDisk: job.items.find(old => old.id === item.id)?.savedToDisk ?? item.savedToDisk }))
                };
            } catch (error) { console.warn('Local batch cache read failed:', error); }
            // Check if job items already have resultUrl populated
            const existingUrlsCount = (job.items || []).filter(it => !!it.resultUrl).length;
            if ((existingUrlsCount > 0 || job.resultsCached) && job.items.length > 0 && job.items.every(item => !!item.resultUrl || item.status === 'failed' || item.status === 'cancelled')) {
                let successCount = 0;
                let firstUrl: string | undefined = undefined;
                const restoredItems = job.items.map(item => ({ ...item }));
                for (let i = 0; i < job.items.length; i++) {
                    const item = { ...job.items[i] };
                    if (item.resultUrl) {
                        successCount++;
                        if (!firstUrl) firstUrl = item.resultUrl;
                        const frameNum = item.frameIndex !== undefined ? item.frameIndex : i;
                        const thumb = item.resultThumbnail || await generateThumbnail(item.resultUrl, 256, 256);
                        item.resultThumbnail = thumb;
                        restoredItems[i] = item;

                        refreshTarget();
                        if (shouldRestore) {

                            if (updateNodeInStorage && job.tabId && job.nodeId) {
                                if (job.isSequence) {
                                    updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => {
                                        const seqOutputs = [...(prevNode?.sequenceOutputs || [])];
                                        seqOutputs[frameNum] = { status: 'done', thumbnail: thumb };
                                        return { ...prevNode, sequenceOutputs: seqOutputs };
                                    }, { frame: 1000 + frameNum, url: item.resultUrl });
                                } else {
                                    updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => {
                                        if (job.nodeTitle === 'Image Output' || typeof prevNode === 'string') {
                                            return thumb;
                                        }
                                        if (typeof prevNode === 'object' && prevNode !== null) {
                                            if (Array.isArray(prevNode)) {
                                                return prevNode;
                                            }
                                            return {
                                                ...prevNode,
                                                outputImage: thumb
                                            };
                                        }
                                        return thumb;
                                    }, { frame: 0, url: item.resultUrl });
                                }
                            }
                            saveInsertedImage(item, item.resultUrl, frameNum, item.prompt);
                            restoredItems[i] = item;
                        }
                    } else if (item.status === 'failed') {
                        refreshTarget();
                        if (shouldRestore && restoreFailedCardsRef.current && job.isSequence && job.tabId && updateNodeInStorage) {
                            const frame = item.frameIndex ?? i;
                            updateNodeInStorage(job.tabId, job.nodeId, (prev: any) => {
                                const sequenceOutputs = [...(prev.sequenceOutputs || [])];
                                sequenceOutputs[frame] = { status: 'error', thumbnail: null };
                                return { ...prev, sequenceOutputs };
                            });
                        }
                    }
                }
                const resultsCached = await storeResults(job, restoredItems);
                persistBatchJobs(prev => prev.map(j => j.id === targetJobId ? { ...j, rawJsonl: job.rawJsonl, resultsCached, state: successCount > 0 ? 'SUCCEEDED' : 'FAILED', items: restoredItems } : j));

                if (updateTaskByBatchJob) {
                    const patch = {
                        status: (successCount > 0 ? 'completed' : 'failed') as TaskStatus,
                        resultUrl: firstUrl,
                        completedAt: Date.now()
                    };
                    updateTaskByBatchJob(job.id, patch);
                    if (job.name) updateTaskByBatchJob(job.name, patch);
                }
                if (successCount > 0 && completeBatchTasksForNode && job.nodeId) {
                    completeBatchTasksForNode(job.nodeId, firstUrl);
                }

                if (addToast) {
                    const toastMsg = (t?.('batch.completedToast') || 'Batch job completed: {count} images generated!')
                        .replace('{count}', String(successCount));
                    addToast(toastMsg, 'success');
                }
                return;
            }

            const sdkJob = await getBatchJobStatus(job.name || job.id);
            if (!sdkJob) {
                throw new Error("Could not retrieve batch status from server");
            }

            // Extract items metadata
            const itemsMeta = (job.items || []).map((item, idx) => ({
                id: item.id || `item-${idx}`,
                prompt: item.prompt || `Batch Item #${idx + 1}`
            }));

            const extracted = await extractImagesFromBatchJob(sdkJob, itemsMeta);
            if (!extracted || extracted.length === 0) {
                throw new Error(sdkJob.error?.message || "No image results returned from batch API");
            }

            let successCount = 0;
            const updatedItems: BatchJobItem[] = [];

            for (let i = 0; i < extracted.length; i++) {
                const ext = extracted[i];
                const prevItem = job.items.find(it => it.id === ext.id) || job.items[i];
                const frameNum = prevItem?.frameIndex !== undefined ? prevItem.frameIndex : i;
                const prompt = ext.prompt || prevItem?.prompt || `Batch Item #${i + 1}`;

                if (ext.imageUrl) {
                    successCount++;
                    let finalUrl = ext.imageUrl;
                    if (prevItem?.autoCrop169) {
                        try {
                            finalUrl = await cropImageTo169(finalUrl);
                        } catch (e) {
                            console.error("Crop 16:9 failed", e);
                        }
                    }

                    const thumb = await generateThumbnail(finalUrl, 256, 256);

                    refreshTarget();
                    // Cache full size image and update canvas node if shouldRestore is true
                    if (shouldRestore) {

                        // Update canvas node storage
                        if (updateNodeInStorage && job.tabId && job.nodeId) {
                            if (job.isSequence) {
                                updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => {
                                    const seqOutputs = [...(prevNode?.sequenceOutputs || [])];
                                    seqOutputs[frameNum] = { status: 'done', thumbnail: thumb };
                                    return { ...prevNode, sequenceOutputs: seqOutputs };
                                }, { frame: 1000 + frameNum, url: finalUrl });
                            } else {
                                updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => {
                                    if (job.nodeTitle === 'Image Output' || typeof prevNode === 'string') {
                                        return thumb;
                                    }
                                    if (typeof prevNode === 'object' && prevNode !== null) {
                                        if (Array.isArray(prevNode)) {
                                            let chars = [...prevNode];
                                            if (chars[frameNum]) {
                                                const itemRatio = prevItem?.aspectRatio || '1:1';
                                                const updatedThumbnails = { ...(chars[frameNum].thumbnails || {}), [itemRatio]: thumb };
                                                chars[frameNum] = {
                                                    ...chars[frameNum],
                                                    image: thumb,
                                                    thumbnails: updatedThumbnails
                                                };
                                            }
                                            return chars;
                                        }
                                        return {
                                            ...prevNode,
                                            outputImage: thumb
                                        };
                                    }
                                    return thumb;
                                }, { frame: 0, url: finalUrl });
                            }
                        }
                    }

                    const resultItem = { ...prevItem } as BatchJobItem;
                    saveInsertedImage(resultItem, finalUrl, frameNum, prompt);

                    // Add to generation history (skipStats: true so downloads do not re-increment stats)
                    if (addToHistory) {
                        addToHistory(finalUrl, prompt, job.model || 'gemini-3-pro-image-preview', {
                            aspectRatio: prevItem?.aspectRatio,
                            resolution: prevItem?.resolution,
                            isBatch: true,
                            skipStats: true,
                            generationMode: 'batch',
                            batchJobName: job.name
                        });
                    }

                    updatedItems.push({
                        ...resultItem,
                        id: ext.id || prevItem?.id || `item-${i}`,
                        frameIndex: frameNum,
                        prompt,
                        aspectRatio: prevItem?.aspectRatio,
                        resolution: prevItem?.resolution,
                        status: 'completed',
                        resultThumbnail: thumb,
                        resultUrl: finalUrl
                    });
                } else {
                    const err = ext.error || 'Generation failed in batch response';
                    updatedItems.push({
                        ...prevItem,
                        id: ext.id || prevItem?.id || `item-${i}`,
                        frameIndex: frameNum,
                        prompt,
                        aspectRatio: prevItem?.aspectRatio,
                        resolution: prevItem?.resolution,
                        status: 'failed',
                        error: err
                    });

                    // Update canvas node storage only if restoreFailedCards is enabled
                    if (restoreFailedCardsRef.current && updateNodeInStorage && job.tabId && job.nodeId) {
                        if (job.isSequence) {
                            updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => {
                                const seqOutputs = [...(prevNode.sequenceOutputs || [])];
                                seqOutputs[frameNum] = { status: 'error', thumbnail: null };
                                return { ...prevNode, sequenceOutputs: seqOutputs };
                            });
                        }
                    }
                }
            }

            // Update job record
            const resultsCached = await storeResults(job, updatedItems);
            persistBatchJobs(prev => prev.map(j => {
                if (j.id === targetJobId) {
                    return {
                        ...j,
                        resultsCached,
                        state: successCount > 0 ? 'SUCCEEDED' : 'FAILED',
                        completedAt: Date.now(),
                        updatedAt: Date.now(),
                        items: updatedItems
                    };
                }
                return j;
            }));

            const firstCompleted = updatedItems.find(it => it.status === 'completed' && it.resultUrl);
            if (updateTaskByBatchJob) {
                const patch = {
                    status: (successCount > 0 ? 'completed' : 'failed') as TaskStatus,
                    resultUrl: firstCompleted?.resultUrl,
                    completedAt: Date.now()
                };
                updateTaskByBatchJob(job.id, patch);
                if (job.name) updateTaskByBatchJob(job.name, patch);
            }
            if (completeBatchTasksForNode && job.nodeId) {
                completeBatchTasksForNode(job.nodeId, firstCompleted?.resultUrl);
            }

            if (addToast) {
                const toastMsg = (t?.('batch.completedToast') || 'Batch job completed: {count} images generated!')
                    .replace('{count}', String(successCount));
                addToast(toastMsg, 'success');
            }

            if (successCount > 0) {
                playBatchSuccessSound();
            } else {
                playBatchErrorSound();
            }

            if (triggerAutoSave) {
                try {
                    await triggerAutoSave();
                } catch (saveErr) {
                    console.error("Auto-save on batch fetch failed:", saveErr);
                }
            }
        } catch (e: any) {
            console.error("Error downloading batch job results:", e);
            playBatchErrorSound();
            if (addToast) {
                addToast(`Failed to download batch results: ${e?.message || e}`, 'error');
            }
        } finally {

            fetchingJobIdsRef.current[targetJobId] = false;
            setFetchingJobIds(prev => ({ ...prev, [targetJobId]: false }));
        }
    }, [getTargetNode, updateNodeInStorage, setFullSizeImage, addToHistory, addToast, persistBatchJobs, storeResults, triggerAutoSave, t]);

    // 4. Poll specific Batch Job status (Update status without auto-downloading large assets)
    const checkBatchJob = useCallback(async (jobIdOrName: string) => {
        const job = batchJobsRef.current.find(j => j.id === jobIdOrName || j.name === jobIdOrName);
        if (!job) return;

        try {
            const sdkJob = await getBatchJobStatus(job.name, { downloadResults: false });
            const rawState = sdkJob.state || sdkJob.status;
            const mappedState = mapSdkState(rawState);

            if (mappedState === 'SUCCEEDED') {
                persistBatchJobs(prev => prev.map(j => {
                    if (j.id === job!.id) {
                        let updatedItems = [...j.items];
                        // If remote metadata lists inlinedRequests, populate accurate count/prompts
                        if (sdkJob.src?.inlinedRequests && Array.isArray(sdkJob.src.inlinedRequests) && sdkJob.src.inlinedRequests.length > updatedItems.length) {
                            updatedItems = sdkJob.src.inlinedRequests.map((req: any, idx: number) => {
                                const promptText = extractBatchPromptText(req, idx);
                                const existing = j.items[idx];
                                return existing || {
                                    id: `item-${idx}`,
                                    frameIndex: idx,
                                    prompt: promptText,
                                    status: 'completed' as TaskStatus
                                };
                            });
                        }
                        return {
                            ...j,
                            state: 'SUCCEEDED',
                            updatedAt: Date.now(),
                            items: updatedItems
                        };
                    }
                    return j;
                }));

                if (updateTaskByBatchJob) {
                    const patch = { status: 'completed' as TaskStatus, completedAt: Date.now() };
                    updateTaskByBatchJob(job.id, patch);
                    if (job.name) updateTaskByBatchJob(job.name, patch);
                }

                // Server retrieval is independent of node insertion and disk saving.
                const shouldAutoFetch = autoDownloadFromServerRef.current;
                if (shouldAutoFetch && !fetchingJobIdsRef.current?.[job.id]) {
                    fetchBatchJobResults(job.id);
                }
            } else if (mappedState === 'FAILED') {
                const errMsg = sdkJob.error?.message || 'Batch job failed on server';
                playBatchErrorSound();
                persistBatchJobs(prev => prev.map(j => {
                    if (j.id === job!.id) {
                        return {
                            ...j,
                            state: 'FAILED',
                            error: errMsg,
                            updatedAt: Date.now(),
                            completedAt: Date.now(),
                            items: j.items.map(it => ({ ...it, status: 'failed', error: errMsg }))
                        };
                    }
                    return j;
                }));

                if (updateTaskByBatchJob) {
                    const patch = { status: 'failed' as TaskStatus, error: errMsg, completedAt: Date.now() };
                    updateTaskByBatchJob(job.id, patch);
                    if (job.name) updateTaskByBatchJob(job.name, patch);
                }

                // Update node state to error only if restoreFailedCards is enabled
                if (restoreFailedCardsRef.current && updateNodeInStorage && job.tabId && job.nodeId) {
                    job.items.forEach(it => {
                        const frameNum = it.frameIndex !== undefined ? it.frameIndex : 0;
                        if (job!.isSequence) {
                            updateNodeInStorage(job!.tabId!, job!.nodeId, (prev: any) => {
                                const seq = [...(prev.sequenceOutputs || [])];
                                seq[frameNum] = { status: 'error', thumbnail: null };
                                return { ...prev, sequenceOutputs: seq };
                            });
                        }
                    });
                }
            } else if (mappedState === 'CANCELLED') {
                persistBatchJobs(prev => prev.map(j => {
                    if (j.id === job!.id) {
                        return {
                            ...j,
                            state: 'CANCELLED',
                            updatedAt: Date.now(),
                            completedAt: Date.now(),
                            items: j.items.map(it => ({ ...it, status: 'cancelled' }))
                        };
                    }
                    return j;
                }));

                if (updateTaskByBatchJob) {
                    const patch = { status: 'cancelled' as TaskStatus, completedAt: Date.now() };
                    updateTaskByBatchJob(job.id, patch);
                    if (job.name) updateTaskByBatchJob(job.name, patch);
                }
            } else {
                // RUNNING or PENDING
                persistBatchJobs(prev => prev.map(j => {
                    if (j.id === job!.id) {
                        return {
                            ...j,
                            state: mappedState,
                            updatedAt: Date.now()
                        };
                    }
                    return j;
                }));

                if (updateTaskByBatchJob) {
                    const patch = { status: (mappedState === 'RUNNING' ? 'running' : 'queued') as TaskStatus };
                    updateTaskByBatchJob(job.id, patch);
                    if (job.name) updateTaskByBatchJob(job.name, patch);
                }
            }
        } catch (err: any) {
            console.warn(`Failed to poll batch job ${job.name}:`, err);
        }
    }, [persistBatchJobs, updateNodeInStorage]);

    // 5. Poll all active batch jobs AND discover remote batch jobs (Server-sync & recovery without auto-downloading images)
    const pollActiveBatchJobs = useCallback(async () => {
        setIsPolling(true);
        try {
            const currentDevId = getDeviceId();
            const isolationActive = isDeviceIsolationEnabled();

            // Step 1: Discover remote batch jobs from server
            const remoteJobs = await listAllRemoteBatchJobs();
            const currentJobs = batchJobsRef.current;
            const newRecoveredRecords: BatchJobRecord[] = [];

            if (remoteJobs && remoteJobs.length > 0) {
                for (const rJob of remoteJobs) {
                    const rName = rJob.name || rJob.id;
                    if (!rName) continue;

                    const rDeviceId = rJob.deviceId || extractDeviceId(rJob.displayName) || extractDeviceId(rName);

                    // If device isolation is active and this batch belongs to another device, skip it!
                    if (isolationActive && rDeviceId && rDeviceId !== currentDevId) {
                        continue;
                    }

                    const exists = currentJobs.some(j => 
                        j.name === rName || 
                        j.id === rName || 
                        (j.name && rName && (j.name.endsWith(rName) || rName.endsWith(j.name)))
                    );

                    if (!exists) {
                        const mappedState = mapSdkState(rJob.state || rJob.status);

                        // Respect restore settings during remote batch recovery
                        if (mappedState === 'SUCCEEDED' && !restoreFinishedCardsRef.current) {
                            continue;
                        }
                        if (mappedState === 'FAILED' && !restoreFailedCardsRef.current) {
                            continue;
                        }

                        const items: any[] = [];

                        if (rJob.src?.inlinedRequests && Array.isArray(rJob.src.inlinedRequests)) {
                            rJob.src.inlinedRequests.forEach((req: any, idx: number) => {
                                const promptText = extractBatchPromptText(req, idx);
                                items.push({
                                    id: `item-${idx}`,
                                    frameIndex: idx,
                                    prompt: promptText,
                                    aspectRatio: extractBatchAspectRatio(req) || '1:1',
                                    resolution: extractBatchResolution(req) || '1K',
                                    status: (mappedState === 'SUCCEEDED' ? 'completed' : (mappedState === 'FAILED' ? 'failed' : 'queued')) as TaskStatus
                                });
                            });
                        } else if (rJob.dest?.inlinedResponses && Array.isArray(rJob.dest.inlinedResponses)) {
                            rJob.dest.inlinedResponses.forEach((_: any, idx: number) => {
                                items.push({
                                    id: `item-${idx}`,
                                    frameIndex: idx,
                                    prompt: `Batch Item #${idx + 1}`,
                                    status: (mappedState === 'SUCCEEDED' ? 'completed' : (mappedState === 'FAILED' ? 'failed' : 'queued')) as TaskStatus
                                });
                            });
                        } else if (rJob.batch?.items) {
                            items.push(...rJob.batch.items.map((it: any) => ({
                                id: it.id,
                                prompt: it.prompt,
                                aspectRatio: it.aspectRatio,
                                size: it.size,
                                quality: it.quality,
                                outputFormat: it.outputFormat,
                                status: (it.status || 'queued') as TaskStatus,
                                resultUrl: it.resultUrl
                            })));
                        } else {
                            items.push({
                                id: 'item-0',
                                prompt: rJob.displayName || `Batch Job ${rName.split('/').pop()}`,
                                status: (mappedState === 'SUCCEEDED' ? 'completed' : (mappedState === 'FAILED' ? 'failed' : 'queued')) as TaskStatus
                            });
                        }

                        const recoveredRecord: BatchJobRecord = {
                            id: `batch-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            name: rName,
                            displayName: rJob.displayName || `Recovered Batch (${rName.split('/').pop()})`,
                            model: rJob.model || 'gemini-3-pro-image-preview',
                            createdAt: rJob.createTime ? new Date(rJob.createTime).getTime() : Date.now(),
                            updatedAt: rJob.updateTime ? new Date(rJob.updateTime).getTime() : Date.now(),
                            state: mappedState,
                            nodeId: '',
                            nodeTitle: rJob.displayName || 'Batch Job',
                            isSequence: items.length > 1,
                            deviceId: rDeviceId || currentDevId,
                            items
                        };

                        newRecoveredRecords.push(recoveredRecord);
                    }
                }

                if (newRecoveredRecords.length > 0) {
                    persistBatchJobs(prev => [...newRecoveredRecords, ...prev]);
                    if (addToast) {
                        const msg = (t?.('batch.restoredToast') || 'Restored {count} batch job(s) from server')
                            .replace('{count}', String(newRecoveredRecords.length));
                        addToast(msg, 'info');
                    }
                }
            }

            // Step 2: Poll active jobs (RUNNING or PENDING) to update status
            const allActiveJobs = batchJobsRef.current.filter(j => {
                if (j.state !== 'PENDING' && j.state !== 'RUNNING') return false;
                if (isolationActive && j.deviceId && j.deviceId !== currentDevId) return false;
                return true;
            });
            for (const job of allActiveJobs) {
                await checkBatchJob(job.id);
            }
        } catch (err) {
            console.warn("Failed during remote batch synchronization:", err);
        } finally {
            setIsPolling(false);
        }
    }, [checkBatchJob, persistBatchJobs, addToast, t]);

    // 6. Submit a new batch generation
    const createBatchGeneration = useCallback(async (params: {
        nodeId: string;
        nodeTitle?: string;
        tabId?: string;
        tabName?: string;
        model: string;
        isSequence: boolean;
        items: {
            id: string;
            frameIndex?: number;
            prompt: string;
            aspectRatio?: string;
            resolution?: string;
            quality?: string;
            outputFormat?: string;
            size?: string;
            images?: { base64ImageData: string; mimeType: string }[];
            autoCrop169?: boolean;
            autoDownload?: boolean;
            autoInsertResults?: boolean;
            autoSaveImages?: boolean;
        }[];
        signal?: AbortSignal;
    }): Promise<BatchJobRecord | null> => {
        const { nodeId, nodeTitle, tabId, tabName, model, isSequence, items, signal } = params;

        // Check if already aborted
        if (signal?.aborted) {
            unregisterFormingBatch(nodeId);
            return null;
        }

        let abortController = formingAbortControllersRef.current.get(nodeId);
        if (!abortController) {
            abortController = new AbortController();
            formingAbortControllersRef.current.set(nodeId, abortController);
        }

        const combinedSignal = signal || abortController.signal;

        setFormingBatchNodeIds(prev => prev.includes(nodeId) ? prev : [...prev, nodeId]);
        try {
            // 1. Prepare request inputs
            if (combinedSignal.aborted) {
                throw new Error('ABORTED');
            }

            const batchInputs: BatchRequestItemInput[] = items.map(item => ({
                id: item.id,
                prompt: item.prompt,
                aspectRatio: item.aspectRatio || '1:1',
                resolution: item.resolution || '1K',
                quality: item.quality,
                outputFormat: item.outputFormat,
                size: item.size,
                images: item.images
            }));

            const currentDevId = getDeviceId();
            const displayName = formatWithDeviceTag(
                `${nodeTitle || 'Image Editor'} Batch - ${new Date().toLocaleTimeString()}`,
                currentDevId
            );

            if (combinedSignal.aborted) {
                throw new Error('ABORTED');
            }

            // 2. Call Batch API (Gemini or OpenAI based on model)
            const createdSdkJob = await createBatchImageJob(batchInputs, model, displayName);

            // If cancelled while network call was in flight, cancel remotely immediately
            if (combinedSignal.aborted) {
                if (createdSdkJob?.name) {
                    try {
                        await cancelBatchJobService(createdSdkJob.name);
                    } catch (e) {
                        console.warn("Failed to auto-cancel aborted batch job on server:", e);
                    }
                }
                throw new Error('ABORTED');
            }

            const clientId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const batchRecord: BatchJobRecord = {
                id: clientId,
                name: createdSdkJob.name,
                displayName,
                model,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                state: mapSdkState(createdSdkJob.state),
                rawJsonl: createdSdkJob.rawJsonl,
                nodeId,
                nodeTitle: nodeTitle || 'Image Editor',
                tabId,
                tabName,
                isSequence,
                deviceId: currentDevId,
                items: items.map(item => ({
                    id: item.id,
                    frameIndex: item.frameIndex,
                    prompt: item.prompt,
                    aspectRatio: item.aspectRatio,
                    resolution: item.resolution,
                    quality: item.quality,
                    outputFormat: item.outputFormat,
                    size: item.size,
                    images: item.images,
                    autoCrop169: item.autoCrop169,
                    autoDownload: item.autoDownload,
                    autoInsertResults: item.autoInsertResults,
                    autoSaveImages: item.autoSaveImages,
                    status: 'queued' as TaskStatus
                }))
            };

            // 3. Persist record
            persistBatchJobs(prev => [batchRecord, ...prev]);

            // Record batch items in generation statistics at request creation time with batch API mode tag
            try {
                items.forEach((item, idx) => {
                    recordGenerationEvent({
                        id: `batch-${createdSdkJob.name}-${item.id || (item.frameIndex !== undefined ? `frame-${item.frameIndex}` : `item-${idx}`)}`,
                        timestamp: Date.now(),
                        model,
                        aspectRatio: item.aspectRatio || '1:1',
                        resolution: item.resolution,
                        prompt: item.prompt || '',
                        generationMode: 'batch',
                        source: 'batch_api',
                    });
                });
            } catch (statsErr) {
                console.warn("Failed to record batch generation stats event:", statsErr);
            }

            // 4. Update node output status to batch queued
            if (updateNodeInStorage && tabId) {
                if (isSequence) {
                    updateNodeInStorage(tabId, nodeId, (prevNode: any) => {
                        const nextOutputs = [...(prevNode.sequenceOutputs || [])];
                        items.forEach(it => {
                            if (it.frameIndex !== undefined) {
                                nextOutputs[it.frameIndex] = { status: 'queued', thumbnail: null };
                            }
                        });
                        return { ...prevNode, sequenceOutputs: nextOutputs };
                    });
                } else {
                    updateNodeInStorage(tabId, nodeId, (prevNode: any) => {
                        if (typeof prevNode === 'object' && prevNode !== null) {
                            if (Array.isArray(prevNode)) {
                                return prevNode;
                            }
                            return {
                                ...prevNode,
                                outputImage: null
                            };
                        }
                        return prevNode;
                    });
                }
            }

            // 5. Enqueue ONE consolidated task in TaskQueue for all items in batch mode
            if (enqueueTask) {
                const promptSummary = items.length === 1 
                    ? (items[0].prompt || 'Single image batch task')
                    : (isSequence 
                        ? `Sequence (${items.length} frames): ${items[0]?.prompt ? (items[0].prompt.length > 80 ? items[0].prompt.slice(0, 80) + '...' : items[0].prompt) : 'Batch sequence'}` 
                        : `${items.length} items: ${items[0]?.prompt ? (items[0].prompt.length > 80 ? items[0].prompt.slice(0, 80) + '...' : items[0].prompt) : 'Batch generation'}`);

                enqueueTask({
                    nodeId,
                    nodeTitle: nodeTitle || 'Image Generation',
                    prompt: promptSummary,
                    type: isSequence ? 'sequence_frame' : (nodeTitle === 'Image Output' || nodeTitle === 'Character Card' ? 'image_gen' : 'image_edit'),
                    tabId,
                    tabName,
                    isBatch: true,
                    batchJobName: createdSdkJob.name,
                    batchJobId: clientId,
                    itemCount: items.length,
                    initialStatus: (mapSdkState(createdSdkJob.state) === 'RUNNING' ? 'running' : 'queued') as TaskStatus
                });
            }

            if (addToast) {
                const submittedMsg = (t?.('batch.submittedToast') || 'Batch job submitted ({count} items). Delayed processing started!')
                    .replace('{count}', String(items.length));
                addToast(submittedMsg, 'info');
            }

            // 6. Immediately trigger auto-save so current project state is securely persisted on batch launch
            if (triggerAutoSave) {
                try {
                    await triggerAutoSave();
                } catch (autoSaveErr) {
                    console.error("Auto-save on batch launch failed:", autoSaveErr);
                }
            }

            return batchRecord;
        } catch (err: any) {
            if (err?.message === 'ABORTED' || combinedSignal?.aborted) {
                console.log(`[BatchManager] Batch formation for node ${nodeId} was cancelled.`);
                // Reset 'generating' sequence outputs back to idle
                if (updateNodeInStorage && tabId && isSequence) {
                    updateNodeInStorage(tabId, nodeId, (prevNode: any) => {
                        const nextOutputs = [...(prevNode.sequenceOutputs || [])];
                        items.forEach(it => {
                            if (it.frameIndex !== undefined && nextOutputs[it.frameIndex]?.status === 'generating') {
                                nextOutputs[it.frameIndex] = { status: 'idle', thumbnail: null };
                            }
                        });
                        return { ...prevNode, sequenceOutputs: nextOutputs };
                    });
                }
                return null;
            }
            throw err;
        } finally {
            formingAbortControllersRef.current.delete(nodeId);
            setFormingBatchNodeIds(prev => prev.filter(id => id !== nodeId));
        }
    }, [persistBatchJobs, updateNodeInStorage, enqueueTask, addToast, triggerAutoSave, unregisterFormingBatch, t]);

    // 7. Cancel a batch job
    const cancelBatchJob = useCallback(async (jobId: string) => {
        const job = batchJobsRef.current.find(j => j.id === jobId || j.name === jobId);
        if (!job) return;

        try {
            await cancelBatchJobService(job.name);
            persistBatchJobs(prev => prev.map(j => {
                if (j.id === job.id) {
                    return {
                        ...j,
                        state: 'CANCELLED',
                        updatedAt: Date.now(),
                        completedAt: Date.now(),
                        items: j.items.map(it => ({ ...it, status: 'cancelled' }))
                    };
                }
                return j;
            }));

            if (addToast) {
                addToast(t?.('batch.cancelledToast') || 'Batch job cancelled', 'info');
            }
        } catch (e: any) {
            console.error("Failed to cancel batch job:", e);
            if (addToast) {
                addToast(`Failed to cancel batch job: ${e?.message || e}`, 'error');
            }
        }
    }, [persistBatchJobs, addToast, t]);

    // 7b. Cancel batch operations for a specific node (both formation & active server job)
    const cancelBatchForNode = useCallback(async (nodeId: string) => {
        const isForming = formingBatchNodeIdsRef.current.includes(nodeId) || formingAbortControllersRef.current.has(nodeId);
        if (isForming) {
            cancelFormingBatch(nodeId);
            if (addToast) {
                addToast(t?.('batch.cancelFormation.toast') || 'Формирование batch-запроса отменено', 'info');
            }
        }

        const activeJob = batchJobsRef.current.find(j => j.nodeId === nodeId && (j.state === 'PENDING' || j.state === 'RUNNING'));
        if (activeJob) {
            await cancelBatchJob(activeJob.id);
        }
    }, [cancelFormingBatch, cancelBatchJob, addToast, t]);

    // 8. Delete / Remove a batch job record
    const deleteBatchJob = useCallback((jobId: string) => {
        const job = batchJobsRef.current.find(job => job.id === jobId || job.name === jobId);
        if (job?.name) deleteStoredOpenAiBatch(job.name);
        deleteStoredOpenAiBatch(jobId);
        persistBatchJobs(prev => prev.filter(j => j.id !== jobId && j.name !== jobId));
    }, [persistBatchJobs]);

    // 8b. Retry a failed batch job
    const retryBatchJob = useCallback(async (jobId: string) => {
        const targetJob = batchJobsRef.current.find(j => j.id === jobId || j.name === jobId);
        if (!targetJob || !targetJob.items || targetJob.items.length === 0) return;

        try {
            deleteBatchJob(jobId);
            await createBatchGeneration({
                nodeId: targetJob.nodeId,
                nodeTitle: targetJob.nodeTitle,
                tabId: targetJob.tabId,
                tabName: targetJob.tabName,
                model: targetJob.model,
                isSequence: targetJob.isSequence || false,
                items: targetJob.items.map(item => ({
                    id: item.id,
                    frameIndex: item.frameIndex,
                    prompt: item.prompt,
                    aspectRatio: item.aspectRatio,
                    resolution: item.resolution,
                    quality: item.quality,
                    outputFormat: item.outputFormat,
                    size: item.size,
                    images: item.images,
                    autoCrop169: item.autoCrop169,
                    autoDownload: item.autoDownload,
                    autoInsertResults: item.autoInsertResults,
                    autoSaveImages: item.autoSaveImages
                }))
            });

            if (addToast) {
                addToast(t?.('batch.retrying') || 'Задача Batch API перезапущена', 'info');
            }
        } catch (err: any) {
            console.error("Failed to retry batch job:", err);
            if (addToast) {
                addToast(`Failed to retry batch: ${err?.message || err}`, 'error');
            }
        }
    }, [deleteBatchJob, createBatchGeneration, addToast, t]);

    // 9. Clear completed/failed batch jobs
    const clearFinishedBatchJobs = useCallback(() => {
        batchJobsRef.current.filter(job => job.state !== 'PENDING' && job.state !== 'RUNNING')
            .forEach(job => deleteStoredOpenAiBatch(job.name || job.id));
        persistBatchJobs(prev => prev.filter(j => j.state === 'PENDING' || j.state === 'RUNNING'));
    }, [persistBatchJobs]);

    // 9b. Clear ALL batch jobs (Both Gemini batch jobs and OpenAI batch storage)
    const clearAllBatchJobs = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY_BATCH_JOBS);
            localStorage.removeItem('openai_batch_store_v1');
            clearAllOpenAiBatches();
        } catch (e) {
            console.error("Failed to remove batch storage keys:", e);
        }
        setBatchJobs([]);
        batchJobsRef.current = [];
        if (addToast) {
            addToast(t?.('batch.allJobsCleared') || 'Все Batch задачи успешно удалены', 'success');
        }
    }, [addToast, t]);

    // 10. Auto polling on mount and every 30s for active jobs
    useEffect(() => {
        // Initial poll on startup
        pollActiveBatchJobs();

        const interval = setInterval(() => {
            const hasActive = batchJobsRef.current.some(j => j.state === 'PENDING' || j.state === 'RUNNING');
            if (hasActive) {
                pollActiveBatchJobs();
            }
        }, 30000); // Poll every 30 seconds

        return () => clearInterval(interval);
    }, [pollActiveBatchJobs]);

    // Helpers for node UI status and button states
    const isFormingBatch = useCallback((nodeId: string) => {
        return formingBatchNodeIds.includes(nodeId);
    }, [formingBatchNodeIds]);

    const getNodeActiveBatchJob = useCallback((nodeId: string) => {
        return batchJobs.find(j => j.nodeId === nodeId && (j.state === 'PENDING' || j.state === 'RUNNING'));
    }, [batchJobs]);

    const isNodeBatchActive = useCallback((nodeId: string) => {
        return formingBatchNodeIds.includes(nodeId) || !!batchJobs.find(j => j.nodeId === nodeId && (j.state === 'PENDING' || j.state === 'RUNNING'));
    }, [formingBatchNodeIds, batchJobs]);

    const getBatchJobJsonl = useCallback((jobId: string): string | undefined => {
        const job = batchJobsRef.current.find(j => j.id === jobId || j.name === jobId);
        if (job?.rawJsonl) return job.rawJsonl;
        const fromOpenAi = getStoredOpenAiBatchJsonl(jobId);
        if (fromOpenAi) return fromOpenAi;
        if (job && job.items && job.items.length > 0) {
            return generateOpenAiBatchJsonl(job.items, job.model, job.id || job.name);
        }
        return undefined;
    }, []);

    const downloadBatchJsonl = useCallback((jobId: string) => {
        const jsonl = getBatchJobJsonl(jobId);
        if (!jsonl) {
            if (addToast) addToast('JSONL-файл не найден для этой задачи', 'error');
            return;
        }
        const job = batchJobsRef.current.find(j => j.id === jobId || j.name === jobId);
        const safeName = (job?.displayName || job?.name || jobId).replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadJsonlFile(jsonl, `batch_${safeName}_request.jsonl`);
        if (addToast) addToast('Файл JSONL успешно скачан!', 'success');
    }, [getBatchJobJsonl, addToast]);

    return {
        clearUnusedBatchCache,
        isCleaningBatchCache,
        autoDownloadFromServer,
        setAutoDownloadFromServer,
        isBatchMode,
        setIsBatchMode,
        restoreFinishedCards,
        setRestoreFinishedCards,
        restoreFailedCards,
        setRestoreFailedCards,
        batchJobs,
        setBatchJobs: persistBatchJobs,
        formingBatchNodeIds,
        isFormingBatch,
        getNodeActiveBatchJob,
        isNodeBatchActive,
        isPolling,
        isBatchPolling: isPolling,
        fetchingJobIds,
        fetchBatchJobResults,
        createBatchGeneration,
        checkBatchJob,
        pollActiveBatchJobs,
        cancelBatchJob,
        cancelBatchForNode,
        cancelFormingBatch,
        registerFormingBatch,
        unregisterFormingBatch,
        deleteBatchJob,
        retryBatchJob,
        clearFinishedBatchJobs,
        clearAllBatchJobs,
        getBatchJobJsonl,
        downloadBatchJsonl,
        deviceId,
        deviceName,
        setDeviceId: updateDeviceId,
        setDeviceName: updateDeviceName,
        regenerateDeviceId: regenDeviceId,
        deviceIsolationEnabled,
        setDeviceIsolationEnabled: updateDeviceIsolationEnabled,
        deviceFilterMode,
        setDeviceFilterMode: updateDeviceFilterMode
    };
};
