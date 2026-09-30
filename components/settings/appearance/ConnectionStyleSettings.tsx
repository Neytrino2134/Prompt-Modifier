import React from 'react';
import { useLanguage } from '../../../localization';
import { useAppContext } from '../../../contexts/AppContext';
import { CustomCheckbox } from '../../CustomCheckbox';
import { 
  ConnectionAnimationStyle, 
  ConnectionColorMode, 
  DEFAULT_CONNECTION_ANIMATION_CONFIG, 
  LineStyle 
} from '../../../types';
import { 
  CONNECTION_THEMES, 
  CONNECTION_COLOR_MODES, 
  getEffectiveConnectionColor,
  getNeonFlowGradientStops,
  CYBER_TRON_GRADATIONS
} from './connectionAnimationDefinitions';

interface ConnectionStyleSettingsProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const ConnectionStyleSettings: React.FC<ConnectionStyleSettingsProps> = ({
  isCollapsed,
  onToggle,
}) => {
  const { t } = useLanguage();
  const {
    isConnectionAnimationEnabled,
    setIsConnectionAnimationEnabled,
    connectionOpacity,
    setConnectionOpacity,
    connectionAnimationStyle,
    setConnectionAnimationStyle,
    connectionAnimationConfig,
    updateConnectionAnimationConfig,
    resetConnectionAnimationConfig,
    lineStyle,
    setLineStyle,
  } = useAppContext();

  const config = connectionAnimationConfig || DEFAULT_CONNECTION_ANIMATION_CONFIG;
  const currentStyle = connectionAnimationStyle || config.style || 'cyber_tron';

  const handleSelectTheme = (style: ConnectionAnimationStyle) => {
    setConnectionAnimationStyle(style);
    updateConnectionAnimationConfig({ style });
  };

  const handleSpeedChange = (speed: number) => {
    updateConnectionAnimationConfig({ speed });
  };

  const handleFrequencyChange = (frequency: number) => {
    updateConnectionAnimationConfig({ frequency });
  };

  const handleTrailLengthChange = (trailLength: number) => {
    updateConnectionAnimationConfig({ trailLength });
  };

  const handleParticleSizeChange = (particleSize: number) => {
    updateConnectionAnimationConfig({ particleSize });
  };

  const handleGlowIntensityChange = (glowIntensity: number) => {
    updateConnectionAnimationConfig({ glowIntensity });
  };

  const handleFlowDirectionChange = (flowDirection: 'forward' | 'reverse') => {
    updateConnectionAnimationConfig({ flowDirection });
  };

  const handleColorModeChange = (colorMode: ConnectionColorMode) => {
    updateConnectionAnimationConfig({ colorMode });
  };

  // Compute live preview colors
  const activeFlowColor = getEffectiveConnectionColor(
    config.colorMode,
    '#00f0ff',
    '#22d3ee'
  );

  const speedMultiplier = Math.max(0.2, config.speed || 1.0);
  const previewDuration = (2.6 / speedMultiplier).toFixed(2);
  const isReverse = config.flowDirection === 'reverse';
  const previewDir = isReverse ? 'flow-move-rev' : 'flow-move-fwd';
  const previewTrailLen = Math.max(15, config.trailLength || 70);
  const previewParticleSz = Math.max(2, config.particleSize || 4.5);
  const previewDensity = Math.max(1, config.frequency || 2);
  const previewGlow = Math.max(0.1, Math.min(1.0, config.glowIntensity ?? 0.8));
  
  const previewGap = Math.max(40, Math.round(240 / previewDensity));
  const previewPeriod = previewTrailLen + previewGap;

  const streamGap = Math.max(10, Math.round(50 / previewDensity));
  const streamPeriod = previewParticleSz + streamGap;
  const classicPeriod = 8 + 48;

  const selectedThemeMeta = CONNECTION_THEMES.find(th => th.id === currentStyle) || CONNECTION_THEMES[0];
  const isWholeLine = selectedThemeMeta.isWholeLine;

  const previewContainerRef = React.useRef<HTMLDivElement>(null);
  const sourceNodeRef = React.useRef<HTMLDivElement>(null);
  const targetNodeRef = React.useRef<HTMLDivElement>(null);
  const [lineCoords, setLineCoords] = React.useState<{ startX: number; endX: number }>({ startX: 84, endX: 380 });

  React.useLayoutEffect(() => {
    const updateCoords = () => {
      if (!previewContainerRef.current) return;
      const containerRect = previewContainerRef.current.getBoundingClientRect();
      let startX = 84;
      let endX = containerRect.width > 0 ? containerRect.width - 84 : 380;

      if (sourceNodeRef.current) {
        const sourceRect = sourceNodeRef.current.getBoundingClientRect();
        startX = sourceRect.right - containerRect.left;
      }
      if (targetNodeRef.current) {
        const targetRect = targetNodeRef.current.getBoundingClientRect();
        endX = targetRect.left - containerRect.left;
      }

      setLineCoords({
        startX: Math.max(0, Math.round(startX)),
        endX: Math.max(startX + 20, Math.round(endX))
      });
    };

    updateCoords();

    const ro = new ResizeObserver(() => {
      updateCoords();
    });

    if (previewContainerRef.current) {
      ro.observe(previewContainerRef.current);
    }
    return () => ro.disconnect();
  }, [isCollapsed]);

  const previewPathD = `M ${lineCoords.startX} 40 C ${lineCoords.startX + (lineCoords.endX - lineCoords.startX) * 0.4} 40, ${lineCoords.endX - (lineCoords.endX - lineCoords.startX) * 0.4} 40, ${lineCoords.endX} 40`;

  return (
    <div className="bg-gray-900/90 rounded-lg border border-cyan-900/40 shadow-sm overflow-hidden transition-all">
      {/* Header Button */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-800/60 transition-colors select-none group"
      >
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 group-hover:border-cyan-400/60 group-hover:scale-105 transition-all shadow-[0_0_8px_rgba(0,240,255,0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <label className="block text-xs font-semibold text-gray-200 cursor-pointer">
                {t('settings.connectionStyleSubpanel' as any) || 'Стиль и анимация связей'}
              </label>
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                Cyber FX
              </span>
            </div>
            {isCollapsed && (
              <p className="text-[10px] text-gray-400 leading-tight flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: selectedThemeMeta.accentColor }} />
                <span>{t(selectedThemeMeta.titleKey as any) || selectedThemeMeta.id}</span>
                <span>•</span>
                <span>{config.speed}x</span>
                <span>•</span>
                <span>{Math.round(connectionOpacity * 100)}%</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-600/40 shadow-sm">
            {t(selectedThemeMeta.badgeKey as any) || selectedThemeMeta.id}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-400 group-hover:text-cyan-300 transition-transform duration-200 ${!isCollapsed ? 'rotate-180 text-cyan-400' : 'rotate-0'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <div className="px-3.5 pb-4 space-y-4 border-t border-gray-800/70 pt-3">
          {/* Main Toggle & Reset */}
          <div className="flex items-center justify-between bg-gray-950/70 p-2.5 rounded-md border border-gray-800">
            <CustomCheckbox
              id="enableConnectionAnim"
              checked={isConnectionAnimationEnabled}
              onChange={setIsConnectionAnimationEnabled}
              label={t('dialog.settings.connectionAnimationLabel' as any) || 'Анимация потока данных'}
              className="text-xs font-medium text-gray-200"
            />
            <button
              type="button"
              onClick={resetConnectionAnimationConfig}
              className="text-[11px] px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors flex items-center gap-1"
              title={t('settings.connectionResetTooltip' as any) || 'Сбросить параметры к стандарту Cyber Tron'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{t('dialog.settings.reset' as any) || 'Сброс'}</span>
            </button>
          </div>

          {/* Real-time Visual Interactive Preview Box */}
          <div className="relative rounded-lg overflow-hidden border border-cyan-900/60 bg-gradient-to-b from-gray-950 via-[#070d14] to-gray-950 p-3 shadow-inner">
            <div className="flex items-center justify-between pb-1.5 mb-1 text-[11px] text-gray-400 border-b border-gray-800/80">
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                {t('settings.connectionLivePreview' as any) || 'Интерактивный предпросмотр (Live Preview)'}
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                {selectedThemeMeta.id} • {config.speed}x {isWholeLine ? '• Whole-line FX' : `• ${config.trailLength}px`}
              </span>
            </div>

            {/* SVG Mini Stage */}
            <div ref={previewContainerRef} className="relative h-20 w-full flex items-center justify-between">
              {/* Mini Source Node */}
              <div 
                ref={sourceNodeRef} 
                className="absolute left-3 z-10 px-2.5 py-1.5 rounded-md bg-gray-900 border border-gray-700 text-[10px] font-mono text-cyan-400 shadow-md flex items-center gap-1.5 select-none"
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
                <span>Source</span>
                {/* Output socket pin on right side */}
                <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-gray-950 shadow-[0_0_6px_rgba(0,240,255,1)]" />
              </div>

              {/* Mini Target Node */}
              <div 
                ref={targetNodeRef} 
                className="absolute right-3 z-10 px-2.5 py-1.5 rounded-md bg-gray-900 border border-gray-700 text-[10px] font-mono text-emerald-400 shadow-md flex items-center gap-1.5 select-none"
              >
                {/* Input socket pin on left side */}
                <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-gray-950 shadow-[0_0_6px_rgba(16,185,129,1)]" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                <span>Target</span>
              </div>

              <svg 
                className="w-full h-full overflow-visible pointer-events-none"
                style={{
                  ['--conn-period' as any]: `${previewPeriod}px`,
                  ['--conn-speed' as any]: `${previewDuration}s`,
                  ['--conn-glow-color' as any]: activeFlowColor,
                }}
              >
                <defs>
                  <filter id="preview-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation={3 * previewGlow} result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>

                  {currentStyle === 'neon_flow' && (
                    <linearGradient 
                      id="preview-neon-grad" 
                      x1={isReverse ? "100%" : "0%"} 
                      y1="0%" 
                      x2={isReverse ? "0%" : "100%"} 
                      y2="0%"
                      gradientUnits="userSpaceOnUse"
                    >
                      {getNeonFlowGradientStops(config.colorMode, activeFlowColor).map((col, idx, arr) => {
                        const offsetPct = `${Math.round((idx / (arr.length - 1)) * 100)}%`;
                        const cycleValues = arr.slice(idx).concat(arr.slice(0, idx)).concat(arr[idx]).join('; ');
                        return (
                          <stop key={idx} offset={offsetPct} stopColor={col}>
                            <animate
                              attributeName="stop-color"
                              values={cycleValues}
                              dur={`${(3.2 / speedMultiplier).toFixed(2)}s`}
                              repeatCount="indefinite"
                            />
                          </stop>
                        );
                      })}
                    </linearGradient>
                  )}
                </defs>

                {/* Grid guidelines for Cyber Tron vibe */}
                <line x1="0" y1="40" x2="100%" y2="40" stroke="rgba(0, 240, 255, 0.08)" strokeDasharray="3 3" />

                {/* Base Dimmed Track */}
                <path
                  d={previewPathD}
                  stroke={activeFlowColor}
                  strokeWidth="3"
                  fill="none"
                  style={{ opacity: connectionOpacity }}
                />

                {/* Active Dynamic Effect */}
                {isConnectionAnimationEnabled && (
                  <g>
                    {/* 1. Cyber Tron with 8-10 Gradations tail */}
                    {currentStyle === 'cyber_tron' && (
                      <>
                        {CYBER_TRON_GRADATIONS.map((grad, idx) => {
                          const segLen = Math.max(3, Math.round(previewTrailLen * grad.lenFrac));
                          const segGap = previewPeriod - segLen;
                          const segDelay = isReverse
                            ? '0s'
                            : `${-(((previewTrailLen - segLen) / previewPeriod) * parseFloat(previewDuration)).toFixed(3)}s`;
                          const isAuraLayer = idx < 2;

                          return (
                            <path
                              key={idx}
                              d={previewPathD}
                              stroke={activeFlowColor}
                              strokeWidth={Math.max(1.2, previewParticleSz * grad.widthMul)}
                              fill="none"
                              style={{
                                strokeDasharray: `${segLen} ${segGap}`,
                                animation: `${previewDir} ${previewDuration}s linear ${segDelay} infinite`,
                                opacity: grad.opacityMul * previewGlow,
                                filter: isAuraLayer ? 'url(#preview-glow-filter)' : undefined,
                                strokeLinecap: 'round',
                              }}
                            />
                          );
                        })}

                        {/* Leading Photon Head */}
                        <path
                          d={previewPathD}
                          stroke="#ffffff"
                          strokeWidth={previewParticleSz * 1.35}
                          fill="none"
                          style={{
                            strokeDasharray: `${previewParticleSz} ${previewPeriod - previewParticleSz}`,
                            animation: `${previewDir} ${previewDuration}s linear ${
                              isReverse
                                ? '0s'
                                : `${-(((previewTrailLen - previewParticleSz) / previewPeriod) * parseFloat(previewDuration)).toFixed(3)}s`
                            } infinite`,
                            opacity: 1,
                            filter: `drop-shadow(0 0 ${4 * previewGlow}px #ffffff) drop-shadow(0 0 ${8 * previewGlow}px ${activeFlowColor})`,
                            strokeLinecap: 'round',
                          }}
                        />
                      </>
                    )}

                    {/* 2. Neon Flow (Whole Line Gradient Shift) */}
                    {currentStyle === 'neon_flow' && (
                      <>
                        {/* Outer Glow Bloom */}
                        <path
                          d={previewPathD}
                          stroke="url(#preview-neon-grad)"
                          strokeWidth={previewParticleSz * 2.2}
                          fill="none"
                          style={{
                            opacity: 0.65 * previewGlow,
                            filter: 'url(#preview-glow-filter)',
                            animation: `conn-neon-aura-breath ${(parseFloat(previewDuration) * 0.9).toFixed(2)}s ease-in-out infinite`,
                            strokeLinecap: 'round',
                          }}
                        />
                        {/* Core Neon Tube */}
                        <path
                          d={previewPathD}
                          stroke="url(#preview-neon-grad)"
                          strokeWidth={Math.max(2, previewParticleSz * 0.95)}
                          fill="none"
                          style={{
                            opacity: 0.95,
                            filter: `drop-shadow(0 0 ${4 * previewGlow}px ${activeFlowColor})`,
                            strokeLinecap: 'round',
                          }}
                        />
                        {/* Bright Filament */}
                        <path
                          d={previewPathD}
                          stroke="#ffffff"
                          strokeWidth={Math.max(1, previewParticleSz * 0.3)}
                          fill="none"
                          style={{
                            opacity: 0.8,
                            strokeLinecap: 'round',
                          }}
                        />
                      </>
                    )}

                    {/* 3. Pulse (Whole Line Breathing) */}
                    {currentStyle === 'pulse' && (
                      <>
                        <path
                          d={previewPathD}
                          stroke={activeFlowColor}
                          strokeWidth={previewParticleSz * 2.4}
                          fill="none"
                          style={{
                            animation: `conn-whole-line-pulse ${(parseFloat(previewDuration) * 0.85).toFixed(2)}s ease-in-out infinite`,
                            opacity: 0.75 * previewGlow,
                            filter: 'url(#preview-glow-filter)',
                            strokeLinecap: 'round',
                          }}
                        />
                        <path
                          d={previewPathD}
                          stroke={activeFlowColor}
                          strokeWidth={Math.max(2, previewParticleSz * 1.15)}
                          fill="none"
                          style={{
                            animation: `conn-whole-line-pulse ${(parseFloat(previewDuration) * 0.85).toFixed(2)}s ease-in-out infinite`,
                            opacity: 0.9,
                            strokeLinecap: 'round',
                          }}
                        />
                        <path
                          d={previewPathD}
                          stroke="#ffffff"
                          strokeWidth={Math.max(1.2, previewParticleSz * 0.4)}
                          fill="none"
                          style={{
                            animation: `conn-pulse-core ${(parseFloat(previewDuration) * 0.85).toFixed(2)}s ease-in-out infinite`,
                            opacity: 0.9,
                            strokeLinecap: 'round',
                          }}
                        />
                      </>
                    )}

                    {/* 4. Shimmer (Whole Line Sparkling) */}
                    {currentStyle === 'shimmer' && (
                      <>
                        <path
                          d={previewPathD}
                          stroke={activeFlowColor}
                          strokeWidth={previewParticleSz * 1.8}
                          fill="none"
                          style={{
                            animation: `conn-whole-line-shimmer ${(parseFloat(previewDuration) * 0.7).toFixed(2)}s ease-in-out infinite`,
                            opacity: 0.9 * previewGlow,
                            filter: 'url(#preview-glow-filter)',
                            strokeLinecap: 'round',
                          }}
                        />
                        <path
                          d={previewPathD}
                          stroke="#ffffff"
                          strokeWidth={Math.max(1.2, previewParticleSz * 0.5)}
                          fill="none"
                          style={{
                            animation: `conn-shimmer-core ${(parseFloat(previewDuration) * 0.5).toFixed(2)}s ease-in-out infinite`,
                            opacity: 0.95,
                            strokeLinecap: 'round',
                          }}
                        />
                      </>
                    )}

                    {/* 5. Particle Stream */}
                    {currentStyle === 'particle_stream' && (
                      <path
                        d={previewPathD}
                        stroke={activeFlowColor}
                        strokeWidth={previewParticleSz}
                        fill="none"
                        style={{
                          ['--conn-period' as any]: `${streamPeriod}px`,
                          strokeDasharray: `${previewParticleSz} ${streamGap}`,
                          animation: `${previewDir} ${(parseFloat(previewDuration) * 0.65).toFixed(2)}s linear infinite`,
                          opacity: 0.95 * previewGlow,
                          strokeLinecap: 'round',
                          filter: `drop-shadow(0 0 ${4 * previewGlow}px ${activeFlowColor})`,
                        }}
                      />
                    )}

                    {/* 6. Energy Beam */}
                    {currentStyle === 'energy_beam' && (
                      <>
                        <path
                          d={previewPathD}
                          stroke={activeFlowColor}
                          strokeWidth={previewParticleSz * 1.4}
                          fill="none"
                          style={{
                            strokeDasharray: `${previewTrailLen} ${previewGap}`,
                            animation: `${previewDir} ${(parseFloat(previewDuration) * 0.55).toFixed(2)}s linear infinite, conn-beam-surge 1.4s ease-in-out infinite`,
                            opacity: 0.9 * previewGlow,
                            strokeLinecap: 'round',
                            filter: `drop-shadow(0 0 ${8 * previewGlow}px ${activeFlowColor})`,
                          }}
                        />
                        <path
                          d={previewPathD}
                          stroke="#ffffff"
                          strokeWidth={Math.max(1.5, previewParticleSz * 0.5)}
                          fill="none"
                          style={{
                            strokeDasharray: `${previewTrailLen * 0.65} ${previewGap + previewTrailLen * 0.35}`,
                            animation: `${previewDir} ${(parseFloat(previewDuration) * 0.55).toFixed(2)}s linear ${
                              isReverse ? '0s' : `${-(((previewTrailLen * 0.35) / previewPeriod) * (parseFloat(previewDuration) * 0.55)).toFixed(3)}s`
                            } infinite`,
                            opacity: 1,
                            strokeLinecap: 'round',
                          }}
                        />
                      </>
                    )}

                    {/* 7. Classic */}
                    {currentStyle === 'classic' && (
                      <path
                        d={previewPathD}
                        stroke={activeFlowColor}
                        strokeWidth="3"
                        fill="none"
                        style={{
                          ['--conn-period' as any]: `${classicPeriod}px`,
                          strokeDasharray: '8 48',
                          animation: `${previewDir} ${previewDuration}s linear infinite`,
                          opacity: 0.85,
                          strokeLinecap: 'round',
                        }}
                      />
                    )}
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Theme Selector Badges ("Плашки смены тем") */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-300">
                {t('settings.connectionThemesLabel' as any) || 'Темы оформления связей (Style Themes)'}
              </label>
              <span className="text-[10px] text-gray-400">
                {CONNECTION_THEMES.length} {t('settings.connectionAvailableThemes' as any) || 'доступных тем'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONNECTION_THEMES.map((themeOption) => {
                const isSelected = currentStyle === themeOption.id;
                return (
                  <button
                    key={themeOption.id}
                    type="button"
                    onClick={() => handleSelectTheme(themeOption.id)}
                    className={`relative p-2.5 rounded-lg text-left transition-all flex flex-col justify-between border select-none group ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400'
                        : 'bg-gray-800/80 hover:bg-gray-800 border-gray-700/80 hover:border-gray-600 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {/* Top row: Indicator dot & badge */}
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125"
                          style={{
                            backgroundColor: themeOption.accentColor,
                            boxShadow: isSelected ? `0 0 8px ${themeOption.accentColor}` : 'none',
                          }}
                        />
                        <span className={`text-xs font-semibold ${isSelected ? 'text-cyan-200' : 'text-gray-200'}`}>
                          {t(themeOption.titleKey as any) || themeOption.id}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                      {t(themeOption.descKey as any) || 'Анимационный эффект линии'}
                    </p>

                    {/* Bottom Tag */}
                    <div className="mt-2 pt-1.5 border-t border-gray-700/40 flex items-center justify-between">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'bg-gray-900/60 text-gray-400'}`}>
                        {t(themeOption.badgeKey as any) || themeOption.previewType}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animation Parameters fine tuning tailored to the selected animation style */}
          <div className="space-y-3 p-3 bg-gray-950/80 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>{t('settings.connectionFineTuning' as any) || 'Параметры анимации (Fine Tuning)'}</span>
              </div>
              {isWholeLine && (
                <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                  Whole-Line Sync
                </span>
              )}
            </div>

            {/* Whole-line notice badge if active */}
            {currentStyle === 'neon_flow' && (
              <div className="p-2 rounded bg-pink-950/40 border border-pink-800/40 text-[10px] text-pink-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse shrink-0" />
                <span>{t('settings.connectionNeonFlowDesc' as any) || 'Плавный градиентный перелив вдоль всей непрерывной линии'}</span>
              </div>
            )}
            {currentStyle === 'pulse' && (
              <div className="p-2 rounded bg-sky-950/40 border border-sky-800/40 text-[10px] text-sky-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                <span>{t('settings.connectionPulseDesc' as any) || 'Синхронная ритмичная пульсация и дыхание всей линии целиком'}</span>
              </div>
            )}
            {currentStyle === 'shimmer' && (
              <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-[10px] text-amber-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span>{t('settings.connectionShimmerDesc' as any) || 'Мерцающее люминесцентное сияние и искры по всей нити'}</span>
              </div>
            )}

            {/* 1. Speed Slider & Preset Buttons */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">
                  {currentStyle === 'neon_flow'
                    ? (t('settings.connectionSpeedShift' as any) || 'Скорость перелива градиента (Shift Speed)')
                    : currentStyle === 'pulse'
                    ? (t('settings.connectionSpeedPulse' as any) || 'Скорость пульсации (Pulse Speed)')
                    : currentStyle === 'shimmer'
                    ? (t('settings.connectionSpeedShimmer' as any) || 'Скорость мерцания (Shimmer Speed)')
                    : (t('settings.connectionSpeed' as any) || 'Скорость движения (Speed)')}
                </span>
                <span className="font-mono text-cyan-400 font-medium">{config.speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="4.0"
                step="0.05"
                value={config.speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex gap-1 justify-between pt-0.5">
                {[0.5, 1.0, 1.5, 2.0, 3.0].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => handleSpeedChange(spd)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                      Math.abs(config.speed - spd) < 0.05
                        ? 'bg-cyan-900 text-cyan-300 border border-cyan-600'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Frequency / Density (For pulse, shimmer, cyber_tron, particle_stream, energy_beam) */}
            {!isWholeLine && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">
                    {currentStyle === 'cyber_tron'
                      ? (t('settings.connectionFrequencyTron' as any) || 'Частота импульсов фотона (Pulse Frequency)')
                      : (t('settings.connectionFrequency' as any) || 'Частота / Плотность частиц (Frequency)')}
                  </span>
                  <span className="font-mono text-cyan-400 font-medium">{config.frequency}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={config.frequency}
                  onChange={(e) => handleFrequencyChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            )}

            {/* 3. Trail Length (Only for non-whole-line styles: cyber_tron, particle_stream, energy_beam) */}
            {!isWholeLine && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <span>{t('settings.connectionTrailLength' as any) || 'Длина светового следа (Trail Length)'}</span>
                    {currentStyle === 'cyber_tron' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono">
                        8-10 градаций
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-cyan-400 font-medium">{config.trailLength} px</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="250"
                  step="5"
                  value={config.trailLength}
                  onChange={(e) => handleTrailLengthChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            )}

            {/* 4. Particle Size / Beam Thickness */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">
                  {isWholeLine 
                    ? (t('settings.connectionBeamThickness' as any) || 'Толщина линии и ореола (Beam Width)')
                    : currentStyle === 'cyber_tron'
                    ? (t('settings.connectionPhotonHeadSize' as any) || 'Размер ведущего фотона (Photon Head Size)')
                    : (t('settings.connectionParticleSize' as any) || 'Размер фотона / точки (Particle Size)')}
                </span>
                <span className="font-mono text-cyan-400 font-medium">{config.particleSize} px</span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                step="0.5"
                value={config.particleSize}
                onChange={(e) => handleParticleSizeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 5. Glow Bloom Intensity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">{t('settings.connectionGlowBloom' as any) || 'Интенсивность свечения (Glow Bloom)'}</span>
                <span className="font-mono text-cyan-400 font-medium">{Math.round((config.glowIntensity ?? 0.8) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.glowIntensity ?? 0.8}
                onChange={(e) => handleGlowIntensityChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 6. Flow Direction (Applicable to moving styles and gradient shift neon_flow) */}
            {currentStyle !== 'pulse' && currentStyle !== 'shimmer' && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs text-gray-400 block">
                  {currentStyle === 'neon_flow'
                    ? (t('settings.connectionShiftDirection' as any) || 'Направление перелива градиента')
                    : (t('settings.connectionFlowDirection' as any) || 'Направление движения потока')}
                </span>
                <div className="flex bg-gray-800 rounded-md p-1 border border-gray-700">
                  <button
                    type="button"
                    onClick={() => handleFlowDirectionChange('forward')}
                    className={`flex-1 py-1 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                      config.flowDirection === 'forward'
                        ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-600/60 shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>{t('settings.connectionFlowForward' as any) || 'Вперед (Out ➔ In)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFlowDirectionChange('reverse')}
                    className={`flex-1 py-1 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                      config.flowDirection === 'reverse'
                        ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-600/60 shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>{t('settings.connectionFlowReverse' as any) || 'Назад (In ➔ Out)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Color Mode Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">
              {t('settings.connectionColorPalette' as any) || 'Цветовая гамма потока (Color Palette)'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CONNECTION_COLOR_MODES.map((colOption) => {
                const isColActive = config.colorMode === colOption.id;
                return (
                  <button
                    key={colOption.id}
                    type="button"
                    onClick={() => handleColorModeChange(colOption.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
                      isColActive
                        ? 'bg-cyan-950 text-cyan-200 border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200 border-gray-700'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30"
                      style={{ background: colOption.previewColor }}
                    />
                    <span>{t(colOption.titleKey as any) || colOption.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Base Track Opacity & Routing Style */}
          <div className="space-y-3 pt-2 border-t border-gray-800/80">
            {/* Opacity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{t('settings.connectionBaseTrackOpacity' as any) || 'Прозрачность фоновой линии связей'}</span>
                <span className="font-mono text-cyan-400">{Math.round(connectionOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={connectionOpacity}
                onChange={(e) => setConnectionOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Line Style: Orthogonal vs Curved */}
            <div className="space-y-1.5">
              <span className="text-xs text-gray-400 block">{t('settings.connectionGeometry' as any) || 'Геометрия линий связей'}</span>
              <div className="flex bg-gray-800 rounded-md p-1 border border-gray-700">
                <button
                  type="button"
                  onClick={() => setLineStyle('spaghetti')}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                    lineStyle === 'spaghetti'
                      ? 'bg-gray-700 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t('settings.connectionLineCurved' as any) || t('canvas.lineStyle.curved' as any) || 'Сглаженные кривые'}
                </button>
                <button
                  type="button"
                  onClick={() => setLineStyle('orthogonal')}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                    lineStyle === 'orthogonal'
                      ? 'bg-gray-700 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t('settings.connectionLineOrthogonal' as any) || t('canvas.lineStyle.orthogonal' as any) || 'Ортогональные (Сетка)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
