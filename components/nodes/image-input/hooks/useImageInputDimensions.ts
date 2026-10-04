import { useEffect, useState } from 'react';

export const useImageInputDimensions = (src: string | null | undefined) => {
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        if (!src) {
            setDimensions(null);
            return;
        }

        const img = new Image();
        img.onload = () => setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = src;
        return () => { img.onload = null; };
    }, [src]);

    return dimensions;
};
