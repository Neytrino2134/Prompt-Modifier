
import { useState, useCallback, WheelEvent, useRef } from 'react';
import { Point } from '../types';

// Define the new state shape for panning information, making it more robust.
interface PanInfo {
  startPoint: Point;
  startTranslate: Point;
}

export const useCanvas = (initialTransform?: { scale: number; translate: Point }) => {
    const [viewTransform, setViewTransform] = useState(initialTransform || { scale: 1, translate: { x: 0, y: 0 } });
    const [panInfo, setPanInfo] = useState<PanInfo | null>(null);
    const [pointerPosition, setPointerPosition] = useState<Point>({ x: 0, y: 0 });
    const [clientPointerPosition, setClientPointerPosition] = useState<Point>({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement | null>(null);

    const setCanvasRef = useCallback((node: HTMLDivElement | null) => {
        canvasRef.current = node;
    }, []);

    const getCanvasRelativePoint = useCallback((point: Point): Point => {
        if (!canvasRef.current) return point;
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: point.x - rect.left,
            y: point.y - rect.top,
        };
    }, []);

    const getTransformedPoint = useCallback((point: Point): Point => {
        const canvasPoint = getCanvasRelativePoint(point);
        // Safety check for NaN values to prevent UI freeze
        if (!Number.isFinite(viewTransform.scale) || viewTransform.scale === 0 || 
            !Number.isFinite(viewTransform.translate.x) || !Number.isFinite(viewTransform.translate.y)) {
            return { x: 0, y: 0 };
        }
        return {
            x: (canvasPoint.x - viewTransform.translate.x) / viewTransform.scale,
            y: (canvasPoint.y - viewTransform.translate.y) / viewTransform.scale,
        };
    }, [viewTransform.scale, viewTransform.translate.x, viewTransform.translate.y, getCanvasRelativePoint]);

    // Robust setZoom using functional state update to prevent drift
    const setZoom = useCallback((newScale: number, pivot: Point) => {
        // Get the DOM-relative coordinate of the pivot immediately (this doesn't depend on state)
        const canvasPivot = getCanvasRelativePoint(pivot);

        setViewTransform(prev => {
            let clampedScale = Math.max(0.1, Math.min(newScale, 2.0)); // Safely clamp
            
            // Protection against corrupt state
            if (!Number.isFinite(clampedScale) || Number.isNaN(clampedScale)) {
                clampedScale = 1;
            }
            
            // Fallback for corrupted previous state
            const safePrevScale = (Number.isFinite(prev.scale) && prev.scale > 0) ? prev.scale : 1;
            const safePrevTx = Number.isFinite(prev.translate.x) ? prev.translate.x : 0;
            const safePrevTy = Number.isFinite(prev.translate.y) ? prev.translate.y : 0;

            // 1. Calculate the point in "World Space" using the PREVIOUS state.
            const worldX = (canvasPivot.x - safePrevTx) / safePrevScale;
            const worldY = (canvasPivot.y - safePrevTy) / safePrevScale;

            // 2. Calculate new Translation to keep World Point under the same Screen Point.
            const newTranslateX = canvasPivot.x - worldX * clampedScale;
            const newTranslateY = canvasPivot.y - worldY * clampedScale;

            // Final Safety check
            if (!Number.isFinite(newTranslateX) || !Number.isFinite(newTranslateY)) {
                return prev;
            }

            return {
                scale: clampedScale,
                translate: { x: newTranslateX, y: newTranslateY },
            };
        });
    }, [getCanvasRelativePoint]);

    const handleZoomChange = useCallback((newScale: number) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      setZoom(newScale, { x: centerX, y: centerY });
    }, [setZoom]);

    const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Calculate scale factor based on delta
        const zoomFactor = Math.pow(1.001, -e.deltaY); 
        
        setViewTransform(prev => {
             const safePrevScale = (Number.isFinite(prev.scale) && prev.scale > 0) ? prev.scale : 1;
             const safePrevTx = Number.isFinite(prev.translate.x) ? prev.translate.x : 0;
             const safePrevTy = Number.isFinite(prev.translate.y) ? prev.translate.y : 0;
             
             const newScale = Math.max(0.1, Math.min(2.0, safePrevScale * zoomFactor));
             
             if (!Number.isFinite(newScale)) return prev;

             const canvasPivot = getCanvasRelativePoint({ x: e.clientX, y: e.clientY });
             const worldX = (canvasPivot.x - safePrevTx) / safePrevScale;
             const worldY = (canvasPivot.y - safePrevTy) / safePrevScale;

             const newTranslateX = canvasPivot.x - worldX * newScale;
             const newTranslateY = canvasPivot.y - worldY * newScale;

             if (!Number.isFinite(newTranslateX) || !Number.isFinite(newTranslateY)) {
                 return prev;
             }

             return {
                 scale: newScale,
                 translate: { x: newTranslateX, y: newTranslateY }
             };
        });
    }, [getCanvasRelativePoint]);

    const startPanning = useCallback((point: Point) => {
        setViewTransform(current => {
             if (!Number.isFinite(current.translate.x) || !Number.isFinite(current.translate.y)) {
                  return { scale: 1, translate: { x: window.innerWidth / 2, y: window.innerHeight / 2 } };
             }
            setPanInfo({
                startPoint: point,
                startTranslate: { ...current.translate },
            });
            return current;
        });
    }, []);
    
    const stopPanning = useCallback(() => setPanInfo(null), []);
    
    const pan = useCallback((point: Point) => {
        if (!panInfo) return;
        const dx = point.x - panInfo.startPoint.x;
        const dy = point.y - panInfo.startPoint.y;
        
        setViewTransform(current => {
            const newX = panInfo.startTranslate.x + dx;
            const newY = panInfo.startTranslate.y + dy;

            if (!Number.isFinite(newX) || !Number.isFinite(newY)) return current;

            return {
                ...current,
                translate: { x: newX, y: newY }
            };
        });
    }, [panInfo]);
    
    const updatePointerPosition = useCallback((e: { clientX: number, clientY: number }) => {
         const viewportPoint = { x: e.clientX, y: e.clientY };
        const transformedPointerPos = getTransformedPoint(viewportPoint);
        setPointerPosition(transformedPointerPos);
        setClientPointerPosition(viewportPoint);
    }, [getTransformedPoint]);

    const resetView = useCallback(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        setViewTransform({
            scale: 1,
            translate: { x: centerX, y: centerY }
        });
    }, []);

    const scaleToSliderValue = (scale: number) => scale >= 1 ? (scale - 1) * 100 : (scale - 1) * 125;
    const sliderValueToScale = (value: number) => value >= 0 ? 1 + (value / 100) : 1 + (value / 125);

    return {
        viewTransform,
        setViewTransform,
        isPanning: !!panInfo,
        pointerPosition,
        clientPointerPosition,
        handleWheel,
        startPanning,
        stopPanning,
        pan,
        updatePointerPosition,
        setZoom,
        setCanvasRef,
        getCanvasRelativePoint,
        getTransformedPoint,
        handleZoomChange,
        scaleToSliderValue,
        sliderValueToScale,
        resetView,
    };
};
