/// <reference types="vite/client" />
import {
    DEFAULT_TRIPO_API_BASE,
    DEFAULT_TRIPO_V3_API_BASE,
    TRIPO_PROXY_API_BASE,
    TRIPO_PROXY_V3_API_BASE,
    TripoUploadResponse,
    STORAGE_KEY_TRIPO_LAST_BALANCE,
    TRIPO_BALANCE_CHANGE_EVENT,
    TripoBalanceData
} from './types';
import { getTripoApiKey, isTripoEnabled } from './config';
import { logTripo } from './logger';

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
export class TripoApiError extends Error {
    constructor(message: string, public code?: number, public httpStatus?: number) {
        super(message);
        this.name = 'TripoApiError';
    }
}

/** Use one API contract; only fall back when a dev proxy is demonstrably absent.
 * A lost POST response may already have created a paid task: never replay it.
 */
export async function tripoApiRequest<T = any>(
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
