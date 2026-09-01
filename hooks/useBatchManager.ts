import { useState, useEffect, useCallback, useRef } from 'react';
import { BatchJobRecord, BatchJobItem, BatchJobState, TaskStatus, ToastType } from '../types';
import { 
    createBatchImageJob, 
    getBatchJobStatus, 
    cancelBatchJobService, 
    extractImagesFromBatchJob,
    listAllRemoteBatchJobs,
    BatchRequestItemInput
} from '../services/geminiService';
import { clearAllOpenAiBatches } from '../services/openaiService';
import { generateThumbnail, cropImageTo169 } from '../utils/imageUtils';
import { recordGenerationEvent } from '../utils/generationStats';

const STORAGE_KEY_BATCH_JOBS = 'gemini_batch_jobs_v1';
const STORAGE_KEY_BATCH_MODE = 'settings_isBatchMode';
const STORAGE_KEY_RESTORE_FINISHED_CARDS = 'task_queue_restore_finished_cards';
const STORAGE_KEY_RESTORE_FAILED_CARDS = 'task_queue_restore_failed_cards';

export interface UseBatchManagerProps {
    updateNodeInStorage?: (tabId: string, nodeId: string, updater: (nodeVal: any) => any, cacheData?: { frame: number; url: string }) => void;
    setFullSizeImage?: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    addToHistory?: (imageUrl: string, prompt: string, model: string, meta?: any) => void;
    addToast?: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
    enqueueTask?: (options: any) => string;
    updateTaskByBatchJob?: (batchJobIdOrName: string, patch: Partial<any>) => void;
    triggerAutoSave?: () => Promise<void> | void;
    t?: (key: string) => string;
}

export const useBatchManager = ({
    updateNodeInStorage,
    setFullSizeImage,
    addToHistory,
    addToast,
    enqueueTask,
    updateTaskByBatchJob,
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
        const job = batchJobsRef.current.find(j => j.id === jobIdOrName || j.name === jobIdOrName);
        if (!job) {
            console.warn(`Job not found for results fetch: ${jobIdOrName}`);
            return;
        }

        const targetJobId = job.id;
        setFetchingJobIds(prev => ({ ...prev, [targetJobId]: true }));

        const shouldRestore = options?.forceRestore !== undefined
            ? options.forceRestore
            : (restoreFinishedCardsRef.current || true);

        try {
            // Check if job items already have resultUrl populated
            const existingUrlsCount = (job.items || []).filter(it => !!it.resultUrl).length;
            if (existingUrlsCount > 0 && existingUrlsCount === (job.items || []).length) {
                let successCount = 0;
                for (let i = 0; i < job.items.length; i++) {
                    const item = job.items[i];
                    if (item.resultUrl) {
                        successCount++;
                        const frameNum = item.frameIndex !== undefined ? item.frameIndex : i;
                        const thumb = await generateThumbnail(item.resultUrl, 256, 256);

                        if (shouldRestore) {
                            if (setFullSizeImage && job.nodeId) {
                                setFullSizeImage(job.nodeId, job.isSequence ? 1000 + frameNum : frameNum, item.resultUrl);
                            }

                            if (updateNodeInStorage && job.tabId && job.nodeId) {
                                if (job.isSequence) {
                                    updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => {
                                        const seqOutputs = [...(prevNode.sequenceOutputs || [])];
                                        seqOutputs[frameNum] = { status: 'done', thumbnail: thumb };
                                        return { ...prevNode, sequenceOutputs: seqOutputs };
                                    }, { frame: 1000 + frameNum, url: item.resultUrl });
                                } else {
                                    updateNodeInStorage(job.tabId, job.nodeId, (prevNode: any) => ({
                                        ...prevNode,
                                        outputImage: thumb
                                    }), { frame: 0, url: item.resultUrl });
                                }
                            }
                        }
                    }
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

                    // Cache full size image and update canvas node if shouldRestore is true
                    if (shouldRestore) {
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
                    }

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
                        id: ext.id || prevItem?.id || `item-${i}`,
                        frameIndex: frameNum,
                        prompt,
                        aspectRatio: prevItem?.aspectRatio,
                        resolution: prevItem?.resolution,
                        status: 'completed',
                        resultUrl: finalUrl
                    });
                } else {
                    const err = ext.error || 'Generation failed in batch response';
                    updatedItems.push({
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
            persistBatchJobs(prev => prev.map(j => {
                if (j.id === targetJobId) {
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

            if (addToast) {
                const toastMsg = (t?.('batch.completedToast') || 'Batch job completed: {count} images generated!')
                    .replace('{count}', String(successCount));
                addToast(toastMsg, 'success');
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
            if (addToast) {
                addToast(`Failed to download batch results: ${e?.message || e}`, 'error');
            }
        } finally {
            setFetchingJobIds(prev => ({ ...prev, [targetJobId]: false }));
        }
    }, [updateNodeInStorage, setFullSizeImage, addToHistory, addToast, persistBatchJobs, triggerAutoSave, t]);

    // 4. Poll specific Batch Job status (Update status without auto-downloading large assets)
    const checkBatchJob = useCallback(async (jobIdOrName: string) => {
        const job = batchJobsRef.current.find(j => j.id === jobIdOrName || j.name === jobIdOrName);
        if (!job) return;

        try {
            const sdkJob = await getBatchJobStatus(job.name);
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
            const allActiveJobs = batchJobsRef.current.filter(j => j.state === 'PENDING' || j.state === 'RUNNING');
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
                updateNodeInStorage(tabId, nodeId, (prevNode: any) => ({
                    ...prevNode,
                    outputImage: null
                }));
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
                nodeTitle: nodeTitle || 'Image Editor',
                prompt: promptSummary,
                type: isSequence ? 'sequence_frame' : 'image_edit',
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

    return {
        isBatchMode,
        setIsBatchMode,
        restoreFinishedCards,
        setRestoreFinishedCards,
        restoreFailedCards,
        setRestoreFailedCards,
        batchJobs,
        isPolling,
        isBatchPolling: isPolling,
        fetchingJobIds,
        fetchBatchJobResults,
        createBatchGeneration,
        checkBatchJob,
        pollActiveBatchJobs,
        cancelBatchJob,
        deleteBatchJob,
        clearFinishedBatchJobs,
        clearAllBatchJobs
    };
};
