import { useLayoutEffect, useRef, useState } from 'react';
import { isImageNearViewport } from '../utils/imageVisibility';

const watches = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const update = () => watches.forEach(check => check());
function subscribe(check: () => void) {
    watches.add(check);
    if (!timer) {
        timer = setInterval(update, 100);
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
    }
    check();
    return () => {
        watches.delete(check);
        if (!watches.size) {
            clearInterval(timer); timer = undefined;
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        }
    };
}

export function useImageVisibility() {
    const ref = useRef<HTMLImageElement>(null);
    const [visible, setVisible] = useState(false);
    useLayoutEffect(() => {
        let previous = false;
        return subscribe(() => {
            const element = ref.current;
            if (!element) return;
            // An unloaded img may have zero intrinsic size. Its container still
            // locates it correctly, so loading cannot depend on img dimensions.
            const container = element.parentElement || element;
            const rect = container.getBoundingClientRect();
            const hasLayout = !container.getClientRects || container.getClientRects().length > 0;
            const next = hasLayout && isImageNearViewport(rect, window.innerWidth, window.innerHeight, previous);
            if (next !== previous) { previous = next; setVisible(next); }
        });
    }, []);
    return { ref, visible };
}
