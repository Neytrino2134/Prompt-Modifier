import { useState, useEffect, useCallback, useRef } from 'react';
import { BatchJobRecord, BatchJobState, TaskStatus, ToastType } from '../types';
import { 
    createBatchImageJob, 
    getBatchJobStatus, 
    cancelBatchJobService, 
    extractImagesFromBatchJob,
    BatchRequestItemInput
} from '../services/geminiService';
import { generateThumbnail, cropImageTo169 } from '../utils/imageUtils';
import { addMetadataToPNG } from '../utils/pngMetadata';

const STORAGE_KEY_BATCH_JOBS = 'gemini_batch_jobs_v1';
const STORAGE_KEY_BATCH_MODE = 'settings_isBatchMode';

// Local download trigger
const triggerDownload = (url: string, prompt: string, frameNumber: number = 0) => {
    let assetUrl = url;
    if (url.startsWith('data:image/png')) {
        assetUrl = addMetadataToPNG(url, 'prompt', prompt);
    }
    const link = document.createElement('a');
    link.href = assetUrl;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const paddedFrame = String(frameNumber).padStart(3, '0');
    const filename = `Batch_Image_${paddedFrame}_${date}_${time}.png`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export interface UseBatchManagerProps {
    updateNodeInStorage?: (tabId: string, nodeId: string, updater: (nodeVal: any) => any, cacheData?: { frame: number; url: string }) => void;
    setFullSizeImage?: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    addToHistory?: (imageUrl: string, prompt: string, model: string, meta?: any) => void;
    addToast?: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
    enqueueTask?: (options: any) => string;
    t?: (key: string) => string;
}

export const useBatchManager = ({
    updateNodeInStorage,
    setFullSizeImage,
    addToHistory,
    addToast,
    enqueueTask,
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
                    if (setFullSizeImage) {
                        setFullSizeImage(job.nodeId, job.isSequence ? 1000 + frameNum : frameNum, finalUrl);
                    }

                    // Update canvas node storage
                    if (updateNodeInStorage && job.tabId) {
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

                    // Trigger auto download if enabled
                    if (item.autoDownload) {
                        triggerDownload(finalUrl, item.prompt, frameNum + 1);
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
                    if (updateNodeInStorage && job.tabId) {
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
    }, [updateNodeInStorage, setFullSizeImage, addToHistory, addToast, persistBatchJobs, t]);

    // 4. Poll specific Batch Job
    const checkBatchJob = useCallback(async (jobIdOrName: string) => {
        const job = batchJobsRef.current.find(j => j.id === jobIdOrName || j.name === jobIdOrName);
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
                    if (j.id === job.id) {
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
                if (updateNodeInStorage && job.tabId) {
                    job.items.forEach(it => {
                        const frameNum = it.frameIndex !== undefined ? it.frameIndex : 0;
                        if (job.isSequence) {
                            updateNodeInStorage(job.tabId!, job.nodeId, (prev: any) => {
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
            } else {
                // RUNNING or PENDING
                persistBatchJobs(prev => prev.map(j => {
                    if (j.id === job.id) {
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

    // 5. Poll all active batch jobs
    const pollActiveBatchJobs = useCallback(async () => {
        const activeJobs = batchJobsRef.current.filter(j => j.state === 'PENDING' || j.state === 'RUNNING');
        if (activeJobs.length === 0) return;

        setIsPolling(true);
        try {
            for (const job of activeJobs) {
                await checkBatchJob(job.id);
            }
        } finally {
            setIsPolling(false);
        }
    }, [checkBatchJob]);

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

        return batchRecord;
    }, [persistBatchJobs, updateNodeInStorage, enqueueTask, addToast, t]);

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
