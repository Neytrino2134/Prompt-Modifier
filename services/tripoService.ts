import { useState, useEffect } from 'react';

export const STORAGE_KEY_TRIPO_ENABLED = 'settings_tripo_enabled';
export const STORAGE_KEY_TRIPO_API_KEY = 'settings_tripo_api_key';
export const STORAGE_KEY_TRIPO_MODEL_VERSION = 'settings_tripo_model_version';
export const TRIPO_CONFIG_CHANGE_EVENT = 'tripo-config-changed';

export const DEFAULT_TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';
export const DEFAULT_TRIPO_MODEL_VERSION = 'v2.5-20250123';

/**
 * Check if TRIPO AI API is enabled in settings
 */
export const isTripoEnabled = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY_TRIPO_ENABLED) === 'true';
    } catch {
        return false;
    }
};

/**
 * Enable or disable TRIPO AI API
 */
export const setTripoEnabled = (enabled: boolean): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_ENABLED, String(enabled));
        notifyTripoConfigChanged();
    } catch (e) {
        console.error('Failed to set TRIPO AI enabled status', e);
    }
};

/**
 * Get configured TRIPO AI API Key
 */
export const getTripoApiKey = (): string => {
    try {
        const key = localStorage.getItem(STORAGE_KEY_TRIPO_API_KEY);
        if (key && key.trim()) {
            return key.trim();
        }
    } catch {}
    return (process.env.TRIPO_API_KEY || '').trim();
};

/**
 * Save TRIPO AI API Key
 */
export const setTripoApiKey = (key: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_API_KEY, key.trim());
        notifyTripoConfigChanged();
    } catch (e) {
        console.error('Failed to save TRIPO AI API Key', e);
    }
};

/**
 * Get configured TRIPO model version
 */
export const getTripoModelVersion = (): string => {
    try {
        const version = localStorage.getItem(STORAGE_KEY_TRIPO_MODEL_VERSION);
        if (version && version.trim()) {
            return version.trim();
        }
    } catch {}
    return DEFAULT_TRIPO_MODEL_VERSION;
};

/**
 * Save TRIPO model version
 */
export const setTripoModelVersion = (version: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_MODEL_VERSION, version.trim());
        notifyTripoConfigChanged();
    } catch (e) {
        console.error('Failed to save TRIPO model version', e);
    }
};

/**
 * Notify subscribers about TRIPO AI config updates
 */
export const notifyTripoConfigChanged = (): void => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(TRIPO_CONFIG_CHANGE_EVENT, {
            detail: {
                enabled: isTripoEnabled(),
                hasKey: !!getTripoApiKey()
            }
        }));
    }
};

/**
 * React hook to subscribe to TRIPO AI toggle updates in real-time
 */
export const useTripoEnabled = (): boolean => {
    const [enabled, setEnabled] = useState<boolean>(() => isTripoEnabled());

    useEffect(() => {
        const handleUpdate = () => {
            setEnabled(isTripoEnabled());
        };

        window.addEventListener(TRIPO_CONFIG_CHANGE_EVENT, handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener(TRIPO_CONFIG_CHANGE_EVENT, handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    return enabled;
};

// ==========================================
// Tripo 3D Types and Interfaces
// ==========================================

export type TripoTextureQuality = 'standard' | 'detailed' | 'extreme';
export type TripoTextureAlignment = 'original_image' | 'geometry';
export type TripoTaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown';

export interface TripoFileInput {
    type?: 'image';
    file_token?: string;
    url?: string;
}

export interface TripoMultiviewViews {
    front: string | Blob | File; // base64, dataUrl, url, file_token, or Blob/File (Required)
    left?: string | Blob | File;  // (Optional)
    back?: string | Blob | File;  // (Optional)
    right?: string | Blob | File; // (Optional)
}

export interface TripoMultiviewTo3DParams {
    views: TripoMultiviewViews;
    texture?: boolean; // Default: true
    textureQuality?: TripoTextureQuality; // Default: 'standard'
    textureAlignment?: TripoTextureAlignment; // Default: 'original_image'
    pbr?: boolean; // Default: true (generate PBR materials)
    textureSeed?: number;
    modelSeed?: number;
    faceLimit?: number;
    quadMesh?: boolean;
    modelVersion?: string; // Default: 'v2.5-20250123'
    prompt?: string;
}

export interface TripoImageTo3DParams {
    image: string | Blob | File; // base64, dataUrl, url, file_token, or Blob/File (Required)
    texture?: boolean; // Default: true
    textureQuality?: TripoTextureQuality; // Default: 'standard'
    textureAlignment?: TripoTextureAlignment; // Default: 'original_image'
    pbr?: boolean; // Default: true (generate PBR materials)
    textureSeed?: number;
    modelSeed?: number;
    faceLimit?: number;
    quadMesh?: boolean;
    modelVersion?: string; // Default: 'v2.5-20250123'
    prompt?: string;
}

export interface TripoUploadResponse {
    code: number;
    data: {
        image_token?: string;
        file_token?: string;
    };
    message?: string;
}

export interface TripoTaskOutput {
    model?: string; // GLB model URL
    base_model?: string;
    pbr_model?: string;
    rendered_image?: string;
    thumbnail?: string;
    texture_maps?: {
        base_color?: string;
        normal?: string;
        roughness?: string;
        metallic?: string;
    };
    [key: string]: any;
}

export interface TripoTaskData {
    task_id: string;
    type: string;
    status: TripoTaskStatus;
    progress: number;
    output?: TripoTaskOutput;
    result?: TripoTaskOutput;
    error?: {
        code?: string | number;
        message?: string;
    } | string;
    created_at?: number;
    updated_at?: number;
}

export interface TripoTaskStatusResponse {
    code: number;
    data: TripoTaskData;
    message?: string;
}

export interface TripoTaskCreateResult {
    taskId: string;
    status: TripoTaskStatus;
    rawResponse: any;
}

export interface TripoTaskResult {
    taskId: string;
    status: 'success' | 'failed' | 'cancelled';
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    output?: TripoTaskOutput;
    error?: string;
}

// ==========================================
// Tripo 3D API Core Functions
// ==========================================

/**
 * Upload an image (base64, File, Blob) to Tripo 3D API to obtain a file_token
 */
export const uploadTripoFile = async (
    fileInput: File | Blob | string,
    filename: string = 'input_image.png'
): Promise<string> => {
    const apiKey = getTripoApiKey();
    if (!apiKey) {
        throw new Error('TRIPO AI API Key is missing. Please configure it in Settings.');
    }

    // If input is already a Tripo file_token
    if (typeof fileInput === 'string' && !fileInput.startsWith('data:') && !fileInput.startsWith('http://') && !fileInput.startsWith('https://') && !fileInput.startsWith('blob:')) {
        return fileInput.trim();
    }

    let blobToSend: Blob;

    if (typeof fileInput === 'string') {
        if (fileInput.startsWith('data:')) {
            const parts = fileInput.split(',');
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/png';
            const byteCharacters = atob(parts[1]);
            const byteArrays = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteArrays[i] = byteCharacters.charCodeAt(i);
            }
            blobToSend = new Blob([byteArrays], { type: mime });
        } else if (fileInput.startsWith('http://') || fileInput.startsWith('https://') || fileInput.startsWith('blob:')) {
            const res = await fetch(fileInput);
            if (!res.ok) {
                throw new Error(`Failed to fetch image from URL: ${fileInput}`);
            }
            blobToSend = await res.blob();
        } else {
            throw new Error('Invalid image format provided for Tripo upload.');
        }
    } else {
        blobToSend = fileInput;
    }

    const formData = new FormData();
    formData.append('file', blobToSend, filename);

    const response = await fetch(`${DEFAULT_TRIPO_API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });

    const data: TripoUploadResponse = await response.json();

    if (!response.ok || data.code !== 0) {
        const msg = data.message || `Upload failed with HTTP status ${response.status}`;
        throw new Error(`Tripo Upload Error: ${msg}`);
    }

    const token = data.data?.image_token || data.data?.file_token;
    if (!token) {
        throw new Error('Tripo API did not return a valid file_token after upload.');
    }

    return token;
};

/**
 * Creates a Multiview to 3D task with Standard Texture on Tripo 3D
 */
export const createMultiviewTo3DTask = async (
    params: TripoMultiviewTo3DParams
): Promise<TripoTaskCreateResult> => {
    const apiKey = getTripoApiKey();
    if (!apiKey) {
        throw new Error('TRIPO AI API Key is missing. Please configure it in Settings.');
    }

    if (!params.views || !params.views.front) {
        throw new Error('Front view image is required for Multiview to 3D generation.');
    }

    // 1. Process and upload each view to get file_token or direct URL
    const viewsOrder: (keyof TripoMultiviewViews)[] = ['front', 'left', 'back', 'right'];
    const filesPayload: TripoFileInput[] = [];

    for (const viewKey of viewsOrder) {
        const viewData = params.views[viewKey];
        if (viewData) {
            if (typeof viewData === 'string' && (viewData.startsWith('http://') || viewData.startsWith('https://'))) {
                filesPayload.push({
                    type: 'image',
                    url: viewData
                });
            } else {
                const token = await uploadTripoFile(viewData, `${viewKey}_view.png`);
                filesPayload.push({
                    type: 'image',
                    file_token: token
                });
            }
        } else {
            // Include empty slot representation or omit trailing
            // In Tripo multiview: ordered array [front, left, back, right]
            // Omitted views can be represented without file_token or skipped if trailing
            filesPayload.push({
                type: 'image'
            });
        }
    }

    // Filter trailing empty objects if any
    while (filesPayload.length > 1 && !filesPayload[filesPayload.length - 1].file_token && !filesPayload[filesPayload.length - 1].url) {
        filesPayload.pop();
    }

    const requestBody: Record<string, any> = {
        type: 'multiview_to_model',
        files: filesPayload,
        texture: params.texture !== false, // Default: true
        texture_quality: params.textureQuality || 'standard', // Standard Texture
        texture_alignment: params.textureAlignment || 'original_image',
        pbr: params.pbr !== false, // Default: true
        model_version: params.modelVersion || getTripoModelVersion() || DEFAULT_TRIPO_MODEL_VERSION
    };

    if (params.textureSeed !== undefined) {
        requestBody.texture_seed = params.textureSeed;
    }
    if (params.modelSeed !== undefined) {
        requestBody.model_seed = params.modelSeed;
    }
    if (params.faceLimit !== undefined) {
        requestBody.face_limit = params.faceLimit;
    }
    if (params.quadMesh !== undefined) {
        requestBody.quad = params.quadMesh;
    }
    if (params.prompt && params.prompt.trim()) {
        requestBody.prompt = params.prompt.trim();
    }

    const response = await fetch(`${DEFAULT_TRIPO_API_BASE}/task`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok || data.code !== 0) {
        const errorMsg = data.message || (data.error?.message) || `Tripo task creation failed with HTTP ${response.status}`;
        throw new Error(`Tripo Multiview to 3D error: ${errorMsg}`);
    }

    const taskId = data.data?.task_id || data.data?.taskId;
    if (!taskId) {
        throw new Error('Tripo API did not return a valid task_id.');
    }

    return {
        taskId,
        status: data.data?.status || 'queued',
        rawResponse: data
    };
};

/**
 * Query the status and output of a Tripo task
 */
export const getTripoTaskStatus = async (
    taskId: string
): Promise<TripoTaskStatusResponse> => {
    const apiKey = getTripoApiKey();
    if (!apiKey) {
        throw new Error('TRIPO AI API Key is missing. Please configure it in Settings.');
    }

    const response = await fetch(`${DEFAULT_TRIPO_API_BASE}/task/${taskId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    const data: TripoTaskStatusResponse = await response.json();

    if (!response.ok || data.code !== 0) {
        const msg = data.message || `Failed to fetch Tripo task status (HTTP ${response.status})`;
        throw new Error(`Tripo Status Error: ${msg}`);
    }

    return data;
};

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

    while (true) {
        if (signal?.aborted) {
            throw new Error('Tripo task generation was cancelled by user.');
        }

        if (Date.now() - startTime > maxTimeoutMs) {
            throw new Error(`Tripo task generation timed out after ${Math.round(maxTimeoutMs / 1000)} seconds.`);
        }

        const res = await getTripoTaskStatus(taskId);
        const taskData = res.data;
        const status = taskData.status?.toLowerCase() as TripoTaskStatus;
        const progress = taskData.progress || 0;

        if (onProgress) {
            onProgress(progress, status);
        }

        if (status === 'success') {
            const output = taskData.output || taskData.result || {};
            const modelUrl = output.model || output.pbr_model || output.base_model;
            const thumbnailUrl = output.thumbnail || output.rendered_image;
            const renderedImageUrl = output.rendered_image;

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
            let errorMsg = 'Unknown Tripo generation error';
            if (typeof taskData.error === 'string') {
                errorMsg = taskData.error;
            } else if (taskData.error && typeof taskData.error === 'object') {
                errorMsg = taskData.error.message || JSON.stringify(taskData.error);
            }
            return {
                taskId,
                status: 'failed',
                error: errorMsg
            };
        }

        if (status === 'cancelled') {
            return {
                taskId,
                status: 'cancelled',
                error: 'Task was cancelled'
            };
        }

        // Wait before next poll
        await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, intervalMs);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timeoutId);
                    reject(new Error('Tripo task polling aborted'));
                }, { once: true });
            }
        });
    }
};

/**
 * Creates an Image to 3D task with Standard Texture on Tripo 3D
 */
export const createImageTo3DTask = async (
    params: TripoImageTo3DParams
): Promise<TripoTaskCreateResult> => {
    const apiKey = getTripoApiKey();
    if (!apiKey) {
        throw new Error('TRIPO AI API Key is missing. Please configure it in Settings.');
    }

    if (!params.image) {
        throw new Error('Input image is required for Image to 3D generation.');
    }

    let filePayload: TripoFileInput;
    if (typeof params.image === 'string' && (params.image.startsWith('http://') || params.image.startsWith('https://'))) {
        filePayload = {
            type: 'image',
            url: params.image
        };
    } else {
        const token = await uploadTripoFile(params.image, 'image_to_3d.png');
        filePayload = {
            type: 'image',
            file_token: token
        };
    }

    const requestBody: Record<string, any> = {
        type: 'image_to_model',
        file: filePayload,
        texture: params.texture !== false,
        texture_quality: params.textureQuality || 'standard',
        texture_alignment: params.textureAlignment || 'original_image',
        pbr: params.pbr !== false,
        model_version: params.modelVersion || getTripoModelVersion() || DEFAULT_TRIPO_MODEL_VERSION
    };

    if (params.textureSeed !== undefined) {
        requestBody.texture_seed = params.textureSeed;
    }
    if (params.modelSeed !== undefined) {
        requestBody.model_seed = params.modelSeed;
    }
    if (params.faceLimit !== undefined) {
        requestBody.face_limit = params.faceLimit;
    }
    if (params.quadMesh !== undefined) {
        requestBody.quad = params.quadMesh;
    }
    if (params.prompt && params.prompt.trim()) {
        requestBody.prompt = params.prompt.trim();
    }

    const response = await fetch(`${DEFAULT_TRIPO_API_BASE}/task`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok || data.code !== 0) {
        const errorMsg = data.message || (data.error?.message) || `Tripo Image to 3D task creation failed with HTTP ${response.status}`;
        throw new Error(`Tripo Image to 3D error: ${errorMsg}`);
    }

    const taskId = data.data?.task_id || data.data?.taskId;
    if (!taskId) {
        throw new Error('Tripo API did not return a valid task_id.');
    }

    return {
        taskId,
        status: data.data?.status || 'queued',
        rawResponse: data
    };
};

/**
 * High-level helper: Generates a 3D model from a single image + Standard Texture
 */
export const generateImageTo3D = async (
    params: TripoImageTo3DParams,
    onProgress?: (progress: number, status: string) => void,
    signal?: AbortSignal
): Promise<TripoTaskResult> => {
    if (onProgress) onProgress(5, 'uploading');
    const { taskId } = await createImageTo3DTask(params);
    if (onProgress) onProgress(15, 'queued');
    return await pollTripoTask(taskId, onProgress, signal);
};

/**
 * High-level helper: Generates a 3D model from multiview images + Standard Texture
 */
export const generateMultiviewTo3D = async (
    params: TripoMultiviewTo3DParams,
    onProgress?: (progress: number, status: string) => void,
    signal?: AbortSignal
): Promise<TripoTaskResult> => {
    if (onProgress) onProgress(5, 'uploading');
    const { taskId } = await createMultiviewTo3DTask(params);
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
    const apiKey = getTripoApiKey();
    if (!apiKey) {
        throw new Error('TRIPO AI API Key is missing. Please configure it in Settings.');
    }

    const requestBody: Record<string, any> = {
        type: 'texture_model',
        original_model_task_id: originalTaskId,
        texture_quality: options.textureQuality || 'standard',
        pbr: true
    };

    if (options.textureSeed !== undefined) {
        requestBody.texture_seed = options.textureSeed;
    }
    if (options.prompt) {
        requestBody.prompt = options.prompt;
    }

    const response = await fetch(`${DEFAULT_TRIPO_API_BASE}/task`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok || data.code !== 0) {
        const errorMsg = data.message || (data.error?.message) || `Failed to start texture task (${response.status})`;
        throw new Error(`Tripo Texture error: ${errorMsg}`);
    }

    return {
        taskId: data.data?.task_id || data.data?.taskId,
        status: data.data?.status || 'queued',
        rawResponse: data
    };
};
