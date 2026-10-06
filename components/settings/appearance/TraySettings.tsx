import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../localization';
import { MonitorIcon } from '../../icons/AppIcons';
import { CustomCheckbox } from '../../CustomCheckbox';
import { 
    getTrayNotificationSettings, 
    saveTrayNotificationSettings, 
    testTrayNotification, 
    TrayNotificationSettings as NotificationSettingsType,
    requestDesktopNotificationPermission
} from '../../../services/trayNotificationService';
import { Bell, Sparkles, Layers, Box, Image, Palette, Volume2, Check } from 'lucide-react';

export const TraySettings: React.FC = () => {
    const { t } = useLanguage();
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

    // Electron window & tray settings
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

    // Tray Popup Notification settings
    const [notifSettings, setNotifSettings] = useState<NotificationSettingsType>(getTrayNotificationSettings());
    const [lastTestType, setLastTestType] = useState<string | null>(null);

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

    const handleUpdateNotifSetting = (key: keyof NotificationSettingsType, value: boolean) => {
        const updated = saveTrayNotificationSettings({ [key]: value });
        setNotifSettings(updated);

        if (key === 'enableNativeDesktop' && value && !isElectron) {
            requestDesktopNotificationPermission();
        }
    };

    const handleRunTest = (type: 'batch_start' | 'batch_success' | 'image_output' | 'threed_batch_success') => {
        testTrayNotification(type);
        setLastTestType(type);
        setTimeout(() => setLastTestType(null), 2500);
    };

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
        <div className="space-y-3.5 pt-2 border-t border-gray-700/50">
            {/* 1. Header & Section Description */}
            <div>
                <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Всплывающие уведомления в трее</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        NEW
                    </span>
                </label>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Стильные компактные карточки в нижнем углу трея для отслеживания старта и завершения батч операций, генераций Image Output, AI Editor и 3D моделей.
                </p>
            </div>

            {/* 2. Notification Options Card */}
            <div className="space-y-3 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                {/* Global Master Toggle */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
                    <div>
                        <span className="text-xs font-medium text-gray-200">Показывать всплывающие карточки</span>
                        <p className="text-[10px] text-gray-400">Компактные всплывающие карточки в углу экрана/трея</p>
                    </div>
                    <CustomCheckbox
                        checked={notifSettings.enabled}
                        onChange={(checked) => handleUpdateNotifSetting('enabled', checked)}
                    />
                </div>

                {/* Granular Feature Checkboxes */}
                <div className={`space-y-2 pt-1 transition-opacity ${notifSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                        <CustomCheckbox
                            checked={notifSettings.enableBatchStart}
                            onChange={(checked) => handleUpdateNotifSetting('enableBatchStart', checked)}
                        />
                        <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Старт батч операций (Batch API Launch)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                        <CustomCheckbox
                            checked={notifSettings.enableBatchSuccess}
                            onChange={(checked) => handleUpdateNotifSetting('enableBatchSuccess', checked)}
                        />
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Успешное завершение батч операций (Batch Ready)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                        <CustomCheckbox
                            checked={notifSettings.enableImageOutput}
                            onChange={(checked) => handleUpdateNotifSetting('enableImageOutput', checked)}
                        />
                        <Image className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>Нода Image Output (Успешная генерация)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                        <CustomCheckbox
                            checked={notifSettings.enableImageEditor}
                            onChange={(checked) => handleUpdateNotifSetting('enableImageEditor', checked)}
                        />
                        <Palette className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Нода AI Image Editor (Кадры и одиночные правки)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                        <CustomCheckbox
                            checked={notifSettings.enableThreeDBatch}
                            onChange={(checked) => handleUpdateNotifSetting('enableThreeDBatch', checked)}
                        />
                        <Box className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Нода 3D Generation (Батч старт и завершение 3D)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                        <CustomCheckbox
                            checked={notifSettings.enableSound}
                            onChange={(checked) => handleUpdateNotifSetting('enableSound', checked)}
                        />
                        <Volume2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Звуковое оповещение при появлении уведомления</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                        <CustomCheckbox
                            checked={notifSettings.enableNativeDesktop}
                            onChange={(checked) => handleUpdateNotifSetting('enableNativeDesktop', checked)}
                        />
                        <MonitorIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Системные уведомления рабочего стола (OS System Tray)</span>
                    </label>
                </div>

                {/* Quick Test Trigger Buttons */}
                <div className="pt-2.5 border-t border-gray-800/80">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                        Проверить вид уведомлений в трее:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleRunTest('batch_start')}
                            className="px-2 py-1.5 rounded text-[11px] font-medium bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <Layers className="w-3 h-3 text-cyan-400" />
                            <span>Батч старт</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRunTest('batch_success')}
                            className="px-2 py-1.5 rounded text-[11px] font-medium bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>Батч готов</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRunTest('image_output')}
                            className="px-2 py-1.5 rounded text-[11px] font-medium bg-sky-950/50 hover:bg-sky-900/60 text-sky-300 border border-sky-800/60 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <Image className="w-3 h-3 text-sky-400" />
                            <span>Изображение</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRunTest('threed_batch_success')}
                            className="px-2 py-1.5 rounded text-[11px] font-medium bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <Box className="w-3 h-3 text-amber-400" />
                            <span>3D Батч</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Electron Window Actions (Only visible in Electron desktop application) */}
            {isElectron && (
                <div className="space-y-3 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                    <div>
                        <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                            <MonitorIcon className="w-3.5 h-3.5 text-cyan-400" />
                            {t('settings.traySectionLabel')}
                        </span>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                            {t('settings.traySectionDesc')}
                        </p>
                    </div>

                    {/* Action on Close */}
                    <div className="space-y-1.5 pt-1">
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
                                className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-200 text-xs font-medium rounded-md border border-cyan-700/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <MonitorIcon className="w-3.5 h-3.5 text-cyan-400" />
                                {t('settings.trayMinimizeNowBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
