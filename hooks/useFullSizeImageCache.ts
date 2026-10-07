import { useCallback, useRef, useState, type SetStateAction } from 'react';

export type FullSizeImageCache = Record<string, Record<number, string>>;

export function useFullSizeImageCache() {
    const [fullSizeImageCache, commitCache] = useState<FullSizeImageCache>({});
    const current = useRef(fullSizeImageCache);
    // Chain processors may request the next image before React commits a render.
    // Old callback closures must still read the latest original, never a preview.
    const setFullSizeImageCache = useCallback((update: SetStateAction<FullSizeImageCache>) => {
        const next = typeof update === 'function' ? update(current.current) : update;
        if (next === current.current) return;
        current.current = next;
        commitCache(next);
    }, []);
    const setFullSizeImage = useCallback((nodeId: string, frame: number, image: string) => {
        setFullSizeImageCache(cache => cache[nodeId]?.[frame] === image ? cache : ({ ...cache, [nodeId]: { ...cache[nodeId], [frame]: image } }));
    }, [setFullSizeImageCache]);
    const getFullSizeImage = useCallback((nodeId: string, frame: number) => current.current[nodeId]?.[frame], [fullSizeImageCache]);
    // Consumers can invalidate only dependents of changed original-image nodes.
    (getFullSizeImage as typeof getFullSizeImage & { cacheSnapshot: FullSizeImageCache }).cacheSnapshot = fullSizeImageCache;
    return { fullSizeImageCache, setFullSizeImageCache, setFullSizeImage, getFullSizeImage };
}
