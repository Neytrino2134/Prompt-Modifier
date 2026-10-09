import React, { memo } from 'react';
import { useImageVisibility } from '../hooks/useImageVisibility';

export const VisibleImage = memo((props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { ref, visible } = useImageVisibility();
    return <img {...props} ref={ref} src={visible ? props.src : undefined} loading="eager" decoding="async" />;
});
