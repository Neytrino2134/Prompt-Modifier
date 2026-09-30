import React from 'react';
import {
  X,
  RotateCcw,
  Check,
  SlidersHorizontal,
  Sparkles,
  Zap,
  Circle,
  Grid,
  CornerDownRight,
  Activity,
  Maximize2,
  Gauge,
  Layers,
} from 'lucide-react';
import { useAppContext } from '../../../contexts/AppContext';
import { useLanguage } from '../../../localization';
import { PanelAnimationBackground } from './PanelAnimationBackground';
import {
  BubbleAnimationConfig,
  CyberGridAnimationConfig,
  DEFAULT_BUBBLE_CONFIG,
  DEFAULT_CYBER_CONFIG,
} from './panelAnimationDefinitions';

export const PanelAnimationConfigDialog: React.FC = () => {
  const {
    currentTheme,
    panelAnimation,
    setPanelAnimation,
    isPanelAnimationAdaptive,
    panelAnimationConfig,
    updatePanelAnimationConfig,
    resetPanelAnimationConfig,
    isPanelAnimationConfigOpen,
    setIsPanelAnimationConfigOpen,
    panelAnimationConfigActiveTab,
    setPanelAnimationConfigActiveTab,
  } = useAppContext();

  const { t } = useLanguage();

  if (!isPanelAnimationConfigOpen) {
    return null;
  }

  const bubbleCfg: BubbleAnimationConfig = {
    ...DEFAULT_BUBBLE_CONFIG,
    ...panelAnimationConfig.shapes_bubbles,
  };

  const cyberCfg: CyberGridAnimationConfig = {
    ...DEFAULT_CYBER_CONFIG,
    ...panelAnimationConfig.shapes_cyber,
  };

  const isCurrentActiveTabActiveInApp =
    panelAnimation === panelAnimationConfigActiveTab;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in select-none"
      onClick={() => setIsPanelAnimationConfigOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl bg-gray-900/95 border border-cyan-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] text-gray-100 ring-1 ring-cyan-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-gray-100">
                {t('settings.panelAnimation.configTitle' as any) ||
                  'Параметры анимации панели'}
              </h3>
              <p className="text-xs text-gray-400">
                {t('settings.panelAnimation.configSubtitle' as any) ||
                  'Точная процедурная настройка частоты, размеров, скоростей и поведения'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPanelAnimationConfigOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
            title={t('common.close' as any) || 'Закрыть'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector for Configurable Animations */}
        <div className="flex items-center gap-2 px-5 pt-3.5 pb-2 bg-gray-950/40 border-b border-gray-800/80">
          <button
            onClick={() => setPanelAnimationConfigActiveTab('shapes_bubbles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              panelAnimationConfigActiveTab === 'shapes_bubbles'
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-gray-800/60 border border-gray-700/60 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <Circle size={14} className="text-cyan-400" />
            <span>
              {t('settings.panelAnimation.shapes_bubbles' as any) ||
                '🫧 Пузырьки (Bubbles)'}
            </span>
            {panelAnimation === 'shapes_bubbles' && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {t('settings.panelAnimation.activeBadge' as any) || 'Активна'}
              </span>
            )}
          </button>

          <button
            onClick={() => setPanelAnimationConfigActiveTab('shapes_cyber')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              panelAnimationConfigActiveTab === 'shapes_cyber'
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-gray-800/60 border border-gray-700/60 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <Zap size={14} className="text-amber-400" />
            <span>
              {t('settings.panelAnimation.shapes_cyber' as any) ||
                '⚡ Кибер-сетка (Cyber Grid)'}
            </span>
            {panelAnimation === 'shapes_cyber' && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {t('settings.panelAnimation.activeBadge' as any) || 'Активна'}
              </span>
            )}
          </button>

          <div className="ml-auto">
            {!isCurrentActiveTabActiveInApp && (
              <button
                onClick={() => setPanelAnimation(panelAnimationConfigActiveTab)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all"
              >
                <Check size={13} />
                <span>
                  {t('settings.panelAnimation.applyAsActive' as any) ||
                    'Выбрать как активную'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Live Interactive Preview Box */}
        <div className="px-5 pt-3">
          <div className="relative h-12 w-full rounded-lg border border-gray-700/70 bg-gray-950/80 overflow-hidden shadow-inner flex items-center justify-between px-3">
            <PanelAnimationBackground
              animation={panelAnimationConfigActiveTab}
              theme={currentTheme}
              isAdaptive={isPanelAnimationAdaptive}
              previewMode={false}
              config={panelAnimationConfig}
            />
            <div className="relative z-10 flex items-center justify-between w-full pointer-events-none text-xs text-gray-400">
              <span className="font-mono text-[11px] text-gray-300/80 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-cyan-400 animate-pulse" />
                {t('settings.panelAnimation.preview' as any) || 'Живой предпросмотр панели'}
              </span>
              <span className="text-[10px] text-gray-400/80 bg-gray-900/80 px-2 py-0.5 rounded border border-gray-700/50">
                {panelAnimationConfigActiveTab === 'shapes_bubbles' ? 'Bubbles Engine' : 'Photon Matrix Engine'}
              </span>
            </div>
          </div>
        </div>

        {/* Sliders and Controls Container */}
        <div className="px-5 py-4 overflow-y-auto space-y-4 max-h-[52vh] custom-scrollbar">
          {panelAnimationConfigActiveTab === 'shapes_bubbles' && (
            <div className="space-y-3.5">
              {/* Count / Density */}
              <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-medium flex items-center gap-1.5">
                    <Activity size={13} className="text-cyan-400" />
                    {t('settings.panelAnimation.bubbles.count' as any) || 'Количество пузырьков (Частота)'}
                  </span>
                  <span className="text-cyan-300 font-mono text-xs">{bubbleCfg.count} шт.</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="40"
                  step="1"
                  value={bubbleCfg.count}
                  onChange={(e) =>
                    updatePanelAnimationConfig('shapes_bubbles', {
                      count: Number(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Base Size & Size Variance Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Maximize2 size={13} className="text-cyan-400" />
                      {t('settings.panelAnimation.bubbles.baseSize' as any) || 'Базовый размер'}
                    </span>
                    <span className="text-cyan-300 font-mono text-xs">{bubbleCfg.baseSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="90"
                    step="1"
                    value={bubbleCfg.baseSize}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_bubbles', {
                        baseSize: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Layers size={13} className="text-cyan-400" />
                      {t('settings.panelAnimation.bubbles.sizeVariance' as any) || 'Разброс размеров'}
                    </span>
                    <span className="text-cyan-300 font-mono text-xs">±{bubbleCfg.sizeVariance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={bubbleCfg.sizeVariance}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_bubbles', {
                        sizeVariance: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Base Speed & Speed Variance Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Gauge size={13} className="text-cyan-400" />
                      {t('settings.panelAnimation.bubbles.baseSpeed' as any) || 'Базовая скорость'}
                    </span>
                    <span className="text-cyan-300 font-mono text-xs">{bubbleCfg.baseSpeed} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="60"
                    step="1"
                    value={bubbleCfg.baseSpeed}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_bubbles', {
                        baseSpeed: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Layers size={13} className="text-cyan-400" />
                      {t('settings.panelAnimation.bubbles.speedVariance' as any) || 'Разброс скоростей'}
                    </span>
                    <span className="text-cyan-300 font-mono text-xs">±{bubbleCfg.speedVariance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={bubbleCfg.speedVariance}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_bubbles', {
                        speedVariance: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Opacity & Wobble Amplitude Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Sparkles size={13} className="text-cyan-400" />
                      {t('settings.panelAnimation.bubbles.opacity' as any) || 'Интенсивность и свечение'}
                    </span>
                    <span className="text-cyan-300 font-mono text-xs">{Math.round(bubbleCfg.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={bubbleCfg.opacity}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_bubbles', {
                        opacity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <CornerDownRight size={13} className="text-cyan-400" />
                      {t('settings.panelAnimation.bubbles.wobbleAmp' as any) || 'Амплитуда покачивания'}
                    </span>
                    <span className="text-cyan-300 font-mono text-xs">{bubbleCfg.wobbleAmp} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={bubbleCfg.wobbleAmp}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_bubbles', {
                        wobbleAmp: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {panelAnimationConfigActiveTab === 'shapes_cyber' && (
            <div className="space-y-3.5">
              {/* Density / Count */}
              <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-medium flex items-center gap-1.5">
                    <Activity size={13} className="text-amber-400" />
                    {t('settings.panelAnimation.cyber.count' as any) || 'Количество фотонных трассеров (Частота)'}
                  </span>
                  <span className="text-amber-300 font-mono text-xs">{cyberCfg.count} шт.</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={cyberCfg.count}
                  onChange={(e) =>
                    updatePanelAnimationConfig('shapes_cyber', {
                      count: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Grid Width & Height Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Grid size={13} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.gridWidth' as any) || 'Размер сетки (Ширина ячейки)'}
                    </span>
                    <span className="text-amber-300 font-mono text-xs">{cyberCfg.gridWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="80"
                    step="2"
                    value={cyberCfg.gridWidth}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        gridWidth: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Grid size={13} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.gridHeight' as any) || 'Размер сетки (Высота ячейки)'}
                    </span>
                    <span className="text-amber-300 font-mono text-xs">{cyberCfg.gridHeight} px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="40"
                    step="2"
                    value={cyberCfg.gridHeight}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        gridHeight: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Point Head Size & Size Variance Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Circle size={13} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.baseSize' as any) || 'Размер фотонной точки'}
                    </span>
                    <span className="text-amber-300 font-mono text-xs">{cyberCfg.baseSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.2"
                    value={cyberCfg.baseSize}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        baseSize: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Layers size={13} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.sizeVariance' as any) || 'Разброс размера точек'}
                    </span>
                    <span className="text-amber-300 font-mono text-xs">±{cyberCfg.sizeVariance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={cyberCfg.sizeVariance}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        sizeVariance: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Base Speed & Speed Variance Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Gauge size={13} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.baseSpeed' as any) || 'Базовая скорость'}
                    </span>
                    <span className="text-amber-300 font-mono text-xs">{cyberCfg.baseSpeed} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="360"
                    step="10"
                    value={cyberCfg.baseSpeed}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        baseSpeed: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Layers size={13} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.speedVariance' as any) || 'Разброс скоростей'}
                    </span>
                    <span className="text-amber-300 font-mono text-xs">±{cyberCfg.speedVariance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={cyberCfg.speedVariance}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        speedVariance: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Trail Length & Trail Opacity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <CornerDownRight size={13} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.tailLength' as any) || 'Длина шлейфа (Trail)'}
                    </span>
                    <span className="text-amber-300 font-mono text-xs">{cyberCfg.tailLength} px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="5"
                    value={cyberCfg.tailLength}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        tailLength: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.tailOpacity' as any) || 'Прозрачность и яркость Trail'}
                    </span>
                    <span className="text-amber-300 font-mono text-xs">{Math.round(cyberCfg.tailOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={cyberCfg.tailOpacity}
                    onChange={(e) =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        tailOpacity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Turning on Matrix Intersections (Toggle & Turn Chance) */}
              <div className="bg-gray-950/50 p-3.5 rounded-lg border border-gray-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                      <CornerDownRight size={14} className="text-amber-400" />
                      {t('settings.panelAnimation.cyber.allowTurns' as any) ||
                        'Поворот точек на перекрёстках сетки (90° Turns)'}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {t('settings.panelAnimation.cyber.allowTurnsDesc' as any) ||
                        'Позволяет фотонным импульсам менять направление на узлах матрицы с лазерным шлейфом'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updatePanelAnimationConfig('shapes_cyber', {
                        allowTurns: !cyberCfg.allowTurns,
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      cyberCfg.allowTurns ? 'bg-amber-500' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        cyberCfg.allowTurns ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {cyberCfg.allowTurns && (
                  <div className="space-y-1.5 pt-1 border-t border-gray-800/70">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">
                        {t('settings.panelAnimation.cyber.turnChance' as any) ||
                          'Вероятность поворота на узле'}
                      </span>
                      <span className="text-amber-300 font-mono text-xs">{cyberCfg.turnChance}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="95"
                      step="5"
                      value={cyberCfg.turnChance}
                      onChange={(e) =>
                        updatePanelAnimationConfig('shapes_cyber', {
                          turnChance: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 bg-gray-950/80">
          <button
            onClick={() => resetPanelAnimationConfig(panelAnimationConfigActiveTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 transition-colors"
          >
            <RotateCcw size={13} />
            <span>
              {t('settings.panelAnimation.resetPreset' as any) || 'Сбросить по умолчанию'}
            </span>
          </button>

          <button
            onClick={() => setIsPanelAnimationConfigOpen(false)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-cyan-500 hover:bg-cyan-400 text-gray-950 shadow-md transition-all font-semibold"
          >
            <Check size={14} />
            <span>{t('common.done' as any) || 'Готово'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
