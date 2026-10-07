import { NodeType, type Node } from '../types';

export type FullSizeCache = Record<string, Record<number, string>>;

// Known slot layouts can be pruned precisely. Unknown node types are retained
// conservatively while the node exists, to avoid discarding their only full image.
export function pruneCanvasImageCache(nodes: Node[], cache: FullSizeCache, protectedImages: Set<string> = new Set()): { cache: FullSizeCache; removed: number } {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const result: FullSizeCache = {};
    let removed = 0;
    for (const [id, frames] of Object.entries(cache)) {
        const node = byId.get(id);
        let value: any;
        try { value = JSON.parse(node?.value || '{}'); } catch { value = node?.value; }
        for (const [slot, image] of Object.entries(frames)) {
            const frame = Number(slot);
            let keep = !!node && !!image;
            if (keep && node?.type === NodeType.IMAGE_EDITOR && value && typeof value === 'object') {
                if (frame === 0) keep = !!value.outputImage;
                else if (frame >= 2001) keep = !!value.inputImagesB?.[frame - 2001];
                else if (frame >= 1000) keep = !!value.sequenceOutputs?.[frame - 1000]?.thumbnail;
                else keep = !!value.inputImages?.[frame - 1];
            } else if (keep && node?.type === NodeType.NOTE && value && typeof value === 'object') {
                keep = !!value.references?.[frame]?.image;
            }
            if (protectedImages.has(image)) keep = true;
            if (keep) (result[id] ||= {})[frame] = image;
            else removed++;
        }
    }
    return { cache: result, removed };
}

export function collectCacheReferences(roots: unknown[]): { images: Set<string>; keys: Set<string> } {
    const images = new Set<string>(), keys = new Set<string>(), seen = new Set<object>();
    const visit = (value: any, field = '') => {
        if (typeof value === 'string') {
            if (/^(originalArchiveKey|canvasOriginalArchiveKey)$/.test(field)) keys.add(value);
            if (/^(data:image\/|blob:|https?:\/\/|file:)/.test(value)) images.add(value);
            else if (/^(batchJobName|batchJobId|batchJobIdOrName|nativeBatchId)$/.test(field)) {
                keys.add(`results:${value}`);
                keys.add(`openai-output:${value}`);
            } else if (value.startsWith('{') || value.startsWith('[')) {
                try { visit(JSON.parse(value)); } catch { }
            }
        } else if (value && typeof value === 'object' && !seen.has(value)) {
            seen.add(value);
            for (const [key, child] of Object.entries(value)) {
                if ((key === 'fullSizeImageCache' || key === 'fullSizeImages') && Array.isArray(value.nodes)) {
                    visit(pruneCanvasImageCache(value.nodes, child as FullSizeCache).cache, key);
                } else visit(child, key);
            }
        }
    };
    roots.forEach(root => visit(root));
    return { images, keys };
}
