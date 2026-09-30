import React from 'react';
import { useLanguage } from '../../localization';
import { useSoundNotifications } from '../../hooks/useSoundNotifications';
import { SoundIcon, SoundMuteIcon } from '../icons/AppIcons';
import { SoundTheme, SoundNotificationType } from '../../services/soundNotificationService';

interface SoundSettingsSectionProps {
    isOpen: boolean;
    addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SoundSettingsSection: React.FC<SoundSettingsSectionProps> = ({
    addToast,
}) => {
    const { t } = useLanguage();
    const {
        soundSettings,
        updateSettings,
        resetSettings,
        playTestSound,
    } = useSoundNotifications();

    const handleMasterToggle = (enabled: boolean) => {
        updateSettings({ soundEnabled: enabled });
        if (enabled) {
            playTestSound('info');
        }
    };

    const handleMasterVolumeChange = (vol: number) => {
        updateSettings({ masterVolume: vol });
    };

    const handleThemeChange = (theme: SoundTheme) => {
        updateSettings({ soundTheme: theme });
        playTestSound('batch_success', theme);
    };

    const handleReset = () => {
        resetSettings();
        if (addToast) {
            addToast(t('settings.sound.resetDone' as any) || 'Sound settings reset to default', 'info');
        }
        playTestSound('info', 'modern');
    };

    const soundThemes: { id: SoundTheme; labelKey: string; descKey: string }[] = [
        {
            id: 'modern',
            labelKey: 'settings.sound.themeModern',
            descKey: 'settings.sound.themeModernDesc'
        },
        {
            id: 'crystal',
            labelKey: 'settings.sound.themeCrystal',
            descKey: 'settings.sound.themeCrystalDesc'
        },
        {
            id: 'organic',
            labelKey: 'settings.sound.themeOrganic',
            descKey: 'settings.sound.themeOrganicDesc'
        },
        {
            id: 'minimal',
            labelKey: 'settings.sound.themeMinimal',
            descKey: 'settings.sound.themeMinimalDesc'
        }
    ];

    const notificationItems: {
        type: SoundNotificationType;
        titleKey: string;
        descKey: string;
        enabledKey: keyof typeof soundSettings;
        volumeKey: keyof typeof soundSettings;
        badgeText?: string;
        accentColor: string;
    }[] = [
        {
            type: 'batch_success',
            titleKey: 'settings.sound.batchSuccessTitle',
            descKey: 'settings.sound.batchSuccessDesc',
            enabledKey: 'enableBatchSuccessSound',
            volumeKey: 'batchSuccessVolume',
            accentColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        },
        {
            type: 'batch_error',
            titleKey: 'settings.sound.batchErrorTitle',
            descKey: 'settings.sound.batchErrorDesc',
            enabledKey: 'enableBatchErrorSound',
            volumeKey: 'batchErrorVolume',
            accentColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        },
        {
            type: 'autosave',
            titleKey: 'settings.sound.autosaveTitle',
            descKey: 'settings.sound.autosaveDesc',
            enabledKey: 'enableAutosaveSound',
            volumeKey: 'autosaveVolume',
            badgeText: 'Ultra-Quiet',
            accentColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
        },
        {
            type: 'task_success',
            titleKey: 'settings.sound.taskCompleteTitle',
            descKey: 'settings.sound.taskCompleteDesc',
            enabledKey: 'enableTaskCompleteSound',
            volumeKey: 'taskCompleteVolume',
            accentColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        },
        {
            type: 'info',
            titleKey: 'settings.sound.notificationTitle',
            descKey: 'settings.sound.notificationDesc',
            enabledKey: 'enableGeneralNotificationSound',
            volumeKey: 'notificationVolume',
            accentColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        }
    ];

    return (
        <div className="space-y-4 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
            {/* Master Control Card */}
            <div className="p-3.5 bg-gray-800/90 rounded-lg border border-gray-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${soundSettings.soundEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-700 text-gray-400'}`}>
                            {soundSettings.soundEnabled && soundSettings.masterVolume > 0 ? (
                                <SoundIcon className="w-5 h-5" />
                            ) : (
                                <SoundMuteIcon className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                                {t('settings.sound.masterTitle' as any) || 'Sound Notifications'}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    soundSettings.soundEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-gray-700 text-gray-400'
                                }`}>
                                    {soundSettings.soundEnabled ? (t('settings.geminiActive' as any) || 'Active') : (t('common.disabled' as any) || 'Disabled')}
                                </span>
                            </h4>
                            <p className="text-xs text-gray-400">
                                {t('settings.sound.masterDesc' as any) || 'Subtle, gentle acoustic audio feedback for batch operations, background autosave, and tasks.'}
                            </p>
                        </div>
                    </div>

                    {/* Master Switch */}
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={soundSettings.soundEnabled}
                            onChange={(e) => handleMasterToggle(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                </div>

                {/* Master Volume Slider */}
                {soundSettings.soundEnabled && (
                    <div className="pt-2 border-t border-gray-700/60 flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-300 min-w-[90px]">
                            {t('settings.sound.masterVolume' as any) || 'Master Volume'}:
                        </span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={soundSettings.masterVolume}
                            onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                        <span className="text-xs font-mono text-cyan-300 w-10 text-right">
                            {Math.round(soundSettings.masterVolume * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={() => playTestSound('batch_success')}
                            className="px-2.5 py-1 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors flex items-center gap-1 shadow-sm"
                            title={t('settings.sound.testSound' as any) || 'Test Preview'}
                        >
                            <span>▶</span>
                            <span>{t('settings.sound.test' as any) || 'Test'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Sound Acoustic Theme Picker */}
            {soundSettings.soundEnabled && (
                <div className="p-3.5 bg-gray-800/80 rounded-lg border border-gray-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                                {t('settings.sound.themeTitle' as any) || 'Acoustic Sound Theme'}
                            </h4>
                            <p className="text-xs text-gray-400">
                                {t('settings.sound.themeSubtitle' as any) || 'Select the acoustic signature and harmonic tone of notifications'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {soundThemes.map((theme) => {
                            const isSelected = soundSettings.soundTheme === theme.id;
                            return (
                                <button
                                    key={theme.id}
                                    type="button"
                                    onClick={() => handleThemeChange(theme.id)}
                                    className={`p-2.5 rounded-lg border text-left transition-all relative ${
                                        isSelected
                                            ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/30'
                                            : 'bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-100">
                                            {t(theme.labelKey as any) || theme.id}
                                        </span>
                                        {isSelected && (
                                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-tight">
                                        {t(theme.descKey as any) || ''}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Individual Notification Triggers */}
            {soundSettings.soundEnabled && (
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
                            {t('settings.sound.eventsTitle' as any) || 'Notification Events & Volume'}
                        </h4>
                    </div>

                    <div className="space-y-2">
                        {notificationItems.map((item) => {
                            const isItemEnabled = !!soundSettings[item.enabledKey];
                            const itemVolume = typeof soundSettings[item.volumeKey] === 'number' 
                                ? (soundSettings[item.volumeKey] as number) 
                                : 0.5;

                            return (
                                <div
                                    key={item.type}
                                    className={`p-3 rounded-lg border transition-all ${
                                        isItemEnabled 
                                            ? 'bg-gray-800/90 border-gray-700/90' 
                                            : 'bg-gray-900/40 border-gray-800/80 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h5 className="text-xs font-bold text-gray-100">
                                                    {t(item.titleKey as any) || item.type}
                                                </h5>
                                                {item.badgeText && (
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                                                        {item.badgeText}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
                                                {t(item.descKey as any) || ''}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={!isItemEnabled}
                                                onClick={() => playTestSound(item.type, soundSettings.soundTheme, itemVolume * soundSettings.masterVolume)}
                                                className={`p-1.5 text-xs rounded border transition-colors ${
                                                    isItemEnabled
                                                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600'
                                                        : 'bg-gray-800 text-gray-600 border-transparent cursor-not-allowed'
                                                }`}
                                                title={t('settings.sound.testSound' as any) || 'Preview Tone'}
                                            >
                                                <span className="text-[10px]">▶</span>
                                            </button>

                                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={isItemEnabled}
                                                    onChange={(e) => updateSettings({ [item.enabledKey]: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Volume control per item */}
                                    {isItemEnabled && (
                                        <div className="mt-2.5 pt-2 border-t border-gray-700/50 flex items-center gap-3">
                                            <span className="text-[11px] text-gray-400 min-w-[70px]">
                                                {t('settings.sound.volume' as any) || 'Volume'}:
                                            </span>
                                            <input
                                                type="range"
                                                min="0.05"
                                                max="1"
                                                step="0.05"
                                                value={itemVolume}
                                                onChange={(e) => updateSettings({ [item.volumeKey]: parseFloat(e.target.value) })}
                                                className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                            />
                                            <span className="text-[11px] font-mono text-gray-400 w-8 text-right">
                                                {Math.round(itemVolume * 100)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Reset to Defaults button */}
            <div className="pt-2 flex justify-end">
                <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-gray-400 hover:text-gray-200 hover:underline transition-colors"
                >
                    {t('settings.sound.resetButton' as any) || 'Reset sound settings to default'}
                </button>
            </div>
        </div>
    );
};
