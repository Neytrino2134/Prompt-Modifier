import React, { useState } from 'react';
import { useLanguage } from '../../../localization';
import { useAppContext } from '../../../contexts/AppContext';
import { Theme, CanvasColorMode, InputColorMode } from '../../../types';

export interface ThemeDefinition {
  id: Theme;
  color: string;
  secondaryColor: string;
  bgColor: string;
  inputBgColor?: string;
  labelKey: string;
  fallbackLabel: string;
}

export interface ThemeGroup {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  themes: ThemeDefinition[];
}

export const THEME_GROUPS: ThemeGroup[] = [
  {
    id: 'classic',
    titleKey: 'settings.themeGroup.classic',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    themes: [
      { id: 'cyan', color: '#06b6d4', secondaryColor: '#22d3ee', bgColor: '#111827', inputBgColor: '#18202f', labelKey: 'settings.theme.cyan', fallbackLabel: 'Cyan' },
      { id: 'azure', color: '#0ea5e9', secondaryColor: '#38bdf8', bgColor: '#0f172a', inputBgColor: '#172033', labelKey: 'settings.theme.azure', fallbackLabel: 'Azure' },
      { id: 'amber', color: '#f59e0b', secondaryColor: '#d97706', bgColor: '#131210', inputBgColor: '#181512', labelKey: 'settings.theme.amber', fallbackLabel: 'Amber' },
      { id: 'teal', color: '#14b8a6', secondaryColor: '#0f766e', bgColor: '#0c1517', inputBgColor: '#10201c', labelKey: 'settings.theme.teal', fallbackLabel: 'Teal' },
      { id: 'rose', color: '#f43f5e', secondaryColor: '#be123c', bgColor: '#161114', inputBgColor: '#1c1218', labelKey: 'settings.theme.rose', fallbackLabel: 'Rose' },
      { id: 'purple', color: '#a78bfa', secondaryColor: '#7c3aed', bgColor: '#111019', inputBgColor: '#171424', labelKey: 'settings.theme.purple', fallbackLabel: 'Purple' },
      { id: 'pink', color: '#f472b6', secondaryColor: '#db2777', bgColor: '#141014', inputBgColor: '#1b131b', labelKey: 'settings.theme.pink', fallbackLabel: 'Pink' },
      { id: 'red', color: '#f87171', secondaryColor: '#dc2626', bgColor: '#141012', inputBgColor: '#1b1216', labelKey: 'settings.theme.red', fallbackLabel: 'Red' },
      { id: 'orange', color: '#fb923c', secondaryColor: '#ea580c', bgColor: '#141110', inputBgColor: '#1b1613', labelKey: 'settings.theme.orange', fallbackLabel: 'Orange' },
      { id: 'lime', color: '#a3e635', secondaryColor: '#65a30d', bgColor: '#111511', inputBgColor: '#141b14', labelKey: 'settings.theme.lime', fallbackLabel: 'Lime' },
      { id: 'emerald', color: '#34d399', secondaryColor: '#059669', bgColor: '#0c1815', inputBgColor: '#10201c', labelKey: 'settings.theme.emerald', fallbackLabel: 'Emerald' },
      { id: 'gray', color: '#a1a1aa', secondaryColor: '#52525b', bgColor: '#18181b', inputBgColor: '#18181b', labelKey: 'settings.theme.gray', fallbackLabel: 'Gray' },
    ]
  },
  {
    id: 'pastel',
    titleKey: 'settings.themeGroup.pastel',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    themes: [
      { id: 'pastel_mint', color: '#5eead4', secondaryColor: '#0f766e', bgColor: '#0e171b', inputBgColor: '#101c20', labelKey: 'settings.theme.pastel_mint', fallbackLabel: 'Pastel Mint' },
      { id: 'pastel_lavender', color: '#c4b5db', secondaryColor: '#5b4b70', bgColor: '#131219', inputBgColor: '#171520', labelKey: 'settings.theme.pastel_lavender', fallbackLabel: 'Pastel Lavender' },
      { id: 'pastel_peach', color: '#ebba9e', secondaryColor: '#7d4e38', bgColor: '#161311', inputBgColor: '#1b1613', labelKey: 'settings.theme.pastel_peach', fallbackLabel: 'Pastel Peach' },
      { id: 'pastel_rose', color: '#e2afc3', secondaryColor: '#704859', bgColor: '#161214', inputBgColor: '#1c1518', labelKey: 'settings.theme.pastel_rose', fallbackLabel: 'Pastel Rose' },
      { id: 'pastel_sky', color: '#a5c6de', secondaryColor: '#3d5a73', bgColor: '#101418', inputBgColor: '#131920', labelKey: 'settings.theme.pastel_sky', fallbackLabel: 'Pastel Sky' },
      { id: 'pastel_vanilla', color: '#e8d49d', secondaryColor: '#6d5a37', bgColor: '#151410', inputBgColor: '#191812', labelKey: 'settings.theme.pastel_vanilla', fallbackLabel: 'Pastel Vanilla' },
      { id: 'pastel_sage', color: '#a8cbb3', secondaryColor: '#405d4b', bgColor: '#111613', inputBgColor: '#141b16', labelKey: 'settings.theme.pastel_sage', fallbackLabel: 'Pastel Sage' },
      { id: 'pastel_sand', color: '#e6ccb2', secondaryColor: '#78583c', bgColor: '#151311', inputBgColor: '#1a1714', labelKey: 'settings.theme.pastel_sand', fallbackLabel: 'Pastel Sand' },
    ]
  }
];

export const allThemes: ThemeDefinition[] = THEME_GROUPS.flatMap((g) => g.themes);
export const themes = allThemes;

export const ThemeAndAutoSaveSettings: React.FC = () => {
  const { t } = useLanguage();
  const { 
    currentTheme, 
    setTheme, 
    canvasColorMode,
    setCanvasColorMode,
    inputColorMode,
    setInputColorMode
  } = useAppContext();

  const [isThemesCollapsed, setIsThemesCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('settingsCollapsedAppearance_themes');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const toggleThemesCollapse = () => {
    setIsThemesCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('settingsCollapsedAppearance_themes', String(next));
      } catch (e) {
        console.error('Failed to save themes collapse state', e);
      }
      return next;
    });
  };

  const activeThemeDef = allThemes.find((th) => th.id === currentTheme) || allThemes[0];

  return (
    <div className="space-y-3.5">
      {/* 1. Canvas Background Mode Row */}
      <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700/60 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M9 21V9" />
              </svg>
            </span>
            <div>
              <label className="block text-xs font-semibold text-gray-200">
                {t('settings.canvasColorLabel' as any) || 'Фон холста'}
              </label>
              <p className="text-[10px] text-gray-400 leading-tight">
                {t('settings.canvasColorDesc' as any) || 'Режим фонового цвета рабочей области холста'}
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 self-start sm:self-auto">
            {canvasColorMode === 'static'
              ? (t('settings.canvasColor.static' as any) || 'Static')
              : (t('settings.canvasColor.dynamic' as any) || 'Dynamic')}
          </span>
        </div>

        {/* Toggle Switch Cards for Canvas Color Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Static Option */}
          <button
            type="button"
            onClick={() => setCanvasColorMode('static')}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all border outline-none focus:outline-none cursor-pointer ${
              canvasColorMode === 'static'
                ? 'bg-cyan-950/40 border-cyan-500/70 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.12)]'
                : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
            }`}
          >
            <div className="w-6 h-6 rounded-md bg-[#111827] border border-cyan-700/60 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/80" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-semibold truncate ${canvasColorMode === 'static' ? 'text-cyan-300' : 'text-gray-200'}`}>
                  {t('settings.canvasColor.static' as any) || 'Standard (Static)'}
                </span>
                {canvasColorMode === 'static' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {t('settings.canvasColor.staticDesc' as any) || 'Dark Blue / Cyan Default (#111827)'}
              </p>
            </div>
          </button>

          {/* Dynamic Option */}
          <button
            type="button"
            onClick={() => setCanvasColorMode('dynamic')}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all border outline-none focus:outline-none cursor-pointer ${
              canvasColorMode === 'dynamic'
                ? 'bg-cyan-950/40 border-cyan-500/70 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.12)]'
                : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
            }`}
          >
            <div 
              className="w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner"
              style={{ 
                backgroundColor: activeThemeDef.bgColor, 
                borderColor: activeThemeDef.color 
              }}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: activeThemeDef.color }} 
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-semibold truncate ${canvasColorMode === 'dynamic' ? 'text-cyan-300' : 'text-gray-200'}`}>
                  {t('settings.canvasColor.dynamic' as any) || 'Dynamic (Theme Matched)'}
                </span>
                {canvasColorMode === 'dynamic' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {t('settings.canvasColor.dynamicDesc' as any) || 'Adapts to the selected theme palette'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Text Fields Background Mode Row */}
      <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700/60 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </span>
            <div>
              <label className="block text-xs font-semibold text-gray-200">
                {t('settings.inputColorLabel' as any) || 'Фон текстовых полей'}
              </label>
              <p className="text-[10px] text-gray-400 leading-tight">
                {t('settings.inputColorDesc' as any) || 'Режим фонового цвета для полей ввода, текстовых областей и форм'}
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 self-start sm:self-auto">
            {inputColorMode === 'static'
              ? (t('settings.inputColor.static' as any) || 'Static')
              : (t('settings.inputColor.dynamic' as any) || 'Dynamic')}
          </span>
        </div>

        {/* Toggle Switch Cards for Text Fields Background Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Static Option */}
          <button
            type="button"
            onClick={() => setInputColorMode('static')}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all border outline-none focus:outline-none cursor-pointer ${
              inputColorMode === 'static'
                ? 'bg-cyan-950/40 border-cyan-500/70 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.12)]'
                : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
            }`}
          >
            <div className="w-6 h-6 rounded-md bg-[#18202f] border border-cyan-700/60 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/80" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-semibold truncate ${inputColorMode === 'static' ? 'text-cyan-300' : 'text-gray-200'}`}>
                  {t('settings.inputColor.static' as any) || 'Standard (Static)'}
                </span>
                {inputColorMode === 'static' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {t('settings.inputColor.staticDesc' as any) || 'Classic Dark Blue (#18202F)'}
              </p>
            </div>
          </button>

          {/* Dynamic Option */}
          <button
            type="button"
            onClick={() => setInputColorMode('dynamic')}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all border outline-none focus:outline-none cursor-pointer ${
              inputColorMode === 'dynamic'
                ? 'bg-cyan-950/40 border-cyan-500/70 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.12)]'
                : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
            }`}
          >
            <div 
              className="w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner"
              style={{ 
                backgroundColor: activeThemeDef.inputBgColor || activeThemeDef.bgColor, 
                borderColor: activeThemeDef.color 
              }}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: activeThemeDef.color }} 
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-semibold truncate ${inputColorMode === 'dynamic' ? 'text-cyan-300' : 'text-gray-200'}`}>
                  {t('settings.inputColor.dynamic' as any) || 'Dynamic (Theme Matched)'}
                </span>
                {inputColorMode === 'dynamic' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                {t('settings.inputColor.dynamicDesc' as any) || 'Adapts to the selected theme palette'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Themes Panel (Collapsible Card with Color Swatches & Family Groups) */}
      <div className="bg-gray-900/90 rounded-lg border border-gray-700/70 overflow-hidden transition-all">
        <button
          type="button"
          onClick={toggleThemesCollapse}
          className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-800/50 transition-colors select-none group"
        >
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4 5 5 0 015-5h1.26a8.96 8.96 0 011.74-3.64l.26-.26a6 6 0 018.49 8.49l-.26.26A8.96 8.96 0 0116 18.74V20a4 4 0 01-4 4H7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h.01M11 7h.01M7 11h.01" />
              </svg>
            </span>
            <div>
              <label className="block text-xs font-semibold text-gray-200 cursor-pointer">
                {t('dialog.settings.themeLabel')}
              </label>
              <p className="text-[10px] text-gray-400 leading-tight">
                {t('settings.interfaceThemeDesc' as any)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium flex items-center gap-1.5 bg-cyan-950/70 text-cyan-400 border border-cyan-800/50">
              <span 
                className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: activeThemeDef.color }}
              />
              {t(activeThemeDef.labelKey as any) || activeThemeDef.fallbackLabel}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-transform duration-200 ${!isThemesCollapsed ? 'rotate-180 text-cyan-400' : 'rotate-0'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {!isThemesCollapsed && (
          <div className="px-3 pb-3 space-y-4 border-t border-gray-800/60 pt-3">
            {THEME_GROUPS.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center gap-1.5 px-0.5">
                  {group.icon}
                  <span className="text-[11px] font-semibold text-gray-300 tracking-wide uppercase">
                    {t(group.titleKey as any)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {group.themes.map((theme) => {
                    const isSelected = currentTheme === theme.id;
                    const localized = t(theme.labelKey as any);
                    const labelText = localized && localized !== theme.labelKey ? localized : theme.fallbackLabel;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setTheme(theme.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-all outline-none focus:outline-none border cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.18)] ring-1 ring-cyan-500/40'
                            : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-750 hover:border-gray-600 hover:text-gray-100'
                        }`}
                      >
                        {/* 3-Dot Palette Swatch */}
                        <div 
                          className="flex items-center gap-1 p-1.5 rounded-md border flex-shrink-0 shadow-inner"
                          style={{ 
                            backgroundColor: theme.bgColor, 
                            borderColor: isSelected ? theme.color : 'rgba(75, 85, 99, 0.4)' 
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: theme.color }}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full opacity-85"
                            style={{ backgroundColor: theme.secondaryColor }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-semibold truncate ${isSelected ? 'text-cyan-300' : 'text-gray-200'}`}>
                              {labelText}
                            </span>
                            {isSelected && (
                              <span 
                                className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                                style={{ backgroundColor: theme.color }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {theme.color}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
