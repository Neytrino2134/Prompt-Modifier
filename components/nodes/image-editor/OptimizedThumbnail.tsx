import React, { memo, useEffect, useState } from 'react';
import { generateThumbnail } from '../../../utils/imageUtils';
import { scheduleImageWork } from '../../../utils/imageWorkQueue';
import { useImageVisibility } from '../../../hooks/useImageVisibility';

const cache = new Map<string, string>();
interface Consumer { success: (url: string) => void; error?: () => void }
const pending = new Map<string, { controller: AbortController; consumers: Set<Consumer> }>();
const MAX_BYTES = 12 * 1024 * 1024;
let bytes = 0;
function cachePut(key: string, url: string) {
    const previous = cache.get(key);
    if (previous) bytes -= previous.length * 2;
    cache.delete(key); cache.set(key, url); bytes += url.length * 2;
    while (bytes > MAX_BYTES && cache.size) {
        const oldest = cache.keys().next().value!;
        bytes -= cache.get(oldest)!.length * 2; cache.delete(oldest);
    }
}
async function sourceKey(src: string, size: number) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src));
    return `${size}:${Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('')}`;
}
export function createCachedThumbnail(src: string, size: number, callback: (url: string) => void, onError?: () => void): () => void {
    let disposed = false;
    let key: string | undefined;
    const consumer: Consumer = { success: callback, error: onError };
    const hashing = new AbortController();
    void scheduleImageWork(() => sourceKey(src, size), hashing.signal).then(k => {
        if (disposed) return;
        key = k;
        const cached = cache.get(k);
        if (cached) { cache.delete(k); cache.set(k, cached); callback(cached); return; }
        const existing = pending.get(k);
        if (existing) { existing.consumers.add(consumer); return; }
        const entry = { controller: new AbortController(), consumers: new Set([consumer]) };
        pending.set(k, entry);
        void generateThumbnail(src, size, size, entry.controller.signal).then(url => {
            if (entry.controller.signal.aborted) return;
            cachePut(k, url); entry.consumers.forEach(c => c.success(url));
        }).catch(() => {
            if (!entry.controller.signal.aborted) entry.consumers.forEach(c => c.error?.());
        }).finally(() => { if (pending.get(k) === entry) pending.delete(k); });
    }).catch(() => { if (!disposed) onError?.(); });
    return () => {
        disposed = true; hashing.abort();
        if (!key) return;
        const entry = pending.get(key);
        entry?.consumers.delete(consumer);
        if (entry && !entry.consumers.size) { pending.delete(key); entry.controller.abort(); }
    };
}
export interface OptimizedThumbnailProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string | null | undefined;
    fallbackSrc?: string | null;
    size: number;
}
export const OptimizedThumbnail: React.FC<OptimizedThumbnailProps> = memo(({ src, fallbackSrc, size, alt = '', onError, ...props }) => {
    const { ref, visible } = useImageVisibility();
    const [failed, setFailed] = useState<{ source: string; size: number } | null>(null);
    const [thumbnail, setThumbnail] = useState<{ source: string; size: number; url: string } | null>(null);
    const primaryFailed = failed?.source === src && failed?.size === size;
    const source = (!src || primaryFailed) && fallbackSrc ? fallbackSrc : src;
    const url = thumbnail?.source === source && thumbnail?.size === size ? thumbnail.url : undefined;
    useEffect(() => {
        if (!source || !visible) return;
        let active = true;
        const dispose = createCachedThumbnail(source, size, result => {
            if (active) setThumbnail({ source, size, url: result });
        }, () => {
            if (active && source === src && fallbackSrc && fallbackSrc !== src) setFailed({ source, size });
        });
        return () => { active = false; dispose(); };
    }, [source, src, fallbackSrc, size, visible]);
    return <img {...props} ref={ref} src={visible ? url : undefined} alt={alt} loading="eager" decoding="async" onError={event => {
        if (source === src && src && fallbackSrc && fallbackSrc !== src) setFailed({ source: src, size });
        onError?.(event);
    }} />;
});
