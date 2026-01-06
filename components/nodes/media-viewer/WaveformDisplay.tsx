
import React, { useRef, useEffect, useCallback } from 'react';
import { WaveformDisplayProps } from './types';

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ 
    audioData, 
    currentTime, 
    duration, 
    isPlaying,
    onSeek,
    markers,
    onSelect
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Store props in refs to access them in event handlers/draw loop without re-binding
    const onSeekRef = useRef(onSeek);
    const markersRef = useRef(markers);
    const isDraggingRef = useRef(false);

    // Sync refs
    useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
    useEffect(() => { markersRef.current = markers; }, [markers]);

    // Draw Function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const rawData = audioData;

        if (!canvas || !container || !rawData) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const dpr = window.devicePixelRatio || 1;
        
        // Resize canvas only if dimensions changed to prevent clearing
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
        }
        
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);
        
        const barWidth = 3; 
        const gap = 1; 
        const totalBarWidth = barWidth + gap;
        const totalBars = Math.floor(width / totalBarWidth);
        const blockSize = Math.floor(rawData.length / totalBars);
        
        const progressRatio = duration > 0 ? currentTime / duration : 0;
        const playedBars = Math.floor(totalBars * progressRatio);

        // Draw Waveform Bars
        ctx.beginPath();
        for (let i = 0; i < totalBars; i++) {
            let blockStart = blockSize * i; 
            let sum = 0;
            // Optimization: stride for large files
            const step = Math.ceil(blockSize / 10); 
            let samples = 0;
            
            for (let j = 0; j < blockSize; j += step) {
                if (blockStart + j < rawData.length) {
                    sum += Math.abs(rawData[blockStart + j]);
                    samples++;
                }
            }
            const amplitude = samples > 0 ? sum / samples : 0;
            const barHeight = Math.min(height, Math.max(2, amplitude * height * 2.5)); 
            
            const x = i * totalBarWidth;
            const y = height - barHeight;
            
            ctx.fillStyle = i < playedBars ? '#22d3ee' : '#4b5563';
            ctx.fillRect(x, y, barWidth, barHeight);
        }

        // Draw Markers and Labels (Read from Ref to avoid flicker during parent updates)
        const currentMarkers = markersRef.current;
        if (duration > 0 && currentMarkers) {
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            currentMarkers.forEach(marker => {
                const markerX = Math.round((marker.time / duration) * width);
                
                ctx.beginPath();
                ctx.strokeStyle = marker.color;
                ctx.lineWidth = 2;
                ctx.moveTo(markerX, 0);
                ctx.lineTo(markerX, height);
                ctx.stroke();
                
                // Marker Handle
                ctx.beginPath();
                ctx.fillStyle = marker.color;
                ctx.arc(markerX, height - 6, 3, 0, Math.PI * 2);
                ctx.fill();

                // Marker Label (Text above)
                const textWidth = ctx.measureText(marker.label).width;
                const labelBgX = Math.round(markerX - textWidth/2 - 2);
                const labelBgY = 2;
                const labelBgW = Math.round(textWidth + 4);
                const labelBgH = 14;

                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(labelBgX, labelBgY, labelBgW, labelBgH);
                
                ctx.fillStyle = marker.color;
                ctx.fillText(marker.label, markerX, 4);
            });
        }

        // Playhead
        const playheadX = Math.round(width * progressRatio);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(playheadX - 1, 0, 2, height);

    }, [audioData, currentTime, duration]); // Intentionally exclude markers to rely on ref for flicker prevention

    // Redraw loop
    useEffect(() => {
        let rafId: number;
        
        const loop = () => {
            draw();
            // Continue loop if playing or dragging (for smooth visual feedback)
            if (isPlaying || isDraggingRef.current) {
                rafId = requestAnimationFrame(loop);
            }
        };
        
        // Draw immediately
        draw();
        
        if (isPlaying) {
             rafId = requestAnimationFrame(loop);
        }
        
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [draw, isPlaying]);

    // Handle Resize
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(() => requestAnimationFrame(draw));
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [draw]);

    // Interaction Logic
    const calculateSeek = (clientX: number) => {
        if (!containerRef.current || !duration) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        // Clamp percentage between 0 and 1
        const percent = Math.max(0, Math.min(1, x / rect.width));
        onSeekRef.current(percent * duration);
    };

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling to prevent Node dragging
        
        if (onSelect) onSelect(); 
        
        isDraggingRef.current = true;
        calculateSeek(e.clientX); // Seek immediately on click

        // Attach global listeners to window
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    }, [onSelect, duration]); // Depends on duration for initial calc

    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingRef.current) {
            e.preventDefault();
            calculateSeek(e.clientX);
        }
    }, [duration]);

    const handleGlobalMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [handleGlobalMouseMove]);

    // Cleanup global listeners on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);

    return (
        <div 
            ref={containerRef} 
            className="absolute inset-0 w-full h-full cursor-pointer" 
            onMouseDown={handleMouseDown}
        >
            <canvas ref={canvasRef} className="w-full h-full object-cover block" />
        </div>
    );
};
