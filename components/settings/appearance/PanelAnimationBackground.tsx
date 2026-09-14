import React, { useMemo } from 'react';
import { PanelAnimation, Theme } from '../../../types';
import { getEffectivePalette } from './panelAnimationDefinitions';

interface PanelAnimationBackgroundProps {
  animation: PanelAnimation;
  theme: Theme;
  isAdaptive: boolean;
  className?: string;
  previewMode?: boolean;
}

export const PanelAnimationBackground: React.FC<PanelAnimationBackgroundProps> = ({
  animation,
  theme,
  isAdaptive,
  className = '',
  previewMode = false,
}) => {
  const palette = useMemo(
    () => getEffectivePalette(animation, theme, isAdaptive),
    [animation, theme, isAdaptive]
  );

  if (animation === 'none') {
    return null;
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Shimmer Glare Effect */}
      {animation === 'shimmer' && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="top-panel-glare"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${palette.dim} 20%, rgba(255, 255, 255, 0.16) 50%, ${palette.dim} 80%, transparent 100%)`,
            }}
          />
        </div>
      )}

      {/* 2. Pulse Glow Effect */}
      {animation === 'pulse' && (
        <div
          className="absolute inset-0 anim-panel-pulse-glow"
          style={
            {
              '--pulse-glow-color': palette.glow,
              '--pulse-dim-color': palette.dim,
              '--pulse-primary-color': palette.primary,
            } as React.CSSProperties
          }
        />
      )}

      {/* 3. Breathing Glow Effect (Strictly inner, smooth, zero step) */}
      {animation === 'breath' && (
        <div
          className="absolute inset-0 anim-panel-breath-glow"
          style={
            {
              '--breath-glow-color': palette.glow,
              '--breath-subtle-color': palette.subtleGlow,
              '--breath-primary': palette.primary,
            } as React.CSSProperties
          }
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 70% 80% at 50% 50%, ${palette.subtleGlow} 0%, transparent 80%)`,
            }}
          />
        </div>
      )}

      {/* 4. Fluid Wave (Gentle, slow, soft ambient wave without fast glare or shimmer) */}
      {animation === 'wave' && (
        <div
          className="absolute inset-0 anim-panel-fluid-wave"
          style={{
            background: `linear-gradient(90deg, 
              rgba(11, 15, 25, 0) 0%, 
              ${palette.waveGradient[0]} 20%, 
              ${palette.waveGradient[1]} 40%, 
              ${palette.waveGradient[2]} 50%, 
              ${palette.waveGradient[3]} 60%, 
              ${palette.waveGradient[4]} 80%, 
              rgba(11, 15, 25, 0) 100%
            )`,
            backgroundSize: '200% 100%',
          }}
        />
      )}

      {/* 5. Aurora Borealis */}
      {animation === 'aurora' && (
        <div
          className="absolute inset-0 anim-panel-aurora"
          style={{
            background: `linear-gradient(125deg, 
              rgba(10, 16, 30, 0.4) 0%, 
              ${palette.auroraGradient[0]} 25%, 
              ${palette.auroraGradient[1]} 45%, 
              ${palette.auroraGradient[2]} 65%, 
              ${palette.auroraGradient[3]} 85%, 
              rgba(10, 16, 30, 0.4) 100%
            )`,
            backgroundSize: '250% 250%',
            filter: 'blur(8px)',
            opacity: 0.85,
          }}
        />
      )}

      {/* 6. Neon Flow Seam (Full width, continuous flowing laser seam) */}
      {animation === 'neon' && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none">
          <div
            className="w-full h-[1.5px] anim-panel-neon-flow"
            style={{
              background: `linear-gradient(90deg, ${palette.neonStops.join(', ')})`,
              backgroundSize: '200% 100%',
              boxShadow: `0 0 6px 0.5px ${palette.glow}`,
            }}
          />
        </div>
      )}

      {/* 7. Vector Shapes: Bubbles (Large, perfectly round, highly translucent, continuous upward flight) */}
      {animation === 'shapes_bubbles' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Defined bubble stream items with fixed pixel dimensions and % horizontal positioning */}
          {[
            { left: '3%', size: previewMode ? 32 : 72, dur: 9.5, delay: -2.3, skew: 3 },
            { left: '14%', size: previewMode ? 42 : 96, dur: 12.0, delay: -7.5, skew: -4 },
            { left: '26%', size: previewMode ? 28 : 64, dur: 8.5, delay: -4.1, skew: 2 },
            { left: '38%', size: previewMode ? 46 : 108, dur: 13.5, delay: -10.2, skew: -3 },
            { left: '50%', size: previewMode ? 36 : 82, dur: 10.5, delay: -1.8, skew: 4 },
            { left: '62%', size: previewMode ? 44 : 102, dur: 12.8, delay: -6.4, skew: -2 },
            { left: '74%', size: previewMode ? 30 : 68, dur: 8.8, delay: -3.6, skew: 3 },
            { left: '85%', size: previewMode ? 42 : 94, dur: 11.6, delay: -8.9, skew: -4 },
            { left: '95%', size: previewMode ? 34 : 76, dur: 9.8, delay: -5.0, skew: 2 },
          ].map((b, i) => (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                left: b.left,
                bottom: 0,
                width: `${b.size}px`,
                height: `${b.size}px`,
                borderRadius: '9999px',
                aspectRatio: '1 / 1',
                animation: `bubble-rise-infinite ${b.dur}s linear infinite`,
                animationDelay: `${b.delay}s`,
                background: `radial-gradient(circle at 35% 30%, 
                  rgba(255, 255, 255, 0.35) 0%, 
                  ${palette.subtleGlow} 35%, 
                  ${palette.dim} 65%, 
                  rgba(255, 255, 255, 0.05) 100%
                )`,
                border: `1px solid ${palette.primary}`,
                borderColor: `${palette.primary}40`,
                boxShadow: `inset 0 0 14px ${palette.subtleGlow}, 0 0 8px ${palette.dim}`,
              }}
            >
              {/* Internal Glass Reflection Glare */}
              <div
                className="absolute top-[18%] left-[22%] rounded-full bg-white/40"
                style={{
                  width: `${Math.max(4, b.size * 0.18)}px`,
                  height: `${Math.max(3, b.size * 0.12)}px`,
                  transform: 'rotate(-25deg)',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 8. Vector Shapes: Ocean Waves (Moving to the RIGHT, increased height, seamless tile width-independent) */}
      {animation === 'shapes_ocean' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg
            className="absolute top-0 h-full pointer-events-none"
            style={{
              left: '-480px',
              width: 'calc(100% + 960px)',
              minWidth: '2400px',
            }}
            viewBox="0 0 2400 44"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`ocean-grad-deep-${theme}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.primary} stopOpacity="0.08" />
                <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.30" />
              </linearGradient>
              <linearGradient id={`ocean-grad-mid-${theme}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.highlight} stopOpacity="0.15" />
                <stop offset="100%" stopColor={palette.primary} stopOpacity="0.35" />
              </linearGradient>
            </defs>

            {/* Deep Background Ocean Wave Layer (Tide depth moving to the RIGHT) */}
            <g className="anim-ocean-layer-2">
              <path
                d="M -480,18 C -360,6 -240,30 -120,18 C 0,6 120,30 240,18 C 360,6 480,30 600,18 C 720,6 840,30 960,18 C 1080,6 1200,30 1320,18 C 1440,6 1560,30 1680,18 C 1800,6 1920,30 2040,18 C 2160,6 2280,30 2400,18 C 2520,6 2640,30 2760,18 C 2880,6 3000,30 3120,18 L 3120,44 L -480,44 Z"
                fill={`url(#ocean-grad-deep-${theme})`}
              />
            </g>

            {/* Mid Ocean Swell Layer with increased height and amplitude */}
            <g className="anim-ocean-layer-1">
              <path
                d="M -480,24 C -360,36 -240,10 -120,24 C 0,36 120,10 240,24 C 360,36 480,10 600,24 C 720,36 840,10 960,24 C 1080,36 1200,10 1320,24 C 1440,36 1560,10 1680,24 C 1800,36 1920,10 2040,24 C 2160,36 2280,10 2400,24 C 2520,36 2640,10 2760,24 C 2880,36 3000,10 3120,24 L 3120,44 L -480,44 Z"
                fill={`url(#ocean-grad-mid-${theme})`}
              />
            </g>

            {/* Top Luminous Crest Line Wave moving to the RIGHT */}
            <g className="anim-ocean-layer-3">
              <path
                d="M -480,22 C -360,34 -240,8 -120,22 C 0,34 120,8 240,22 C 360,34 480,8 600,22 C 720,34 840,8 960,22 C 1080,34 1200,8 1320,22 C 1440,34 1560,8 1680,22 C 1800,34 1920,8 2040,22 C 2160,34 2280,8 2400,22 C 2520,34 2640,8 2760,22 C 2880,34 3000,8 3120,22"
                fill="none"
                stroke={palette.highlight}
                strokeWidth="1.6"
                strokeOpacity="0.75"
                filter={`drop-shadow(0 0 3px ${palette.glow})`}
              />
            </g>
          </svg>
        </div>
      )}

      {/* 9. Vector Shapes: Isometric Geometry (Larger shapes, perfectly 1:1 regular geometry, gentle swaying, no distortion) */}
      {animation === 'shapes_geometry' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center">
          {/* Unit 1: 3D Isometric Cube at ~7% */}
          <div
            className="absolute anim-geom-sway-1"
            style={{ left: '7%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg width={previewMode ? 26 : 42} height={previewMode ? 26 : 42} viewBox="0 0 44 44" className="overflow-visible">
              {/* Isometric Cube Top Face */}
              <polygon points="22,4 38,13 22,22 6,13" fill={palette.dim} stroke={palette.highlight} strokeWidth="1.2" />
              {/* Left Face */}
              <polygon points="6,13 22,22 22,40 6,31" fill={palette.svgFill} stroke={palette.primary} strokeWidth="1.2" opacity="0.8" />
              {/* Right Face */}
              <polygon points="22,22 38,13 38,31 22,40" fill={palette.dim} stroke={palette.secondary} strokeWidth="1.2" opacity="0.9" />
              {/* Center Node */}
              <circle cx="22" cy="22" r="2" fill={palette.highlight} />
            </svg>
          </div>

          {/* Unit 2: Regular Equilateral Triangle with Inner Wireframe at ~22% */}
          <div
            className="absolute anim-geom-sway-2"
            style={{ left: '22%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg width={previewMode ? 24 : 38} height={previewMode ? 24 : 38} viewBox="0 0 40 40" className="overflow-visible">
              <polygon points="20,4 36,34 4,34" fill={palette.dim} stroke={palette.primary} strokeWidth="1.4" />
              <polygon points="20,14 28,30 12,30" fill="none" stroke={palette.highlight} strokeWidth="1" strokeDasharray="3 2" />
              <circle cx="20" cy="24" r="3" fill={palette.highlight} />
            </svg>
          </div>

          {/* Unit 3: Regular Hexagon with Star Wireframe at ~38% */}
          <div
            className="absolute anim-geom-sway-3"
            style={{ left: '38%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg width={previewMode ? 26 : 42} height={previewMode ? 26 : 42} viewBox="0 0 44 44" className="overflow-visible">
              <polygon points="22,4 37,13 37,31 22,40 7,31 7,13" fill={palette.dim} stroke={palette.secondary} strokeWidth="1.2" />
              <line x1="22" y1="4" x2="22" y2="40" stroke={palette.primary} strokeWidth="1" opacity="0.6" strokeDasharray="2 2" />
              <line x1="7" y1="13" x2="37" y2="31" stroke={palette.primary} strokeWidth="1" opacity="0.6" strokeDasharray="2 2" />
              <line x1="7" y1="31" x2="37" y2="13" stroke={palette.primary} strokeWidth="1" opacity="0.6" strokeDasharray="2 2" />
              <circle cx="22" cy="22" r="3.5" fill={palette.highlight} stroke={palette.primary} strokeWidth="1" />
            </svg>
          </div>

          {/* Unit 4: 3D Rhombus / Octahedron at ~54% */}
          <div
            className="absolute anim-geom-sway-1"
            style={{ left: '54%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg width={previewMode ? 24 : 38} height={previewMode ? 24 : 38} viewBox="0 0 40 40" className="overflow-visible">
              <polygon points="20,3 36,20 20,37 4,20" fill={palette.dim} stroke={palette.highlight} strokeWidth="1.3" />
              <line x1="4" y1="20" x2="36" y2="20" stroke={palette.primary} strokeWidth="1.2" />
              <line x1="20" y1="3" x2="20" y2="37" stroke={palette.primary} strokeWidth="1.2" />
              <circle cx="20" cy="20" r="2.5" fill={palette.highlight} />
            </svg>
          </div>

          {/* Unit 5: Isometric 3D Cube at ~70% */}
          <div
            className="absolute anim-geom-sway-2"
            style={{ left: '70%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg width={previewMode ? 26 : 42} height={previewMode ? 26 : 42} viewBox="0 0 44 44" className="overflow-visible">
              <polygon points="22,4 38,13 22,22 6,13" fill={palette.dim} stroke={palette.highlight} strokeWidth="1.2" />
              <polygon points="6,13 22,22 22,40 6,31" fill={palette.svgFill} stroke={palette.primary} strokeWidth="1.2" opacity="0.8" />
              <polygon points="22,22 38,13 38,31 22,40" fill={palette.dim} stroke={palette.secondary} strokeWidth="1.2" opacity="0.9" />
              <circle cx="22" cy="22" r="2" fill={palette.highlight} />
            </svg>
          </div>

          {/* Unit 6: Regular Equilateral Polygon at ~86% */}
          <div
            className="absolute anim-geom-sway-3"
            style={{ left: '86%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg width={previewMode ? 24 : 38} height={previewMode ? 24 : 38} viewBox="0 0 40 40" className="overflow-visible">
              <polygon points="20,4 36,34 4,34" fill={palette.dim} stroke={palette.primary} strokeWidth="1.4" />
              <polygon points="20,14 28,30 12,30" fill="none" stroke={palette.highlight} strokeWidth="1" strokeDasharray="3 2" />
              <circle cx="20" cy="24" r="2.5" fill={palette.highlight} />
            </svg>
          </div>

          {/* Unit 7: Regular Hexagon Wireframe at ~96% */}
          <div
            className="absolute anim-geom-sway-1"
            style={{ left: '96%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg width={previewMode ? 24 : 38} height={previewMode ? 24 : 38} viewBox="0 0 44 44" className="overflow-visible">
              <polygon points="22,4 37,13 37,31 22,40 7,31 7,13" fill={palette.dim} stroke={palette.secondary} strokeWidth="1.2" />
              <circle cx="22" cy="22" r="3" fill={palette.highlight} />
            </svg>
          </div>
        </div>
      )}

      {/* 10. Vector Shapes: Techno PCB (No wobbling circles, clean PCB tracks with electric data flow & static junction pads) */}
      {animation === 'shapes_techno' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
          <svg
            className="w-full h-full pointer-events-none"
            viewBox={previewMode ? '0 0 200 40' : '0 0 1200 40'}
            preserveAspectRatio="none"
          >
            {/* Top Bus Track */}
            <path
              d="M0,12 L140,12 L160,24 L300,24 L320,10 L480,10 L500,26 L660,26 L680,14 L840,14 L860,28 L1020,28 L1040,12 L1200,12"
              fill="none"
              stroke={palette.secondary}
              strokeWidth="1"
              strokeOpacity="0.35"
            />
            {/* Bottom Bus Track */}
            <path
              d="M0,30 L80,30 L100,16 L240,16 L260,32 L420,32 L440,18 L580,18 L600,32 L760,32 L780,18 L940,18 L960,30 L1200,30"
              fill="none"
              stroke={palette.primary}
              strokeWidth="1.2"
              strokeOpacity="0.45"
            />

            {/* High-speed Electric Data Pulses running along PCB Traces */}
            <path
              className="anim-techno-pulse"
              d="M0,12 L140,12 L160,24 L300,24 L320,10 L480,10 L500,26 L660,26 L680,14 L840,14 L860,28 L1020,28 L1040,12 L1200,12"
              fill="none"
              stroke={palette.highlight}
              strokeWidth="1.8"
              strokeDasharray="20 160"
              filter={`drop-shadow(0 0 3px ${palette.highlight})`}
            />
            <path
              className="anim-techno-pulse"
              style={{ animationDelay: '-3.8s' }}
              d="M0,30 L80,30 L100,16 L240,16 L260,32 L420,32 L440,18 L580,18 L600,32 L760,32 L780,18 L940,18 L960,30 L1200,30"
              fill="none"
              stroke={palette.highlight}
              strokeWidth="1.8"
              strokeDasharray="24 180"
              filter={`drop-shadow(0 0 3px ${palette.highlight})`}
            />

            {/* Static SMD Microchip IC Pads & Junction Solder Vias (Steady, no swinging) */}
            <g className="anim-node-digital-glow">
              <rect x="156" y="20" width="8" height="8" rx="1.5" fill={palette.dim} stroke={palette.highlight} strokeWidth="1" />
              <rect x="316" y="6" width="8" height="8" rx="1.5" fill={palette.dim} stroke={palette.highlight} strokeWidth="1" />
              <rect x="496" y="22" width="8" height="8" rx="1.5" fill={palette.dim} stroke={palette.highlight} strokeWidth="1" />
              <rect x="676" y="10" width="8" height="8" rx="1.5" fill={palette.dim} stroke={palette.highlight} strokeWidth="1" />
              <rect x="856" y="24" width="8" height="8" rx="1.5" fill={palette.dim} stroke={palette.highlight} strokeWidth="1" />
              <rect x="1036" y="8" width="8" height="8" rx="1.5" fill={palette.dim} stroke={palette.highlight} strokeWidth="1" />

              {/* Solder Vias */}
              <circle cx="100" cy="16" r="2.2" fill={palette.highlight} />
              <circle cx="260" cy="32" r="2.2" fill={palette.highlight} />
              <circle cx="440" cy="18" r="2.2" fill={palette.highlight} />
              <circle cx="600" cy="32" r="2.2" fill={palette.highlight} />
              <circle cx="780" cy="18" r="2.2" fill={palette.highlight} />
              <circle cx="960" cy="30" r="2.2" fill={palette.highlight} />
            </g>
          </svg>
        </div>
      )}

      {/* 11. Vector Shapes: Cyber Grid (Top-down camera view, orthogonal matrix, glowing tracers with tails) */}
      {animation === 'shapes_cyber' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-85">
          {/* Top-down Orthogonal Matrix Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, ${palette.dim} 1px, transparent 1px),
                linear-gradient(to bottom, ${palette.dim} 1px, transparent 1px)
              `,
              backgroundSize: '36px 14px',
            }}
          />

          {/* Tracer Track 1 (Horizontal, Top Track at y=14px) */}
          <div className="absolute top-[13px] left-0 w-full h-[2px]">
            <div
              className="anim-cyber-tracer-1 absolute top-0 flex items-center"
              style={{ width: '120px' }}
            >
              <div
                className="h-[1.5px] flex-1"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${palette.primary} 70%, ${palette.highlight} 100%)`,
                }}
              />
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: palette.highlight,
                  boxShadow: `0 0 6px 1.5px ${palette.highlight}`,
                }}
              />
            </div>
          </div>

          {/* Tracer Track 2 (Horizontal, Bottom Track at y=27px) */}
          <div className="absolute top-[27px] left-0 w-full h-[2px]">
            <div
              className="anim-cyber-tracer-2 absolute top-0 flex items-center"
              style={{ width: '140px' }}
            >
              <div
                className="h-[1.5px] flex-1"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${palette.secondary} 70%, ${palette.highlight} 100%)`,
                }}
              />
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: palette.highlight,
                  boxShadow: `0 0 6px 1.5px ${palette.highlight}`,
                }}
              />
            </div>
          </div>

          {/* Tracer Track 3 (Horizontal, Mid Track at y=20px) */}
          <div className="absolute top-[20px] left-0 w-full h-[2px]">
            <div
              className="anim-cyber-tracer-3 absolute top-0 flex items-center"
              style={{ width: '100px' }}
            >
              <div
                className="h-[1.5px] flex-1"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${palette.primary} 70%, ${palette.highlight} 100%)`,
                }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: palette.highlight,
                  boxShadow: `0 0 5px 1px ${palette.highlight}`,
                }}
              />
            </div>
          </div>

          {/* Vertical Grid Pulses */}
          <div className="absolute top-0 left-[25%] h-full w-[2px]">
            <div
              className="anim-cyber-tracer-v1 absolute left-0 w-full h-4"
              style={{
                background: `linear-gradient(180deg, transparent 0%, ${palette.highlight} 100%)`,
                boxShadow: `0 0 4px ${palette.glow}`,
              }}
            />
          </div>
          <div className="absolute top-0 left-[68%] h-full w-[2px]">
            <div
              className="anim-cyber-tracer-v2 absolute left-0 w-full h-4"
              style={{
                background: `linear-gradient(180deg, transparent 0%, ${palette.highlight} 100%)`,
                boxShadow: `0 0 4px ${palette.glow}`,
              }}
            />
          </div>
        </div>
      )}

      {/* 12. Vector Shapes: Nature & Forest (Translucent organic leaves & glowing bioluminescent fireflies) */}
      {animation === 'shapes_nature' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-70">
          <svg
            className="w-full h-full pointer-events-none"
            viewBox={previewMode ? '0 0 200 40' : '0 0 1200 40'}
            preserveAspectRatio="none"
          >
            {/* Drifting organic leaf silhouettes */}
            <g className="anim-leaf-drift-1" style={{ transformOrigin: '15% 40%' }}>
              <path
                d="M160,16 C175,8 185,20 180,30 C165,36 155,24 160,16 Z"
                fill={palette.svgFill}
                stroke={palette.primary}
                strokeWidth="0.8"
              />
              <line x1="160" y1="16" x2="180" y2="30" stroke={palette.highlight} strokeWidth="0.5" opacity="0.6" />
            </g>

            <g className="anim-leaf-drift-2" style={{ transformOrigin: '45% 60%' }}>
              <path
                d="M520,24 C532,16 540,28 535,36 C524,40 516,30 520,24 Z"
                fill={palette.dim}
                stroke={palette.secondary}
                strokeWidth="0.8"
              />
            </g>

            <g className="anim-leaf-drift-1" style={{ transformOrigin: '75% 35%' }}>
              <path
                d="M890,14 C905,6 915,18 910,28 C895,34 885,22 890,14 Z"
                fill={palette.svgFill}
                stroke={palette.primary}
                strokeWidth="0.8"
              />
            </g>

            {/* Glowing fireflies */}
            <circle cx="80" cy="22" r="2.2" fill={palette.particleColor} className="anim-firefly-1" />
            <circle cx="340" cy="14" r="2.5" fill={palette.particleColor} className="anim-firefly-2" />
            <circle cx="680" cy="28" r="2.0" fill={palette.particleColor} className="anim-firefly-1" />
            <circle cx="1040" cy="16" r="2.4" fill={palette.particleColor} className="anim-firefly-2" />
          </svg>
        </div>
      )}

      {/* 13. Vector Shapes: Deep Space (No wobbling circles, cosmic nebula, celestial constellations, twinkling stars & comet) */}
      {animation === 'shapes_space' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
          <svg
            className="w-full h-full pointer-events-none"
            viewBox={previewMode ? '0 0 200 40' : '0 0 1200 40'}
            preserveAspectRatio="none"
          >
            {/* Deep Cosmic Nebula Cloud */}
            <ellipse
              cx="50%"
              cy="50%"
              rx="45%"
              ry="40%"
              fill={palette.dim}
              filter="blur(12px)"
            />

            {/* Constellation 1 */}
            <g opacity="0.75">
              <line x1="80" y1="12" x2="130" y2="26" stroke={palette.primary} strokeWidth="0.7" strokeDasharray="2 2" />
              <line x1="130" y1="26" x2="190" y2="16" stroke={palette.primary} strokeWidth="0.7" strokeDasharray="2 2" />
              <line x1="190" y1="16" x2="230" y2="30" stroke={palette.primary} strokeWidth="0.7" strokeDasharray="2 2" />
              <circle cx="80" cy="12" r="2" fill={palette.highlight} className="anim-star-twinkle-1" />
              <circle cx="130" cy="26" r="2" fill="#fff" className="anim-star-twinkle-2" />
              <circle cx="190" cy="16" r="2.5" fill={palette.highlight} className="anim-star-twinkle-1" />
              <circle cx="230" cy="30" r="1.8" fill="#fff" className="anim-star-twinkle-2" />
            </g>

            {/* Constellation 2 */}
            <g opacity="0.75">
              <line x1="500" y1="28" x2="550" y2="10" stroke={palette.secondary} strokeWidth="0.7" strokeDasharray="2 2" />
              <line x1="550" y1="10" x2="610" y2="22" stroke={palette.secondary} strokeWidth="0.7" strokeDasharray="2 2" />
              <circle cx="500" cy="28" r="2" fill="#fff" className="anim-star-twinkle-2" />
              <circle cx="550" cy="10" r="2.5" fill={palette.highlight} className="anim-star-twinkle-1" />
              <circle cx="610" cy="22" r="2" fill="#fff" className="anim-star-twinkle-2" />
            </g>

            {/* Constellation 3 */}
            <g opacity="0.75">
              <line x1="860" y1="28" x2="910" y2="12" stroke={palette.primary} strokeWidth="0.7" strokeDasharray="2 2" />
              <line x1="910" y1="12" x2="970" y2="24" stroke={palette.primary} strokeWidth="0.7" strokeDasharray="2 2" />
              <line x1="970" y1="24" x2="1040" y2="10" stroke={palette.primary} strokeWidth="0.7" strokeDasharray="2 2" />
              <circle cx="860" cy="28" r="1.8" fill="#fff" className="anim-star-twinkle-2" />
              <circle cx="910" cy="12" r="2.5" fill={palette.highlight} className="anim-star-twinkle-1" />
              <circle cx="970" cy="24" r="2" fill="#fff" className="anim-star-twinkle-2" />
              <circle cx="1040" cy="10" r="2.8" fill={palette.highlight} className="anim-star-twinkle-1" />
            </g>

            {/* Drifting Shooting Star Streak */}
            <line
              className="anim-space-comet"
              x1="0"
              y1="0"
              x2="70"
              y2="18"
              stroke={palette.highlight}
              strokeWidth="1.5"
              strokeLinecap="round"
              filter={`drop-shadow(0 0 3px ${palette.highlight})`}
            />
          </svg>
        </div>
      )}
    </div>
  );
};
