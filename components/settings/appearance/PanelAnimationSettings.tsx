import React from 'react';
import { useLanguage } from '../../../localization';
import { useAppContext } from '../../../contexts/AppContext';
import { CustomCheckbox } from '../../CustomCheckbox';
import { PANEL_ANIMATION_GROUPS } from './panelAnimationDefinitions';
import { PanelAnimationBackground } from './PanelAnimationBackground';
import { PanelAnimation } from '../../../types';

interface PanelAnimationSettingsProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const PanelAnimationSettings: React.FC<PanelAnimationSettingsProps> = ({
  isCollapsed,
  onToggle,
}) => {
  const { t } = useLanguage();
  const {
    currentTheme,
    panelAnimation,
    setPanelAnimation,
    isPanelAnimationAdaptive,
    setIsPanelAnimationAdaptive,
  } = useAppContext();

  const getGroupIcon = (icon: string) => {
    switch (icon) {
      case 'sparkles':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      case 'shapes':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" stroke="currentColor" />
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const getOptionIcon = (iconName: string, isSelected: boolean) => {
    switch (iconName) {
      case 'pulse':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'breath':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.5" />
          </svg>
        );
      case 'wave':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12c3-4 6-4 9 0s6 4 9 0M3 17c3-4 6-4 9 0s6 4 9 0" />
          </svg>
        );
      case 'aurora':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'neon':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        );
      case 'shimmer':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
        );
      case 'bubbles':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="8" cy="14" r="5" stroke="currentColor" />
            <circle cx="17" cy="9" r="4" stroke="currentColor" />
            <circle cx="14" cy="17" r="2.5" fill="currentColor" opacity="0.6" />
          </svg>
        );
      case 'ocean':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7 0M2 18c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7 0" />
          </svg>
        );
      case 'geometry':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polygon points="12 2 2 7 12 12 22 7 12 2" stroke="currentColor" />
            <polyline points="2 17 12 22 22 17" stroke="currentColor" />
            <polyline points="2 12 12 17 22 12" stroke="currentColor" />
          </svg>
        );
      case 'techno':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" />
            <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.6" />
            <line x1="9" y1="1" x2="9" y2="4" stroke="currentColor" />
            <line x1="15" y1="1" x2="15" y2="4" stroke="currentColor" />
            <line x1="9" y1="20" x2="9" y2="23" stroke="currentColor" />
            <line x1="15" y1="20" x2="15" y2="23" stroke="currentColor" />
          </svg>
        );
      case 'cyber':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="2" x2="2" y2="22" stroke="currentColor" />
            <line x1="12" y1="2" x2="22" y2="22" stroke="currentColor" />
            <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" />
            <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" />
            <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" />
          </svg>
        );
      case 'nature':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 21l7.03-3.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z" />
            <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" />
          </svg>
        );
      case 'space':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.6" />
            <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-30 12 12)" stroke="currentColor" />
            <circle cx="19" cy="5" r="1.5" fill="currentColor" />
          </svg>
        );
      case 'none':
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-gray-900/90 rounded-lg border border-gray-700/70 overflow-hidden transition-all">
      {/* Header Accordion Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-800/50 transition-colors select-none group"
      >
        <div className="flex items-center gap-2">
          <span className="text-accent group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <div>
            <label className="block text-xs font-semibold text-gray-200 cursor-pointer">
              {t('settings.panelAnimationLabel')}
            </label>
            {isCollapsed && (
              <p className="text-[10px] text-gray-400 leading-tight">
                {t(`settings.panelAnimation.${panelAnimation}` as any)}
                {isPanelAnimationAdaptive && (
                  <span className="ml-1.5 text-accent/90">
                    ({t('settings.panelAnimationAdaptiveLabel')})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium flex-shrink-0 bg-accent/20 text-accent border border-accent/30">
            {t(`settings.panelAnimation.${panelAnimation}` as any)}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-transform duration-200 ${
              !isCollapsed ? 'rotate-180 text-accent' : 'rotate-0'
            }`}
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
        <div className="px-3 pb-3 space-y-3.5 border-t border-gray-800/60 pt-2.5">
          <p className="text-[11px] text-gray-400 leading-tight">
            {t('settings.panelAnimationDesc')}
          </p>

          {/* Theme Adaptive Switch */}
          <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <CustomCheckbox
                id="panelAnimationAdaptiveToggle"
                checked={isPanelAnimationAdaptive}
                onChange={setIsPanelAnimationAdaptive}
                label={t('settings.panelAnimationAdaptiveLabel')}
                className="text-xs font-semibold text-gray-200"
              />
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  isPanelAnimationAdaptive
                    ? 'bg-accent/20 text-accent border border-accent/40'
                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                }`}
              >
                {isPanelAnimationAdaptive ? t('common.enabled') : t('common.disabled')}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 pl-6 leading-relaxed">
              {t('settings.panelAnimationAdaptiveDesc')}
            </p>
          </div>

          {/* Grouped Panel Animation Categories */}
          <div className="space-y-3 pt-0.5">
            {PANEL_ANIMATION_GROUPS.map((group) => (
              <div key={group.id} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-0.5">
                  {getGroupIcon(group.icon)}
                  <span className="text-[11px] font-semibold text-gray-300 tracking-wide">
                    {t(group.titleKey as any)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {group.items.map((opt) => {
                    const isSelected = panelAnimation === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPanelAnimation(opt.id)}
                        className={`relative group/item overflow-hidden flex items-start gap-2.5 p-2 rounded-lg text-left transition-all border outline-none focus:outline-none ${
                          isSelected
                            ? 'bg-gray-900 border-accent text-white shadow-sm ring-1 ring-accent/40'
                            : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-700/60 hover:border-gray-600 hover:text-white'
                        }`}
                      >
                        {/* Live Micro Background Preview Layer */}
                        <div className="absolute inset-0 opacity-40 group-hover/item:opacity-65 transition-opacity pointer-events-none overflow-hidden rounded-lg">
                          <PanelAnimationBackground
                            animation={opt.id}
                            theme={currentTheme}
                            isAdaptive={isPanelAnimationAdaptive}
                            previewMode={true}
                          />
                        </div>

                        {/* Icon Container */}
                        <div
                          className={`relative z-10 p-1.5 rounded-md flex-shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? 'bg-accent text-white shadow-sm shadow-accent/40'
                              : 'bg-gray-900/80 border border-gray-700 text-gray-400 group-hover/item:text-gray-200'
                          }`}
                        >
                          {getOptionIcon(opt.iconName, isSelected)}
                        </div>

                        {/* Text Information */}
                        <div className="relative z-10 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-semibold truncate ${
                                isSelected ? 'text-accent' : 'text-gray-200'
                              }`}
                            >
                              {t(opt.labelKey as any)}
                            </span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
                            )}
                          </div>
                          <p
                            className={`text-[10px] leading-tight mt-0.5 line-clamp-2 ${
                              isSelected ? 'text-gray-200' : 'text-gray-400'
                            }`}
                          >
                            {t(opt.descKey as any)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
