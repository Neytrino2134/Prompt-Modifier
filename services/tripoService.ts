/// <reference types="vite/client" />
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
    return typeof process !== 'undefined' ? (process.env.TRIPO_API_KEY || '').trim() : '';
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
    modelVersion?: string; // Defaults to configured model
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
    model_url?: string;
    rendered_image_url?: string;
    thumbnail_url?: string;
    model?: string; // Legacy model URL
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
    error_code?: number;
    error_message?: string;
    credits_consumed?: number;
    created_at?: number | string;
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
class TripoApiError extends Error {
    constructor(message: string, public code?: number, public httpStatus?: number) {
        super(message);
        this.name = 'TripoApiError';
    }
}

/** Use one API contract; only fall back when a dev proxy is demonstrably absent.
 * A lost POST response may already have created a paid task: never replay it.
 */
async function tripoApiRequest<T = any>(
    endpoint: string,
    options: RequestInit,
    description: string,
    legacy = false
): Promise<T> {
    const apiKey = getTripoApiKey();
    if (!apiKey) throw new Error('TRIPO AI API Key is missing. Please enter your API key in Settings.');
    const headers = new Headers(options.headers);
    headers.set('Authorization', 'Bearer ' + apiKey);
    const clean = endpoint.replace(/^\/v3(?=\/)/, '').replace(/^\/v2\/openapi(?=\/)/, '');
    const base = legacy ? DEFAULT_TRIPO_API_BASE : DEFAULT_TRIPO_V3_API_BASE;
    const proxy = legacy ? TRIPO_PROXY_API_BASE : TRIPO_PROXY_V3_API_BASE;
    // Vite proxies do not exist on GitHub Pages or Electron file:// builds.
    const urls = import.meta.env?.DEV ? [proxy + clean, base + clean] : [base + clean];
    for (let i = 0; i < urls.length; i++) {
        options.signal?.throwIfAborted();
        const url = urls[i];
        const isProxy = url.startsWith('/');
        logTripo('info', '[' + description + '] Requesting: ' + url, { method: options.method || 'GET' });
        const controller = new AbortController();
        const abort = () => controller.abort(options.signal?.reason);
        options.signal?.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(() => controller.abort(new DOMException('Tripo request timed out', 'TimeoutError')), 60000);
        try {
            let response: Response;
            let rawText: string;
            try {
                response = await fetch(url, { ...options, headers, signal: controller.signal });
                rawText = await response.text();
            } catch (error) {
                if (isProxy && i + 1 < urls.length && (!options.method || options.method === 'GET') && !controller.signal.aborted) {
                    logTripo('warning', 'Dev proxy unavailable; querying Tripo directly.');
                    continue;
                }
                if (controller.signal.aborted) throw controller.signal.reason;
                throw new TripoApiError('Tripo network request failed. Check connectivity/CORS.' + (options.method === 'POST' ? ' Check task history before retrying: the server may have accepted the request.' : ''), undefined, 0);
            }
            const isHtml = rawText.trim().startsWith('<');
            // A SPA index or missing dev route cannot have submitted the task upstream.
            if (isProxy && i + 1 < urls.length && (response.status === 404 || (response.ok && isHtml))) {
                logTripo('warning', 'Dev proxy route missing; using the same Tripo API directly.');
                continue;
            }
            if (isHtml) throw new TripoApiError('Tripo HTTP ' + response.status + ': ' + (extractHtmlTitle(rawText) || 'HTML response'), undefined, response.status);
            let json: any;
            try { json = JSON.parse(rawText); }
            catch { throw new TripoApiError('Tripo returned invalid JSON (HTTP ' + response.status + ').', undefined, response.status); }
            if (!json || typeof json !== 'object' || Array.isArray(json)) throw new TripoApiError('Invalid Tripo response.', undefined, response.status);
            if (!response.ok || json.code !== 0) {
                const message = json.message || json.error?.message || json.msg || 'HTTP ' + response.status;
                const suggestion = json.suggestion ? ' Suggestion: ' + json.suggestion : '';
                throw new TripoApiError('Tripo API [code ' + (json.code ?? response.status) + ']: ' + message + suggestion, json.code, response.status);
            }
            return json as T;
        } catch (error: any) {
            logTripo('error', '[' + description + '] ' + error.message, { endpoint, code: error.code });
            throw error;
        } finally {
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', abort);
        }
    }
    throw new Error('Tripo API request failed.');
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
    filename: string = 'input_image.png',
    signal?: AbortSignal
): Promise<string> => {
    signal?.throwIfAborted();
    // If input is already a Tripo file_token
    if (typeof fileInput === 'string' && /^(file_[a-zA-Z0-9_-]+|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(fileInput.trim())) {
        logTripo('info', `Using existing Tripo file_token: ${fileInput}`);
        return fileInput.trim();
    }

    let blobToSend: Blob;
    let ext = detectImageFileExtension(fileInput);

    if (typeof fileInput === 'string') {
        if (!fileInput.startsWith('data:') && /^[A-Za-z0-9+/\s]+={0,2}$/.test(fileInput) && fileInput.replace(/\s/g, '').length >= 32) {
            fileInput = 'data:image/png;base64,' + fileInput.replace(/\s/g, '');
        }
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
            const res = await fetch(fileInput, { signal });
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

    const prefix = new Uint8Array(await blobToSend.slice(0, 12).arrayBuffer());
    const mime = prefix[0] === 0x89 && prefix[1] === 0x50 && prefix[2] === 0x4e && prefix[3] === 0x47 ? 'image/png'
        : prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff ? 'image/jpeg'
        : String.fromCharCode(...prefix.slice(0, 4)) === 'RIFF' && String.fromCharCode(...prefix.slice(8, 12)) === 'WEBP' ? 'image/webp' : '';
    if (!mime) throw new Error('Image bytes are not PNG, JPEG or WebP. The file may be corrupted or a URL may have returned an error page.');
    if (blobToSend.type !== mime) blobToSend = new Blob([blobToSend], { type: mime });
    if (blobToSend.size > 20 * 1024 * 1024) throw new Error('Tripo images must be at most 20 MB.');
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(blobToSend.type.toLowerCase())) throw new Error('Tripo requires a PNG, JPEG or WebP image.');
    ext = detectImageFileExtension(blobToSend);
    const sizeKb = Math.round(blobToSend.size / 1024);
    const targetFilename = filename.includes('.') ? filename.replace(/\.[^.]+$/, '.' + ext) : `${filename}.${ext}`;
    logTripo('info', `Uploading asset "${targetFilename}" (${sizeKb} KB) to Tripo 3D...`);

    const formData = new FormData();
    formData.append('file', blobToSend, targetFilename);

    const data = await tripoApiRequest<TripoUploadResponse>(
        '/files',
        {
            method: 'POST',
            body: formData,
            signal
        },
        `Upload Asset (${targetFilename})`
    );

    const token = data.data?.file_token || data.data?.image_token || (data as any).file_token || (data as any).image_token;
    if (typeof token !== 'string' || !token.trim()) {
        throw new Error('Tripo API did not return a valid file_token after upload.');
    }

    logTripo('success', `Asset "${targetFilename}" uploaded successfully. Token: ${token}`);
    return token.trim();
};

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
            modelUrl: taskData.modelUrl || taskData.output?.model_url || taskData.output?.model || taskData.output?.pbr_model || taskData.output?.base_model,
            thumbnailUrl: taskData.thumbnailUrl || taskData.output?.thumbnail || taskData.output?.rendered_image_url || taskData.output?.rendered_image,
            renderedImageUrl: taskData.renderedImageUrl || taskData.output?.rendered_image_url || taskData.output?.rendered_image,
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
    if (cleanIds.length > 100) {
        const chunks: TripoRecentTask[] = [];
        for (let i = 0; i < cleanIds.length; i += 100) chunks.push(...await queryTripoTasksBatch(cleanIds.slice(i, i + 100)));
        return chunks;
    }

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
                    body: JSON.stringify({ task_ids: cleanIds })
                },
                'Batch Tasks Query'
            );

            if (listRes && (listRes.data?.tasks || listRes.tasks || Array.isArray(listRes.data))) {
                const rawItems = listRes.data?.tasks || listRes.tasks || listRes.data;
                const items = Array.isArray(rawItems) ? rawItems : Object.entries(rawItems).map(([id, task]) => ({ ...(task as any), task_id: (task as any).task_id || id }));
                items.forEach((d: any) => {
                    const id = d.task_id || d.taskId || d.id;
                    if (!id) return;
                    const out = d.output || d.result || {};
                    const tItem: TripoRecentTask = {
                        taskId: id,
                        type: d.type || '3d_generation',
                        prompt: d.prompt || d.input?.prompt || '',
                        createdAt: d.created_at ? (typeof d.created_at === 'string' ? Date.parse(d.created_at) : d.created_at < 1e11 ? d.created_at * 1000 : d.created_at) : Date.now(),
                        status: (d.status?.toLowerCase() || 'unknown') as TripoTaskStatus,
                        progress: d.progress ?? (d.status === 'success' ? 100 : 0),
                        modelUrl: out.model || out.pbr_model || out.base_model || out.model_url,
                        thumbnailUrl: out.thumbnail || out.rendered_image || out.thumbnail_url || out.rendered_image_url,
                        renderedImageUrl: out.rendered_image || out.thumbnail || out.rendered_image_url,
                        creditsConsumed: d.credits_consumed ?? d.consumed_credit
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

    const missingIds = cleanIds.filter(id => !results.some(task => task.taskId === id));
    if (!batchSucceeded || missingIds.length) {
        // Recover missed IDs individually, including legacy tasks.
        await Promise.all(
            missingIds.map(async (id) => {
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
                createdAt: d.created_at ? (typeof d.created_at === 'string' ? Date.parse(d.created_at) : d.created_at < 1e11 ? d.created_at * 1000 : d.created_at) : Date.now(),
                status: (d.status?.toLowerCase() || 'unknown') as TripoTaskStatus,
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
                            item.thumbnailUrl = out.thumbnail_url || out.thumbnail || out.rendered_image_url || out.rendered_image || item.thumbnailUrl;
                            item.renderedImageUrl = out.rendered_image || out.thumbnail || out.rendered_image_url || item.renderedImageUrl;
                            if (d.created_at) {
                                item.createdAt = typeof d.created_at === 'string' ? Date.parse(d.created_at) : d.created_at < 1e11 ? d.created_at * 1000 : d.created_at;
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
