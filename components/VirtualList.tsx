import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface VirtualListProps<T> {
    items: T[];
    estimatedRowHeight: number;
    getKey: (item: T) => string | number;
    renderItem: (item: T, index: number) => React.ReactNode;
    scrollToIndex?: number | null;
    scrollRequestId?: number;
}

function MeasuredRow({ children, onHeight }: { children: React.ReactNode; onHeight: (height: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const callback = useRef(onHeight);
    callback.current = onHeight;
    useLayoutEffect(() => {
        const element = ref.current!;
        const observer = new ResizeObserver(() => callback.current(element.offsetHeight));
        observer.observe(element);
        callback.current(element.offsetHeight);
        return () => observer.disconnect();
    }, []);
    return <div ref={ref} className="pb-2">{children}</div>;
}

// Variable-height rows preserve textarea resizing. Keep the focused row mounted
// so scrolling cannot discard an uncommitted edit or keyboard focus.
export function VirtualList<T>({ items, estimatedRowHeight, getKey, renderItem, scrollToIndex, scrollRequestId }: VirtualListProps<T>) {
    const ref = useRef<HTMLDivElement>(null);
    const heights = useRef(new Map<string | number, number>());
    const [revision, setRevision] = useState(0);
    const [view, setView] = useState({ top: 0, height: 500 });
    const [focused, setFocused] = useState<string | number | null>(null);
    const frame = useRef<number | null>(null);
    const layout = useMemo(() => {
        let height = 0;
        const rows = items.map((item, index) => {
            const key = getKey(item);
            const top = height;
            height += heights.current.get(key) || estimatedRowHeight;
            return { item, index, key, top, height: height - top };
        });
        return { rows, height };
    }, [items, estimatedRowHeight, revision, getKey]);
    const updateView = () => {
        if (frame.current !== null) return;
        frame.current = requestAnimationFrame(() => {
            frame.current = null;
            if (ref.current) setView({ top: ref.current.scrollTop, height: ref.current.clientHeight });
        });
    };
    useLayoutEffect(() => {
        const observer = new ResizeObserver(updateView);
        observer.observe(ref.current!);
        updateView();
        return () => { observer.disconnect(); if (frame.current !== null) cancelAnimationFrame(frame.current); };
    }, []);
    useLayoutEffect(() => {
        const row = scrollToIndex == null ? undefined : layout.rows[scrollToIndex];
        if (row && ref.current) { ref.current.scrollTop = Math.max(0, row.top - view.height / 3); updateView(); }
    }, [scrollToIndex, scrollRequestId]);
    useLayoutEffect(() => {
        const keys = new Set(layout.rows.map(row => row.key));
        for (const key of heights.current.keys()) if (!keys.has(key)) heights.current.delete(key);
    }, [items]);
    const overscan = estimatedRowHeight * 2;
    return <div ref={ref} onScroll={updateView} className="h-full min-h-0 overflow-y-auto custom-scrollbar" onWheel={e => e.stopPropagation()}>
        <div style={{ height: layout.height, position: 'relative' }}>
            {layout.rows.filter(row => row.key === focused || (row.top + row.height >= view.top - overscan && row.top <= view.top + view.height + overscan)).map(row =>
                <div key={row.key} style={{ position: 'absolute', top: row.top, width: '100%' }}
                    onFocusCapture={() => setFocused(row.key)}
                    onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(null); }}>
                    <MeasuredRow onHeight={height => {
                        if (height > 0 && heights.current.get(row.key) !== height) {
                            heights.current.set(row.key, height);
                            setRevision(n => n + 1);
                        }
                    }}>{renderItem(row.item, row.index)}</MeasuredRow>
                </div>
            )}
        </div>
    </div>;
}
