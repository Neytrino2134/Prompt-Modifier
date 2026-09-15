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
                d="M -480,18 C -360,6 -240,30 -120,18 C 0,6 120,30 240,18 C 360,6 480,30 600,18 C 720,6 840,30 960,18 C 1080,6 1200,30 1320,18 C 1440,6 1560,30 1680,18 C 1800,6 1920,30 2040,18 C 2160,6 2280,30 2400,18 C 2520,6 2640,30 2760,18 C 2880,6 3000,30 3120,18 C 3240,6 3360,30 3480,18 L 3480,44 L -480,44 Z"
                fill={`url(#ocean-grad-deep-${theme})`}
              />
            </g>

            {/* Mid Ocean Swell Layer with increased height and amplitude */}
            <g className="anim-ocean-layer-1">
              <path
                d="M -480,24 C -360,36 -240,10 -120,24 C 0,36 120,10 240,24 C 360,36 480,10 600,24 C 720,36 840,10 960,24 C 1080,36 1200,10 1320,24 C 1440,36 1560,10 1680,24 C 1800,36 1920,10 2040,24 C 2160,36 2280,10 2400,24 C 2520,36 2640,10 2760,24 C 2880,36 3000,10 3120,24 C 3240,36 3360,10 3480,24 L 3480,44 L -480,44 Z"
                fill={`url(#ocean-grad-mid-${theme})`}
              />
            </g>

            {/* Top Luminous Crest Line Wave moving to the RIGHT */}
            <g className="anim-ocean-layer-3">
              <path
                d="M -480,22 C -360,34 -240,8 -120,22 C 0,34 120,8 240,22 C 360,34 480,8 600,22 C 720,34 840,8 960,22 C 1080,34 1200,8 1320,22 C 1440,34 1560,8 1680,22 C 1800,34 1920,8 2040,22 C 2160,34 2280,8 2400,22 C 2520,34 2640,8 2760,22 C 2880,34 3000,8 3120,22 C 3240,34 3360,8 3480,22"
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
              strokeDasharray="24 156"
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

      {/* 13. Vector Shapes: Deep Space (Celestial Constellation Map: Ursa Major, Orion & Belt, Cassiopeia, Polaris, Cygnus & Pleiades with soft starlight glow and gentle pulsing) */}
      {animation === 'shapes_space' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-85">
          {previewMode ? (
            <svg
              className="w-full h-full pointer-events-none"
              viewBox="0 0 200 40"
              preserveAspectRatio="none"
            >
              {/* Cosmic Nebula Haze */}
              <ellipse cx="60" cy="20" rx="55" ry="18" fill={palette.dim} filter="blur(8px)" opacity="0.6" />
              <ellipse cx="145" cy="20" rx="50" ry="18" fill={palette.subtleGlow} filter="blur(8px)" opacity="0.5" />

              {/* Celestial Coordinate Arc */}
              <path
                d="M 0,22 Q 100,10 200,18"
                fill="none"
                stroke={palette.primary}
                strokeWidth="0.5"
                strokeDasharray="2 3"
                strokeOpacity="0.25"
              />

              {/* Ursa Major / Большая Медведица (Big Dipper) */}
              <g opacity="0.85">
                <path
                  d="M 18,26 L 30,20 L 42,16 L 54,17 L 56,29 L 72,28 L 74,15 L 54,17"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.75"
                  strokeDasharray="2.5 2.5"
                />
                {/* Pointer ray to Polaris */}
                <line x1="74" y1="15" x2="94" y2="8" stroke={palette.highlight} strokeWidth="0.5" strokeDasharray="1.5 2.5" strokeOpacity="0.35" />

                {/* Big Dipper Stars */}
                <circle cx="18" cy="26" r="1.4" fill="#ffffff" className="anim-star-twinkle-1" />
                <circle cx="30" cy="20" r="1.5" fill={palette.highlight} className="anim-star-twinkle-2" />
                <circle cx="42" cy="16" r="1.4" fill="#ffffff" className="anim-star-twinkle-3" />
                <circle cx="54" cy="17" r="1.3" fill="#ffffff" className="anim-star-twinkle-4" />
                <circle cx="56" cy="29" r="1.4" fill={palette.highlight} className="anim-star-twinkle-1" />
                <circle cx="72" cy="28" r="1.5" fill="#ffffff" className="anim-star-twinkle-2" />
                <circle cx="74" cy="15" r="1.8" fill={palette.highlight} className="anim-star-twinkle-3" />
              </g>

              {/* Polaris (Полярная звезда) */}
              <g opacity="0.9">
                <circle cx="98" cy="8" r="4.5" fill={palette.highlight} opacity="0.2" className="anim-star-glow-1" />
                <circle cx="98" cy="8" r="2.2" fill={palette.highlight} className="anim-star-twinkle-1" />
                <circle cx="98" cy="8" r="1.2" fill="#ffffff" />
              </g>

              {/* Orion & Orion's Belt / Орион и Пояс Ориона */}
              <g opacity="0.85">
                <path
                  d="M 126,8 L 140,5 L 154,9 M 126,8 L 148,21 M 154,9 L 136,19 M 136,19 L 142,20 L 148,21 M 148,21 L 130,32 L 156,30 L 136,19"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.75"
                  strokeDasharray="2.5 2.5"
                />
                {/* Betelgeuse (Warm halo) */}
                <circle cx="126" cy="8" r="3.5" fill={palette.highlight} opacity="0.25" className="anim-star-glow-2" />
                <circle cx="126" cy="8" r="1.8" fill="#ffeedd" className="anim-star-twinkle-2" />

                {/* Bellatrix */}
                <circle cx="154" cy="9" r="1.6" fill={palette.highlight} className="anim-star-twinkle-3" />

                {/* Orion's Belt (3 Stars) */}
                <circle cx="136" cy="19" r="1.5" fill="#ffffff" className="anim-star-twinkle-1" />
                <circle cx="142" cy="20" r="1.6" fill={palette.highlight} className="anim-star-twinkle-2" />
                <circle cx="148" cy="21" r="1.5" fill="#ffffff" className="anim-star-twinkle-3" />

                {/* Rigel (Brilliant blue-white glow) */}
                <circle cx="156" cy="30" r="3.8" fill={palette.highlight} opacity="0.25" className="anim-star-glow-1" />
                <circle cx="156" cy="30" r="2.0" fill="#ffffff" className="anim-star-twinkle-4" />

                {/* Saiph */}
                <circle cx="130" cy="32" r="1.5" fill="#ffffff" className="anim-star-twinkle-1" />
              </g>

              {/* Ambient stars */}
              <circle cx="10" cy="12" r="1.0" fill={palette.highlight} opacity="0.6" className="anim-star-twinkle-3" />
              <circle cx="86" cy="34" r="1.1" fill="#ffffff" opacity="0.5" className="anim-star-twinkle-4" />
              <circle cx="178" cy="16" r="1.2" fill={palette.highlight} opacity="0.6" className="anim-star-twinkle-1" />
              <circle cx="190" cy="28" r="1.0" fill="#ffffff" opacity="0.5" className="anim-star-twinkle-2" />
            </svg>
          ) : (
            <svg
              className="w-full h-full pointer-events-none"
              viewBox="0 0 1200 40"
              preserveAspectRatio="none"
            >
              <defs>
                <radialGradient id={`space-nebula-1-${theme}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={palette.primary} stopOpacity="0.18" />
                  <stop offset="60%" stopColor={palette.secondary} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`space-nebula-2-${theme}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={palette.highlight} stopOpacity="0.16" />
                  <stop offset="70%" stopColor={palette.secondary} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={palette.highlight} stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Deep Ambient Cosmic Nebula Clouds */}
              <ellipse cx="280" cy="20" rx="160" ry="18" fill={`url(#space-nebula-1-${theme})`} filter="blur(10px)" />
              <ellipse cx="730" cy="20" rx="150" ry="18" fill={`url(#space-nebula-2-${theme})`} filter="blur(10px)" />
              <ellipse cx="940" cy="20" rx="120" ry="18" fill={`url(#space-nebula-1-${theme})`} filter="blur(10px)" />
              <ellipse cx="80" cy="20" rx="90" ry="18" fill={`url(#space-nebula-2-${theme})`} filter="blur(10px)" />

              {/* Subtle Celestial Coordinate Grid & Declination Arcs */}
              <g opacity="0.22">
                <path
                  d="M 0,22 Q 300,7 600,21 T 1200,16"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.6"
                  strokeDasharray="4 6"
                />
                <path
                  d="M 0,33 Q 350,17 700,30 T 1200,25"
                  fill="none"
                  stroke={palette.secondary}
                  strokeWidth="0.5"
                  strokeDasharray="3 5"
                />
                <path
                  d="M 0,9 Q 250,22 500,10 T 1000,14 T 1200,8"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.5"
                  strokeDasharray="2 6"
                />
              </g>

              {/* ========================================================================= */}
              {/* CONSTELLATION 1: Cassiopeia (Кассиопея - W-shape)                         */}
              {/* ========================================================================= */}
              <g opacity="0.85">
                {/* Dashed lines connecting stars */}
                <path
                  d="M 35,14 L 62,27 L 92,12 L 122,26 L 152,15"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  strokeOpacity="0.65"
                />

                {/* Segin (ε Cas) */}
                <circle cx="35" cy="14" r="3.2" fill={palette.highlight} opacity="0.22" className="anim-star-glow-1" />
                <circle cx="35" cy="14" r="1.6" fill="#ffffff" className="anim-star-twinkle-1" />

                {/* Ruchbah (δ Cas) */}
                <circle cx="62" cy="27" r="3.4" fill={palette.highlight} opacity="0.24" className="anim-star-glow-2" />
                <circle cx="62" cy="27" r="1.8" fill={palette.highlight} className="anim-star-twinkle-2" />

                {/* Navi (γ Cas) - Central peak */}
                <circle cx="92" cy="12" r="4.2" fill={palette.highlight} opacity="0.30" className="anim-star-glow-1" />
                <circle cx="92" cy="12" r="2.2" fill="#ffffff" className="anim-star-twinkle-3" />

                {/* Schedar (α Cas) */}
                <circle cx="122" cy="26" r="4.0" fill={palette.highlight} opacity="0.28" className="anim-star-glow-2" />
                <circle cx="122" cy="26" r="2.1" fill={palette.highlight} className="anim-star-twinkle-4" />

                {/* Caph (β Cas) */}
                <circle cx="152" cy="15" r="3.6" fill={palette.highlight} opacity="0.25" className="anim-star-glow-1" />
                <circle cx="152" cy="15" r="1.9" fill="#ffffff" className="anim-star-twinkle-1" />
              </g>

              {/* ========================================================================= */}
              {/* CONSTELLATION 2: Ursa Major / Большая Медведица (Big Dipper)              */}
              {/* ========================================================================= */}
              <g opacity="0.88">
                {/* Handle dashed track */}
                <path
                  d="M 205,27 L 240,20 L 276,16 L 314,18"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.85"
                  strokeDasharray="3 3"
                  strokeOpacity="0.7"
                />
                {/* Bowl dashed track */}
                <path
                  d="M 314,18 L 318,30 L 365,29 L 369,14 Z"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.85"
                  strokeDasharray="3 3"
                  strokeOpacity="0.7"
                />

                {/* Pointer ray from Merak & Dubhe towards Polaris */}
                <line
                  x1="369"
                  y1="14"
                  x2="435"
                  y2="7"
                  stroke={palette.highlight}
                  strokeWidth="0.6"
                  strokeDasharray="2 3"
                  strokeOpacity="0.35"
                />

                {/* Alkaid (Бенетнаш - Handle tip) */}
                <circle cx="205" cy="27" r="3.5" fill={palette.highlight} opacity="0.22" className="anim-star-glow-2" />
                <circle cx="205" cy="27" r="1.8" fill="#ffffff" className="anim-star-twinkle-1" />

                {/* Mizar & Alcor (Мицар и Алькор) */}
                <circle cx="240" cy="20" r="3.8" fill={palette.highlight} opacity="0.26" className="anim-star-glow-1" />
                <circle cx="240" cy="20" r="2.0" fill={palette.highlight} className="anim-star-twinkle-2" />
                <circle cx="243" cy="17.5" r="0.9" fill="#ffffff" opacity="0.75" className="anim-star-twinkle-3" />

                {/* Alioth (Алиот) */}
                <circle cx="276" cy="16" r="4.2" fill={palette.highlight} opacity="0.28" className="anim-star-glow-2" />
                <circle cx="276" cy="16" r="2.2" fill="#ffffff" className="anim-star-twinkle-3" />

                {/* Megrez (Мегрец - Joint) */}
                <circle cx="314" cy="18" r="3.2" fill={palette.highlight} opacity="0.22" className="anim-star-glow-1" />
                <circle cx="314" cy="18" r="1.6" fill="#ffffff" className="anim-star-twinkle-4" />

                {/* Phecda (Фекда - Bowl bottom-left) */}
                <circle cx="318" cy="30" r="3.6" fill={palette.highlight} opacity="0.25" className="anim-star-glow-2" />
                <circle cx="318" cy="30" r="1.9" fill={palette.highlight} className="anim-star-twinkle-1" />

                {/* Merak (Мерак - Pointer 1) */}
                <circle cx="365" cy="29" r="4.0" fill={palette.highlight} opacity="0.28" className="anim-star-glow-1" />
                <circle cx="365" cy="29" r="2.1" fill="#ffffff" className="anim-star-twinkle-2" />

                {/* Dubhe (Дубхе - Pointer 2, bright alpha) */}
                <circle cx="369" cy="14" r="4.8" fill={palette.highlight} opacity="0.32" className="anim-star-glow-2" />
                <circle cx="369" cy="14" r="2.4" fill={palette.highlight} className="anim-star-twinkle-3" />
              </g>

              {/* ========================================================================= */}
              {/* CONSTELLATION 3: Ursa Minor & Polaris / Малая Медведица и Полярная звезда  */}
              {/* ========================================================================= */}
              <g opacity="0.86">
                {/* Handle & Bowl dashed tracks */}
                <path
                  d="M 445,7 L 476,11 L 504,16 L 530,21"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.75"
                  strokeDasharray="2.5 2.5"
                  strokeOpacity="0.55"
                />
                <path
                  d="M 530,21 L 562,15 L 558,28 L 534,30 Z"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.75"
                  strokeDasharray="2.5 2.5"
                  strokeOpacity="0.55"
                />

                {/* Polaris (Полярная звезда - North Star, Radiant Beacon) */}
                <circle cx="445" cy="7" r="6.0" fill={palette.highlight} opacity="0.20" className="anim-star-glow-1" />
                <circle cx="445" cy="7" r="3.6" fill={palette.highlight} opacity="0.35" className="anim-star-glow-2" />
                <circle cx="445" cy="7" r="2.5" fill="#ffffff" className="anim-star-twinkle-1" />
                {/* Polaris subtle diffraction spikes */}
                <line x1="441" y1="7" x2="449" y2="7" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
                <line x1="445" y1="3" x2="445" y2="11" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />

                {/* Yildun */}
                <circle cx="476" cy="11" r="1.4" fill="#ffffff" className="anim-star-twinkle-2" />

                {/* Epsilon UMi */}
                <circle cx="504" cy="16" r="1.5" fill={palette.highlight} className="anim-star-twinkle-3" />

                {/* Zeta UMi */}
                <circle cx="530" cy="21" r="1.6" fill="#ffffff" className="anim-star-twinkle-4" />

                {/* Kochab (Кохаб) */}
                <circle cx="562" cy="15" r="3.8" fill={palette.highlight} opacity="0.26" className="anim-star-glow-1" />
                <circle cx="562" cy="15" r="2.0" fill={palette.highlight} className="anim-star-twinkle-1" />

                {/* Pherkad (Феркад) */}
                <circle cx="558" cy="28" r="3.2" fill={palette.highlight} opacity="0.22" className="anim-star-glow-2" />
                <circle cx="558" cy="28" r="1.7" fill="#ffffff" className="anim-star-twinkle-2" />

                {/* Eta UMi */}
                <circle cx="534" cy="30" r="1.4" fill="#ffffff" className="anim-star-twinkle-3" />
              </g>

              {/* ========================================================================= */}
              {/* CONSTELLATION 4: Orion & Orion's Belt / Орион и Пояс Ориона               */}
              {/* ========================================================================= */}
              <g opacity="0.90">
                {/* Head & shoulders */}
                <path
                  d="M 688,9 L 720,5 L 752,10"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.8"
                  strokeDasharray="2.5 2.5"
                  strokeOpacity="0.65"
                />
                {/* Betelgeuse & Bellatrix down to Belt */}
                <path
                  d="M 688,9 L 734,22"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.8"
                  strokeDasharray="2.5 2.5"
                  strokeOpacity="0.65"
                />
                <path
                  d="M 752,10 L 710,20"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.8"
                  strokeDasharray="2.5 2.5"
                  strokeOpacity="0.65"
                />

                {/* THE 3 BELT STARS (Пояс Ориона) */}
                <path
                  d="M 710,20 L 722,21 L 734,22"
                  fill="none"
                  stroke={palette.highlight}
                  strokeWidth="1.0"
                  strokeDasharray="3 2.5"
                  strokeOpacity="0.85"
                />

                {/* Belt down to Saiph & Rigel */}
                <path
                  d="M 734,22 L 694,33 L 758,31 L 710,20"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.8"
                  strokeDasharray="2.5 2.5"
                  strokeOpacity="0.65"
                />

                {/* Orion Sword / M42 line */}
                <path
                  d="M 722,21 L 723,28"
                  fill="none"
                  stroke={palette.secondary}
                  strokeWidth="0.7"
                  strokeDasharray="1.5 2"
                  strokeOpacity="0.5"
                />

                {/* Head (Meissa) */}
                <circle cx="720" cy="5" r="1.5" fill="#ffffff" className="anim-star-twinkle-4" />

                {/* Betelgeuse (Бетельгейзе - Red/Amber Supergiant Glow) */}
                <circle cx="688" cy="9" r="5.0" fill={palette.highlight} opacity="0.30" className="anim-star-glow-1" />
                <circle cx="688" cy="9" r="2.5" fill="#ffedd5" className="anim-star-twinkle-1" />

                {/* Bellatrix (Беллатрикс - Blue-White Giant) */}
                <circle cx="752" cy="10" r="4.2" fill={palette.highlight} opacity="0.28" className="anim-star-glow-2" />
                <circle cx="752" cy="10" r="2.2" fill={palette.highlight} className="anim-star-twinkle-2" />

                {/* ORION'S BELT: Mintaka (Минтака - West belt star) */}
                <circle cx="710" cy="20" r="3.8" fill={palette.highlight} opacity="0.30" className="anim-star-glow-1" />
                <circle cx="710" cy="20" r="2.0" fill="#ffffff" className="anim-star-twinkle-1" />

                {/* ORION'S BELT: Alnilam (Альнилам - Central belt supergiant) */}
                <circle cx="722" cy="21" r="4.5" fill={palette.highlight} opacity="0.35" className="anim-star-glow-2" />
                <circle cx="722" cy="21" r="2.3" fill="#ffffff" className="anim-star-twinkle-2" />

                {/* ORION'S BELT: Alnitak (Альнитак - East belt triple star) */}
                <circle cx="734" cy="22" r="4.0" fill={palette.highlight} opacity="0.32" className="anim-star-glow-1" />
                <circle cx="734" cy="22" r="2.1" fill="#ffffff" className="anim-star-twinkle-3" />

                {/* M42 Orion Nebula Sword Glow */}
                <ellipse cx="723" cy="26.5" rx="3.5" ry="2.2" fill={palette.subtleGlow} opacity="0.5" filter="blur(1px)" />
                <circle cx="723" cy="25.5" r="1.1" fill={palette.highlight} className="anim-star-twinkle-4" />
                <circle cx="723" cy="27.5" r="1.0" fill="#ffffff" className="anim-star-twinkle-1" />

                {/* Saiph (Саиф - Right foot) */}
                <circle cx="694" cy="33" r="3.6" fill={palette.highlight} opacity="0.25" className="anim-star-glow-2" />
                <circle cx="694" cy="33" r="1.9" fill={palette.highlight} className="anim-star-twinkle-3" />

                {/* Rigel (Ригель - Left foot, brilliant blue-white luminary) */}
                <circle cx="758" cy="31" r="5.6" fill={palette.highlight} opacity="0.35" className="anim-star-glow-1" />
                <circle cx="758" cy="31" r="2.7" fill="#ffffff" className="anim-star-twinkle-4" />
                {/* Rigel subtle diffraction spikes */}
                <line x1="754" y1="31" x2="762" y2="31" stroke="#ffffff" strokeWidth="0.5" opacity="0.6" />
                <line x1="758" y1="27" x2="758" y2="35" stroke="#ffffff" strokeWidth="0.5" opacity="0.6" />
              </g>

              {/* ========================================================================= */}
              {/* CONSTELLATION 5: Cygnus / Northern Cross / Лебедь                         */}
              {/* ========================================================================= */}
              <g opacity="0.86">
                {/* Backbone */}
                <path
                  d="M 880,20 L 928,20 L 990,20"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.8"
                  strokeDasharray="2.5 2.5"
                  strokeOpacity="0.65"
                />
                {/* Wings */}
                <path
                  d="M 928,7 L 928,20 L 928,33"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.8"
                  strokeDasharray="2.5 2.5"
                  strokeOpacity="0.65"
                />

                {/* Deneb (Денеб - Tail supergiant) */}
                <circle cx="880" cy="20" r="4.8" fill={palette.highlight} opacity="0.30" className="anim-star-glow-2" />
                <circle cx="880" cy="20" r="2.4" fill="#ffffff" className="anim-star-twinkle-1" />

                {/* Sadr (Садр - Chest center) */}
                <circle cx="928" cy="20" r="4.2" fill={palette.highlight} opacity="0.28" className="anim-star-glow-1" />
                <circle cx="928" cy="20" r="2.2" fill={palette.highlight} className="anim-star-twinkle-2" />

                {/* Albireo (Альбирео - Head binary star) */}
                <circle cx="990" cy="20" r="3.4" fill={palette.highlight} opacity="0.25" className="anim-star-glow-2" />
                <circle cx="990" cy="20" r="1.8" fill="#ffffff" className="anim-star-twinkle-3" />

                {/* Gienah (ε Cygni - North wing) */}
                <circle cx="928" cy="7" r="3.6" fill={palette.highlight} opacity="0.26" className="anim-star-glow-1" />
                <circle cx="928" cy="7" r="1.9" fill="#ffffff" className="anim-star-twinkle-4" />

                {/* Delta Cygni (South wing) */}
                <circle cx="928" cy="33" r="3.6" fill={palette.highlight} opacity="0.26" className="anim-star-glow-2" />
                <circle cx="928" cy="33" r="1.9" fill={palette.highlight} className="anim-star-twinkle-1" />
              </g>

              {/* ========================================================================= */}
              {/* CONSTELLATION 6: Pleiades Cluster / Плеяды (Seven Sisters)                */}
              {/* ========================================================================= */}
              <g opacity="0.85">
                <ellipse cx="1110" cy="17" rx="26" ry="12" fill={palette.subtleGlow} opacity="0.3" filter="blur(4px)" />
                {/* Dashed cluster connecting lines */}
                <path
                  d="M 1084,11 L 1086,16 L 1098,14 L 1110,19 L 1125,21 L 1127,16 M 1098,14 L 1100,24 L 1110,19"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="0.65"
                  strokeDasharray="2 2"
                  strokeOpacity="0.55"
                />

                {/* Taygeta */}
                <circle cx="1084" cy="11" r="1.3" fill="#ffffff" className="anim-star-twinkle-2" />
                {/* Electra */}
                <circle cx="1086" cy="16" r="1.5" fill={palette.highlight} className="anim-star-twinkle-3" />
                {/* Maia */}
                <circle cx="1098" cy="14" r="1.6" fill="#ffffff" className="anim-star-twinkle-1" />
                {/* Merope */}
                <circle cx="1100" cy="24" r="1.5" fill={palette.highlight} className="anim-star-twinkle-4" />
                {/* Alcyone (Brightest sister) */}
                <circle cx="1110" cy="19" r="3.4" fill={palette.highlight} opacity="0.28" className="anim-star-glow-1" />
                <circle cx="1110" cy="19" r="2.0" fill="#ffffff" className="anim-star-twinkle-2" />
                {/* Atlas */}
                <circle cx="1125" cy="21" r="1.6" fill={palette.highlight} className="anim-star-twinkle-3" />
                {/* Pleione */}
                <circle cx="1127" cy="16" r="1.3" fill="#ffffff" className="anim-star-twinkle-4" />
              </g>

              {/* ========================================================================= */}
              {/* STATIC DEEP SKY FIELD STARS (Subtle, gentle non-moving twinkling)         */}
              {/* ========================================================================= */}
              <g opacity="0.6">
                <circle cx="15" cy="28" r="0.9" fill={palette.highlight} className="anim-star-twinkle-1" />
                <circle cx="48" cy="6" r="1.0" fill="#ffffff" className="anim-star-twinkle-3" />
                <circle cx="178" cy="28" r="1.1" fill={palette.highlight} className="anim-star-twinkle-2" />
                <circle cx="188" cy="8" r="0.8" fill="#ffffff" className="anim-star-twinkle-4" />
                <circle cx="395" cy="8" r="1.0" fill="#ffffff" className="anim-star-twinkle-1" />
                <circle cx="408" cy="33" r="0.9" fill={palette.highlight} className="anim-star-twinkle-3" />
                <circle cx="585" cy="8" r="1.1" fill="#ffffff" className="anim-star-twinkle-2" />
                <circle cx="615" cy="28" r="0.8" fill={palette.highlight} className="anim-star-twinkle-4" />
                <circle cx="640" cy="12" r="1.0" fill="#ffffff" className="anim-star-twinkle-1" />
                <circle cx="660" cy="26" r="0.9" fill={palette.highlight} className="anim-star-twinkle-3" />
                <circle cx="790" cy="14" r="1.1" fill="#ffffff" className="anim-star-twinkle-2" />
                <circle cx="810" cy="28" r="0.8" fill={palette.highlight} className="anim-star-twinkle-4" />
                <circle cx="845" cy="8" r="1.0" fill="#ffffff" className="anim-star-twinkle-1" />
                <circle cx="855" cy="32" r="0.9" fill={palette.highlight} className="anim-star-twinkle-3" />
                <circle cx="1025" cy="10" r="1.0" fill="#ffffff" className="anim-star-twinkle-2" />
                <circle cx="1045" cy="28" r="0.8" fill={palette.highlight} className="anim-star-twinkle-4" />
                <circle cx="1060" cy="14" r="0.9" fill="#ffffff" className="anim-star-twinkle-1" />
                <circle cx="1165" cy="9" r="1.1" fill={palette.highlight} className="anim-star-twinkle-3" />
                <circle cx="1185" cy="27" r="0.9" fill="#ffffff" className="anim-star-twinkle-2" />
              </g>
            </svg>
          )}
        </div>
      )}
    </div>
  );
};
