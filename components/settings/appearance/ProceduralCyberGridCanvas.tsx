import React, { useEffect, useRef } from 'react';
import {
  ThemeAnimationPalette,
  CyberGridAnimationConfig,
  DEFAULT_CYBER_CONFIG,
} from './panelAnimationDefinitions';

interface ProceduralCyberGridCanvasProps {
  palette: ThemeAnimationPalette;
  previewMode?: boolean;
  config?: Partial<CyberGridAnimationConfig>;
}

interface PathPoint {
  x: number;
  y: number;
}

interface CyberTracer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: 'right' | 'left' | 'down' | 'up';
  speed: number;
  tailLength: number;
  headRadius: number;
  glowRadius: number;
  color: string;
  headColor: string;
  opacity: number;
  distanceSinceLastTurn: number;
  path: PathPoint[];
}

export const ProceduralCyberGridCanvas: React.FC<ProceduralCyberGridCanvasProps> = ({
  palette,
  previewMode = false,
  config,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mergedConfig: CyberGridAnimationConfig = {
    ...DEFAULT_CYBER_CONFIG,
    ...config,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = 0;
    let height = 0;
    let lastTime = performance.now();

    const scaleFactor = previewMode ? 0.65 : 1;
    const cellWidth = Math.max(12, Math.round(mergedConfig.gridWidth * scaleFactor));
    const cellHeight = Math.max(6, Math.round(mergedConfig.gridHeight * scaleFactor));

    const sizeFrac = Math.max(0, Math.min(1, mergedConfig.sizeVariance / 100));
    const speedFrac = Math.max(0, Math.min(1, mergedConfig.speedVariance / 100));

    const baseHead = mergedConfig.baseSize * scaleFactor;
    const minHead = Math.max(0.8, baseHead * (1 - sizeFrac * 0.5));
    const maxHead = Math.max(minHead + 0.4, baseHead * (1 + sizeFrac * 0.7));

    const baseSpeed = mergedConfig.baseSpeed * (previewMode ? 0.7 : 1);
    const minSpeed = Math.max(20, baseSpeed * (1 - speedFrac * 0.5));
    const maxSpeed = Math.max(minSpeed + 10, baseSpeed * (1 + speedFrac * 0.7));

    const baseTail = mergedConfig.tailLength * scaleFactor;
    const baseTailOpacity = Math.max(0.1, Math.min(1, mergedConfig.tailOpacity));

    const allowTurns = mergedConfig.allowTurns ?? true;
    const turnChance = Math.max(0.05, Math.min(0.95, (mergedConfig.turnChance || 35) / 100));

    const colors = [
      palette.highlight || '#67e8f9',
      palette.primary || '#22d3ee',
      palette.secondary || '#0891b2',
      '#ffffff',
    ];

    const createTracer = (isInitial = false): CyberTracer => {
      const numRows = Math.max(2, Math.floor((height || 40) / cellHeight));
      const numCols = Math.max(2, Math.floor((width || 200) / cellWidth));

      const isHorizontal = Math.random() < 0.85;
      const rowIndex = Math.floor(Math.random() * (numRows + 1));
      const colIndex = Math.floor(Math.random() * (numCols + 1));
      const selectedColor = colors[Math.floor(Math.random() * colors.length)];

      const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;
      const tailLength = Math.max(15, baseTail * (0.7 + Math.random() * 0.6));
      const headRadius = Math.random() * (maxHead - minHead) + minHead;
      const glowRadius = headRadius * (previewMode ? 2.5 : 3.5);
      const opacity = (Math.random() * 0.3 + 0.7) * baseTailOpacity;

      let x: number;
      let y: number;
      let vx: number;
      let vy: number;
      let direction: 'right' | 'left' | 'down' | 'up';

      if (isHorizontal) {
        const toRight = Math.random() < 0.82;
        y = rowIndex * cellHeight;
        x = isInitial
          ? Math.random() * (width || 200)
          : toRight
          ? -Math.random() * 80 - tailLength
          : (width || 200) + Math.random() * 80 + tailLength;

        vx = toRight ? speed : -speed;
        vy = 0;
        direction = toRight ? 'right' : 'left';
      } else {
        const toDown = Math.random() < 0.65;
        x = colIndex * cellWidth;
        y = isInitial
          ? Math.random() * (height || 40)
          : toDown
          ? -Math.random() * 30 - 20
          : (height || 40) + Math.random() * 30 + 20;

        vx = 0;
        vy = toDown ? speed * 0.75 : -speed * 0.75;
        direction = toDown ? 'down' : 'up';
      }

      return {
        x,
        y,
        vx,
        vy,
        direction,
        speed,
        tailLength,
        headRadius,
        glowRadius,
        color: selectedColor,
        headColor: selectedColor === '#ffffff' ? '#ffffff' : palette.highlight || '#ffffff',
        opacity,
        distanceSinceLastTurn: cellWidth * 2,
        path: [{ x, y }],
      };
    };

    let tracers: CyberTracer[] = [];

    const initTracers = () => {
      const userCount = mergedConfig.count || 9;
      const targetCount = previewMode
        ? Math.max(2, Math.round(userCount * 0.5))
        : Math.max(3, Math.round(userCount * (width > 0 ? Math.min(1.4, Math.max(0.6, width / 900)) : 1)));

      tracers = Array.from({ length: targetCount }, () => createTracer(true));
    };

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;

      if (width <= 0 || height <= 0) return;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initTracers();
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(canvas);

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height);

        // 1. Draw Tron Orthogonal Matrix Grid
        ctx.save();
        ctx.strokeStyle = palette.dim || 'rgba(34, 211, 238, 0.08)';
        ctx.lineWidth = 1;

        // Vertical Grid Lines
        ctx.beginPath();
        for (let x = 0; x <= width + cellWidth; x += cellWidth) {
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, height);
        }
        // Horizontal Grid Lines
        for (let y = 0; y <= height + cellHeight; y += cellHeight) {
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(width, y + 0.5);
        }
        ctx.stroke();

        // 2. Subtle static solder vias on random intersections
        const numCols = Math.floor(width / cellWidth);
        const numRows = Math.floor(height / cellHeight);
        ctx.fillStyle = palette.highlight || '#67e8f9';
        ctx.globalAlpha = 0.25;
        for (let c = 1; c < numCols; c += 3) {
          for (let r = 1; r < numRows; r += 2) {
            const jx = c * cellWidth;
            const jy = r * cellHeight;
            ctx.beginPath();
            ctx.arc(jx + 0.5, jy + 0.5, 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // 3. Draw Procedural Tracers
        for (let i = 0; i < tracers.length; i++) {
          const t = tracers[i];
          const prevX = t.x;
          const prevY = t.y;

          // Step distance
          const stepDist = (Math.abs(t.vx) + Math.abs(t.vy)) * dt;
          t.distanceSinceLastTurn += stepDist;

          // Candidate next position
          const nextX = t.x + t.vx * dt;
          const nextY = t.y + t.vy * dt;

          // Check if tracer crosses a matrix junction & can turn
          let didTurn = false;
          if (allowTurns && t.distanceSinceLastTurn > cellWidth * 1.5) {
            if (t.direction === 'right' || t.direction === 'left') {
              const crossingCol = t.direction === 'right'
                ? Math.floor(nextX / cellWidth)
                : Math.ceil(nextX / cellWidth);
              const junctionX = crossingCol * cellWidth;

              const crossed = t.direction === 'right'
                ? prevX <= junctionX && nextX >= junctionX
                : prevX >= junctionX && nextX <= junctionX;

              if (crossed && Math.random() < turnChance) {
                // Snap to intersection
                t.x = junctionX;
                t.path.push({ x: t.x, y: t.y });

                // Choose vertical direction
                let newDir: 'up' | 'down';
                if (t.y >= height - cellHeight * 1.5) {
                  newDir = 'up';
                } else if (t.y <= cellHeight * 1.5) {
                  newDir = 'down';
                } else {
                  newDir = Math.random() < 0.5 ? 'up' : 'down';
                }

                t.direction = newDir;
                t.vx = 0;
                t.vy = (newDir === 'down' ? 1 : -1) * t.speed * 0.75;
                t.distanceSinceLastTurn = 0;
                didTurn = true;
              }
            } else if (t.direction === 'down' || t.direction === 'up') {
              const crossingRow = t.direction === 'down'
                ? Math.floor(nextY / cellHeight)
                : Math.ceil(nextY / cellHeight);
              const junctionY = crossingRow * cellHeight;

              const crossed = t.direction === 'down'
                ? prevY <= junctionY && nextY >= junctionY
                : prevY >= junctionY && nextY <= junctionY;

              if (crossed && Math.random() < turnChance) {
                // Snap to intersection
                t.y = junctionY;
                t.path.push({ x: t.x, y: t.y });

                // Choose horizontal direction
                let newDir: 'left' | 'right';
                if (t.x >= width - cellWidth * 1.5) {
                  newDir = 'left';
                } else if (t.x <= cellWidth * 1.5) {
                  newDir = 'right';
                } else {
                  newDir = Math.random() < 0.8 ? 'right' : 'left';
                }

                t.direction = newDir;
                t.vx = (newDir === 'right' ? 1 : -1) * t.speed;
                t.vy = 0;
                t.distanceSinceLastTurn = 0;
                didTurn = true;
              }
            }
          }

          if (!didTurn) {
            t.x = nextX;
            t.y = nextY;
          }

          // Update trail path points
          t.path.push({ x: t.x, y: t.y });

          // Trim trail points based on accumulated length
          let accDist = 0;
          let cutIndex = -1;
          let tailTip: PathPoint = { x: t.x, y: t.y };

          for (let p = t.path.length - 1; p > 0; p--) {
            const pCurrent = t.path[p];
            const pPrev = t.path[p - 1];
            const segLen = Math.hypot(pCurrent.x - pPrev.x, pCurrent.y - pPrev.y);

            if (accDist + segLen >= t.tailLength) {
              const remaining = t.tailLength - accDist;
              const ratio = segLen > 0 ? remaining / segLen : 0;
              tailTip = {
                x: pCurrent.x + (pPrev.x - pCurrent.x) * ratio,
                y: pCurrent.y + (pPrev.y - pCurrent.y) * ratio,
              };
              cutIndex = p - 1;
              break;
            }
            accDist += segLen;
          }

          if (cutIndex >= 0) {
            t.path = t.path.slice(cutIndex);
            t.path[0] = tailTip;
          }

          // Out of bounds check
          const margin = t.tailLength + 80;
          if (
            t.x < -margin ||
            t.x > width + margin ||
            t.y < -margin ||
            t.y > height + margin
          ) {
            tracers[i] = createTracer(false);
            continue;
          }

          // 4. Render Laser Trail Polyline
          if (t.path.length >= 2) {
            ctx.save();
            const startP = t.path[0];
            const endP = t.path[t.path.length - 1];

            const grad = ctx.createLinearGradient(startP.x, startP.y, endP.x, endP.y);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(0.5, palette.primary || '#22d3ee');
            grad.addColorStop(1, t.color);

            ctx.beginPath();
            ctx.moveTo(t.path[0].x, t.path[0].y);
            for (let p = 1; p < t.path.length; p++) {
              ctx.lineTo(t.path[p].x, t.path[p].y);
            }
            ctx.strokeStyle = grad;
            ctx.lineWidth = previewMode ? 1.5 : 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = t.opacity;
            ctx.stroke();
            ctx.restore();
          }

          // 5. Draw Glowing Tracer Photon Head
          ctx.save();
          ctx.shadowColor = t.color;
          ctx.shadowBlur = t.glowRadius;
          ctx.fillStyle = t.headColor;
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.headRadius, 0, Math.PI * 2);
          ctx.fill();

          // Bright center core
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(t.x, t.y, Math.max(0.6, t.headRadius * 0.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
    };
  }, [
    palette,
    previewMode,
    mergedConfig.count,
    mergedConfig.gridWidth,
    mergedConfig.gridHeight,
    mergedConfig.baseSize,
    mergedConfig.sizeVariance,
    mergedConfig.baseSpeed,
    mergedConfig.speedVariance,
    mergedConfig.tailLength,
    mergedConfig.tailOpacity,
    mergedConfig.allowTurns,
    mergedConfig.turnChance,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none block"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

