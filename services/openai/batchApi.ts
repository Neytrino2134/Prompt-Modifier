import { readBatchArchive, writeBatchArchive } from '../batchResultsCache';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { convertToPNG } from '../../utils/imageUtils';
import { getDeviceId, formatWithDeviceTag, extractDeviceId } from '../../utils/deviceId';
import {
    OPENAI_BATCH_IMAGE_EDITS_ENDPOINT,
    OPENAI_BATCH_IMAGE_GEN_ENDPOINT,
    StoredOpenAiBatch
} from './types';
import { getOpenAiApiKey, resolveOpenAiBatchModel } from './config';
import { getStoredOpenAiBatches, saveStoredOpenAiBatches } from './batchStorage';
import {
    applyCachedOutput,
    buildOpenAiBatchRequestBody,
    normalizeOpenAiBatchError,
    parseOpenAiBatchErrorLine
} from './batchJsonl';
import { triggerNextOpenAiBatchItem } from './localBatchRunner';

// ==========================================
// OpenAI Server Batch API & Lifecycle
// ==========================================

const waitForOpenAiBatchFileReady = async (fileId: string, apiKey: string): Promise<void> => {
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            throw new Error(normalizeOpenAiBatchError(errorData?.error || errorData, `OpenAI could not retrieve uploaded batch file ${fileId}`));
        }

        const fileData = await res.json();
        const status = String(fileData?.status || '').toLowerCase();
        if (!status || status === 'processed' || status === 'uploaded') {
            return;
        }
        if (status === 'error' || status === 'failed') {
            throw new Error(normalizeOpenAiBatchError(fileData?.status_details || fileData?.error, `OpenAI failed to process batch file ${fileId}`));
        }

        await new Promise(resolve => setTimeout(resolve, 500 + attempt * 300));
    }
};

/**
 * Submit an OpenAI Batch Image Job
 */
export const createOpenAiBatchImageJob = async (
    items: Array<{
        id: string;
        prompt: string;
        aspectRatio?: string;
        resolution?: string;
        size?: string;
        quality?: string;
        outputFormat?: string;
        images?: { base64ImageData: string; mimeType: string }[];
    }>,
    model: string = 'gpt-image-2.5-flare',
    displayName?: string
): Promise<{ name: string; state: string; rawJsonl?: string }> => {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new Error("OpenAI API Key is missing. Please enter your OpenAI API key in Settings.");
    }

    const currentDeviceId = getDeviceId();
    const batchInternalId = `openai_batch_${currentDeviceId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const targetModel = resolveOpenAiBatchModel(model);
    const hasInputImages = items.some(it => it.images && it.images.length > 0 && !!it.images[0]?.base64ImageData);
    const chosenEndpoint = hasInputImages ? OPENAI_BATCH_IMAGE_EDITS_ENDPOINT : OPENAI_BATCH_IMAGE_GEN_ENDPOINT;

    // Attempt OpenAI native Batch API file upload & batch creation
    let nativeBatchId: string | undefined = undefined;
    let nativeBatchCreationError: string | undefined = undefined;
    let jsonlLines: string[] = [];

    try {
        // 1. If any items have input images for /v1/images/edits, upload them to Files API first
        const uploadedFileIds: Record<number, string> = {};
        if (hasInputImages) {
            for (let i = 0; i < items.length; i++) {
                const it = items[i];
                const img = it.images?.[0];
                if (img?.base64ImageData) {
                    try {
                        const byteChars = atob(img.base64ImageData);
                        const byteNums = new Array(byteChars.length);
                        for (let j = 0; j < byteChars.length; j++) byteNums[j] = byteChars.charCodeAt(j);
                        const byteArray = new Uint8Array(byteNums);
                        const blob = new Blob([byteArray], { type: img.mimeType || 'image/png' });
                        const fileFormData = new FormData();
                        fileFormData.append('file', blob, `input_${i}.png`);
                        fileFormData.append('purpose', 'batch');
                        const uploadRes = await fetch('https://api.openai.com/v1/files', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${apiKey}` },
                            body: fileFormData
                        });
                        if (uploadRes.ok) {
                            const upData = await uploadRes.json();
                            if (upData?.id) {
                                uploadedFileIds[i] = upData.id;
                                await waitForOpenAiBatchFileReady(upData.id, apiKey);
                            }
                        }
                    } catch (err) {
                        console.warn(`Could not pre-upload image ${i} to OpenAI Files API:`, err);
                    }
                }
            }
        }

        const fallbackImage = items.find(it => it.images && it.images.length > 0 && !!it.images[0]?.base64ImageData)?.images?.[0];

        // 2. Construct JSONL lines for OpenAI Batch API
        jsonlLines = items.map((item, idx) => {
            const body = buildOpenAiBatchRequestBody(item, targetModel, chosenEndpoint, uploadedFileIds[idx], fallbackImage);

            const batchRequest = {
                custom_id: `${batchInternalId}__${item.id || idx}`,
                method: "POST",
                url: chosenEndpoint,
                body
            };

            console.log(`[OpenAI Batch Request #${idx + 1} Payload]:`, JSON.stringify(batchRequest, null, 2));

            return JSON.stringify(batchRequest);
        });

        const jsonlBlob = new Blob([jsonlLines.join('\n')], { type: 'application/json' });
        const fileFormData = new FormData();
        fileFormData.append('file', jsonlBlob, `batch_${batchInternalId}.jsonl`);
        fileFormData.append('purpose', 'batch');

        const fileRes = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: fileFormData
        });

        if (fileRes.ok) {
            const fileData = await fileRes.json();
            if (fileData?.id) {
                await waitForOpenAiBatchFileReady(fileData.id, apiKey);
                const batchRes = await fetch('https://api.openai.com/v1/batches', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        input_file_id: fileData.id,
                        endpoint: chosenEndpoint,
                        completion_window: '24h',
                        metadata: {
                            device_id: currentDeviceId,
                            deviceId: currentDeviceId
                        }
                    })
                });

                if (batchRes.ok) {
                    const batchData = await batchRes.json();
                    if (batchData?.id) {
                        nativeBatchId = batchData.id;
                    }
                } else {
                    const errorData = await batchRes.json().catch(() => null);
                    nativeBatchCreationError = normalizeOpenAiBatchError(errorData?.error || errorData, `OpenAI Batch API returned status ${batchRes.status}`);
                }
            }
        } else {
            const errorData = await fileRes.json().catch(() => null);
            nativeBatchCreationError = normalizeOpenAiBatchError(errorData?.error || errorData, `OpenAI file upload returned status ${fileRes.status}`);
        }
    } catch (e: any) {
        nativeBatchCreationError = e?.message || String(e);
    }

    if (!nativeBatchId) {
        console.warn(`OpenAI native Batch API could not be created directly (${nativeBatchCreationError}). Running local queue fallback.`);
    }

    const rawJsonlString = jsonlLines.join('\n');

    const newBatch: StoredOpenAiBatch = {
        id: batchInternalId,
        deviceId: currentDeviceId,
        model: targetModel,
        displayName: formatWithDeviceTag(displayName || `OpenAI Batch (${targetModel})`, currentDeviceId),
        state: nativeBatchId ? 'PENDING' : 'RUNNING',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nativeBatchId,
        endpoint: chosenEndpoint,
        rawJsonl: rawJsonlString,
        items: items.map(item => ({
            id: item.id,
            prompt: item.prompt,
            aspectRatio: item.aspectRatio,
            size: item.size,
            quality: item.quality,
            outputFormat: item.outputFormat,
            images: item.images,
            status: 'queued'
        }))
    };

    const batches = getStoredOpenAiBatches();
    batches.push(newBatch);
    saveStoredOpenAiBatches(batches);

    // Only the local fallback runner executes requests itself. Native OpenAI
    // Batch jobs wait for OpenAI's discounted asynchronous pipeline.
    if (!nativeBatchId) {
        triggerNextOpenAiBatchItem(batchInternalId).catch(console.error);
    }

    return {
        name: batchInternalId,
        state: nativeBatchId ? 'JOB_STATE_PENDING' : 'JOB_STATE_RUNNING',
        rawJsonl: rawJsonlString
    };
};

/**
 * Check status of an OpenAI Batch Job
 */
export const getOpenAiBatchJobStatus = async (jobName: string, options?: { downloadResults?: boolean }): Promise<any> => {
    const batches = getStoredOpenAiBatches();
    const batch = batches.find(b => b.id === jobName || b.nativeBatchId === jobName);
    if (!batch) {
        return { state: 'JOB_STATE_FAILED', error: { message: 'OpenAI Batch not found' } };
    }

    if (batch.nativeBatchId && options?.downloadResults !== false) {
        try {
            const cached = await readBatchArchive<{ text: string }>(`openai-output:${batch.id}`);
            if (cached?.text) {
                applyCachedOutput(batch, cached.text);
                batch.outputCached = true;
                batch.state = batch.items.some(item => item.resultUrl) ? 'SUCCEEDED' : 'FAILED';
                saveStoredOpenAiBatches(batches);
                return { state: batch.state === 'SUCCEEDED' ? 'JOB_STATE_SUCCEEDED' : 'JOB_STATE_FAILED', batch };
            }
        } catch (error) {
            console.warn('Could not read cached OpenAI output:', error);
        }
    }
    const apiKey = getOpenAiApiKey();

    // If connected to native OpenAI Batch API
    if (batch.nativeBatchId && apiKey) {
        try {
            const res = await fetch(`https://api.openai.com/v1/batches/${batch.nativeBatchId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (res.ok) {
                const batchStatus = await res.json();
                const status = batchStatus.status;
                if (status === 'completed' && options?.downloadResults === false) {
                    batch.state = 'SUCCEEDED';
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);
                    return { state: 'JOB_STATE_SUCCEEDED', batch };
                } // validating, in_progress, finalizing, completed, failed, expired, cancelling, cancelled

                // If error_file_id is available, parse error details for individual items
                if (batchStatus.error_file_id) {
                    try {
                        const errFileRes = await fetch(`https://api.openai.com/v1/files/${batchStatus.error_file_id}/content`, {
                            headers: { 'Authorization': `Bearer ${apiKey}` }
                        });
                        if (errFileRes.ok) {
                            const errFileText = await errFileRes.text();
                            const errLines = errFileText.trim().split('\n').filter(Boolean);
                            errLines.forEach(line => {
                                const parsedErr = parseOpenAiBatchErrorLine(line);
                                if (parsedErr) {
                                    const itemId = parsedErr.customId.includes('__') ? parsedErr.customId.split('__')[1] : parsedErr.customId;
                                    const item = batch.items.find(it => it.id === itemId);
                                    if (item) {
                                        item.error = parsedErr.errorMsg;
                                        item.status = 'failed';
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.warn("Could not read OpenAI error file:", e);
                    }
                }

                if (batchStatus.errors && Array.isArray(batchStatus.errors.data)) {
                    const topErrors = batchStatus.errors.data.map((e: any) => `${e.code || 'error'}: ${e.message}`).join('; ');
                    if (topErrors) {
                        batch.error = topErrors;
                    }
                }

                if (status === 'completed') {
                    // Fetch completed output file
                    if (batchStatus.output_file_id) {
                        const fileRes = await fetch(`https://api.openai.com/v1/files/${batchStatus.output_file_id}/content`, {
                            headers: { 'Authorization': `Bearer ${apiKey}` }
                        });
                        if (fileRes.ok) {
                            const fileText = await fileRes.text();
                            applyCachedOutput(batch, fileText);
                            try {
                                await writeBatchArchive(`openai-output:${batch.id}`, { text: fileText }, batch.items.map(item => item.resultUrl).filter((url): url is string => !!url));
                                batch.outputCached = true;
                            } catch (error) {
                                console.warn('Failed to cache OpenAI output file:', error);
                            }
                        }
                    }

                    const anySuccess = batch.items.some(it => it.status === 'completed');
                    batch.state = anySuccess ? 'SUCCEEDED' : 'FAILED';

                    const itemErrors = batch.items.map(it => it.error).filter(Boolean) as string[];
                    const uniqueErrors = Array.from(new Set(itemErrors));
                    let detailedErrorMessage = 'All batch items failed';
                    if (uniqueErrors.length > 0) {
                        detailedErrorMessage = `All batch items failed:\n${uniqueErrors.join('\n')}`;
                    } else if (batch.error) {
                        detailedErrorMessage = `All batch items failed: ${batch.error}`;
                    }

                    if (!anySuccess) {
                        batch.error = detailedErrorMessage;
                    }
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);

                    return {
                        state: batch.state === 'SUCCEEDED' ? 'JOB_STATE_SUCCEEDED' : 'JOB_STATE_FAILED',
                        error: !anySuccess ? { message: detailedErrorMessage } : undefined,
                        deviceId: batch.deviceId || extractDeviceId(batch.displayName) || extractDeviceId(batch.id),
                        batch
                    };
                } else if (status === 'failed' || status === 'expired') {
                    batch.state = 'FAILED';
                    const itemErrors = batch.items.map(it => it.error).filter(Boolean) as string[];
                    const uniqueErrors = Array.from(new Set(itemErrors));
                    let detailedErrorMessage = normalizeOpenAiBatchError(batchStatus.errors, `Batch job ${status}`);
                    if (uniqueErrors.length > 0) {
                        detailedErrorMessage += `:\n${uniqueErrors.join('\n')}`;
                    }
                    batch.error = detailedErrorMessage;
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);
                    return { state: 'JOB_STATE_FAILED', error: { message: detailedErrorMessage }, batch };
                } else if (status === 'cancelled') {
                    batch.state = 'CANCELLED';
                    saveStoredOpenAiBatches(batches);
                    return { state: 'JOB_STATE_CANCELLED', batch };
                } else {
                    batch.state = status === 'validating' ? 'PENDING' : 'RUNNING';
                    batch.updatedAt = Date.now();
                    saveStoredOpenAiBatches(batches);
                    return { state: batch.state === 'PENDING' ? 'JOB_STATE_PENDING' : 'JOB_STATE_RUNNING', batch };
                }
            }
        } catch (e) {
            console.warn("Could not query OpenAI native batch:", e);
        }
    }

    if (batch.nativeBatchId) throw new Error('Could not retrieve OpenAI batch results. Check the connection or local cache.');

    // Step-by-step background processing fallback (when running locally)
    await triggerNextOpenAiBatchItem(batch.id);

    const allDone = batch.items.every(it => it.status === 'completed' || it.status === 'failed' || it.status === 'cancelled');
    if (allDone) {
        const anySuccess = batch.items.some(it => it.status === 'completed');
        batch.state = anySuccess ? 'SUCCEEDED' : 'FAILED';
        const itemErrors = batch.items.map(it => it.error).filter(Boolean) as string[];
        const uniqueErrors = Array.from(new Set(itemErrors));
        let detailedErrorMessage = 'All batch items failed';
        if (uniqueErrors.length > 0) {
            detailedErrorMessage = `All batch items failed:\n${uniqueErrors.join('\n')}`;
        } else if (batch.error) {
            detailedErrorMessage = `All batch items failed: ${batch.error}`;
        }
        if (!anySuccess) {
            batch.error = detailedErrorMessage;
        }
        batch.updatedAt = Date.now();
        saveStoredOpenAiBatches(batches);
        return {
            state: anySuccess ? 'JOB_STATE_SUCCEEDED' : 'JOB_STATE_FAILED',
            error: !anySuccess ? { message: detailedErrorMessage } : undefined,
            batch
        };
    }

    return {
        state: 'JOB_STATE_RUNNING',
        batch
    };
};

/**
 * Extract images from completed OpenAI batch job
 */
export const extractImagesFromOpenAiBatchJob = async (
    sdkJob: any,
    itemsMeta: Array<{ id: string; prompt: string }>
): Promise<Array<{ id: string; imageUrl?: string; error?: string; prompt?: string }>> => {
    const batch: StoredOpenAiBatch | undefined = sdkJob?.batch || getStoredOpenAiBatches().find(b => b.id === sdkJob?.name);
    if (!batch) return [];

    const metaItems = itemsMeta && itemsMeta.length > 0 ? itemsMeta : batch.items.map(it => ({ id: it.id, prompt: it.prompt }));
    const results: Array<{ id: string; imageUrl?: string; error?: string; prompt?: string }> = [];

    for (let idx = 0; idx < metaItems.length; idx++) {
        const meta = metaItems[idx];
        const item = batch.items.find(it => it.id === meta.id) || batch.items[idx];
        const promptText = item?.prompt || meta.prompt || `Batch Item #${idx + 1}`;
        const metaId = meta.id || item?.id || `item-${idx}`;

        if (item?.error) {
            results.push({
                id: metaId,
                prompt: promptText,
                error: item.error
            });
            continue;
        }

        if (item?.resultUrl) {
            try {
                let finalUrl = item.resultUrl;
                if (finalUrl.startsWith('data:')) {
                    const pngDataUrl = await convertToPNG(finalUrl);
                    finalUrl = addMetadataToPNG(pngDataUrl, 'prompt', promptText);
                } else if (finalUrl.startsWith('http')) {
                    const res = await fetch(finalUrl);
                    const blob = await res.blob();
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    const pngDataUrl = await convertToPNG(dataUrl);
                    finalUrl = addMetadataToPNG(pngDataUrl, 'prompt', promptText);
                }
                results.push({
                    id: metaId,
                    imageUrl: finalUrl,
                    prompt: promptText
                });
            } catch (err: any) {
                results.push({
                    id: metaId,
                    imageUrl: item.resultUrl,
                    prompt: promptText
                });
            }
        } else {
            results.push({
                id: metaId,
                prompt: promptText,
                error: item?.status === 'failed' ? (item?.error || 'Item generation failed') : undefined
            });
        }
    }

    return results;
};

/**
 * Cancel an OpenAI Batch job
 */
export const cancelOpenAiBatchJob = async (jobName: string): Promise<void> => {
    const batches = getStoredOpenAiBatches();
    const batch = batches.find(b => b.id === jobName || b.nativeBatchId === jobName);
    if (!batch) return;

    batch.state = 'CANCELLED';
    batch.items.forEach(it => {
        if (it.status === 'queued' || it.status === 'running') it.status = 'cancelled';
    });
    saveStoredOpenAiBatches(batches);

    if (batch.nativeBatchId) {
        const apiKey = getOpenAiApiKey();
        if (apiKey) {
            try {
                await fetch(`https://api.openai.com/v1/batches/${batch.nativeBatchId}/cancel`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
            } catch {}
        }
    }
};

/**
 * List OpenAI Batch jobs (combines locally stored batches and remote native batches)
 */
export const listOpenAiBatchJobs = async (): Promise<StoredOpenAiBatch[]> => {
    const localBatches = getStoredOpenAiBatches();
    const apiKey = getOpenAiApiKey();
    if (!apiKey) return localBatches;

    try {
        const res = await fetch('https://api.openai.com/v1/batches?limit=50', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (res.ok) {
            const data = await res.json();
            const remoteBatches = data.data || [];
            let changed = false;
            for (const rb of remoteBatches) {
                const existing = localBatches.find(b => b.nativeBatchId === rb.id || b.id === rb.id);
                if (!existing) {
                    const mappedStatus = rb.status === 'completed' ? 'SUCCEEDED' : (rb.status === 'failed' || rb.status === 'expired' ? 'FAILED' : (rb.status === 'cancelled' ? 'CANCELLED' : 'RUNNING'));
                    const rMeta = rb.metadata || {};
                    const extractedDev = rMeta.device_id || rMeta.deviceId || extractDeviceId(rb.id) || extractDeviceId(rb.description);
                    localBatches.push({
                        id: `openai_batch_${rb.id}`,
                        deviceId: extractedDev,
                        model: 'gpt-image-2',
                        displayName: extractedDev ? `[${extractedDev}] OpenAI Batch (${rb.id})` : `OpenAI Batch (${rb.id})`,
                        state: mappedStatus,
                        createdAt: rb.created_at ? rb.created_at * 1000 : Date.now(),
                        updatedAt: Date.now(),
                        nativeBatchId: rb.id,
                        items: [{
                            id: '0',
                            prompt: 'Batch Item',
                            status: rb.status === 'completed' ? 'completed' : 'queued'
                        }]
                    });
                    changed = true;
                }
            }
            if (changed) {
                saveStoredOpenAiBatches(localBatches);
            }
        }
    } catch (e) {
        console.warn("Failed to fetch OpenAI remote batches:", e);
    }
    return localBatches;
};
