import { useState, useEffect, useCallback, useRef } from 'react';
import { BatchJobRecord, BatchJobState, TaskStatus, ToastType } from '../types';
import { 
    createBatchImageJob, 
    getBatchJobStatus, 
    cancelBatchJobService, 
    extractImagesFromBatchJob,
    listAllRemoteBatchJobs,
    BatchRequestItemInput
} from '../services/geminiService';
import { generateThumbnail, cropImageTo169 } from '../utils/imageUtils';

const STORAGE_KEY_BATCH_JOBS = 'gemini_batch_jobs_v1';
const STORAGE_KEY_BATCH_MODE = 'settings_isBatchMode';

export interface UseBatchManagerProps {
    updateNodeInStorage?: (tabId: string, nodeId: string, updater: (nodeVal: any) => any, cacheData?: { frame: number; url: string }) => void;
    setFullSizeImage?: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    addToHistory?: (imageUrl: string, prompt: string, model: string, meta?: any) => void;
    addToast?: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
    enqueueTask?: (options: any) => string;
    triggerAutoSave?: () => Promise<void> | void;
    t?: (key: string) => string;
}

export const useBatchManager = ({
    updateNodeInStorage,
    setFullSizeImage,
    addToHistory,
    addToast,
    enqueueTask,
    triggerAutoSave,
    t
}: UseBatchManagerProps = {}) => {
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

    // 2. Persistent Batch Jobs State
    const [batchJobs, setBatchJobs] = useState<BatchJobRecord[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_BATCH_JOBS);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error("Failed to load batch jobs from storage", e);
        }
        return [];
    });

    const batchJobsRef = useRef<BatchJobRecord[]>(batchJobs);
    batchJobsRef.current = batchJobs;

    const [isPolling, setIsPolling] = useState<boolean>(false);

    // Save batch jobs to localStorage whenever changed
    const persistBatchJobs = useCallback((updater: (prev: BatchJobRecord[]) => BatchJobRecord[]) => {
        setBatchJobs(prev => {
            const next = updater(prev);
            try {
                localStorage.setItem(STORAGE_KEY_BATCH_JOBS, JSON.stringify(next));
            } catch (e) {
                console.error("Failed to persist batch jobs", e);
            }
            return next;
        });
    }, []);

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

    // 3. Process Completed Batch Job Results
    const handleJobCompleted = useCallback(async (job: BatchJobRecord, sdkJob: any) => {
        try {
            const itemsMeta = job.items.map(item => ({
                id: item.id,
                prompt: item.prompt
            }));

            const extracted = await extractImagesFromBatchJob(sdkJob, itemsMeta);

            let successCount = 0;
            const updatedItems = [...job.items];

            for (let i = 0; i < job.items.length; i++) {
                const item = job.items[i];
                const res = extracted.find(r => r.id === item.id) || extracted[i];

                if (res?.imageUrl) {
                    successCount++;
                    let finalUrl = res.imageUrl;
                    if (item.autoCrop169) {
                        try {
                            finalUrl = await cropImageTo169(finalUrl);
                        } catch (e) {
                            console.error("Crop 16:9 failed", e);
                        }
                    }

                    const thumb = await generateThumbnail(finalUrl, 256, 256);
                    const frameNum = item.frameIndex !== undefined ? item.frameIndex : 0;

                    // Cache full size image
                    if (setFullSizeImage && job.nodeId) {
                        setFullSizeImage(job.nodeId, job.isSequence ? 1000 + frameNum : frameNum, finalUrl);
                    }

                    // Update canvas node storage
                    if (updateNodeInStorage && job.tabId && job.nodeId) {
                        if (job.isSequence) {
                            updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => {
                                const seqOutputs = [...(prevNode.sequenceOutputs || [])];
                                seqOutputs[frameNum] = { status: 'done', thumbnail: thumb };
                                return { ...prevNode, sequenceOutputs: seqOutputs };
                            }, { frame: 1000 + frameNum, url: finalUrl });
                        } else {
                            updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => ({
                                ...prevNode,
                                outputImage: thumb
                            }), { frame: 0, url: finalUrl });
                        }
                    }

                    // Add to generation history
                    if (addToHistory) {
                        addToHistory(finalUrl, item.prompt, job.model || 'gemini-3-pro-image-preview', {
                            aspectRatio: item.aspectRatio,
                            resolution: item.resolution,
                            isBatch: true,
                            batchJobName: job.name
                        });
                    }

                    updatedItems[i] = {
                        ...item,
                        status: 'completed',
                        resultUrl: finalUrl
                    };
                } else {
                    const err = res?.error || 'Generation failed in batch response';
                    updatedItems[i] = {
                        ...item,
                        status: 'failed',
                        error: err
                    };

                    const frameNum = item.frameIndex !== undefined ? item.frameIndex : 0;
                    if (updateNodeInStorage && job.tabId && job.nodeId) {
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

            // If extracted has more items than job.items (e.g. recovered job with placeholder item)
            if (extracted.length > updatedItems.length) {
                for (let k = updatedItems.length; k < extracted.length; k++) {
                    const ext = extracted[k];
                    if (ext.imageUrl) {
                        successCount++;
                        updatedItems.push({
                            id: ext.id || `item-${k}`,
                            frameIndex: k,
                            prompt: `Batch Item #${k + 1}`,
                            status: 'completed',
                            resultUrl: ext.imageUrl
                        });
                        if (addToHistory) {
                            addToHistory(ext.imageUrl, `Batch Item #${k + 1}`, job.model || 'gemini-3-pro-image-preview', {
                                isBatch: true,
                                batchJobName: job.name
                            });
                        }
                    } else {
                        updatedItems.push({
                            id: ext.id || `item-${k}`,
                            frameIndex: k,
                            prompt: `Batch Item #${k + 1}`,
                            status: 'failed',
                            error: ext.error || 'Failed'
                        });
                    }
                }
            }

            // Update job record
            persistBatchJobs(prev => prev.map(j => {
                if (j.id === job.id) {
                    return {
                        ...j,
                        state: 'SUCCEEDED',
                        completedAt: Date.now(),
                        updatedAt: Date.now(),
                        items: updatedItems
                    };
                }
                return j;
            }));

            if (addToast) {
                const toastMsg = (t?.('batch.completedToast') || 'Batch job completed: {count} images generated!')
                    .replace('{count}', String(successCount));
                addToast(toastMsg, 'success');
            }

            if (triggerAutoSave) {
                try {
                    await triggerAutoSave();
                } catch (saveErr) {
                    console.error("Auto-save on batch complete failed:", saveErr);
                }
            }
        } catch (e: any) {
            console.error("Error processing completed batch job:", e);
            persistBatchJobs(prev => prev.map(j => {
                if (j.id === job.id) {
                    return {
                        ...j,
                        state: 'FAILED',
                        error: e?.message || 'Failed to extract batch results',
                        updatedAt: Date.now()
                    };
                }
                return j;
            }));
        }
    }, [updateNodeInStorage, setFullSizeImage, addToHistory, addToast, persistBatchJobs, triggerAutoSave, t]);

    // 4. Poll specific Batch Job (with remote recovery fallback if not found locally)
    const checkBatchJob = useCallback(async (jobIdOrName: string) => {
        let job = batchJobsRef.current.find(j => j.id === jobIdOrName || j.name === jobIdOrName);

        // If not found locally in state, try querying remote API directly to recover it
        if (!job) {
            try {
                const rawRemoteJob = await getBatchJobStatus(jobIdOrName);
                if (rawRemoteJob) {
                    const rName = rawRemoteJob.name || rawRemoteJob.id || jobIdOrName;
                    const mappedState = mapSdkState(rawRemoteJob.state || rawRemoteJob.status);
                    const recoveredJob: BatchJobRecord = {
                        id: `batch-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        name: rName,
                        displayName: rawRemoteJob.displayName || `Recovered Batch (${rName.split('/').pop()})`,
                        model: rawRemoteJob.model || 'gemini-3-pro-image-preview',
                        createdAt: rawRemoteJob.createTime ? new Date(rawRemoteJob.createTime).getTime() : Date.now(),
                        updatedAt: Date.now(),
                        state: mappedState,
                        nodeId: '',
                        nodeTitle: rawRemoteJob.displayName || 'Batch Job',
                        isSequence: false,
                        items: [{
                            id: 'item-0',
                            prompt: rawRemoteJob.displayName || 'Batch Task',
                            status: (mappedState === 'SUCCEEDED' ? 'completed' : (mappedState === 'FAILED' ? 'failed' : 'queued')) as TaskStatus
                        }]
                    };
                    persistBatchJobs(prev => [recoveredJob, ...prev]);
                    job = recoveredJob;
                }
            } catch (fetchErr) {
                console.warn(`Could not recover remote job ${jobIdOrName}:`, fetchErr);
            }
        }

        if (!job) return;

        try {
            const sdkJob = await getBatchJobStatus(job.name);
            const rawState = sdkJob.state || sdkJob.status;
            const mappedState = mapSdkState(rawState);

            if (mappedState === 'SUCCEEDED') {
                await handleJobCompleted(job, sdkJob);
            } else if (mappedState === 'FAILED') {
                const errMsg = sdkJob.error?.message || 'Batch job failed on server';
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

                // Update node state to error
                if (updateNodeInStorage && job.tabId && job.nodeId) {
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

                if (addToast) {
                    addToast(`Batch job failed: ${errMsg}`, 'error');
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
            }
        } catch (err: any) {
            console.warn(`Failed to poll batch job ${job.name}:`, err);
        }
    }, [handleJobCompleted, persistBatchJobs, updateNodeInStorage, addToast]);

    // 5. Poll all active batch jobs AND discover remote batch jobs (Server-sync & recovery)
    const pollActiveBatchJobs = useCallback(async () => {
        setIsPolling(true);
        try {
            // Step 1: Discover remote batch jobs from server
            const remoteJobs = await listAllRemoteBatchJobs();
            const currentJobs = batchJobsRef.current;
            const newRecoveredRecords: BatchJobRecord[] = [];

            if (remoteJobs && remoteJobs.length > 0) {
                for (const rJob of remoteJobs) {
                    const rName = rJob.name || rJob.id;
                    if (!rName) continue;

                    const exists = currentJobs.some(j => 
                        j.name === rName || 
                        j.id === rName || 
                        (j.name && rName && (j.name.endsWith(rName) || rName.endsWith(j.name)))
                    );

                    if (!exists) {
                        const mappedState = mapSdkState(rJob.state || rJob.status);
                        const items: any[] = [];

                        if (rJob.src?.inlinedRequests && Array.isArray(rJob.src.inlinedRequests)) {
                            rJob.src.inlinedRequests.forEach((req: any, idx: number) => {
                                const promptText = req.contents?.[0]?.parts?.find((p: any) => p.text)?.text || `Batch Item #${idx + 1}`;
                                items.push({
                                    id: `item-${idx}`,
                                    frameIndex: idx,
                                    prompt: promptText,
                                    aspectRatio: req.config?.imageConfig?.aspectRatio || '1:1',
                                    resolution: req.config?.imageConfig?.imageSize || '1K',
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

            // Step 2: Poll all active or newly recovered jobs
            const allActiveJobs = batchJobsRef.current.filter(j => j.state === 'PENDING' || j.state === 'RUNNING');
            for (const job of allActiveJobs) {
                await checkBatchJob(job.id);
            }

            // Also check newly added recovered jobs that might already be SUCCEEDED but need image extraction
            for (const recJob of newRecoveredRecords) {
                if (recJob.state === 'SUCCEEDED' && recJob.items.some(it => !it.resultUrl)) {
                    await checkBatchJob(recJob.id);
                }
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
        }[];
    }): Promise<BatchJobRecord> => {
        const { nodeId, nodeTitle, tabId, tabName, model, isSequence, items } = params;

        // 1. Prepare request inputs
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

        const displayName = `${nodeTitle || 'Image Editor'} Batch - ${new Date().toLocaleTimeString()}`;

        // 2. Call Batch API (Gemini or OpenAI based on model)
        const createdSdkJob = await createBatchImageJob(batchInputs, model, displayName);

        const clientId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const batchRecord: BatchJobRecord = {
            id: clientId,
            name: createdSdkJob.name,
            displayName,
            model,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            state: mapSdkState(createdSdkJob.state),
            nodeId,
            nodeTitle: nodeTitle || 'Image Editor',
            tabId,
            tabName,
            isSequence,
            items: items.map(item => ({
                id: item.id,
                frameIndex: item.frameIndex,
                prompt: item.prompt,
                aspectRatio: item.aspectRatio,
                resolution: item.resolution,
                quality: item.quality,
                outputFormat: item.outputFormat,
                size: item.size,
                autoCrop169: item.autoCrop169,
                autoDownload: item.autoDownload,
                status: 'queued' as TaskStatus
            }))
        };

        // 3. Persist record
        persistBatchJobs(prev => [batchRecord, ...prev]);

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
                updateNodeInStorage(tabId, nodeId, (prevNode: any) => ({
                    ...prevNode,
                    outputImage: null
                }));
            }
        }

        // 5. Enqueue tasks in TaskQueue for tracking
        if (enqueueTask) {
            items.forEach(it => {
                enqueueTask({
                    nodeId,
                    nodeTitle: nodeTitle || 'Image Editor',
                    frameIndex: it.frameIndex,
                    prompt: it.prompt,
                    type: isSequence ? 'sequence_frame' : 'image_edit',
                    tabId,
                    tabName,
                    isBatch: true,
                    batchJobName: createdSdkJob.name,
                    batchJobId: clientId,
                    execute: async () => {
                        // Batch tasks are processed remotely, this serves as tracking
                        return "";
                    }
                });
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
    }, [persistBatchJobs, updateNodeInStorage, enqueueTask, addToast, triggerAutoSave, t]);

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

    // 8. Delete / Remove a batch job record
    const deleteBatchJob = useCallback((jobId: string) => {
        persistBatchJobs(prev => prev.filter(j => j.id !== jobId && j.name !== jobId));
    }, [persistBatchJobs]);

    // 9. Clear completed/failed batch jobs
    const clearFinishedBatchJobs = useCallback(() => {
        persistBatchJobs(prev => prev.filter(j => j.state === 'PENDING' || j.state === 'RUNNING'));
    }, [persistBatchJobs]);

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

    return {
        isBatchMode,
        setIsBatchMode,
        batchJobs,
        isPolling,
        isBatchPolling: isPolling,
        createBatchGeneration,
        checkBatchJob,
        pollActiveBatchJobs,
        cancelBatchJob,
        deleteBatchJob,
        clearFinishedBatchJobs
    };
};
