import React, { useEffect, useRef } from 'react';
import {
  ThemeAnimationPalette,
  BubbleAnimationConfig,
  DEFAULT_BUBBLE_CONFIG,
} from './panelAnimationDefinitions';

interface ProceduralBubblesCanvasProps {
  palette: ThemeAnimationPalette;
  previewMode?: boolean;
  config?: Partial<BubbleAnimationConfig>;
}

interface BubbleParticle {
  x: number;
  y: number;
  baseX: number;
  radius: number;
  vy: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  wobblePhase: number;
  opacity: number;
}

export const ProceduralBubblesCanvas: React.FC<ProceduralBubblesCanvasProps> = ({
  palette,
  previewMode = false,
  config,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mergedConfig: BubbleAnimationConfig = {
    ...DEFAULT_BUBBLE_CONFIG,
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

    const varianceSizeFrac = Math.max(0, Math.min(1, mergedConfig.sizeVariance / 100));
    const varianceSpeedFrac = Math.max(0, Math.min(1, mergedConfig.speedVariance / 100));

    const scaleFactor = previewMode ? 0.6 : 1;
    const baseRadius = mergedConfig.baseSize * scaleFactor;
    const minRadius = Math.max(4, baseRadius * (1 - varianceSizeFrac * 0.55));
    const maxRadius = Math.max(minRadius + 2, baseRadius * (1 + varianceSizeFrac * 0.75));

    const baseSpeed = mergedConfig.baseSpeed * (previewMode ? 0.7 : 1);
    const minSpeed = Math.max(3, baseSpeed * (1 - varianceSpeedFrac * 0.55));
    const maxSpeed = Math.max(minSpeed + 2, baseSpeed * (1 + varianceSpeedFrac * 0.75));

    const baseOpacity = Math.max(0.05, Math.min(1, mergedConfig.opacity));
    const wobbleBaseAmp = (mergedConfig.wobbleAmp || 10) * (previewMode ? 0.5 : 1);

    const createBubble = (isInitial = false): BubbleParticle => {
      const radius = Math.random() * (maxRadius - minRadius) + minRadius;
      const baseX = Math.random() * (width || 300);
      const vy = Math.random() * (maxSpeed - minSpeed) + minSpeed;
      const wobbleSpeed = Math.random() * 1.6 + 0.8;
      const wobbleAmp = wobbleBaseAmp * (0.6 + Math.random() * 0.8);
      const wobblePhase = Math.random() * Math.PI * 2;
      const opacity = (Math.random() * 0.35 + 0.65) * baseOpacity;
      const y = isInitial
        ? Math.random() * ((height || 50) + radius * 2) - radius
        : (height || 50) + radius + Math.random() * 40;

      return {
        x: baseX,
        y,
        baseX,
        radius,
        vy,
        wobbleSpeed,
        wobbleAmp,
        wobblePhase,
        opacity,
      };
    };

    let bubbles: BubbleParticle[] = [];

    const initBubbles = () => {
      const userCount = mergedConfig.count || 14;
      const targetCount = previewMode
        ? Math.max(4, Math.round(userCount * 0.5))
        : Math.max(5, Math.round(userCount * (width > 0 ? Math.min(1.4, Math.max(0.6, width / 900)) : 1)));

      bubbles = Array.from({ length: targetCount }, () => createBubble(true));
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

      initBubbles();
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

        for (let i = 0; i < bubbles.length; i++) {
          const b = bubbles[i];

          // Procedural upward flight with horizontal trigonometric drift
          b.y -= b.vy * dt;
          b.wobblePhase += b.wobbleSpeed * dt;
          b.x = b.baseX + Math.sin(b.wobblePhase) * b.wobbleAmp;

          // Out-of-bounds check: respawn from below with completely fresh procedural properties
          if (b.y + b.radius * 2 < 0) {
            bubbles[i] = createBubble(false);
            continue;
          }

          const r = b.radius;
          const cx = b.x;
          const cy = b.y;

          // 1. Outer subtle glow & translucent glass body
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);

          // Internal radial glass gradient
          const grad = ctx.createRadialGradient(
            cx - r * 0.35,
            cy - r * 0.35,
            r * 0.05,
            cx,
            cy,
            r
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.45 * b.opacity})`);
          grad.addColorStop(0.35, palette.subtleGlow || 'rgba(34, 211, 238, 0.18)');
          grad.addColorStop(0.7, palette.dim || 'rgba(34, 211, 238, 0.08)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');

          ctx.fillStyle = grad;
          ctx.fill();

          // Outer glass bubble rim
          ctx.strokeStyle = palette.primary || '#22d3ee';
          ctx.globalAlpha = 0.5 * b.opacity;
          ctx.lineWidth = 1;
          ctx.stroke();

          // 2. Specular glass glare arc/highlight
          ctx.restore();
          ctx.save();
          ctx.translate(cx - r * 0.32, cy - r * 0.32);
          ctx.rotate(-0.45);
          ctx.beginPath();
          ctx.ellipse(
            0,
            0,
            Math.max(2.5, r * 0.22),
            Math.max(1.5, r * 0.12),
            0,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * b.opacity})`;
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
    mergedConfig.baseSize,
    mergedConfig.sizeVariance,
    mergedConfig.baseSpeed,
    mergedConfig.speedVariance,
    mergedConfig.opacity,
    mergedConfig.wobbleAmp,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none block"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

