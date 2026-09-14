import React from 'react';
import { useLanguage } from '../../../localization';
import { useAppContext } from '../../../contexts/AppContext';
import { CustomCheckbox } from '../../CustomCheckbox';
import { CURSOR_SETS, getActiveCursorDefinition } from '../../cursors/cursorDefinitions';
import { CursorSkin } from '../../../types';

interface CursorSkinSettingsProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface CursorSkinGroup {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  skins: {
    key: CursorSkin;
    colSpan?: string;
  }[];
}

const CURSOR_SKIN_GROUPS: CursorSkinGroup[] = [
  {
    id: 'standard',
    titleKey: 'settings.cursorSkinGroup.standard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    skins: [
      { key: 'default', colSpan: 'col-span-1 sm:col-span-2' }
    ]
  },
  {
    id: 'roundedGradient',
    titleKey: 'settings.cursorSkinGroup.roundedGradient',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 3.2 C 4.5 2.2, 3.2 3.5, 4.2 4.8 L 9.2 19.8 C 9.8 21.5, 12 21.6, 12.9 20 L 15 15.5 L 19.5 13.4 C 21.1 12.5, 21.0 10.3, 19.3 9.7 L 6.2 4.2 Z" />
      </svg>
    ),
    skins: [
      { key: 'rounded_gradient_cyan' },
      { key: 'rounded_gradient_adaptive' },
      { key: 'rounded_gradient_purple' },
      { key: 'rounded_gradient_violet_orange' },
      { key: 'rounded_gradient_sunset' },
      { key: 'rounded_gradient_emerald' },
      { key: 'rounded_gradient_rose' }
    ]
  },
  {
    id: 'toyStyle',
    titleKey: 'settings.cursorSkinGroup.toyStyle',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="5" y="5" width="14" height="14" rx="4" />
        <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        <circle cx="15" cy="15" r="1.5" fill="currentColor" />
      </svg>
    ),
    skins: [
      { key: 'toy_classic_blue' },
      { key: 'toy_adaptive' },
      { key: 'toy_bubblegum' },
      { key: 'toy_mint' },
      { key: 'toy_amber' },
      { key: 'toy_lilac' }
    ]
  },
  {
    id: 'modernFlat',
    titleKey: 'settings.cursorSkinGroup.modernFlat',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    skins: [
      { key: 'modern_flat' },
      { key: 'modern_flat_dark' },
      { key: 'modern_flat_dark_cyan' },
      { key: 'modern_flat_dark_white' }
    ]
  },
  {
    id: 'stylized',
    titleKey: 'settings.cursorSkinGroup.stylized',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    skins: [
      { key: 'prompt_modifier' },
      { key: 'cyber_neon' },
      { key: 'amber_gold' },
      { key: 'plasma_purple' }
    ]
  }
];

export const CursorSkinSettings: React.FC<CursorSkinSettingsProps> = ({
  isCollapsed,
  onToggle,
}) => {
  const { t } = useLanguage();
  const {
    currentTheme,
    cursorSkin,
    setCursorSkin,
    isCursorEffectEnabled,
    setIsCursorEffectEnabled,
  } = useAppContext();

  const activeSkinDef = getActiveCursorDefinition(cursorSkin, currentTheme);

  return (
    <div className="bg-gray-900/90 rounded-lg border border-gray-700/70 overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-800/50 transition-colors select-none group"
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </span>
          <div>
            <label className="block text-xs font-semibold text-gray-200 cursor-pointer">
              {t('settings.cursorSkinLabel' as any)}
            </label>
            {isCollapsed && (
              <p className="text-[10px] text-gray-400 leading-tight">
                {t(activeSkinDef?.nameKey as any || 'settings.cursorSkin.default')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium flex-shrink-0 bg-cyan-950/70 text-cyan-400 border border-cyan-800/50">
            {t(activeSkinDef?.nameKey as any || 'settings.cursorSkin.default')}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-transform duration-200 ${!isCollapsed ? 'rotate-180 text-cyan-400' : 'rotate-0'}`}
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
            {t('settings.cursorSkinDesc' as any)}
          </p>

          {/* Grouped Cursor Skin Collections */}
          <div className="space-y-3 pt-0.5">
            {CURSOR_SKIN_GROUPS.map((group) => (
              <div key={group.id} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-0.5">
                  {group.icon}
                  <span className="text-[11px] font-semibold text-gray-300 tracking-wide">
                    {t(group.titleKey as any)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {group.skins.map(({ key: skinKey, colSpan }) => {
                    const skinDef = getActiveCursorDefinition(skinKey, currentTheme);
                    const isSelected = cursorSkin === skinKey;
                    return (
                      <button
                        key={skinKey}
                        type="button"
                        onClick={() => setCursorSkin(skinKey)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg text-left transition-all outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border ${
                          colSpan ? colSpan : ''
                        } ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.12)]'
                            : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600 hover:text-gray-200'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 overflow-hidden ${
                            isSelected
                              ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/40'
                              : 'bg-gray-900 text-gray-400 border border-gray-700'
                          }`}
                          dangerouslySetInnerHTML={{ __html: skinDef.rawSvgs.default }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-semibold truncate ${isSelected ? 'text-cyan-300' : 'text-gray-200'}`}>
                              {t(skinDef.nameKey as any)}
                            </span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />}
                          </div>
                          <p className="text-[10px] leading-tight mt-0.5 line-clamp-2 text-gray-400">
                            {t(skinDef.descKey as any)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Click Feedback Effect Toggle */}
          <div className="pt-2 border-t border-gray-800/80">
            <CustomCheckbox
              id="cursorEffectToggle"
              checked={isCursorEffectEnabled}
              onChange={setIsCursorEffectEnabled}
              label={t('settings.cursorEffectLabel' as any)}
              className="text-xs font-medium text-gray-200"
            />
            <p className="text-[11px] text-gray-400 pl-6 leading-relaxed">
              {t('settings.cursorEffectDesc' as any)}
            </p>
          </div>

          {/* Live Interactive Cursor Test Ground */}
          <div className="pt-2.5 border-t border-gray-800/80 space-y-1.5">
            <div className="text-[11px] font-medium text-gray-300">
              {t('settings.cursorTestTitle' as any)}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
              <div className="p-1.5 rounded bg-gray-800/80 border border-gray-700/80 text-[10px] text-gray-300 select-none cursor-default hover:border-cyan-500/40">
                {t('settings.cursorTest.default' as any)}
              </div>
              <button
                type="button"
                className="p-1.5 rounded bg-cyan-950/40 border border-cyan-700/50 text-[10px] text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-500/60 cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none transition-colors"
              >
                {t('settings.cursorTest.pointer' as any)}
              </button>
              <input
                type="text"
                placeholder={t('settings.cursorTest.text' as any)}
                className="p-1 rounded bg-gray-950 border border-gray-700/80 text-[10px] text-gray-200 cursor-text text-center focus:border-cyan-500/60 focus:outline-none focus:ring-0 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="p-1.5 rounded bg-gray-800/80 border border-gray-700/80 text-[10px] text-gray-300 select-none cursor-grab active:cursor-grabbing hover:border-cyan-500/40">
                {t('settings.cursorTest.grab' as any)}
              </div>
              <div className="p-1.5 rounded bg-gray-800/80 border border-gray-700/80 text-[10px] text-gray-300 select-none cursor-crosshair hover:border-cyan-500/40">
                {t('settings.cursorTest.crosshair' as any)}
              </div>
              <div data-tool="cutter" className="p-1.5 rounded bg-rose-950/40 border border-rose-900/50 text-[10px] text-rose-300 select-none hover:border-rose-600/60">
                {t('settings.cursorTest.cutter' as any)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
