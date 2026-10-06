import JSZip from 'jszip';
import { 
    createImageTo3DTask, 
    createMultiviewTo3DTask, 
    pollTripoTask, 
    getTripoApiKey, 
    isTripoEnabled, 
    getTripoModelVersion, 
    downloadTaskMetadataJson,
    saveTripoRecentTask,
    logTripo,
    TripoTaskResult,
    TripoRecentTask
} from './tripoService';
import { playBatchSuccessSound, playBatchErrorSound, playTaskSuccessSound } from './soundNotificationService';
import { notifyThreeDBatchStart, notifyThreeDBatchSuccess } from './trayNotificationService';
import { BatchPreparePack, ViewSlotKey } from '../components/nodes/batch-prepare/types';

export interface ThreeDBatchItemState {
    id: string; // pack id or uuid
    packIndex: number;
    packName: string;
    views: {
        front: string | null;
        back: string | null;
        left: string | null;
        right: string | null;
    };
    mutedViews?: {
        front?: boolean;
        back?: boolean;
        left?: boolean;
        right?: boolean;
    };
    taskId?: string;
    status: 'queued' | 'uploading' | 'running' | 'success' | 'failed' | 'cancelled';
    progress: number;
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    error?: string;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
}

export interface ThreeDBatchJob {
    id: string; // e.g. "threed-batch-174..."
    name: string;
    assetBaseName: string;
    createdAt: number;
    updatedAt?: number;
    completedAt?: number;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    totalCount: number;
    completedCount: number;
    runningCount: number;
    queuedCount: number;
    failedCount: number;
    progressPercent: number;
    modelVersion: string;
    items: ThreeDBatchItemState[];
    nodeId?: string;
    tabId?: string;
    error?: string;
}

export const STORAGE_KEY_THREED_BATCH_JOBS = 'tripo_3d_batch_jobs_v1';
export const THREED_BATCH_CHANGE_EVENT = 'threed-batch-jobs-changed';

export const getStored3DBatchJobs = (): ThreeDBatchJob[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_THREED_BATCH_JOBS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch {}
    return [];
};

export const saveStored3DBatchJob = (job: ThreeDBatchJob): void => {
    try {
        const existing = getStored3DBatchJobs();
        const idx = existing.findIndex(j => j.id === job.id);
        let updated: ThreeDBatchJob[];
        if (idx >= 0) {
            updated = [...existing];
            updated[idx] = { ...updated[idx], ...job, updatedAt: Date.now() };
        } else {
            updated = [job, ...existing];
        }
        localStorage.setItem(STORAGE_KEY_THREED_BATCH_JOBS, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(THREED_BATCH_CHANGE_EVENT, { detail: updated }));
        }
    } catch (e) {
        console.warn('Failed to save 3D batch job:', e);
    }
};

export const removeStored3DBatchJob = (batchId: string): void => {
    try {
        const existing = getStored3DBatchJobs();
        const updated = existing.filter(j => j.id !== batchId);
        localStorage.setItem(STORAGE_KEY_THREED_BATCH_JOBS, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(THREED_BATCH_CHANGE_EVENT, { detail: updated }));
        }
    } catch (e) {
        console.warn('Failed to remove 3D batch job:', e);
    }
};

export const deleteStored3DBatchJob = removeStored3DBatchJob;

export const clearStored3DBatchJobs = (): void => {
    try {
        localStorage.setItem(STORAGE_KEY_THREED_BATCH_JOBS, JSON.stringify([]));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(THREED_BATCH_CHANGE_EVENT, { detail: [] }));
        }
    } catch (e) {
        console.warn('Failed to clear 3D batch jobs:', e);
    }
};

/**
 * Download ZIP archive containing all JSON metadata files for all tasks in a batch
 */
export const downloadAllBatchMetadataJsonZip = async (job: ThreeDBatchJob): Promise<void> => {
    const zip = new JSZip();
    const folderName = `3D_Batch_Metadata_${job.assetBaseName || 'Models'}_${new Date(job.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}`;
    const batchFolder = zip.folder(folderName) || zip;

    // Master manifest
    const manifest = {
        batchId: job.id,
        name: job.name,
        assetBaseName: job.assetBaseName,
        createdAt: new Date(job.createdAt).toISOString(),
        completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
        status: job.status,
        totalTasks: job.items.length,
        tasks: job.items.map((it, idx) => ({
            index: idx + 1,
            packName: it.packName,
            taskId: it.taskId || null,
            status: it.status,
            progress: it.progress,
            modelUrl: it.modelUrl || null,
            thumbnailUrl: it.thumbnailUrl || null,
            renderedImageUrl: it.renderedImageUrl || null,
            error: it.error || null,
            startedAt: it.startedAt ? new Date(it.startedAt).toISOString() : null,
            completedAt: it.completedAt ? new Date(it.completedAt).toISOString() : null
        }))
    };
    batchFolder.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Individual JSON per task
    job.items.forEach((item, idx) => {
        const itemJson = {
            task_id: item.taskId || `pending_${idx + 1}`,
            asset_name: item.packName || `${job.assetBaseName}_${idx + 1}`,
            index: idx + 1,
            status: item.status,
            progress: item.progress,
            model_url: item.modelUrl || null,
            thumbnail_url: item.thumbnailUrl || null,
            rendered_image_url: item.renderedImageUrl || null,
            created_at: new Date(item.createdAt).toISOString(),
            completed_at: item.completedAt ? new Date(item.completedAt).toISOString() : null,
            error: item.error || null,
            batch_id: job.id
        };
        const filename = `${format3DAssetFilename(item.packName || job.assetBaseName, item.packIndex, 'json', item.createdAt)}`;
        batchFolder.file(filename, JSON.stringify(itemJson, null, 2));
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${folderName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

/**
 * Format clean filename: Asset_name_Index_Date_Time.ext
 * e.g. "CyberBot_01_20261002_114321.glb"
 */
export const format3DAssetFilename = (
    assetName: string, 
    index?: number | string, 
    extension: string = 'glb', 
    timestamp?: number
): string => {
    const now = new Date(timestamp || Date.now());
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const cleanName = (assetName || 'Asset').trim().replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_') || 'Asset';
    
    let indexPart = '';
    if (index !== undefined && index !== null && String(index).trim() !== '') {
        const padIdx = typeof index === 'number' ? String(index).padStart(2, '0') : String(index).replace(/[^a-zA-Z0-9_-]/g, '');
        indexPart = `${padIdx}_`;
    }

    const cleanExt = extension.replace(/^\./, '').toLowerCase();
    return `${cleanName}_${indexPart}${dateStr}_${timeStr}.${cleanExt}`;
};

/**
 * Automatically trigger browser download for a .GLB file from remote URL
 */
export const download3DModelFromUrl = (url: string, filename: string): void => {
    try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        logTripo('success', `Started download for 3D model: ${filename}`);
    } catch (e) {
        console.error('Failed to trigger 3D model download', e);
    }
};

/**
 * Download ZIP archive containing all completed 3D models in a batch
 */
export const downloadAllBatch3DModelsZip = async (
    job: ThreeDBatchJob,
    onProgress?: (percent: number, statusText: string) => void
): Promise<void> => {
    const completedItems = job.items.filter(it => it.status === 'success' && Boolean(it.modelUrl));
    if (completedItems.length === 0) {
        throw new Error('No completed 3D models found in this batch.');
    }

    const zip = new JSZip();
    const folderName = `3D_Batch_${job.assetBaseName || 'Models'}_${new Date(job.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}`;
    const batchFolder = zip.folder(folderName) || zip;

    // Add batch summary metadata JSON
    const metadataSummary = {
        batchId: job.id,
        name: job.name,
        assetBaseName: job.assetBaseName,
        createdAt: new Date(job.createdAt).toISOString(),
        completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : new Date().toISOString(),
        totalModels: completedItems.length,
        models: completedItems.map(it => ({
            packIndex: it.packIndex,
            packName: it.packName,
            taskId: it.taskId,
            modelUrl: it.modelUrl,
            thumbnailUrl: it.thumbnailUrl,
            renderedImageUrl: it.renderedImageUrl
        }))
    };
    batchFolder.file('batch_summary.json', JSON.stringify(metadataSummary, null, 2));

    for (let i = 0; i < completedItems.length; i++) {
        const item = completedItems[i];
        if (onProgress) {
            onProgress(Math.round((i / completedItems.length) * 90), `Fetching model ${i + 1}/${completedItems.length}...`);
        }

        try {
            if (item.modelUrl) {
                const res = await fetch(item.modelUrl);
                if (res.ok) {
                    const blob = await res.blob();
                    const filename = format3DAssetFilename(item.packName || job.assetBaseName, item.packIndex, 'glb', item.completedAt || item.createdAt);
                    batchFolder.file(filename, blob);
                }
            }
        } catch (fetchErr) {
            console.warn(`Failed to fetch model ${item.packName} for ZIP:`, fetchErr);
        }
    }

    if (onProgress) {
        onProgress(95, 'Generating ZIP archive...');
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${folderName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    if (onProgress) {
        onProgress(100, 'ZIP downloaded successfully!');
    }
};

export interface Start3DBatchOptions {
    packs: BatchPreparePack[];
    assetBaseName?: string;
    nodeId?: string;
    tabId?: string;
    tripoParams?: {
        modelVersion?: string;
        texture?: boolean;
        textureQuality?: any;
        textureAlignment?: any;
        pbr?: boolean;
        quadMesh?: boolean;
        faceLimit?: number;
        modelSeed?: number;
        textureSeed?: number;
        autoSave3d?: boolean;
        autoSaveJson?: boolean;
        concurrencyLimit?: number; // 1 to 10 (default 5)
    };
    onJobUpdated?: (job: ThreeDBatchJob) => void;
    onItemTaskCreated?: (item: ThreeDBatchItemState, jsonFilename?: string) => void;
    onItemCompleted?: (item: ThreeDBatchItemState, modelFilename?: string) => void;
    onItemFailed?: (item: ThreeDBatchItemState, error: string) => void;
    onBatchFinished?: (job: ThreeDBatchJob) => void;
    addToHistory?: (previewUrl: string, prompt: string, model: string, meta?: any) => Promise<void> | void;
    signal?: AbortSignal;
}

/**
 * 3D Batch Generation Orchestrator
 * - Iterates through the pack buffer
 * - Dispatches tasks to Tripo API to immediately obtain and persist task_ids
 * - Manages parallel background generation workers (up to max concurrency, e.g. 5-10)
 * - Automatically saves task metadata JSONs and downloads .GLB assets upon completion
 * - Unifies all sub-tasks into a single master batch record
 */
export const run3DBatchGeneration = async (options: Start3DBatchOptions): Promise<ThreeDBatchJob> => {
    const {
        packs,
        assetBaseName = 'Asset_Name',
        nodeId,
        tabId,
        tripoParams = {},
        onJobUpdated,
        onItemTaskCreated,
        onItemCompleted,
        onItemFailed,
        onBatchFinished,
        addToHistory,
        signal
    } = options;

    const activePacks = (packs || []).filter(p => p.enabled !== false);
    if (!activePacks || activePacks.length === 0) {
        throw new Error('No active packs provided in the Pack Buffer for 3D Batch Generation.');
    }

    const apiKey = getTripoApiKey();
    if (!isTripoEnabled() || !apiKey) {
        throw new Error('Tripo AI API key is not configured or disabled in Settings.');
    }

    const modelVersion = tripoParams.modelVersion || getTripoModelVersion();
    const autoSave3d = tripoParams.autoSave3d !== false;
    const autoSaveJson = tripoParams.autoSaveJson !== false;
    const concurrencyLimit = Math.min(10, Math.max(1, tripoParams.concurrencyLimit || 5));

    const batchId = `threed-batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const batchName = `3D_Batch_${assetBaseName}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

    // Initialize Batch Job State with all items queued
    const initialItems: ThreeDBatchItemState[] = activePacks.map((pack, idx) => ({
        id: pack.id || `pack-${idx + 1}`,
        packIndex: idx + 1,
        packName: pack.name || `${assetBaseName}_${String(idx + 1).padStart(2, '0')}`,
        views: { ...pack.views },
        mutedViews: { ...(pack.mutedViews || {}) },
        status: 'queued',
        progress: 0,
        createdAt: Date.now() + idx
    }));

    let job: ThreeDBatchJob = {
        id: batchId,
        name: batchName,
        assetBaseName,
        createdAt: Date.now(),
        status: 'running',
        totalCount: initialItems.length,
        completedCount: 0,
        runningCount: 0,
        queuedCount: initialItems.length,
        failedCount: 0,
        progressPercent: 0,
        modelVersion,
        items: initialItems,
        nodeId,
        tabId
    };

    saveStored3DBatchJob(job);
    onJobUpdated?.(job);

    logTripo('info', `🚀 Starting 3D Batch Generation [${job.id}]: ${job.totalCount} packs, Concurrency limit: ${concurrencyLimit}`);

    // Helper to update state and notify listeners
    const updateJob = (updater: (prev: ThreeDBatchJob) => ThreeDBatchJob) => {
        job = updater(job);
        
        // Recalculate summary metrics
        const total = job.items.length;
        const completed = job.items.filter(it => it.status === 'success').length;
        const running = job.items.filter(it => it.status === 'running' || it.status === 'uploading').length;
        const queued = job.items.filter(it => it.status === 'queued').length;
        const failed = job.items.filter(it => it.status === 'failed' || it.status === 'cancelled').length;
        
        const sumProgress = job.items.reduce((acc, it) => acc + (it.status === 'success' ? 100 : (it.progress || 0)), 0);
        const percent = total > 0 ? Math.round(sumProgress / total) : 0;

        job.completedCount = completed;
        job.runningCount = running;
        job.queuedCount = queued;
        job.failedCount = failed;
        job.progressPercent = percent;

        if (completed + failed === total) {
            job.status = completed > 0 ? 'completed' : 'failed';
            job.completedAt = Date.now();
        }

        saveStored3DBatchJob(job);
        onJobUpdated?.({ ...job });
    };

    // Worker function for a single pack
    const processSinglePack = async (item: ThreeDBatchItemState): Promise<void> => {
        if (signal?.aborted) {
            updateJob(prev => ({
                ...prev,
                items: prev.items.map(it => it.id === item.id ? { ...it, status: 'cancelled', error: 'Batch cancelled by user' } : it)
            }));
            return;
        }

        const effectiveFront = item.mutedViews?.front ? null : item.views.front;
        const effectiveBack = item.mutedViews?.back ? null : item.views.back;
        const effectiveLeft = item.mutedViews?.left ? null : item.views.left;
        const effectiveRight = item.mutedViews?.right ? null : item.views.right;

        const activeViewsList = [effectiveFront, effectiveBack, effectiveLeft, effectiveRight].filter(Boolean);

        if (activeViewsList.length === 0) {
            updateJob(prev => ({
                ...prev,
                items: prev.items.map(it => it.id === item.id ? { ...it, status: 'failed', error: 'No active view images in pack' } : it)
            }));
            onItemFailed?.(item, 'No active view images in pack');
            return;
        }

        updateJob(prev => ({
            ...prev,
            items: prev.items.map(it => it.id === item.id ? { ...it, status: 'uploading', progress: 5, startedAt: Date.now() } : it)
        }));

        try {
            let createRes;
            const itemPrompt = `3D Asset ${item.packName}`;

            // 1. Dispatch creation to Tripo API to obtain Task ID immediately
            if (activeViewsList.length === 1 || !effectiveBack && !effectiveLeft && !effectiveRight) {
                // Single Image Mode
                createRes = await createImageTo3DTask({
                    image: (effectiveFront || activeViewsList[0])!,
                    texture: tripoParams.texture !== false,
                    textureQuality: tripoParams.textureQuality || 'standard',
                    textureAlignment: tripoParams.textureAlignment || 'original_image',
                    pbr: tripoParams.pbr !== false,
                    quadMesh: tripoParams.quadMesh || false,
                    faceLimit: tripoParams.faceLimit,
                    modelSeed: tripoParams.modelSeed,
                    textureSeed: tripoParams.textureSeed,
                    modelVersion,
                    prompt: itemPrompt
                }, signal);
            } else {
                // Multiview Mode
                createRes = await createMultiviewTo3DTask({
                    views: {
                        front: effectiveFront!,
                        back: effectiveBack || undefined,
                        left: effectiveLeft || undefined,
                        right: effectiveRight || undefined
                    },
                    texture: tripoParams.texture !== false,
                    textureQuality: tripoParams.textureQuality || 'standard',
                    textureAlignment: tripoParams.textureAlignment || 'original_image',
                    pbr: tripoParams.pbr !== false,
                    quadMesh: tripoParams.quadMesh || false,
                    faceLimit: tripoParams.faceLimit,
                    modelSeed: tripoParams.modelSeed,
                    textureSeed: tripoParams.textureSeed,
                    modelVersion,
                    prompt: itemPrompt
                }, signal);
            }

            const issuedTaskId = createRes.taskId;
            
            // 2. Immediately persist Task ID and trigger Auto-Download JSON
            updateJob(prev => ({
                ...prev,
                items: prev.items.map(it => it.id === item.id ? { 
                    ...it, 
                    taskId: issuedTaskId, 
                    status: 'running', 
                    progress: 15 
                } : it)
            }));

            let jsonFilename = '';
            if (autoSaveJson) {
                try {
                    jsonFilename = downloadTaskMetadataJson({
                        taskId: issuedTaskId,
                        type: 'multiview_to_3d',
                        prompt: itemPrompt,
                        modelVersion,
                        status: 'queued',
                        progress: 15,
                        createdAt: Date.now()
                    }, item.packName, item.packIndex);
                } catch (jsonErr) {
                    console.warn('Auto-save metadata JSON error:', jsonErr);
                }
            }

            onItemTaskCreated?.({ ...item, taskId: issuedTaskId }, jsonFilename);

            // 3. Poll Tripo API task until completion
            const taskResult: TripoTaskResult = await pollTripoTask(
                issuedTaskId,
                (progress, statusText) => {
                    updateJob(prev => ({
                        ...prev,
                        items: prev.items.map(it => it.id === item.id ? {
                            ...it,
                            progress,
                            status: (statusText === 'uploading' ? 'uploading' : 'running') as any
                        } : it)
                    }));
                },
                signal,
                2000,
                300000 // 5 minutes max per task
            );

            if (taskResult.status === 'success' && taskResult.modelUrl) {
                const completedItem: ThreeDBatchItemState = {
                    ...item,
                    taskId: issuedTaskId,
                    status: 'success',
                    progress: 100,
                    modelUrl: taskResult.modelUrl,
                    thumbnailUrl: taskResult.thumbnailUrl,
                    renderedImageUrl: taskResult.renderedImageUrl,
                    completedAt: Date.now()
                };

                updateJob(prev => ({
                    ...prev,
                    items: prev.items.map(it => it.id === item.id ? completedItem : it)
                }));

                // Auto-download .GLB model
                const modelFilename = format3DAssetFilename(item.packName || assetBaseName, item.packIndex, 'glb', Date.now());
                if (autoSave3d) {
                    download3DModelFromUrl(taskResult.modelUrl, modelFilename);
                }

                // Update final metadata JSON if requested
                if (autoSaveJson) {
                    try {
                        downloadTaskMetadataJson({
                            taskId: issuedTaskId,
                            type: 'multiview_to_3d',
                            prompt: itemPrompt,
                            modelVersion,
                            status: 'success',
                            progress: 100,
                            modelUrl: taskResult.modelUrl,
                            thumbnailUrl: taskResult.thumbnailUrl,
                            renderedImageUrl: taskResult.renderedImageUrl,
                            createdAt: Date.now()
                        }, item.packName, item.packIndex);
                    } catch (saveJsonErr) {
                        console.warn('Final JSON metadata save error:', saveJsonErr);
                    }
                }

                // Add to History
                if (addToHistory) {
                    const preview = taskResult.renderedImageUrl || taskResult.thumbnailUrl || effectiveFront || '';
                    try {
                        await addToHistory(
                            preview,
                            `[Batch 3D #${item.packIndex}] ${item.packName}`,
                            modelVersion,
                            {
                                mediaType: '3d',
                                modelUrl: taskResult.modelUrl,
                                thumbnailUrl: taskResult.thumbnailUrl,
                                taskId: issuedTaskId,
                                batchId
                            }
                        );
                    } catch (hErr) {
                        console.warn('Add to history failed:', hErr);
                    }
                }

                playTaskSuccessSound();
                onItemCompleted?.(completedItem, modelFilename);
            } else {
                throw new Error(taskResult.error || 'Tripo generation returned failure');
            }
        } catch (err: any) {
            const isAbort = err?.name === 'AbortError' || signal?.aborted;
            const errMsg = err?.message || '3D generation failed';

            const failedItem: ThreeDBatchItemState = {
                ...item,
                status: isAbort ? 'cancelled' : 'failed',
                error: errMsg,
                completedAt: Date.now()
            };

            updateJob(prev => ({
                ...prev,
                items: prev.items.map(it => it.id === item.id ? failedItem : it)
            }));

            if (!isAbort) {
                logTripo('error', `Pack #${item.packIndex} "${item.packName}" failed: ${errMsg}`);
                onItemFailed?.(failedItem, errMsg);
            }
        }
    };

    // Parallel Worker Pool Scheduler (Concurrency up to concurrencyLimit, e.g. 5-10)
    const queue = [...initialItems];
    const inFlight = new Set<Promise<void>>();

    while (queue.length > 0 || inFlight.size > 0) {
        if (signal?.aborted) break;

        while (queue.length > 0 && inFlight.size < concurrencyLimit) {
            const nextItem = queue.shift()!;
            const itemPromise = processSinglePack(nextItem);
            const tracker: Promise<void> = itemPromise.then(
                () => { inFlight.delete(tracker); },
                () => { inFlight.delete(tracker); }
            );
            inFlight.add(tracker);
        }

        if (inFlight.size > 0) {
            await Promise.race(inFlight);
        }
    }

    if (inFlight.size > 0) {
        await Promise.allSettled(Array.from(inFlight));
    }

    // Finalize Batch Job
    const finalJob = getStored3DBatchJobs().find(j => j.id === batchId) || job;
    if (finalJob.completedCount > 0) {
        playBatchSuccessSound();
    } else if (finalJob.failedCount > 0) {
        playBatchErrorSound();
    }

    logTripo('success', `🎉 3D Batch Completed [${batchId}]: ${finalJob.completedCount}/${finalJob.totalCount} models successful!`);
    onBatchFinished?.(finalJob);

    return finalJob;
};
