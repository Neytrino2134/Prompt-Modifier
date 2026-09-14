import React from 'react';
import { useLanguage } from '../../../localization';
import { useAppContext } from '../../../contexts/AppContext';
import CustomSelect from '../../CustomSelect';
import { Theme } from '../../../types';

export const themes: { id: Theme; color: string; labelKey: string; fallbackLabel: string }[] = [
  { id: 'cyan', color: '#06b6d4', labelKey: 'settings.theme.cyan', fallbackLabel: 'Cyan' },
  { id: 'azure', color: '#0ea5e9', labelKey: 'settings.theme.azure', fallbackLabel: 'Azure' },
  { id: 'purple', color: '#9333ea', labelKey: 'settings.theme.purple', fallbackLabel: 'Purple' },
  { id: 'pink', color: '#ec4899', labelKey: 'settings.theme.pink', fallbackLabel: 'Pink' },
  { id: 'red', color: '#dc2626', labelKey: 'settings.theme.red', fallbackLabel: 'Red' },
  { id: 'orange', color: '#f97316', labelKey: 'settings.theme.orange', fallbackLabel: 'Orange' },
  { id: 'lime', color: '#84cc16', labelKey: 'settings.theme.lime', fallbackLabel: 'Lime' },
  { id: 'emerald', color: '#10b981', labelKey: 'settings.theme.emerald', fallbackLabel: 'Emerald' },
  { id: 'gray', color: '#71717a', labelKey: 'settings.theme.gray', fallbackLabel: 'Gray' },
];

export const ThemeAndAutoSaveSettings: React.FC = () => {
  const { t } = useLanguage();
  const { currentTheme, setTheme, autoSaveInterval, setAutoSaveInterval } = useAppContext();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Interface Theme */}
      <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-700/60 space-y-1.5 flex flex-col justify-between">
        <div>
          <label className="block text-xs font-semibold text-gray-200">
            {t('dialog.settings.themeLabel')}
          </label>
          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
            {t('settings.interfaceThemeDesc' as any)}
          </p>
        </div>
        <CustomSelect
          value={currentTheme}
          onChange={(val) => setTheme(val as Theme)}
          options={themes.map((theme) => {
            const localized = t(theme.labelKey as any);
            return {
              value: theme.id,
              label: localized && localized !== theme.labelKey ? localized : theme.fallbackLabel,
              color: theme.color,
            };
          })}
          className="w-full text-xs"
        />
      </div>

      {/* Auto-Save */}
      <div className="bg-gray-900/80 p-2.5 rounded-lg border border-gray-700/60 space-y-1.5 flex flex-col justify-between">
        <div>
          <label className="block text-xs font-semibold text-gray-200">
            {t('settings.autoSaveLabel')}
          </label>
          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
            {t('settings.autoSaveDesc')}
          </p>
        </div>
        <CustomSelect
          value={String(autoSaveInterval)}
          onChange={(val) => setAutoSaveInterval(Number(val))}
          options={[
            { value: '0', label: t('settings.autoSave.off') },
            { value: '30', label: t('settings.autoSave.30s') },
            { value: '60', label: t('settings.autoSave.1m') },
            { value: '120', label: t('settings.autoSave.2m') },
            { value: '300', label: t('settings.autoSave.5m') },
            { value: '600', label: t('settings.autoSave.10m') },
          ]}
          className="w-full text-xs"
        />
      </div>
    </div>
  );
};
