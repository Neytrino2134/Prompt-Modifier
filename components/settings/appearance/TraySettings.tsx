import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../localization';
import { MonitorIcon } from '../../icons/AppIcons';
import { CustomCheckbox } from '../../CustomCheckbox';

export const TraySettings: React.FC = () => {
  const { t } = useLanguage();
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  const [traySettings, setTraySettings] = useState<{
    closeAction: 'ask' | 'tray' | 'quit';
    minimizeAction: 'taskbar' | 'tray';
    minimizeToTrayOnClose: boolean;
    minimizeToTrayOnMinimize: boolean;
  }>({
    closeAction: 'ask',
    minimizeAction: 'taskbar',
    minimizeToTrayOnClose: false,
    minimizeToTrayOnMinimize: false,
  });

  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (api && api.getTraySettings) {
      api.getTraySettings().then((settings: any) => {
        if (settings) {
          const closeAction = settings.closeAction || (settings.minimizeToTrayOnClose ? 'tray' : 'ask');
          const minimizeAction = settings.minimizeAction || (settings.minimizeToTrayOnMinimize ? 'tray' : 'taskbar');
          setTraySettings({
            closeAction,
            minimizeAction,
            minimizeToTrayOnClose: closeAction === 'tray',
            minimizeToTrayOnMinimize: minimizeAction === 'tray',
          });
        }
      });
    }

    if (api && api.onTraySettingsUpdated) {
      const remove = api.onTraySettingsUpdated((settings: any) => {
        if (settings) {
          const closeAction = settings.closeAction || (settings.minimizeToTrayOnClose ? 'tray' : 'ask');
          const minimizeAction = settings.minimizeAction || (settings.minimizeToTrayOnMinimize ? 'tray' : 'taskbar');
          setTraySettings({
            closeAction,
            minimizeAction,
            minimizeToTrayOnClose: closeAction === 'tray',
            minimizeToTrayOnMinimize: minimizeAction === 'tray',
          });
        }
      });
      return () => remove();
    }
  }, [isElectron]);

  if (!isElectron) return null;

  const handleSetCloseAction = (action: 'ask' | 'tray' | 'quit') => {
    const nextSettings = {
      ...traySettings,
      closeAction: action,
      minimizeToTrayOnClose: action === 'tray',
    };
    setTraySettings(nextSettings);
    const api = (window as any).electronAPI;
    if (api && api.setTraySettings) {
      api.setTraySettings(nextSettings);
    }
  };

  const handleSetMinimizeAction = (action: 'taskbar' | 'tray') => {
    const nextSettings = {
      ...traySettings,
      minimizeAction: action,
      minimizeToTrayOnMinimize: action === 'tray',
    };
    setTraySettings(nextSettings);
    const api = (window as any).electronAPI;
    if (api && api.setTraySettings) {
      api.setTraySettings(nextSettings);
    }
  };

  const handleToggleCheckbox = (key: 'minimizeToTrayOnClose' | 'minimizeToTrayOnMinimize', checked: boolean) => {
    let nextSettings: typeof traySettings;
    if (key === 'minimizeToTrayOnClose') {
      nextSettings = {
        ...traySettings,
        minimizeToTrayOnClose: checked,
        closeAction: checked ? 'tray' : 'ask',
      };
    } else {
      nextSettings = {
        ...traySettings,
        minimizeToTrayOnMinimize: checked,
        minimizeAction: checked ? 'tray' : 'taskbar',
      };
    }
    setTraySettings(nextSettings);
    const api = (window as any).electronAPI;
    if (api && api.setTraySettings) {
      api.setTraySettings(nextSettings);
    }
  };

  const handleMinimizeToTrayNow = () => {
    const api = (window as any).electronAPI;
    if (api && api.minimizeToTray) {
      api.minimizeToTray();
    }
  };

  return (
    <div className="space-y-2.5 pt-2 border-t border-gray-700/50">
      <div>
        <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
          <MonitorIcon className="w-3.5 h-3.5 text-cyan-400" />
          {t('settings.traySectionLabel')}
        </label>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
          {t('settings.traySectionDesc')}
        </p>
      </div>

      <div className="space-y-3 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
        {/* Action on Close */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-200">{t('settings.closeActionLabel')}</span>
            <span className="text-[10px] text-gray-400">{t('settings.closeActionDesc')}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-gray-950/70 p-1 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => handleSetCloseAction('ask')}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-all text-center ${
                traySettings.closeAction === 'ask'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              {t('settings.closeAction.ask')}
            </button>
            <button
              type="button"
              onClick={() => handleSetCloseAction('tray')}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-all text-center ${
                traySettings.closeAction === 'tray'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              {t('settings.closeAction.tray')}
            </button>
            <button
              type="button"
              onClick={() => handleSetCloseAction('quit')}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-all text-center ${
                traySettings.closeAction === 'quit'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              {t('settings.closeAction.quit')}
            </button>
          </div>
        </div>

        {/* Action on Minimize */}
        <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-200">{t('settings.minimizeActionLabel')}</span>
            <span className="text-[10px] text-gray-400">{t('settings.minimizeActionDesc')}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-gray-950/70 p-1 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => handleSetMinimizeAction('taskbar')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all text-center ${
                traySettings.minimizeAction === 'taskbar'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              {t('settings.minimizeAction.taskbar')}
            </button>
            <button
              type="button"
              onClick={() => handleSetMinimizeAction('tray')}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all text-center ${
                traySettings.minimizeAction === 'tray'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              {t('settings.minimizeAction.tray')}
            </button>
          </div>
        </div>

        {/* Quick Checkboxes & Direct Minimize Button */}
        <div className="space-y-2 pt-2 border-t border-gray-800/80">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
            <CustomCheckbox
              checked={traySettings.minimizeToTrayOnClose}
              onChange={(checked) => handleToggleCheckbox('minimizeToTrayOnClose', checked)}
            />
            <span>{t('settings.trayMinimizeToTrayOnClose')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
            <CustomCheckbox
              checked={traySettings.minimizeToTrayOnMinimize}
              onChange={(checked) => handleToggleCheckbox('minimizeToTrayOnMinimize', checked)}
            />
            <span>{t('settings.trayMinimizeToTrayOnMinimize')}</span>
          </label>

          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={handleMinimizeToTrayNow}
              className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-200 text-xs font-medium rounded-md border border-cyan-700/50 flex items-center gap-1.5 transition-colors"
            >
              <MonitorIcon className="w-3.5 h-3.5 text-cyan-400" />
              {t('settings.trayMinimizeNowBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
