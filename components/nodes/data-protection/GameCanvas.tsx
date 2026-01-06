
import React, { useRef, useEffect } from 'react';
import { GameState, GRID_W, GRID_H } from './types';

interface GameCanvasProps {
    gameStateRef: React.MutableRefObject<GameState>;
    onCellClick: (x: number, y: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameStateRef, onCellClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);

    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const state = gameStateRef.current;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width;
        const height = canvas.height;
        const scaleX = width / GRID_W;
        const scaleY = height / GRID_H;

        // Draw Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= GRID_W; x++) {
            ctx.beginPath(); ctx.moveTo(x * scaleX, 0); ctx.lineTo(x * scaleX, height); ctx.stroke();
        }
        for (let y = 0; y <= GRID_H; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * scaleY); ctx.lineTo(width, y * scaleY); ctx.stroke();
        }

        // Draw Paths
        state.paths.forEach((path, idx) => {
            if (path.length === 0) return;
            ctx.beginPath();
            // Data path (0) is Cyan, Enemy paths (1,2,3) are Red
            ctx.strokeStyle = idx === 0 ? 'rgba(34, 211, 238, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            ctx.lineWidth = scaleX * 0.4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            const start = path[0];
            ctx.moveTo((start.x + 0.5) * scaleX, (start.y + 0.5) * scaleY);
            
            for (let i = 1; i < path.length; i++) {
                const p = path[i];
                ctx.lineTo((p.x + 0.5) * scaleX, (p.y + 0.5) * scaleY);
            }
            ctx.stroke();
        });
        
        // Draw Central Portal
        const cx = (state.centerPoint.x + 0.5) * scaleX;
        const cy = (state.centerPoint.y + 0.5) * scaleY;
        const radius = scaleX * 1.5;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
        gradient.addColorStop(0.6, 'rgba(16, 185, 129, 0.4)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner swirl
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Towers
        state.towers.forEach(t => {
             ctx.fillStyle = t.color;
             ctx.fillRect(t.x * scaleX + 2, t.y * scaleY + 2, scaleX - 4, scaleY - 4);
             // Turret
             ctx.fillStyle = '#fff';
             ctx.fillRect(t.x * scaleX + scaleX/2 - 2, t.y * scaleY + scaleY/2 - 2, 4, 4);
        });

        // Draw Units
        const drawUnit = (pathIdx: number, progress: number, color: string, hpPct: number) => {
            const path = state.paths[pathIdx];
            if (!path) return;
            const idx = Math.floor(progress);
            const curr = path[idx] || path[path.length - 1];
            const next = path[idx + 1] || curr;
            const t = progress - idx;
            
            const px = curr.x + (next.x - curr.x) * t;
            const py = curr.y + (next.y - curr.y) * t;
            
            const screenX = (px + 0.5) * scaleX;
            const screenY = (py + 0.5) * scaleY;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, scaleX * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // HP Bar
            ctx.fillStyle = 'red';
            ctx.fillRect(screenX - scaleX * 0.3, screenY - scaleY * 0.5, scaleX * 0.6, 3);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(screenX - scaleX * 0.3, screenY - scaleY * 0.5, scaleX * 0.6 * hpPct, 3);
        };

        state.dataUnits.forEach(u => drawUnit(u.pathIndex, u.progress, u.color, u.hp / u.maxHp));
        state.enemies.forEach(u => drawUnit(u.pathIndex, u.progress, u.color, u.hp / u.maxHp));

        // Draw Projectiles
        state.projectiles.forEach(p => {
             ctx.fillStyle = p.color;
             ctx.beginPath();
             ctx.arc((p.x + 0.5) * scaleX, (p.y + 0.5) * scaleY, 3, 0, Math.PI * 2);
             ctx.fill();
        });
        
        requestRef.current = requestAnimationFrame(render);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(render);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, []);
    
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const scaleX = canvas.width / GRID_W;
        const scaleY = canvas.height / GRID_H;
        
        // Account for CSS scaling
        const domScaleX = canvas.width / rect.width;
        const domScaleY = canvas.height / rect.height;
        
        const gridX = Math.floor((x * domScaleX) / scaleX);
        const gridY = Math.floor((y * domScaleY) / scaleY);
        
        onCellClick(gridX, gridY);
    };

    return (
        <canvas 
            ref={canvasRef} 
            width={900} 
            height={600} 
            className="w-full h-full bg-gray-900 cursor-crosshair"
            onClick={handleClick}
        />
    );
};
