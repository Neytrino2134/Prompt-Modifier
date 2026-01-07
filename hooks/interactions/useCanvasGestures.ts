
import React, { useRef, useCallback } from 'react';
import { Point, NodeType } from '../../types';

interface UseCanvasGesturesProps {
    viewTransform: { scale: number; translate: Point };
    setViewTransform: React.Dispatch<React.SetStateAction<{ scale: number; translate: Point }>>;
    isPanning: boolean;
    pan: (point: Point) => void;
    startPanning: (point: Point) => void;
    stopPanning: () => void;
    getCanvasRelativePoint: (point: Point) => Point;
    setZoom: (newScale: number, pivot: Point) => void;
    handleCloseAddNodeMenus: () => void;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    effectiveTool: string;
    setZoomDragInfo: React.Dispatch<React.SetStateAction<any>>;
    getTransformedPoint: (point: Point) => Point;
    setSelectionRect: React.Dispatch<React.SetStateAction<any>>;
}

export const useCanvasGestures = ({
    viewTransform,
    setViewTransform,
    isPanning,
    pan,
    startPanning,
    stopPanning,
    getCanvasRelativePoint,
    setZoom,
    handleCloseAddNodeMenus,
    setSelectedNodeIds,
    effectiveTool,
    setZoomDragInfo,
    getTransformedPoint,
    setSelectionRect
}: UseCanvasGesturesProps) => {
    
    // Pinch to Zoom Refs
    const pinchRef = useRef<{
        startDist: number;
        startCenter: Point;
        startTransform: { scale: number; translate: Point };
    } | null>(null);

    const getTouchDistance = (t1: React.Touch | Touch, t2: React.Touch | Touch) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.hypot(dx, dy);
    };

    const getTouchCenter = (t1: React.Touch | Touch, t2: React.Touch | Touch) => {
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2,
        };
    };

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        window.focus();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        handleCloseAddNodeMenus();
        
        // Middle mouse button pan
        if (e.button === 1) { 
            e.preventDefault(); 
            startPanning({ x: e.clientX, y: e.clientY }); 
            return; 
        }

        if (e.button === 0) {
            if (effectiveTool === 'zoom') {
                e.preventDefault();
                setZoomDragInfo({ startClientX: e.clientX, startScale: viewTransform.scale, pivot: { x: e.clientX, y: e.clientY } });
                return;
            }
            if (effectiveTool === 'selection' || e.shiftKey) {
                e.preventDefault();
                if (!e.shiftKey) setSelectedNodeIds([]);
                const point = getTransformedPoint({ x: e.clientX, y: e.clientY });
                setSelectionRect({ start: point, end: point });
                return;
            }
            // Clear selection if clicking empty canvas without modifiers
            if (!e.ctrlKey && !e.metaKey && !e.altKey) setSelectedNodeIds([]);
            
            e.preventDefault();
            startPanning({ x: e.clientX, y: e.clientY });
        }
    }, [effectiveTool, startPanning, viewTransform.scale, getTransformedPoint, setSelectedNodeIds, handleCloseAddNodeMenus, setZoomDragInfo, setSelectionRect]);

    const handleCanvasTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        window.focus();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        handleCloseAddNodeMenus();

        // Pinch Start
        if (e.touches.length === 2) {
            if (isPanning) stopPanning(); 
            const dist = getTouchDistance(e.touches[0], e.touches[1]);
            const clientCenter = getTouchCenter(e.touches[0], e.touches[1]);
            const center = getCanvasRelativePoint(clientCenter);
            
            pinchRef.current = {
                startDist: dist,
                startCenter: center,
                startTransform: { ...viewTransform } 
            };
            return;
        }

        // Pan Start
        if (e.touches.length === 1) {
             startPanning({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    }, [handleCloseAddNodeMenus, startPanning, isPanning, stopPanning, viewTransform, getCanvasRelativePoint]);

    const handleCanvasTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement> | TouchEvent) => {
        // Pinch Move
        if (e.touches.length === 2 && pinchRef.current) {
            if (e.cancelable && e.preventDefault) e.preventDefault();
            const dist = getTouchDistance(e.touches[0], e.touches[1]);
            const clientCenter = getTouchCenter(e.touches[0], e.touches[1]);
            const center = getCanvasRelativePoint(clientCenter);

            const { startDist, startCenter, startTransform } = pinchRef.current;
            if (startDist === 0) return; 

            const zoomRatio = dist / startDist;
            let newScale = startTransform.scale * zoomRatio;
            newScale = Math.max(0.1, Math.min(newScale, 5.0));

            const effectiveRatio = newScale / startTransform.scale;
            const newTranslateX = center.x - (startCenter.x - startTransform.translate.x) * effectiveRatio;
            const newTranslateY = center.y - (startCenter.y - startTransform.translate.y) * effectiveRatio;

            setViewTransform({
                scale: newScale,
                translate: { x: newTranslateX, y: newTranslateY }
            });
            return;
        }

        // Pan Move
        if (isPanning && e.touches.length === 1) {
             if (e.cancelable && e.preventDefault) e.preventDefault();
             pan({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    }, [isPanning, pan, setViewTransform, getCanvasRelativePoint]);

    const handleCanvasTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length < 2) {
            pinchRef.current = null;
        }
        if (isPanning && e.touches.length === 0) {
            stopPanning();
        }
    }, [isPanning, stopPanning]);

    return {
        handleCanvasMouseDown,
        handleCanvasTouchStart,
        handleCanvasTouchMove,
        handleCanvasTouchEnd,
        pinchRef // Exposed for cleanup if needed
    };
};
