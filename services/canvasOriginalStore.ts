import type { CanvasState } from '../types';
import { readBatchArchive, writeBatchArchive } from './batchResultsCache';

const MARKER = 'pm-node-image:';
interface CanvasArchive {
    cache: NonNullable<CanvasState['fullSizeImageCache']>;
    nodeImages?: Record<string, Array<string | number>>;
    images?: string[];
}
export function hasWarmCanvasImages(state: CanvasState): boolean {
    return Object.keys(state.fullSizeImageCache || {}).length > 0
        || state.nodes.some(node => /data:image\/[^"\s]{4096}/.test(node.value));
}
function mapImageStrings(value: any, transform: (image: string) => string): any {
    if (typeof value === 'string') return transform(value);
    if (Array.isArray(value)) return value.map(item => mapImageStrings(item, transform));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapImageStrings(item, transform)]));
    return value;
}
function mapNodeValue(value: string, transform: (image: string) => string): string {
    if (typeof value !== 'string') return value;
    if (value.startsWith('data:image/') || value.startsWith(MARKER)) return transform(value);
    if (!value.startsWith('{') && !value.startsWith('[')) return value;
    let parsed: any;
    try { parsed = JSON.parse(value); } catch { return value; }
    return JSON.stringify(mapImageStrings(parsed, transform));
}

export async function hydrateCanvasOriginals(state: CanvasState): Promise<CanvasState> {
    if (!state.canvasOriginalArchiveKey) return state;
    const stored = await readBatchArchive<CanvasArchive>(state.canvasOriginalArchiveKey);
    if (!stored?.cache) throw new Error('Originals for this canvas could not be loaded. The canvas was not opened to prevent preview substitution.');
    const cache = { ...stored.cache };
    for (const [node, frames] of Object.entries(cache)) {
        cache[node] = Object.fromEntries(Object.entries(frames).map(([frame, source]) => {
            if (!source.startsWith('pm-canvas-image:')) return [frame, source];
            const original = stored.images?.[Number(source.slice('pm-canvas-image:'.length))];
            if (!original) throw new Error('An original cache image is missing');
            return [frame, original];
        }));
    }
    for (const [node, images] of Object.entries(state.fullSizeImageCache || {})) cache[node] = { ...cache[node], ...images };
    // Deleted nodes need not be resurrected from an older cache snapshot.
    const ids = new Set(state.nodes.map(node => node.id));
    for (const id of Object.keys(cache)) if (!ids.has(id)) delete cache[id];
    const nodes = state.nodes.map(node => ({ ...node, value: mapNodeValue(node.value, image => {
        if (!image.startsWith(MARKER)) return image;
        const reference = stored.nodeImages?.[node.id]?.[Number(image.slice(MARKER.length))];
        const original = typeof reference === 'number' ? stored.images?.[reference] : reference;
        if (!original) throw new Error('An original image in this canvas archive is missing');
        return original;
    }) }));
    return { ...state, nodes, fullSizeImageCache: cache, canvasOriginalArchiveKey: undefined };
}

export async function coolCanvasOriginals(state: CanvasState): Promise<CanvasState> {
    const warm = await hydrateCanvasOriginals(state);
    const nodeImages: Record<string, number[]> = {};
    const originals: string[] = [];
    const originalIds = new Map<string, number>();
    const storeImage = (image: string) => {
        let id = originalIds.get(image);
        if (id === undefined) { id = originals.length; originals.push(image); originalIds.set(image, id); }
        return id;
    };
    const nodes = warm.nodes.map(node => {
        const images: string[] = [];
        const indices = new Map<string, number>();
        const value = mapNodeValue(node.value, image => {
            if (!image.startsWith('data:image/') || image.length <= 4096) return image;
            let index = indices.get(image);
            if (index === undefined) { index = images.length; indices.set(image, index); images.push(image); }
            return `${MARKER}${index}`;
        });
        if (images.length) nodeImages[node.id] = images.map(storeImage);
        return value === node.value ? node : { ...node, value };
    });
    if (!Object.keys(warm.fullSizeImageCache || {}).length && !Object.keys(nodeImages).length) return state;
    const key = `canvas-originals:${crypto.randomUUID()}`;
    // Write must complete before removing the last in-memory references.
    const cache = Object.fromEntries(Object.entries(warm.fullSizeImageCache || {}).map(([node, frames]) => [node,
        Object.fromEntries(Object.entries(frames).map(([frame, source]) => [frame, `pm-canvas-image:${storeImage(source)}`]))
    ]));
    await writeBatchArchive(key, { cache, nodeImages, images: originals });
    return { ...state, nodes, fullSizeImageCache: {}, canvasOriginalArchiveKey: key };
}
