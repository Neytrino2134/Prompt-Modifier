import React, { useState, useEffect, memo } from 'react';

// ==========================================
// High Performance In-Memory Thumbnail Cache
// ==========================================

const THUMBNAIL_CACHE = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

export const createCachedThumbnail = (
    src: string,
    targetSize: 64 | 128,
    callback: (thumbUrl: string) => void
) => {
    if (!src) return;

    // Cache key based on source prefix, length, and requested target thumbnail size
    const cacheKey = `${src.slice(0, 80)}_${src.length}_${targetSize}`;
    const cached = THUMBNAIL_CACHE.get(cacheKey);
    if (cached) {
        callback(cached);
        return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            const naturalW = img.naturalWidth || img.width || 1;
            const naturalH = img.naturalHeight || img.height || 1;
            const aspect = naturalW / naturalH;

            let w: number = targetSize;
            let h: number = targetSize;
            if (aspect > 1) {
                h = Math.max(1, Math.round(targetSize / aspect));
            } else {
                w = Math.max(1, Math.round(targetSize * aspect));
            }

            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';
                // Center inside target square
                const offsetX = (targetSize - w) / 2;
                const offsetY = (targetSize - h) / 2;
                ctx.drawImage(img, offsetX, offsetY, w, h);
                const thumbData = canvas.toDataURL('image/jpeg', 0.85);

                if (THUMBNAIL_CACHE.size >= MAX_CACHE_SIZE) {
                    const firstKey = THUMBNAIL_CACHE.keys().next().value;
                    if (firstKey) THUMBNAIL_CACHE.delete(firstKey);
                }
                THUMBNAIL_CACHE.set(cacheKey, thumbData);
                callback(thumbData);
            } else {
                callback(src);
            }
        } catch {
            callback(src);
        }
    };
    img.onerror = () => {
        callback(src);
    };
    img.src = src;
};

export interface OptimizedThumbnailProps {
    src: string | null | undefined;
    size: 64 | 128;
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLImageElement>) => void;
    onMouseDown?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export const OptimizedThumbnail: React.FC<OptimizedThumbnailProps> = memo(({
    src,
    size,
    alt = '',
    className = '',
    style,
    draggable = false,
    onDragStart,
    onMouseDown
}) => {
    const [thumbSrc, setThumbSrc] = useState<string>(() => {
        if (!src) return '';
        const key = `${src.slice(0, 80)}_${src.length}_${size}`;
        return THUMBNAIL_CACHE.get(key) || src;
    });

    useEffect(() => {
        if (!src) {
            setThumbSrc('');
            return;
        }
        let isMounted = true;
        createCachedThumbnail(src, size, (t) => {
            if (isMounted) {
                setThumbSrc(t);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [src, size]);

    if (!src) return null;

    return (
        <img
            src={thumbSrc || src}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable={draggable}
            onDragStart={onDragStart}
            onMouseDown={onMouseDown}
            className={className}
            style={style}
        />
    );
});
