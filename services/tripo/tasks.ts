import {
    DEFAULT_TRIPO_MODEL_VERSION,
    TripoImageTo3DParams,
    TripoMultiviewTo3DParams,
    TripoMultiviewViews,
    TripoTaskCreateResult,
    TripoTaskResult,
    TripoTaskStatus,
    TripoTaskStatusResponse,
    TripoTextureQuality
} from './types';
import { getTripoModelVersion } from './config';
import { logTripo } from './logger';
import { detectImageFileExtension, TripoApiError, tripoApiRequest, uploadTripoFile } from './httpClient';
import { saveTripoRecentTask } from './taskHistory';

// ==========================================
// Tripo 3D Task Creation & Polling
// ==========================================

/** Validate options before uploading any images. */
export const getTripoFaceLimitRange = (model: string, quad = false): { min: number; max: number } => {
    if (model === 'P1-20260311') return { min: 50, max: 20000 };
    if (model === 'P2-20260801') return { min: 48, max: quad ? 25000 : 50000 };
    if (quad) return { min: 1, max: 150000 };
    if (model.startsWith('v3.1')) return { min: 1, max: 1500000 };
    if (model.startsWith('v3.0')) return { min: 1, max: 1000000 };
    return { min: 1, max: 500000 };
};

const generationOptions = (params: TripoImageTo3DParams | TripoMultiviewTo3DParams): Record<string, any> => {
    const selected = params.modelVersion || getTripoModelVersion();
    const model = selected === 'default' ? DEFAULT_TRIPO_MODEL_VERSION : selected;
    const texture = params.texture !== false;
    const body: Record<string, any> = { model, texture, pbr: texture && params.pbr !== false };
    if (texture) {
        if (model.startsWith('v3.') || model.startsWith('P')) {
            body.texture_quality = params.textureQuality || 'standard';
        } else if (params.textureQuality && params.textureQuality !== 'standard') {
            throw new Error('Texture quality selection requires Tripo v3 or P series. Use standard for this legacy model.');
        }
        body.texture_alignment = params.textureAlignment || 'original_image';
        if (params.textureSeed !== undefined) body.texture_seed = params.textureSeed;
    }
    if (params.modelSeed !== undefined) body.model_seed = params.modelSeed;
    if (params.quadMesh) {
        if (model === 'P1-20260311' || (!model.startsWith('v3.') && model !== 'P2-20260801')) throw new Error('Quad mesh is not supported by this Tripo model.');
        body.quad = true;
    }
    if (params.faceLimit !== undefined) {
        const range = getTripoFaceLimitRange(model, params.quadMesh);
        if (!Number.isInteger(params.faceLimit) || params.faceLimit < range.min || params.faceLimit > range.max) throw new Error('Face limit for ' + model + ' must be ' + range.min + '–' + range.max + '. Select Auto or a supported density.');
        body.face_limit = params.faceLimit;
    }
    for (const seed of [params.modelSeed, params.textureSeed]) {
        if (seed !== undefined && (!Number.isInteger(seed) || seed < 0)) throw new Error('Tripo seeds must be non-negative integers.');
    }
    return body;
};

/**
 * Creates an Image to 3D task with Standard Texture on Tripo 3D
 */
export const createImageTo3DTask = async (
    params: TripoImageTo3DParams,
    signal?: AbortSignal
): Promise<TripoTaskCreateResult> => {
    signal?.throwIfAborted();
    const options = generationOptions(params);
    if (!params.image) throw new Error('Input image is required for Image to 3D generation.');
    const ext = detectImageFileExtension(params.image);
    const input = typeof params.image === 'string' && /^https?:\/\//.test(params.image)
        ? params.image : await uploadTripoFile(params.image, 'image_to_3d.' + ext, signal);
    const requestBody = { ...options, input };
    logTripo('info', 'Creating Image 3D Task...', requestBody);

    const data = await tripoApiRequest<any>(
        '/generation/image-to-model',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal
        },
        'Create Image to 3D Task'
    );

    const taskId = data.data?.task_id || data.data?.taskId;
    if (!taskId) {
        throw new Error('Tripo API did not return a valid task_id.');
    }

    const status = data.data?.status || 'queued';
    logTripo('success', `Image 3D Task created! Task ID: ${taskId} (Status: ${status})`);

    saveTripoRecentTask({
        taskId,
        type: 'image_to_model',
        prompt: params.prompt,
        createdAt: Date.now(),
        status: status as TripoTaskStatus,
        progress: 0
    });

    return {
        taskId,
        status,
        rawResponse: data
    };
};

/**
 * Creates a Multiview to 3D task with Standard Texture on Tripo 3D
 */
export const createMultiviewTo3DTask = async (
    params: TripoMultiviewTo3DParams,
    signal?: AbortSignal
): Promise<TripoTaskCreateResult> => {
    signal?.throwIfAborted();
    const options = generationOptions(params);
    if (!params.views?.front) {
        throw new Error('Front view is required for Multiview to 3D generation.');
    }

    const viewsOrder: (keyof TripoMultiviewViews)[] = ['front', 'left', 'back', 'right'];
    const activeViewKeys = viewsOrder.filter(k => Boolean(params.views[k]));

    if (activeViewKeys.length === 0) {
        throw new Error('At least one view image is required for 3D generation.');
    }

    // If only 1 view is provided (e.g. only Front view), multiview_to_model on Tripo API
    // requires >= 2 views. Automatically route to single Image to 3D task so generation works seamlessly!
    if (activeViewKeys.length === 1) {
        const singleKey = activeViewKeys[0];
        logTripo('info', `Only 1 view provided ("${singleKey.toUpperCase()}"). Automatically routing to Image to 3D task...`);
        return await createImageTo3DTask({
            image: params.views[singleKey]!,
            texture: params.texture,
            textureQuality: params.textureQuality,
            textureAlignment: params.textureAlignment,
            pbr: params.pbr,
            textureSeed: params.textureSeed,
            modelSeed: params.modelSeed,
            faceLimit: params.faceLimit,
            quadMesh: params.quadMesh,
            modelVersion: params.modelVersion,
            prompt: params.prompt
        }, signal);
    }

    logTripo('info', `Preparing Multiview to 3D task with ${activeViewKeys.length} views: [${activeViewKeys.map(k => k.toUpperCase()).join(', ')}]...`);

    // Upload only the provided views and build valid TripoFileInput entries
    const filesPayload: Record<string, string>[] = [];

    for (const viewKey of viewsOrder) {
        const viewData = params.views[viewKey];
        if (viewData) {
            const ext = detectImageFileExtension(viewData);
            if (typeof viewData === 'string' && (viewData.startsWith('http://') || viewData.startsWith('https://'))) {
                logTripo('info', `View "${viewKey.toUpperCase()}" using direct URL`);
                filesPayload.push({ [viewKey]: viewData });
            } else {
                logTripo('info', `Uploading "${viewKey.toUpperCase()}" view...`);
                const token = await uploadTripoFile(viewData, `${viewKey}_view.${ext}`, signal);
                filesPayload.push({ [viewKey]: token });
            }
        }
    }

    const requestBody = { ...options, inputs: filesPayload };
    logTripo('info', 'Creating Multiview 3D Task...', requestBody);

    const data = await tripoApiRequest<any>(
        '/generation/multiview-to-model',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal
        },
        'Create Multiview 3D Task'
    );

    const taskId = data.data?.task_id || data.data?.taskId;
    if (!taskId) {
        throw new Error('Tripo API did not return a valid task_id.');
    }

    const status = data.data?.status || 'queued';
    logTripo('success', `Multiview Task created! Task ID: ${taskId} (Status: ${status})`);

    saveTripoRecentTask({
        taskId,
        type: 'multiview_to_model',
        prompt: params.prompt,
        createdAt: Date.now(),
        status: status as TripoTaskStatus,
        progress: 0
    });

    return {
        taskId,
        status,
        rawResponse: data
    };
};

/**
 * Query the status and output of a Tripo task
 */
export const getTripoTaskStatus = async (
    taskId: string,
    signal?: AbortSignal
): Promise<TripoTaskStatusResponse> => {
    try {
        return await tripoApiRequest<TripoTaskStatusResponse>(
            '/tasks/' + encodeURIComponent(taskId), { method: 'GET', signal }, 'Task Status (' + taskId + ')'
        );
    } catch (error) {
        if (!(error instanceof TripoApiError) || !(error.httpStatus === 404 || [4001, 404].includes(error.code ?? 0))) throw error;
        return await tripoApiRequest<TripoTaskStatusResponse>(
            '/task/' + encodeURIComponent(taskId), { method: 'GET', signal }, 'Legacy Task Status (' + taskId + ')', true
        );
    }
};

const waitForTripoPoll = (delay: number, signal?: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
    const abort = () => {
        clearTimeout(timer);
        reject(new DOMException('Tripo task polling aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
    }, delay);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
});

/**
 * Poll a Tripo task until completion or failure
 */
export const pollTripoTask = async (
    taskId: string,
    onProgress?: (progress: number, status: string) => void,
    signal?: AbortSignal,
    intervalMs: number = 2000,
    maxTimeoutMs: number = 300000 // 5 minutes max
): Promise<TripoTaskResult> => {
    const startTime = Date.now();
    let lastReportedProgress = -1;
    let lastReportedStatus = '';
    let consecutiveErrors = 0;

    logTripo('info', `Started polling for task ${taskId}...`);

    while (true) {
        if (signal?.aborted) {
            logTripo('warning', `Polling aborted by user for task ${taskId}`);
            throw new DOMException('Tripo task generation was cancelled by user.', 'AbortError');
        }

        if (Date.now() - startTime > maxTimeoutMs) {
            const timeoutMsg = `Tripo task generation timed out after ${Math.round(maxTimeoutMs / 1000)} seconds.`;
            logTripo('error', timeoutMsg);
            throw new Error(timeoutMsg);
        }

        let res: TripoTaskStatusResponse;
        try {
            const remaining = Math.max(1, maxTimeoutMs - (Date.now() - startTime));
            const deadline = AbortSignal.timeout(Math.min(remaining, 60000));
            res = await getTripoTaskStatus(taskId, signal ? AbortSignal.any([signal, deadline]) : deadline);
            consecutiveErrors = 0;
        } catch (error) {
            const retryable = error instanceof TripoApiError && (error.httpStatus === 0 || error.httpStatus === 429 || (error.httpStatus ?? 0) >= 500 || error.code === 2000);
            if (!retryable || ++consecutiveErrors > 3) throw error;
            logTripo('warning', 'Temporary task query failure; retrying the status query for ' + taskId);
            await waitForTripoPoll(Math.min(intervalMs * 2 ** (consecutiveErrors - 1), Math.max(1, maxTimeoutMs - (Date.now() - startTime))), signal);
            continue;
        }
        const taskData = res.data;
        const status = (taskData.status?.toLowerCase() || 'unknown') as TripoTaskStatus;
        const progress = taskData.progress || 0;

        if (progress !== lastReportedProgress || status !== lastReportedStatus) {
            lastReportedProgress = progress;
            lastReportedStatus = status;
            logTripo('info', `Task ${taskId} -> ${status.toUpperCase()} (${progress}%)`);
        }

        if (onProgress) {
            onProgress(progress, status);
        }

        if (status === 'success') {
            const output = taskData.output || taskData.result || {};
            const modelUrl = output.model_url || output.pbr_model || output.model || output.base_model;
            if (!modelUrl) throw new Error('Tripo reported success but returned no model URL. Task ID: ' + taskId);
            const thumbnailUrl = output.thumbnail_url || output.thumbnail || output.rendered_image_url || output.rendered_image;
            const renderedImageUrl = output.rendered_image_url || output.rendered_image;

            const durationSec = Math.round((Date.now() - startTime) / 1000);
            logTripo('success', `Task ${taskId} completed in ${durationSec}s! Model ready.`, {
                modelUrl,
                thumbnailUrl
            });

            saveTripoRecentTask({
                taskId,
                status: 'success',
                progress: 100,
                modelUrl,
                thumbnailUrl,
                renderedImageUrl,
                creditsConsumed: taskData.credits_consumed
            });

            return {
                taskId,
                status: 'success',
                modelUrl,
                thumbnailUrl,
                renderedImageUrl,
                output
            };
        }

        if (status === 'failed') {
            let errorMsg = taskData.error_message || 'Unknown Tripo generation error';
            if (typeof taskData.error === 'string') {
                errorMsg = taskData.error;
            } else if (taskData.error && typeof taskData.error === 'object') {
                errorMsg = (taskData.error as any).message || JSON.stringify(taskData.error);
            }
            logTripo('error', `Task ${taskId} failed: ${errorMsg}`);

            saveTripoRecentTask({
                taskId,
                status: 'failed',
                error: errorMsg
            });

            return {
                taskId,
                status: 'failed',
                error: errorMsg
            };
        }

        if (status === 'cancelled') {
            saveTripoRecentTask({ taskId, status: 'cancelled', progress });
            logTripo('warning', `Task ${taskId} was cancelled on server`);
            return {
                taskId,
                status: 'cancelled',
                error: 'Task was cancelled'
            };
        }

        await waitForTripoPoll(Math.min(intervalMs, Math.max(1, maxTimeoutMs - (Date.now() - startTime))), signal);
    }
};

/**
 * High-level helper: Generates a 3D model from a single image + Standard Texture
 */
export const generateImageTo3D = async (
    params: TripoImageTo3DParams,
    onProgress?: (progress: number, status: string) => void,
    signal?: AbortSignal,
    onTaskCreated?: (taskId: string) => void
): Promise<TripoTaskResult> => {
    if (onProgress) onProgress(5, 'uploading');
    const { taskId } = await createImageTo3DTask(params, signal);
    if (onTaskCreated) onTaskCreated(taskId);
    if (onProgress) onProgress(15, 'queued');
    return await pollTripoTask(taskId, onProgress, signal);
};

/**
 * High-level helper: Generates a 3D model from multiview images + Standard Texture
 */
export const generateMultiviewTo3D = async (
    params: TripoMultiviewTo3DParams,
    onProgress?: (progress: number, status: string) => void,
    signal?: AbortSignal,
    onTaskCreated?: (taskId: string) => void
): Promise<TripoTaskResult> => {
    if (onProgress) onProgress(5, 'uploading');
    const { taskId } = await createMultiviewTo3DTask(params, signal);
    if (onTaskCreated) onTaskCreated(taskId);
    if (onProgress) onProgress(15, 'queued');
    return await pollTripoTask(taskId, onProgress, signal);
};

/**
 * Re-texture an existing model using Tripo 3D Standard Texture
 */
export const textureExistingModel = async (
    originalTaskId: string,
    options: {
        textureQuality?: TripoTextureQuality;
        textureSeed?: number;
        prompt?: string;
    } = {}
): Promise<TripoTaskCreateResult> => {
    logTripo('info', `Starting re-texture task for original model ${originalTaskId}...`);

    const requestBody: Record<string, any> = {
        input: originalTaskId,
        model: 'v3.0-20250812',
        texture_quality: options.textureQuality || 'standard',
        pbr: true
    };

    if (options.textureSeed !== undefined) {
        requestBody.texture_seed = options.textureSeed;
    }
    if (options.prompt) {
        requestBody.texture_prompt = { text: options.prompt };
    }

    const data = await tripoApiRequest<any>(
        '/models/texture',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        },
        'Retexture 3D Model'
    );

    const taskId = data.data?.task_id || data.data?.taskId;
    if (!taskId) throw new Error('Tripo API did not return a valid task_id.');
    const status = data.data?.status || 'queued';
    logTripo('success', `Retexture task created: ${taskId}`);

    saveTripoRecentTask({
        taskId,
        type: 'texture_model',
        prompt: options.prompt,
        createdAt: Date.now(),
        status: status as TripoTaskStatus,
        progress: 0
    });

    return {
        taskId,
        status,
        rawResponse: data
    };
};
