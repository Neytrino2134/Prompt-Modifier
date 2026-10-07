import React, { useState, useEffect, useRef, memo } from 'react';
import { generateThumbnail } from '../../../utils/imageUtils';
import { scheduleImageWork } from '../../../utils/imageWorkQueue';

const cache = new Map<string, string>();
const pending = new Map<string, { controller: AbortController; consumers: Set<(url: string) => void> }>();
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
// Disposing the last consumer cancels queued and active decoding work.
export function createCachedThumbnail(src: string, size: number, callback: (url: string) => void): () => void {
    let disposed = false;
    let key: string | undefined;
    const hashing = new AbortController();
    void scheduleImageWork(() => sourceKey(src, size), hashing.signal).then(k => {
        if (disposed) return;
        key = k;
        const cached = cache.get(k);
        if (cached) { cache.delete(k); cache.set(k, cached); callback(cached); return; }
        const existing = pending.get(k);
        if (existing) { existing.consumers.add(callback); return; }
        const entry = { controller: new AbortController(), consumers: new Set([callback]) };
        pending.set(k, entry);
        void generateThumbnail(src, size, size, entry.controller.signal).then(url => {
            if (entry.controller.signal.aborted) return;
            cachePut(k, url); entry.consumers.forEach(consumer => consumer(url));
        }).catch(() => {
            // Never use a full-resolution source as the DOM fallback.
        }).finally(() => { if (pending.get(k) === entry) pending.delete(k); });
    }).catch(() => {});
    return () => {
        disposed = true;
        hashing.abort();
        if (!key) return;
        const entry = pending.get(key);
        entry?.consumers.delete(callback);
        if (entry && !entry.consumers.size) { pending.delete(key); entry.controller.abort(); }
    };
}
export interface OptimizedThumbnailProps {
    src: string | null | undefined;
    size: number;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    draggable?: boolean;
    loading?: 'eager' | 'lazy';
    referrerPolicy?: React.HTMLAttributeReferrerPolicy;
    onDragStart?: (e: React.DragEvent<HTMLImageElement>) => void;
    onMouseDown?: (e: React.MouseEvent<HTMLImageElement>) => void;
}
export const OptimizedThumbnail: React.FC<OptimizedThumbnailProps> = memo(({ src, size, alt = '', ...props }) => {
    const ref = useRef<HTMLImageElement>(null);
    const [visible, setVisible] = useState(false);
    const [thumbnail, setThumbnail] = useState<{ source: string; size: number; url: string } | null>(null);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (!src || !visible) { setThumbnail(null); return; }
        return createCachedThumbnail(src, size, url => setThumbnail({ source: src, size, url }));
    }, [src, size, visible]);
    const url = thumbnail && thumbnail.source === src && thumbnail.size === size ? thumbnail.url : undefined;
    return <img ref={ref} src={visible ? url : undefined} alt={alt} loading="lazy" decoding="async" {...props} />;
});
