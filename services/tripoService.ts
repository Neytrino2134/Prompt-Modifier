import { useState, useEffect, useCallback } from 'react';

export const STORAGE_KEY_TRIPO_ENABLED = 'settings_tripo_enabled';
export const STORAGE_KEY_TRIPO_API_KEY = 'settings_tripo_api_key';
export const STORAGE_KEY_TRIPO_MODEL_VERSION = 'settings_tripo_model_version';
export const STORAGE_KEY_TRIPO_RECENT_TASKS = 'settings_tripo_recent_tasks';
export const STORAGE_KEY_TRIPO_LAST_BALANCE = 'settings_tripo_last_balance';
export const TRIPO_CONFIG_CHANGE_EVENT = 'tripo-config-changed';
export const TRIPO_LOG_EVENT = 'tripo-log-event';
export const TRIPO_BALANCE_CHANGE_EVENT = 'tripo-balance-changed';
export const TRIPO_TASKS_CHANGE_EVENT = 'tripo-tasks-changed';

export const DEFAULT_TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';
export const DEFAULT_TRIPO_V3_API_BASE = 'https://openapi.tripo3d.ai/v3';
export const TRIPO_PROXY_API_BASE = '/api/tripo';
export const TRIPO_PROXY_V3_API_BASE = '/api/tripo-v3';
export const DEFAULT_TRIPO_MODEL_VERSION = 'v3.1-20260211';

// ==========================================
// Tripo 3D Logging Subsystem
// ==========================================

export interface TripoLogEntry {
    id: string;
    timestamp: number;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: any;
}

const tripoLogBuffer: TripoLogEntry[] = [];
const MAX_TRIPO_LOGS = 100;
const logListeners = new Set<(entry: TripoLogEntry) => void>();

export const logTripo = (level: 'info' | 'success' | 'warning' | 'error', message: string, details?: any): TripoLogEntry => {
    const entry: TripoLogEntry = {
        id: `tripo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        level,
        message,
        details
    };

    tripoLogBuffer.push(entry);
    if (tripoLogBuffer.length > MAX_TRIPO_LOGS) {
        tripoLogBuffer.shift();
    }

    // Console logging with grouped styles
    const prefix = `[Tripo 3D ${new Date(entry.timestamp).toLocaleTimeString()}]`;
    if (level === 'error') {
        console.error(`${prefix} ❌ ${message}`, details || '');
    } else if (level === 'warning') {
        console.warn(`${prefix} ⚠️ ${message}`, details || '');
    } else if (level === 'success') {
        console.log(`%c${prefix} ✅ ${message}`, 'color: #10b981; font-weight: bold;', details || '');
    } else {
        console.log(`%c${prefix} ℹ️ ${message}`, 'color: #06b6d4;', details || '');
    }

    // Dispatch global custom event for AppContext / DebugConsole
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(TRIPO_LOG_EVENT, { detail: entry }));
    }

    // Notify internal subscribers
    logListeners.forEach(listener => {
        try {
            listener(entry);
        } catch (e) {
            console.error('Error in Tripo log listener', e);
        }
    });

    return entry;
};

export const getTripoLogs = (): TripoLogEntry[] => [...tripoLogBuffer];

export const clearTripoLogs = (): void => {
    tripoLogBuffer.length = 0;
};

export const subscribeTripoLogs = (callback: (entry: TripoLogEntry) => void): (() => void) => {
    logListeners.add(callback);
    return () => {
        logListeners.delete(callback);
    };
};

export interface TripoModelOption {
    value: string;
    label: string;
    description: string;
    isFlagship?: boolean;
    badge?: string;
}

export const TRIPO_MODEL_OPTIONS: TripoModelOption[] = [
    {
        value: 'v3.1-20260211',
        label: 'Tripo H3.1 (Flagship • v3.1-20260211)',
        description: 'Top-tier geometry with PBR textures. Best choice for production assets (~40s, up to 2M faces).',
        isFlagship: true,
        badge: 'Flagship'
    },
    {
        value: 'P1-20260311',
        label: 'Tripo P1 (Ultra Precision • P1-20260311)',
        description: 'Next-generation high-precision structural geometry model.',
        badge: 'Precision'
    },
    {
        value: 'v3.0-20250812',
        label: 'Tripo v3.0 (High Quality • v3.0-20250812)',
        description: 'Enhanced edge sharpness, hard-surface support, and PBR textures.',
        badge: 'Quality'
    },
    {
        value: 'Turbo-v1.0-20250506',
        label: 'Tripo Turbo v1.0 (Fast • Turbo-v1.0-20250506)',
        description: 'Ultra-fast rapid generation model for quick prototyping and low latency.',
        badge: 'Fast'
    },
    {
        value: 'v2.5-20250123',
        label: 'Tripo v2.5 (Stable Legacy • v2.5-20250123)',
        description: 'Stable legacy model for multiview and standard texture generation.',
        badge: 'Stable'
    },
    {
        value: 'v2.0-20240919',
        label: 'Tripo v2.0 (v2.0-20240919)',
        description: 'Previous-generation Tripo 3D reconstruction model.'
    },
    {
        value: 'v1.4-20240625',
        label: 'Tripo v1.4 (v1.4-20240625)',
        description: 'Legacy v1.4 model.'
    },
    {
        value: 'default',
        label: 'Tripo Auto Default',
        description: 'Automatically use the latest engine recommended by Tripo API.'
    }
];

export const getTripoModelOption = (version?: string): TripoModelOption => {
    const v = version || getTripoModelVersion();
    return TRIPO_MODEL_OPTIONS.find(m => m.value === v) || {
        value: v,
        label: `Tripo (${v})`,
        description: 'Tripo 3D AI Model'
    };
};

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
        logTripo('info', `Tripo 3D API integration ${enabled ? 'Enabled' : 'Disabled'}`);
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
        const masked = key.trim() ? `${'*'.repeat(Math.max(0, key.trim().length - 4))}${key.trim().slice(-4)}` : '(empty)';
        logTripo('info', `Updated Tripo API Key: ${masked}`);
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
        logTripo('info', `Tripo Default Model Version set to: ${version}`);
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

export interface TripoBalanceData {
    balance: number;
    frozen?: number;
    timestamp?: number;
}

export interface TripoRecentTask {
    taskId: string;
    type?: string;
    prompt?: string;
    createdAt: number;
    status: TripoTaskStatus;
    progress?: number;
    modelUrl?: string;
    thumbnailUrl?: string;
    renderedImageUrl?: string;
    creditsConsumed?: number;
    error?: string;
}

export type TripoTextureQuality = 'standard' | 'detailed' | 'extreme';
export type TripoTextureAlignment = 'original_image' | 'geometry';
export type TripoTaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown';

export interface TripoFileInput {
    type?: string;
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
// Robust Safe Fetch & API Dispatcher
// ==========================================

const extractHtmlTitle = (html: string): string | null => {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
        return titleMatch[1].trim();
    }
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
        return h1Match[1].trim();
    }
    return null;
};

/**
 * Execute request to Tripo API with automatic proxying, direct fallback,
 * safe response handling, and rich logging.
 */
async function tripoApiRequest<T = any>(
    endpoint: string, // e.g. '/files' or '/upload' or '/task' or `/task/${id}` or '/account/balance'
    options: RequestInit,
    description: string
): Promise<T> {
    const apiKey = getTripoApiKey();
    if (!apiKey) {
        const err = 'TRIPO AI API Key is missing. Please enter your API key in Settings.';
        logTripo('error', err);
        throw new Error(err);
    }

    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${apiKey}`);
    }

    let clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    clean = clean.replace(/^\/v3/, '').replace(/^\/v2\/openapi/, '');

    // Map endpoints according to Tripo API v3 and legacy v2
    let v3Path = clean;
    let v2Path = clean;

    if (clean === '/upload' || clean === '/files') {
        v3Path = '/files';
        v2Path = '/upload';
    } else if (clean === '/user/balance' || clean === '/account/balance') {
        v3Path = '/account/balance';
        v2Path = '/user/balance';
    } else if (clean === '/tasks/list' || clean === '/task/list') {
        v3Path = '/tasks/list';
        v2Path = '/tasks/list';
    }

    let endpointsToTry: { url: string; isProxy: boolean; isV3: boolean }[];

    if (clean === '/task' || clean.startsWith('/task/')) {
        // Standard Tripo task creation & status endpoints on v2/openapi
        endpointsToTry = [
            { url: `${TRIPO_PROXY_API_BASE}${v2Path}`, isProxy: true, isV3: false },
            { url: `${DEFAULT_TRIPO_API_BASE}${v2Path}`, isProxy: false, isV3: false },
            { url: `${TRIPO_PROXY_V3_API_BASE}${v3Path}`, isProxy: true, isV3: true },
            { url: `${DEFAULT_TRIPO_V3_API_BASE}${v3Path}`, isProxy: false, isV3: true }
        ];
    } else {
        endpointsToTry = [
            { url: `${TRIPO_PROXY_V3_API_BASE}${v3Path}`, isProxy: true, isV3: true },
            { url: `${DEFAULT_TRIPO_V3_API_BASE}${v3Path}`, isProxy: false, isV3: true },
            { url: `${TRIPO_PROXY_API_BASE}${v2Path}`, isProxy: true, isV3: false },
            { url: `${DEFAULT_TRIPO_API_BASE}${v2Path}`, isProxy: false, isV3: false }
        ];
    }

    let lastError: Error | null = null;
    const maskedKey = `${'*'.repeat(Math.max(0, apiKey.length - 4))}${apiKey.slice(-4)}`;

    for (let i = 0; i < endpointsToTry.length; i++) {
        const { url, isProxy } = endpointsToTry[i];
        const hasMoreCandidates = i < endpointsToTry.length - 1;
        
        try {
            logTripo('info', `[${description}] Requesting ${isProxy ? 'Proxy' : 'Direct API'}: ${url}`, {
                method: options.method || 'GET',
                endpoint,
                key: maskedKey
            });

            const response = await fetch(url, {
                ...options,
                headers
            });

            // Read response as raw text first for safe inspection
            const rawText = await response.text();

            // Check for HTML response
            const isHtml = rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE html') || rawText.includes('<html');

            if (isHtml) {
                const title = extractHtmlTitle(rawText) || 'HTML Error Page';
                const preview = rawText.slice(0, 300).replace(/\s+/g, ' ');
                
                logTripo('warning', `[${description}] Endpoint ${url} returned HTML (${response.status} ${response.statusText}): "${title}"`, {
                    status: response.status,
                    statusText: response.statusText,
                    preview
                });

                // If proxy returned 404/502/500 and candidates remain, try next
                if (hasMoreCandidates && (response.status === 404 || response.status >= 500)) {
                    continue;
                }

                // Format comprehensive, user-actionable error
                let hint = '';
                if (response.status === 401 || response.status === 403) {
                    hint = 'Probable cause: Invalid or expired Tripo API key, or origin restriction.';
                } else if (response.status === 429) {
                    hint = 'Rate limit exceeded on Tripo API. Please wait a few moments.';
                } else if (response.status >= 500) {
                    hint = 'Tripo 3D cloud server error or maintenance.';
                }

                const errMsg = `Tripo API Error (${response.status} ${response.statusText}): ${title}. ${hint}`;
                lastError = new Error(errMsg);
                
                if (!hasMoreCandidates) {
                    logTripo('error', errMsg, { status: response.status, title, url, preview });
                    throw lastError;
                }
                continue;
            }

            // Safe JSON parse
            let json: any;
            try {
                json = JSON.parse(rawText);
            } catch (jsonErr: any) {
                const parseErrMsg = `Failed to parse Tripo API response: ${jsonErr.message}. Response preview: ${rawText.slice(0, 150)}`;
                logTripo('warning', parseErrMsg, { rawText: rawText.slice(0, 500) });
                lastError = new Error(parseErrMsg);
                if (!hasMoreCandidates) throw lastError;
                continue;
            }

            // Check for endpoint-not-found codes like 4001 or 404 where fallback might succeed
            const isEndpointNotFound = json.code === 4001 || json.code === 404 || response.status === 404 ||
                (typeof json.message === 'string' && json.message.toLowerCase().includes('no endpoint found'));

            if (isEndpointNotFound && hasMoreCandidates) {
                logTripo('warning', `[${description}] Endpoint ${url} not found (code ${json.code}): "${json.message || ''}", trying alternative endpoint...`);
                continue;
            }

            // Check HTTP status or Tripo API code
            if (!response.ok || (json.code !== undefined && json.code !== 0)) {
                const apiMsg = json.message || json.error?.message || json.msg || `HTTP Error ${response.status}`;
                const fullErrMsg = `Tripo API [code ${json.code ?? response.status}]: ${apiMsg}`;

                // If authentication error or bad request on current endpoint and we have candidates, check if we should try next
                if (hasMoreCandidates && (response.status >= 500 || response.status === 404)) {
                    logTripo('warning', `[${description}] Candidate ${url} failed with ${fullErrMsg}, trying next candidate...`);
                    continue;
                }

                logTripo('error', fullErrMsg, { endpoint, response: json });
                throw new Error(fullErrMsg);
            }

            logTripo('info', `[${description}] Success (code ${json.code ?? 0})`, {
                taskId: json.data?.task_id || json.data?.taskId,
                status: json.data?.status,
                progress: json.data?.progress
            });

            return json as T;
        } catch (fetchErr: any) {
            lastError = fetchErr;
            // If proxy failed with network error, try direct / next candidate
            if (hasMoreCandidates) {
                logTripo('warning', `Request failed on ${url} (${fetchErr.message}), falling back to next candidate...`);
                continue;
            }
            logTripo('error', `[${description}] Request failed: ${fetchErr.message}`);
            throw fetchErr;
        }
    }

    throw lastError || new Error('Tripo API request failed unexpectedly.');
}

// ==========================================
// Tripo 3D API Core Functions
// ==========================================

/**
 * Detect image format ('png', 'jpeg', 'jpg', 'webp') for Tripo API payload
 */
export const detectImageFileExtension = (input: File | Blob | string): 'png' | 'jpg' | 'jpeg' | 'webp' => {
    if (typeof input === 'string') {
        if (input.startsWith('data:image/')) {
            const mimeMatch = input.match(/^data:image\/(png|jpeg|jpg|webp)/i);
            if (mimeMatch) {
                const ext = mimeMatch[1].toLowerCase();
                return ext === 'jpeg' ? 'jpeg' : (ext as any);
            }
        } else if (input.startsWith('http://') || input.startsWith('https://')) {
            const cleanUrl = input.split('?')[0].toLowerCase();
            if (cleanUrl.endsWith('.jpg')) return 'jpg';
            if (cleanUrl.endsWith('.jpeg')) return 'jpeg';
            if (cleanUrl.endsWith('.webp')) return 'webp';
            return 'png';
        }
    } else if (input instanceof File || input instanceof Blob) {
        const type = (input.type || '').toLowerCase();
        if (type.includes('jpeg')) return 'jpeg';
        if (type.includes('jpg')) return 'jpg';
        if (type.includes('webp')) return 'webp';
        return 'png';
    }
    return 'png';
};

/**
 * Upload an image (base64, File, Blob) to Tripo 3D API to obtain a file_token
 */
export const uploadTripoFile = async (
    fileInput: File | Blob | string,
    filename: string = 'input_image.png'
): Promise<string> => {
    // If input is already a Tripo file_token
    if (typeof fileInput === 'string' && !fileInput.startsWith('data:') && !fileInput.startsWith('http://') && !fileInput.startsWith('https://') && !fileInput.startsWith('blob:')) {
        logTripo('info', `Using existing Tripo file_token: ${fileInput}`);
        return fileInput.trim();
    }

    let blobToSend: Blob;
    let ext = detectImageFileExtension(fileInput);

    if (typeof fileInput === 'string') {
        if (fileInput.startsWith('data:')) {
            const parts = fileInput.split(',');
            if (parts.length < 2 || !parts[1] || parts[1].trim() === '') {
                throw new Error('Image data URL is empty. Please provide a valid non-empty image.');
            }
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : `image/${ext}`;
            const byteCharacters = atob(parts[1]);
            if (byteCharacters.length === 0) {
                throw new Error('Image binary data is 0 bytes. Please provide a valid non-empty image.');
            }
            const byteArrays = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteArrays[i] = byteCharacters.charCodeAt(i);
            }
            blobToSend = new Blob([byteArrays], { type: mime });
        } else if (fileInput.startsWith('http://') || fileInput.startsWith('https://') || fileInput.startsWith('blob:')) {
            logTripo('info', `Fetching image asset from URL: ${fileInput}`);
            const res = await fetch(fileInput);
            if (!res.ok) {
                throw new Error(`Failed to fetch image from URL: ${fileInput} (HTTP ${res.status})`);
            }
            blobToSend = await res.blob();
        } else {
            throw new Error('Invalid image format provided for Tripo upload.');
        }
    } else {
        blobToSend = fileInput;
    }

    if (!blobToSend || blobToSend.size === 0) {
        throw new Error('Image file is empty (0 bytes). Please upload a valid image.');
    }

    const sizeKb = Math.round(blobToSend.size / 1024);
    const targetFilename = filename.includes('.') ? filename : `${filename}.${ext}`;
    logTripo('info', `Uploading asset "${targetFilename}" (${sizeKb} KB) to Tripo 3D...`);

    const formData = new FormData();
    formData.append('file', blobToSend, targetFilename);

    const data = await tripoApiRequest<TripoUploadResponse>(
        '/files',
        {
            method: 'POST',
            body: formData
        },
        `Upload Asset (${targetFilename})`
    );

    const token = data.data?.file_token || data.data?.image_token || (data as any).file_token || (data as any).image_token;
    if (!token) {
        throw new Error('Tripo API did not return a valid file_token after upload.');
    }

    logTripo('success', `Asset "${targetFilename}" uploaded successfully. Token: ${token}`);
    return token;
};

/**
 * Creates a Multiview to 3D task with Standard Texture on Tripo 3D
 */
export const createMultiviewTo3DTask = async (
    params: TripoMultiviewTo3DParams
): Promise<TripoTaskCreateResult> => {
    if (!params.views) {
        throw new Error('Views object is required for Multiview to 3D generation.');
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
        });
    }

    logTripo('info', `Preparing Multiview to 3D task with ${activeViewKeys.length} views: [${activeViewKeys.map(k => k.toUpperCase()).join(', ')}]...`);

    // Upload only the provided views and build valid TripoFileInput entries
    const filesPayload: TripoFileInput[] = [];

    for (const viewKey of viewsOrder) {
        const viewData = params.views[viewKey];
        if (viewData) {
            const ext = detectImageFileExtension(viewData);
            if (typeof viewData === 'string' && (viewData.startsWith('http://') || viewData.startsWith('https://'))) {
                logTripo('info', `View "${viewKey.toUpperCase()}" using direct URL`);
                filesPayload.push({
                    type: ext,
                    url: viewData
                });
            } else {
                logTripo('info', `Uploading "${viewKey.toUpperCase()}" view...`);
                const token = await uploadTripoFile(viewData, `${viewKey}_view.${ext}`);
                filesPayload.push({
                    type: ext,
                    file_token: token
                });
            }
        }
    }

    const modelVer = params.modelVersion || getTripoModelVersion() || DEFAULT_TRIPO_MODEL_VERSION;

    const requestBody: Record<string, any> = {
        type: 'multiview_to_model',
        files: filesPayload,
        texture: params.texture !== false,
        texture_quality: params.textureQuality || 'standard',
        texture_alignment: params.textureAlignment || 'original_image',
        pbr: params.pbr !== false,
        model_version: modelVer
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

    logTripo('info', `Creating Multiview 3D Task with model "${modelVer}" (${filesPayload.length} images)...`, requestBody);

    const data = await tripoApiRequest<any>(
        '/task',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
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
    taskId: string
): Promise<TripoTaskStatusResponse> => {
    return await tripoApiRequest<TripoTaskStatusResponse>(
        `/task/${taskId}`,
        {
            method: 'GET'
        },
        `Task Status (${taskId})`
    );
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
    let lastReportedProgress = -1;
    let lastReportedStatus = '';

    logTripo('info', `Started polling for task ${taskId}...`);

    while (true) {
        if (signal?.aborted) {
            logTripo('warning', `Polling aborted by user for task ${taskId}`);
            throw new Error('Tripo task generation was cancelled by user.');
        }

        if (Date.now() - startTime > maxTimeoutMs) {
            const timeoutMsg = `Tripo task generation timed out after ${Math.round(maxTimeoutMs / 1000)} seconds.`;
            logTripo('error', timeoutMsg);
            throw new Error(timeoutMsg);
        }

        const res = await getTripoTaskStatus(taskId);
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
            const modelUrl = output.model || output.pbr_model || output.base_model;
            const thumbnailUrl = output.thumbnail || output.rendered_image;
            const renderedImageUrl = output.rendered_image;

            const durationSec = Math.round((Date.now() - startTime) / 1000);
            logTripo('success', `Task ${taskId} completed in ${durationSec}s! Model GLB ready.`, {
                modelUrl,
                thumbnailUrl
            });

            saveTripoRecentTask({
                taskId,
                status: 'success',
                progress: 100,
                modelUrl,
                thumbnailUrl,
                renderedImageUrl
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
            let errorMsg = 'Unknown Tripo generation error';
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
            logTripo('warning', `Task ${taskId} was cancelled on server`);
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
    if (!params.image) {
        throw new Error('Input image is required for Image to 3D generation.');
    }

    logTripo('info', 'Preparing single image for Image to 3D...');

    const ext = detectImageFileExtension(params.image);
    let filePayload: TripoFileInput;
    if (typeof params.image === 'string' && (params.image.startsWith('http://') || params.image.startsWith('https://'))) {
        filePayload = {
            type: ext,
            url: params.image
        };
    } else {
        const token = await uploadTripoFile(params.image, `image_to_3d.${ext}`);
        filePayload = {
            type: ext,
            file_token: token
        };
    }

    const modelVer = params.modelVersion || getTripoModelVersion() || DEFAULT_TRIPO_MODEL_VERSION;

    const requestBody: Record<string, any> = {
        type: 'image_to_model',
        file: filePayload,
        texture: params.texture !== false,
        texture_quality: params.textureQuality || 'standard',
        texture_alignment: params.textureAlignment || 'original_image',
        pbr: params.pbr !== false,
        model_version: modelVer
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

    logTripo('info', `Creating Image 3D Task with model "${modelVer}"...`, requestBody);

    const data = await tripoApiRequest<any>(
        '/task',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
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
 * High-level helper: Generates a 3D model from a single image + Standard Texture
 */
export const generateImageTo3D = async (
    params: TripoImageTo3DParams,
    onProgress?: (progress: number, status: string) => void,
    signal?: AbortSignal,
    onTaskCreated?: (taskId: string) => void
): Promise<TripoTaskResult> => {
    if (onProgress) onProgress(5, 'uploading');
    const { taskId } = await createImageTo3DTask(params);
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
    const { taskId } = await createMultiviewTo3DTask(params);
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

    const data = await tripoApiRequest<any>(
        '/task',
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

// ==========================================
// Tripo 3D Balance & Credits
// ==========================================

/**
 * Fetch current user credit/token balance from Tripo 3D API
 */
export const fetchTripoUserBalance = async (): Promise<TripoBalanceData | null> => {
    if (!isTripoEnabled() || !getTripoApiKey()) return null;

    try {
        const res = await tripoApiRequest<{ code: number; data: { balance: number; frozen?: number } }>(
            '/account/balance',
            { method: 'GET' },
            'Fetch User Balance'
        );

        if (res && res.data && typeof res.data.balance === 'number') {
            const balanceData: TripoBalanceData = {
                balance: res.data.balance,
                frozen: res.data.frozen ?? 0,
                timestamp: Date.now()
            };
            try {
                localStorage.setItem(STORAGE_KEY_TRIPO_LAST_BALANCE, JSON.stringify(balanceData));
            } catch {}
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(TRIPO_BALANCE_CHANGE_EVENT, { detail: balanceData }));
            }
            logTripo('info', `Fetched Tripo balance: ${balanceData.balance} credits (frozen: ${balanceData.frozen})`);
            return balanceData;
        }
        return null;
    } catch (e: any) {
        logTripo('warning', `Failed to fetch Tripo user balance: ${e?.message || e}`);
        try {
            const cached = localStorage.getItem(STORAGE_KEY_TRIPO_LAST_BALANCE);
            if (cached) return JSON.parse(cached);
        } catch {}
        return null;
    }
};

/**
 * React hook to access and refresh Tripo 3D account balance in real-time
 */
export const useTripoBalance = () => {
    const [balanceData, setBalanceData] = useState<TripoBalanceData | null>(() => {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_TRIPO_LAST_BALANCE);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshBalance = useCallback(async () => {
        if (!isTripoEnabled() || !getTripoApiKey()) {
            setBalanceData(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTripoUserBalance();
            if (data) setBalanceData(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to fetch balance');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshBalance();

        const handleBalanceUpdate = (e: any) => {
            if (e.detail) setBalanceData(e.detail);
        };
        const handleConfigUpdate = () => {
            refreshBalance();
        };

        window.addEventListener(TRIPO_BALANCE_CHANGE_EVENT, handleBalanceUpdate);
        window.addEventListener(TRIPO_CONFIG_CHANGE_EVENT, handleConfigUpdate);

        return () => {
            window.removeEventListener(TRIPO_BALANCE_CHANGE_EVENT, handleBalanceUpdate);
            window.removeEventListener(TRIPO_CONFIG_CHANGE_EVENT, handleConfigUpdate);
        };
    }, [refreshBalance]);

    return {
        balance: balanceData?.balance ?? null,
        frozen: balanceData?.frozen ?? null,
        balanceData,
        loading,
        error,
        refreshBalance
    };
};

// ==========================================
// Tripo 3D Recent Tasks & History Management
// ==========================================

const MAX_SAVED_TASKS = 60;

/**
 * Get locally stored Tripo 3D tasks
 */
export const getTripoRecentTasks = (): TripoRecentTask[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TRIPO_RECENT_TASKS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter(t => t && t.taskId && !t.taskId.startsWith('sample_'));
            }
        }
    } catch {}
    return [];
};

/**
 * Upsert or update a task in recent Tripo tasks history
 */
export const saveTripoRecentTask = (
    taskUpdate: Partial<TripoRecentTask> & { taskId: string }
): void => {
    try {
        const existing = getTripoRecentTasks();
        const index = existing.findIndex(t => t.taskId === taskUpdate.taskId);
        let updated: TripoRecentTask[];

        if (index >= 0) {
            const current = existing[index];
            updated = [...existing];
            updated[index] = {
                ...current,
                ...taskUpdate,
                createdAt: current.createdAt || taskUpdate.createdAt || Date.now()
            };
        } else {
            const newTask: TripoRecentTask = {
                taskId: taskUpdate.taskId,
                type: taskUpdate.type || 'image_to_model',
                prompt: taskUpdate.prompt || '',
                createdAt: taskUpdate.createdAt || Date.now(),
                status: taskUpdate.status || 'queued',
                progress: taskUpdate.progress || 0,
                modelUrl: taskUpdate.modelUrl,
                thumbnailUrl: taskUpdate.thumbnailUrl,
                renderedImageUrl: taskUpdate.renderedImageUrl,
                creditsConsumed: taskUpdate.creditsConsumed,
                error: taskUpdate.error
            };
            updated = [newTask, ...existing];
        }

        if (updated.length > MAX_SAVED_TASKS) {
            updated = updated.slice(0, MAX_SAVED_TASKS);
        }

        localStorage.setItem(STORAGE_KEY_TRIPO_RECENT_TASKS, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRIPO_TASKS_CHANGE_EVENT, { detail: updated }));
        }
    } catch (e) {
        console.warn('Failed to save recent Tripo task:', e);
    }
};

/**
 * Remove a specific task from local recent history
 */
export const removeTripoRecentTask = (taskId: string): void => {
    try {
        const existing = getTripoRecentTasks();
        const updated = existing.filter(t => t.taskId !== taskId);
        localStorage.setItem(STORAGE_KEY_TRIPO_RECENT_TASKS, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRIPO_TASKS_CHANGE_EVENT, { detail: updated }));
        }
    } catch (e) {
        console.warn('Failed to remove recent Tripo task:', e);
    }
};

/**
 * Clear all recent tasks from history
 */
export const clearTripoRecentTasks = (): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_RECENT_TASKS, JSON.stringify([]));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRIPO_TASKS_CHANGE_EVENT, { detail: [] }));
        }
    } catch (e) {
        console.warn('Failed to clear recent Tripo tasks:', e);
    }
};

/**
 * Helper to harvest all 3D task records and models from across the entire app
 * (local history, canvas node states, tabs state, and recent tasks storage).
 */
export const harvestAllLocal3DTasks = (): TripoRecentTask[] => {
    const taskMap = new Map<string, TripoRecentTask>();

    // 1. Existing recent tasks
    const recent = getTripoRecentTasks();
    recent.forEach(t => {
        if (t && t.taskId) taskMap.set(t.taskId, t);
    });

    // 2. Scan generation history in localStorage
    try {
        const historyKeys = ['generation_history', 'prompt_modifier_history', 'history_items'];
        for (const k of historyKeys) {
            const raw = localStorage.getItem(k);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    parsed.forEach((item: any) => {
                        const is3d = item.mediaType === '3d' || item.aspectRatio === '3d' || !!item.modelUrl || (typeof item.prompt === 'string' && item.prompt.includes('3D'));
                        const taskId = item.taskId || item.id || (item.modelUrl ? `model_${item.timestamp || Date.now()}` : null);
                        if (is3d && taskId && !taskMap.has(taskId)) {
                            taskMap.set(taskId, {
                                taskId: String(taskId),
                                type: '3d_generation',
                                prompt: item.prompt || '3D Model Generation',
                                createdAt: item.timestamp || item.createdAt || Date.now(),
                                status: 'success',
                                progress: 100,
                                modelUrl: item.modelUrl,
                                thumbnailUrl: item.thumbnailUrl || item.imageUrl || item.url,
                                renderedImageUrl: item.imageUrl || item.renderedImageUrl || item.url
                            });
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.warn('Error harvesting from history:', e);
    }

    // 3. Scan canvas tabs and nodes in localStorage
    try {
        const tabKeys = ['canvas_tabs', 'prompt_modifier_tabs', 'session_tabs_state', 'app_nodes'];
        for (const tk of tabKeys) {
            const raw = localStorage.getItem(tk);
            if (raw) {
                const parsed = JSON.parse(raw);
                const nodesList: any[] = [];
                if (Array.isArray(parsed)) {
                    parsed.forEach((tab: any) => {
                        if (Array.isArray(tab.nodes)) nodesList.push(...tab.nodes);
                        else if (tab.id && tab.type) nodesList.push(tab);
                    });
                } else if (parsed && Array.isArray(parsed.nodes)) {
                    nodesList.push(...parsed.nodes);
                }

                nodesList.forEach((n: any) => {
                    if (n && (n.type === 'three_d_generator' || n.type === 'three_d_generation' || n.type === 15 || n.type === 'THREE_D_GENERATOR')) {
                        try {
                            const val = typeof n.value === 'string' ? JSON.parse(n.value) : n.value;
                            if (val && (val.taskId || val.modelUrl || val.renderedImageUrl)) {
                                const tId = val.taskId || `node_${n.id}`;
                                if (!taskMap.has(tId)) {
                                    taskMap.set(tId, {
                                        taskId: tId,
                                        type: val.mode || 'multiview_to_3d',
                                        prompt: val.prompt || n.title || '3D Model',
                                        createdAt: n.createdAt || Date.now(),
                                        status: (val.status as TripoTaskStatus) || 'success',
                                        progress: val.progress ?? 100,
                                        modelUrl: val.modelUrl,
                                        thumbnailUrl: val.thumbnailUrl || val.renderedImageUrl,
                                        renderedImageUrl: val.renderedImageUrl || val.thumbnailUrl
                                    });
                                }
                            }
                        } catch {}
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Error harvesting from canvas nodes:', e);
    }

    return Array.from(taskMap.values()).sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Helper to download task metadata JSON file
 * Filename format: 3D_Model_{AssetName}_{Index}_{Date}_{Time}.json
 */
export const downloadTaskMetadataJson = (taskData: any, assetName?: string, index?: number | string): string => {
    try {
        const now = new Date(taskData.createdAt || Date.now());
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const cleanName = (assetName || taskData.prompt || 'Asset').slice(0, 30).replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_') || 'Asset';
        const indexStr = index !== undefined && index !== null && String(index).trim() !== '' ? `${String(index).replace(/[^a-zA-Z0-9_-]/g, '')}_` : '';
        const filename = `3D_Model_${cleanName}_${indexStr}${dateStr}_${timeStr}.json`;

        const taskId = taskData.taskId || taskData.task_id || taskData.id;
        const payload = {
            app: 'Prompt Modifier',
            engine: 'Tripo 3D AI',
            exportedAt: new Date().toISOString(),
            task_id: taskId,
            taskId: taskId,
            type: taskData.type || taskData.mode || '3d_generation',
            modelVersion: taskData.modelVersion || getTripoModelVersion(),
            prompt: taskData.prompt || '',
            status: taskData.status || 'unknown',
            progress: taskData.progress ?? (taskData.status === 'success' ? 100 : 0),
            modelUrl: taskData.modelUrl || taskData.output?.model || taskData.output?.pbr_model || taskData.output?.base_model,
            thumbnailUrl: taskData.thumbnailUrl || taskData.output?.thumbnail || taskData.output?.rendered_image,
            renderedImageUrl: taskData.renderedImageUrl || taskData.output?.rendered_image,
            creditsConsumed: taskData.creditsConsumed,
            createdAt: taskData.createdAt || Date.now(),
            index: index !== undefined ? index : undefined,
            metadata: taskData
        };

        const jsonStr = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logTripo('success', `Saved Task Metadata JSON: ${filename} (Task ID: ${taskId})`);
        return filename;
    } catch (e: any) {
        console.error('Failed to download task metadata JSON', e);
        return '';
    }
};

/**
 * Batch query multiple tasks from Tripo API (using POST /v3/tasks/list with fallback)
 */
export const queryTripoTasksBatch = async (taskIds: string[]): Promise<TripoRecentTask[]> => {
    const cleanIds = Array.from(new Set(taskIds.map(id => id.trim()).filter(Boolean)));
    if (cleanIds.length === 0) return [];

    logTripo('info', `Batch querying ${cleanIds.length} tasks from Tripo API...`);

    const results: TripoRecentTask[] = [];

    // Try batch endpoint POST /v3/tasks/list if API key is configured
    const hasKey = Boolean(getTripoApiKey() && isTripoEnabled());
    let batchSucceeded = false;

    if (hasKey) {
        try {
            const listRes = await tripoApiRequest<any>(
                '/v3/tasks/list',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_ids: cleanIds, tasks: cleanIds })
                },
                'Batch Tasks Query'
            );

            if (listRes && (Array.isArray(listRes.data) || Array.isArray(listRes.tasks) || Array.isArray(listRes.data?.tasks))) {
                const items = Array.isArray(listRes.data) ? listRes.data : (listRes.tasks || listRes.data?.tasks || []);
                items.forEach((d: any) => {
                    const id = d.task_id || d.taskId || d.id;
                    if (!id) return;
                    const out = d.output || d.result || {};
                    const tItem: TripoRecentTask = {
                        taskId: id,
                        type: d.type || '3d_generation',
                        prompt: d.prompt || d.input?.prompt || '',
                        createdAt: d.created_at ? (typeof d.created_at === 'number' && d.created_at < 1e11 ? d.created_at * 1000 : d.created_at) : Date.now(),
                        status: (d.status?.toLowerCase() || 'success') as TripoTaskStatus,
                        progress: d.progress ?? (d.status === 'success' ? 100 : 0),
                        modelUrl: out.model || out.pbr_model || out.base_model || out.model_url,
                        thumbnailUrl: out.thumbnail || out.rendered_image || out.thumbnail_url || out.rendered_image_url,
                        renderedImageUrl: out.rendered_image || out.thumbnail || out.rendered_image_url,
                        creditsConsumed: d.credits_consumed || d.consumed_credit
                    };
                    saveTripoRecentTask(tItem);
                    results.push(tItem);
                });
                batchSucceeded = results.length > 0;
            }
        } catch {
            // Fall back to parallel individual queries
        }
    }

    if (!batchSucceeded) {
        // Query individually in parallel
        await Promise.all(
            cleanIds.map(async (id) => {
                try {
                    const t = await importTripoTaskById(id);
                    if (t) results.push(t);
                } catch {}
            })
        );
    }

    return results;
};

/**
 * Parse one or multiple uploaded JSON task files and query their live statuses
 */
export const parseTaskJsonFiles = async (files: FileList | File[]): Promise<TripoRecentTask[]> => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return [];

    const discoveredIds = new Set<string>();
    const parsedTasks: Partial<TripoRecentTask>[] = [];

    for (const file of fileList) {
        try {
            const text = await file.text();
            const json = JSON.parse(text);

            const processSingle = (obj: any) => {
                const id = obj.task_id || obj.taskId || obj.id;
                if (id && typeof id === 'string' && id.trim()) {
                    discoveredIds.add(id.trim());
                    parsedTasks.push({
                        taskId: id.trim(),
                        type: obj.type || obj.mode,
                        prompt: obj.prompt,
                        modelUrl: obj.modelUrl || obj.model_url,
                        thumbnailUrl: obj.thumbnailUrl || obj.thumbnail_url || obj.renderedImageUrl,
                        renderedImageUrl: obj.renderedImageUrl || obj.rendered_image_url,
                        createdAt: obj.createdAt ? Number(obj.createdAt) : Date.now(),
                        status: (obj.status?.toLowerCase() || 'success') as TripoTaskStatus
                    });
                }
            };

            if (Array.isArray(json)) {
                json.forEach(processSingle);
            } else if (typeof json === 'object' && json !== null) {
                if (Array.isArray(json.tasks)) {
                    json.tasks.forEach(processSingle);
                } else {
                    processSingle(json);
                }
            }
        } catch (err) {
            console.error(`Failed to parse JSON file ${file.name}:`, err);
        }
    }

    // Save parsed tasks locally first
    parsedTasks.forEach(t => {
        if (t.taskId) {
            saveTripoRecentTask(t as any);
        }
    });

    // Query live statuses for all discovered task IDs
    const idArray = Array.from(discoveredIds);
    if (idArray.length > 0) {
        return await queryTripoTasksBatch(idArray);
    }

    return getTripoRecentTasks();
};

/**
 * Export all saved 3D tasks to a single backup JSON file
 */
export const exportAllTasksToJson = (): void => {
    const tasks = getTripoRecentTasks();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const filename = `Tripo_3D_Tasks_Backup_${dateStr}_${timeStr}.json`;

    const payload = {
        app: 'Prompt Modifier',
        engine: 'Tripo 3D AI',
        exportedAt: new Date().toISOString(),
        totalTasks: tasks.length,
        tasks
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Import and query an existing task by its Task ID directly from Tripo API
 */
export const importTripoTaskById = async (taskId: string): Promise<TripoRecentTask | null> => {
    const cleanId = taskId.trim();
    if (!cleanId) return null;

    logTripo('info', `Importing task by ID: ${cleanId}...`);

    try {
        const res = await getTripoTaskStatus(cleanId);
        if (res && res.data) {
            const d = res.data;
            const out = d.output || d.result || {};
            const importedTask: TripoRecentTask = {
                taskId: cleanId,
                type: d.type || '3d_generation',
                prompt: (d as any).prompt || (d as any).input?.prompt || 'Imported 3D Generation',
                createdAt: d.created_at ? (typeof d.created_at === 'number' && d.created_at < 1e11 ? d.created_at * 1000 : d.created_at) : Date.now(),
                status: (d.status?.toLowerCase() || 'success') as TripoTaskStatus,
                progress: d.progress ?? (d.status === 'success' ? 100 : 0),
                modelUrl: out.model || out.pbr_model || out.base_model || out.model_url,
                thumbnailUrl: out.thumbnail || out.rendered_image || out.thumbnail_url || out.rendered_image_url,
                renderedImageUrl: out.rendered_image || out.thumbnail || out.rendered_image_url
            };

            saveTripoRecentTask(importedTask);
            logTripo('success', `Task ${cleanId} imported successfully! Status: ${importedTask.status}`);
            return importedTask;
        }
    } catch (err: any) {
        logTripo('error', `Failed to import task ${cleanId}: ${err?.message || err}`);
        throw err;
    }

    return null;
};

/**
 * Request recent generations with preview and model download URLs (5, 10, 15, etc.)
 * Queries user's actual Tripo API account and local session records, then filters to requested count.
 */
export const fetchTripoRecentTasks = async (limit: number = 10): Promise<TripoRecentTask[]> => {
    const apiKey = getTripoApiKey();
    const isConfigured = Boolean(apiKey && isTripoEnabled());

    logTripo('info', `Updating recent Tripo 3D models (limit: ${limit})...`);

    // 1. Gather all locally generated/recorded tasks from user's current session & canvas
    const harvestedTasks = harvestAllLocal3DTasks();
    const taskMap = new Map<string, TripoRecentTask>();
    harvestedTasks.forEach(t => {
        if (t && t.taskId && !t.taskId.startsWith('sample_')) {
            taskMap.set(t.taskId, t);
        }
    });

    // 2. Sort all real user tasks by creation date (newest first)
    const allUserTasks = Array.from(taskMap.values())
        .filter(t => t && t.taskId && !t.taskId.startsWith('sample_'))
        .sort((a, b) => b.createdAt - a.createdAt);

    // 3. Take the requested limit (e.g. 5, 10, 15) or all if limit is greater
    const targetSlice = limit > 0 ? allUserTasks.slice(0, limit) : allUserTasks;

    // 4. Query live task statuses for each task ID to refresh GLB download links and preview images
    if (isConfigured && targetSlice.length > 0) {
        await Promise.all(
            targetSlice.map(async (item) => {
                if (item.taskId && !item.taskId.startsWith('node_')) {
                    try {
                        const statusRes = await getTripoTaskStatus(item.taskId);
                        if (statusRes && statusRes.data) {
                            const d = statusRes.data;
                            const out = d.output || d.result || {};
                            item.status = (d.status?.toLowerCase() || item.status) as TripoTaskStatus;
                            item.progress = d.progress ?? item.progress;
                            item.modelUrl = out.model || out.pbr_model || out.base_model || out.model_url || item.modelUrl;
                            item.thumbnailUrl = out.thumbnail || out.rendered_image || out.thumbnail_url || item.thumbnailUrl;
                            item.renderedImageUrl = out.rendered_image || out.thumbnail || out.rendered_image_url || item.renderedImageUrl;
                            if (d.created_at) {
                                item.createdAt = typeof d.created_at === 'number' && d.created_at < 1e11 ? d.created_at * 1000 : d.created_at;
                            }
                            saveTripoRecentTask(item);
                        }
                    } catch {}
                }
            })
        );
        fetchTripoUserBalance().catch(() => {});
    }

    // 5. Persist real user tasks list and dispatch change event
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_RECENT_TASKS, JSON.stringify(targetSlice));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRIPO_TASKS_CHANGE_EVENT, { detail: targetSlice }));
        }
    } catch {}

    logTripo('success', `Finished updating user Tripo tasks. Count: ${targetSlice.length}`);
    return targetSlice;
};
