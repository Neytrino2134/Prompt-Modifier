import React from 'react';
import { useLanguage } from '../../../localization';
import { useAppContext } from '../../../contexts/AppContext';
import { CustomCheckbox } from '../../CustomCheckbox';

interface NodeControlsSettingsProps {
  isCollapsed: boolean;
  onToggle: () => void;
  instantNodeClose: boolean;
  onInstantNodeCloseChange: (checked: boolean) => void;
  hoverHighlight: boolean;
  onHoverHighlightChange: (checked: boolean) => void;
  bringToFrontOnHover: boolean;
  onBringToFrontOnHoverChange: (checked: boolean) => void;
  animMode: string;
  onAnimModeChange: (mode: string) => void;
}

const animModeKeyMap: Record<string, string> = {
  pulse: 'pulse',
  'blade-runner': 'bladeRunner',
  none: 'none',
};

export const NodeControlsSettings: React.FC<NodeControlsSettingsProps> = ({
  isCollapsed,
  onToggle,
  instantNodeClose,
  onInstantNodeCloseChange,
  hoverHighlight,
  onHoverHighlightChange,
  bringToFrontOnHover,
  onBringToFrontOnHoverChange,
  animMode,
  onAnimModeChange,
}) => {
  const { t } = useLanguage();
  const {
    isConnectionAnimationEnabled,
    setIsConnectionAnimationEnabled,
    connectionOpacity,
    setConnectionOpacity,
  } = useAppContext();

  return (
    <div className="bg-gray-900/90 rounded-lg border border-gray-700/70 overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-800/50 transition-colors select-none group"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          </span>
          <div>
            <label className="block text-xs font-semibold text-gray-200 cursor-pointer">
              {t('settings.nodeControlsSubpanel')}
            </label>
            {isCollapsed && (
              <p className="text-[10px] text-gray-400 leading-tight">
                {t(`dialog.settings.anim.${animModeKeyMap[animMode] || animMode}` as any)} • {Math.round(connectionOpacity * 100)}%
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-gray-800 text-gray-300 border border-gray-700">
            {t(`dialog.settings.anim.${animModeKeyMap[animMode] || animMode}` as any)}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-transform duration-200 ${!isCollapsed ? 'rotate-180 text-amber-400' : 'rotate-0'}`}
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
        <div className="px-3 pb-3 space-y-3.5 border-t border-gray-800/60 pt-3">
          {/* Animation Mode */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400">
              {t('dialog.settings.animationModeLabel')}
            </label>
            <div className="flex bg-gray-800 rounded-md p-1 border border-gray-700">
              {['pulse', 'blade-runner', 'none'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onAnimModeChange(mode)}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${animMode === mode ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {t(`dialog.settings.anim.${animModeKeyMap[mode] || mode}` as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Node behavior checkboxes */}
          <div className="flex flex-col gap-2 pt-0.5">
            <CustomCheckbox
              id="instantNodeClose"
              checked={instantNodeClose}
              onChange={onInstantNodeCloseChange}
              label={t('dialog.settings.instantNodeCloseLabel')}
              className="text-sm text-gray-400"
            />
            <CustomCheckbox
              id="hoverHighlight"
              checked={hoverHighlight}
              onChange={onHoverHighlightChange}
              label={t('dialog.settings.hoverHighlightLabel')}
              className="text-sm text-gray-400"
            />
            <CustomCheckbox
              id="bringToFrontOnHover"
              checked={bringToFrontOnHover}
              onChange={onBringToFrontOnHoverChange}
              label={t('dialog.settings.bringToFrontOnHoverLabel')}
              className="text-sm text-gray-400"
            />
          </div>

          {/* Connection Settings */}
          <div className="space-y-1.5 pt-1 border-t border-gray-800/70">
            <label className="block text-xs font-medium text-gray-400">
              {t('dialog.settings.connectionsLabel')}
            </label>
            <div className="flex flex-col gap-2 p-2.5 bg-gray-800 rounded-md border border-gray-700">
              <CustomCheckbox
                id="connectionAnimation"
                checked={isConnectionAnimationEnabled}
                onChange={setIsConnectionAnimationEnabled}
                label={t('dialog.settings.connectionAnimationLabel')}
                className="text-sm text-gray-300"
              />
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{t('dialog.settings.connectionOpacityLabel')}</span>
                  <span>{Math.round(connectionOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={connectionOpacity}
                  onChange={(e) => setConnectionOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
