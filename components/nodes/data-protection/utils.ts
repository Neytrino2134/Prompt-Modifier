
import { Point, GRID_W, GRID_H } from './types';

// Simple Manhattan-ish path with noise towards target
const createPath = (start: Point, end: Point): Point[] => {
    const path: Point[] = [start];
    let current = { ...start };
    let watchdog = 0;

    while ((current.x !== end.x || current.y !== end.y) && watchdog < 1000) {
        watchdog++;
        const dx = end.x - current.x;
        const dy = end.y - current.y;
        
        let next: Point = { ...current };
        const r = Math.random();

        // 80% chance to move towards goal, 20% random wiggle
        if (r > 0.2) {
            if (Math.abs(dx) > Math.abs(dy)) {
                next.x += Math.sign(dx);
            } else {
                next.y += Math.sign(dy);
            }
        } else {
            // Wiggle perpendicular to main axis
            if (Math.abs(dx) > Math.abs(dy)) {
                next.y += Math.random() > 0.5 ? 1 : -1;
            } else {
                next.x += Math.random() > 0.5 ? 1 : -1;
            }
        }

        // Clamp
        next.x = Math.max(0, Math.min(GRID_W - 1, next.x));
        next.y = Math.max(0, Math.min(GRID_H - 1, next.y));

        path.push(next);
        current = next;
    }
    return path;
};

export const generateGamePaths = (): Point[][] => {
    const center = { x: Math.floor(GRID_W / 2), y: Math.floor(GRID_H / 2) };
    
    // Path 0: Data (Left -> Center)
    const p0 = createPath({ x: 0, y: Math.floor(GRID_H / 2) }, center);
    
    // Path 1: Enemy Top (Top -> Center)
    const p1 = createPath({ x: Math.floor(GRID_W / 2), y: 0 }, center);
    
    // Path 2: Enemy Right (Right -> Center)
    const p2 = createPath({ x: GRID_W - 1, y: Math.floor(GRID_H / 2) }, center);
    
    // Path 3: Enemy Bottom (Bottom -> Center)
    const p3 = createPath({ x: Math.floor(GRID_W / 2), y: GRID_H - 1 }, center);

    return [p0, p1, p2, p3];
};
