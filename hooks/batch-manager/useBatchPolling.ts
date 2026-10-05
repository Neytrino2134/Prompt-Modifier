import React, { useState, useEffect, useCallback } from 'react';
import { BatchJobRecord, TaskStatus } from '../../types';
import { getBatchJobStatus, listAllRemoteBatchJobs } from '../../services/geminiService';
import { playBatchErrorSound } from '../../services/soundNotificationService';
import { getDeviceId, isDeviceIsolationEnabled, extractDeviceId } from '../../utils/deviceId';
import {
    extractBatchAspectRatio,
    extractBatchPromptText,
    extractBatchResolution,
    mapSdkState,
    UseBatchManagerProps
} from './types';

interface UseBatchPollingOptions extends UseBatchManagerProps {
    batchJobsRef: React.MutableRefObject<BatchJobRecord[]>;
    persistBatchJobs: (updater: (prev: BatchJobRecord[]) => BatchJobRecord[]) => void;
    fetchingJobIdsRef: React.MutableRefObject<{ [jobId: string]: boolean }>;
    fetchBatchJobResults: (jobIdOrName: string, options?: { forceRestore?: boolean }) => Promise<void>;
    autoDownloadFromServerRef: React.MutableRefObject<boolean>;
    restoreFinishedCardsRef: React.MutableRefObject<boolean>;
    restoreFailedCardsRef: React.MutableRefObject<boolean>;
}

export const useBatchPolling = ({
    batchJobsRef,
    persistBatchJobs,
    fetchingJobIdsRef,
    fetchBatchJobResults,
    autoDownloadFromServerRef,
    restoreFinishedCardsRef,
    restoreFailedCardsRef,
    updateNodeInStorage,
    updateTaskByBatchJob,
    addToast,
    t
}: UseBatchPollingOptions) => {
    const [isPolling, setIsPolling] = useState<boolean>(false);

    // Poll specific Batch Job status (Update status without auto-downloading large assets)
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
    }, [batchJobsRef, persistBatchJobs, updateNodeInStorage, updateTaskByBatchJob, autoDownloadFromServerRef, fetchingJobIdsRef, fetchBatchJobResults, restoreFailedCardsRef]);

    // Poll all active batch jobs AND discover remote batch jobs (Server-sync & recovery without auto-downloading images)
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
    }, [batchJobsRef, checkBatchJob, persistBatchJobs, restoreFinishedCardsRef, restoreFailedCardsRef, addToast, t]);

    // Auto polling on mount and every 30s for active jobs
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
    }, [pollActiveBatchJobs, batchJobsRef]);

    return {
        isPolling,
        checkBatchJob,
        pollActiveBatchJobs
    };
};
