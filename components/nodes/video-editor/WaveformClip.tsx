
import React, { useRef, useEffect } from 'react';

interface WaveformClipProps {
    data: Float32Array;
    color?: string;
    height?: number;
}

export const WaveformClip: React.FC<WaveformClipProps> = ({ data, color = 'rgba(255, 255, 255, 0.5)', height = 40 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        // Get rendered size
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        const width = rect.width;
        const h = rect.height;
        const centerY = h / 2;

        // Draw Logic
        ctx.fillStyle = color;
        ctx.beginPath();
        
        const step = Math.ceil(data.length / width);
        const amp = h / 2;

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            
            // Analyze chunk for min/max
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            // Draw vertical bar
            ctx.fillRect(i, centerY + min * amp, 1, Math.max(1, (max - min) * amp));
        }
    }, [data, color, height]); // Re-draw if dimensions effectively change via CSS layout

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full absolute inset-0 pointer-events-none opacity-60"
        />
    );
};
