import React from 'react';
import { useLanguage } from '../../../localization';
import { useAppContext } from '../../../contexts/AppContext';
import { CustomCheckbox } from '../../CustomCheckbox';

export const PanelStyleSettings: React.FC = () => {
  const { t } = useLanguage();
  const { panelStyle, setPanelStyle, isPanelAutoHide, setIsPanelAutoHide } = useAppContext();

  return (
    <div className="space-y-3 pt-1 border-t border-gray-800">
      {/* Panel Style (Classic / Modern) */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-200">
          {t('settings.panelStyleLabel')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPanelStyle('modern')}
            className={`p-2.5 rounded-lg border text-left transition-all relative overflow-hidden group ${
              panelStyle === 'modern'
                ? 'bg-accent/15 border-accent text-white shadow-sm ring-1 ring-accent/30'
                : 'bg-gray-800/80 border-gray-700/80 text-gray-400 hover:text-gray-200 hover:border-gray-600 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold ${panelStyle === 'modern' ? 'text-accent' : 'text-gray-200'}`}>
                {t('settings.panelStyle.modern')}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">
                New
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-gray-400">
              {t('settings.panelStyle.modernDesc')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPanelStyle('classic')}
            className={`p-2.5 rounded-lg border text-left transition-all relative overflow-hidden group ${
              panelStyle === 'classic'
                ? 'bg-accent/15 border-accent text-white shadow-sm ring-1 ring-accent/30'
                : 'bg-gray-800/80 border-gray-700/80 text-gray-400 hover:text-gray-200 hover:border-gray-600 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold ${panelStyle === 'classic' ? 'text-accent' : 'text-gray-200'}`}>
                {t('settings.panelStyle.classic')}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-gray-400">
              {t('settings.panelStyle.classicDesc')}
            </p>
          </button>
        </div>
      </div>

      {/* Panel Auto-hide Toggle */}
      <div className="pt-2 border-t border-gray-800">
        <CustomCheckbox
          id="panelAutoHideToggle"
          checked={isPanelAutoHide}
          onChange={setIsPanelAutoHide}
          label={t('settings.panelAutoHideLabel')}
          className="text-xs font-medium text-gray-200"
        />
        <p className="text-[11px] text-gray-400 pl-6 leading-relaxed">
          {t('settings.panelAutoHideDesc')}
        </p>
      </div>
    </div>
  );
};
