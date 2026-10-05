import React, { useState, useCallback, useRef } from 'react';
import { BatchJobRecord, TaskStatus } from '../../types';
import {
    createBatchImageJob,
    cancelBatchJobService,
    BatchRequestItemInput
} from '../../services/geminiService';
import {
    clearAllOpenAiBatches,
    deleteStoredOpenAiBatch,
    getStoredOpenAiBatchJsonl,
    generateOpenAiBatchJsonl,
    downloadJsonlFile
} from '../../services/openaiService';
import { recordGenerationEvent } from '../../utils/generationStats';
import { getDeviceId, formatWithDeviceTag } from '../../utils/deviceId';
import {
    CreateBatchGenerationParams,
    mapSdkState,
    STORAGE_KEY_BATCH_JOBS,
    UseBatchManagerProps
} from './types';

interface UseBatchCreationAndLifecycleOptions extends UseBatchManagerProps {
    batchJobs: BatchJobRecord[];
    batchJobsRef: React.MutableRefObject<BatchJobRecord[]>;
    setBatchJobs: React.Dispatch<React.SetStateAction<BatchJobRecord[]>>;
    persistBatchJobs: (updater: (prev: BatchJobRecord[]) => BatchJobRecord[]) => void;
}

export const useBatchCreationAndLifecycle = ({
    batchJobs,
    batchJobsRef,
    setBatchJobs,
    persistBatchJobs,
    updateNodeInStorage,
    enqueueTask,
    addToast,
    triggerAutoSave,
    t
}: UseBatchCreationAndLifecycleOptions) => {
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

    // Submit a new batch generation
    const createBatchGeneration = useCallback(async (params: CreateBatchGenerationParams): Promise<BatchJobRecord | null> => {
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

    // Cancel a batch job
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
    }, [batchJobsRef, persistBatchJobs, addToast, t]);

    // Cancel batch operations for a specific node (both formation & active server job)
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
    }, [batchJobsRef, cancelFormingBatch, cancelBatchJob, addToast, t]);

    // Delete / Remove a batch job record
    const deleteBatchJob = useCallback((jobId: string) => {
        const job = batchJobsRef.current.find(job => job.id === jobId || job.name === jobId);
        if (job?.name) deleteStoredOpenAiBatch(job.name);
        deleteStoredOpenAiBatch(jobId);
        persistBatchJobs(prev => prev.filter(j => j.id !== jobId && j.name !== jobId));
    }, [batchJobsRef, persistBatchJobs]);

    // Retry a failed batch job
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
    }, [batchJobsRef, deleteBatchJob, createBatchGeneration, addToast, t]);

    // Clear completed/failed batch jobs
    const clearFinishedBatchJobs = useCallback(() => {
        batchJobsRef.current.filter(job => job.state !== 'PENDING' && job.state !== 'RUNNING')
            .forEach(job => deleteStoredOpenAiBatch(job.name || job.id));
        persistBatchJobs(prev => prev.filter(j => j.state === 'PENDING' || j.state === 'RUNNING'));
    }, [batchJobsRef, persistBatchJobs]);

    // Clear ALL batch jobs (Both Gemini batch jobs and OpenAI batch storage)
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
    }, [setBatchJobs, batchJobsRef, addToast, t]);

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
    }, [batchJobsRef]);

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
    }, [batchJobsRef, getBatchJobJsonl, addToast]);

    return {
        formingBatchNodeIds,
        isFormingBatch,
        getNodeActiveBatchJob,
        isNodeBatchActive,
        registerFormingBatch,
        unregisterFormingBatch,
        cancelFormingBatch,
        createBatchGeneration,
        cancelBatchJob,
        cancelBatchForNode,
        deleteBatchJob,
        retryBatchJob,
        clearFinishedBatchJobs,
        clearAllBatchJobs,
        getBatchJobJsonl,
        downloadBatchJsonl
    };
};
