import { readBatchArchive, writeBatchArchive } from './batchResultsCache';
import { hydrateCanvasOriginals } from './canvasOriginalStore';

export interface StoredImageSource {
    image: string;
    thumbnailUrl?: string;
    originalArchiveKey?: string;
    originalImage?: string;
    originalSourceVersion?: number;
}

// Durable, content-addressed originals. No canvas conversion or resizing occurs.
export async function storeOriginalImage(dataUrl: string): Promise<string> {
    if (!/^data:image\/[^;]+;base64,/.test(dataUrl)) throw new Error('An original image data URL is required');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
    const key = `original-image:${Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('')}`;
    await writeBatchArchive(key, { dataUrl });
    return key;
}

export async function acquireOriginalImage(source: StoredImageSource): Promise<string> {
    if (source.originalArchiveKey) {
        const stored = await readBatchArchive<{ dataUrl: string }>(source.originalArchiveKey);
        if (!stored?.dataUrl?.startsWith('data:image/')) {
            throw new Error('Original image is unavailable. Reimport the source image; a preview cannot be sent to the server.');
        }
        return stored.dataUrl;
    }
    if (source.originalImage) return source.originalImage;
    if (source.originalSourceVersion === 2) return source.image;
    throw new Error('This legacy MultiView card does not retain a verified original. Reimport the source image before server processing.');
}

export async function prepareStoredImage(dataUrl: string, thumbnailUrl: string): Promise<StoredImageSource> {
    // If durable storage fails, keep the original inline rather than losing it.
    try {
        // The active graph still has synchronous downstream readers. Retain
        // their original until canvas cooling safely replaces it with a disk
        // reference; the DOM receives only the display thumbnail.
        return { image: thumbnailUrl, thumbnailUrl, originalImage: dataUrl, originalArchiveKey: await storeOriginalImage(dataUrl), originalSourceVersion: 2 };
    } catch (error) {
        console.warn('Keeping original inline because durable image storage failed:', error);
        return { image: dataUrl, thumbnailUrl, originalSourceVersion: 2 };
    }
}

// Portable exports include bytes, not references to another machine's cache.
export async function inlineStoredOriginals<T>(value: T): Promise<T> {
    const visit = async (input: any): Promise<any> => {
        if (typeof input === 'string' && (input.startsWith('{') || input.startsWith('['))) {
            let parsed: any;
            try { parsed = JSON.parse(input); } catch { return input; }
            return JSON.stringify(await visit(parsed));
        }
        if (!input || typeof input !== 'object') return input;
        if (Array.isArray(input)) {
            const result = [];
            for (const item of input) result.push(await visit(item));
            return result;
        }
        if (input.canvasOriginalArchiveKey) input = await hydrateCanvasOriginals(input);
        const result: any = {};
        for (const [key, child] of Object.entries(input)) result[key] = await visit(child);
        if (input.originalArchiveKey) {
            result.originalImage = await acquireOriginalImage(input);
            delete result.originalArchiveKey;
        }
        return result;
    };
    return visit(value);
}
