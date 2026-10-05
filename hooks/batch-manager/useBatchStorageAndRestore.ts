import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BatchJobRecord, BatchJobItem, NodeType, TaskStatus } from '../../types';
import { getBatchJobStatus, extractImagesFromBatchJob } from '../../services/geminiService';
import { generateThumbnail, cropImageTo169 } from '../../utils/imageUtils';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { batchResultKey, readBatchArchive, writeBatchArchive, clearUnusedBatchArchives, imageHashes } from '../../services/batchResultsCache';
import { collectCacheReferences } from '../../utils/cacheReferences';
import { playBatchSuccessSound, playBatchErrorSound } from '../../services/soundNotificationService';
import { STORAGE_KEY_BATCH_JOBS, UseBatchManagerProps } from './types';

interface UseBatchStorageAndRestoreOptions extends UseBatchManagerProps {
    restoreFinishedCardsRef: React.MutableRefObject<boolean>;
    restoreFailedCardsRef: React.MutableRefObject<boolean>;
}

export const useBatchStorageAndRestore = ({
    getCacheProtection,
    getTargetNode,
    updateNodeInStorage,
    setFullSizeImage,
    addToHistory,
    addToast,
    updateTaskByBatchJob,
    completeBatchTasksForNode,
    triggerAutoSave,
    t,
    restoreFinishedCardsRef,
    restoreFailedCardsRef
}: UseBatchStorageAndRestoreOptions) => {
    // Persistent Batch Jobs State with strict filtering to prevent corrupt objects
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
            await writeBatchArchive(
                batchResultKey(job),
                { items, rawJsonl: job.rawJsonl },
                items.flatMap(item => [item.resultUrl, item.resultThumbnail].filter((url): url is string => !!url)),
                sourceKeys
            );
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
                        ...current,
                        resultsCached: true,
                        rawJsonl: archived!.rawJsonl ?? current.rawJsonl,
                        items: archived!.items.map(item => ({
                            ...current.items.find(old => old.id === item.id),
                            ...item,
                            savedToDisk: current.items.find(old => old.id === item.id)?.savedToDisk ?? item.savedToDisk
                        }))
                    } : current));
                } catch (error) {
                    console.warn('Could not load local batch archive:', error);
                }
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
            const result = await clearUnusedBatchArchives({
                before,
                keys: [...references.keys],
                imageHashes: await imageHashes(references.images)
            });
            addToast?.((t?.('batch.cacheCleared') || 'Removed {count} unused archives ({size} MB).')
                .replace('{count}', String(result.removed)).replace('{size}', (result.bytes / 1024 / 1024).toFixed(1)), 'info');
            if (result.skipped) addToast?.(t?.('batch.cacheSkipped') || 'Unreadable archives were retained for recovery.', 'warning');
            return result;
        } catch (error) {
            console.error('Batch cache cleanup failed:', error);
            addToast?.(t?.('batch.cacheCleanupFailed') || 'Could not check cache references. Cleanup was stopped.', 'error');
        } finally {
            cleaningBatchCacheRef.current = false;
            setIsCleaningBatchCache(false);
        }
    }, [getCacheProtection, addToast, t]);

    // Explicit on-demand Download of Completed Batch Job Results from Server
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
            } catch (error) {
                console.warn('Saving inserted batch image failed:', error);
            }
        };

        try {
            // Read the local archive before contacting the server, even while
            // background hydration is still running after application startup.
            try {
                const archived = await readBatchArchive<{ items: BatchJobItem[]; rawJsonl?: string }>(batchResultKey(job));
                if (archived && Array.isArray(archived.items)) job = {
                    ...job,
                    resultsCached: true,
                    rawJsonl: archived.rawJsonl ?? job.rawJsonl,
                    items: archived.items.map(item => ({
                        ...job.items.find(old => old.id === item.id),
                        ...item,
                        savedToDisk: job.items.find(old => old.id === item.id)?.savedToDisk ?? item.savedToDisk
                    }))
                };
            } catch (error) {
                console.warn('Local batch cache read failed:', error);
            }
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
                                            const chars = [...prevNode];
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
    }, [getTargetNode, updateNodeInStorage, setFullSizeImage, addToHistory, addToast, persistBatchJobs, storeResults, triggerAutoSave, updateTaskByBatchJob, completeBatchTasksForNode, restoreFinishedCardsRef, restoreFailedCardsRef, t]);

    return {
        batchJobs,
        setBatchJobs,
        batchJobsRef,
        persistBatchJobs,
        fetchingJobIds,
        fetchingJobIdsRef,
        isCleaningBatchCache,
        clearUnusedBatchCache,
        fetchBatchJobResults
    };
};
