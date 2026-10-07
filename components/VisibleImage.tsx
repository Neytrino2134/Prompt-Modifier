import React, { memo, useEffect, useRef, useState } from 'react';

// Large nodes can intersect the canvas while individual preview panels do not.
// Remove src from those panels instead of relying only on whole-node culling.
export const VisibleImage = memo((props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const ref = useRef<HTMLImageElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!ref.current) return;
        if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return <img {...props} ref={ref} src={visible ? props.src : undefined} loading="lazy" decoding="async" />;
});
