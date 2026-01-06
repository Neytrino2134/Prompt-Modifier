
import React, { useRef, useEffect } from 'react';

interface DbMeterProps {
    analyser: AnalyserNode | null;
    isPlaying: boolean;
}

export const DbMeter: React.FC<DbMeterProps> = ({ analyser, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isPlaying || !analyser) {
             if (rafRef.current) cancelAnimationFrame(rafRef.current);
             return;
        }

        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const x = (dataArray[i] - 128) / 128.0;
                sum += x * x;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const value = Math.min(1, rms * 4); // Scale for visibility
            
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);
            
            // Background
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(0, 0, w, h);
            
            // Gradient Bar
            const barHeight = value * h;
            const gradient = ctx.createLinearGradient(0, h, 0, 0);
            gradient.addColorStop(0, '#10b981'); // Green
            gradient.addColorStop(0.6, '#f59e0b'); // Yellow
            gradient.addColorStop(1, '#ef4444'); // Red
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, h - barHeight, w, barHeight);
            
            // Grid lines
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            for(let i = 10; i < h; i+=10) ctx.fillRect(0, i, w, 1);

            rafRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying, analyser]);

    return (
        <canvas ref={canvasRef} width={8} height={150} className="w-full h-full" />
    );
};
