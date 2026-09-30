import { useState, useEffect, useCallback } from 'react';
import { 
    SoundNotificationSettings, 
    SoundNotificationType, 
    SoundTheme, 
    DEFAULT_SOUND_SETTINGS,
    getSoundSettings, 
    saveSoundSettings, 
    resetSoundSettings,
    playNotificationSound,
    playBatchSuccessSound,
    playBatchErrorSound,
    playAutosaveSound,
    playTaskSuccessSound,
    playTaskErrorSound,
    playInfoSound,
    playSubtleClick,
    SOUND_CONFIG_CHANGED_EVENT
} from '../services/soundNotificationService';

export const useSoundNotifications = () => {
    const [soundSettings, setSoundSettings] = useState<SoundNotificationSettings>(() => getSoundSettings());

    // Sync state if another part of the app updates settings
    useEffect(() => {
        const handleConfigChange = (e: CustomEvent<SoundNotificationSettings>) => {
            if (e.detail) {
                setSoundSettings(e.detail);
            } else {
                setSoundSettings(getSoundSettings());
            }
        };

        window.addEventListener(SOUND_CONFIG_CHANGED_EVENT as any, handleConfigChange as EventListener);
        return () => {
            window.removeEventListener(SOUND_CONFIG_CHANGED_EVENT as any, handleConfigChange as EventListener);
        };
    }, []);

    const updateSettings = useCallback((patch: Partial<SoundNotificationSettings>) => {
        const updated = saveSoundSettings(patch);
        setSoundSettings(updated);
        return updated;
    }, []);

    const resetSettings = useCallback(() => {
        const defaults = resetSoundSettings();
        setSoundSettings(defaults);
        return defaults;
    }, []);

    const playTestSound = useCallback((type: SoundNotificationType, themeOverride?: SoundTheme, volumeOverride?: number) => {
        playNotificationSound(type, {
            force: true,
            themeOverride: themeOverride || soundSettings.soundTheme,
            volumeOverride: volumeOverride !== undefined ? volumeOverride : soundSettings.masterVolume
        });
    }, [soundSettings]);

    return {
        soundSettings,
        updateSettings,
        resetSettings,
        playNotificationSound,
        playTestSound,
        playBatchSuccess: playBatchSuccessSound,
        playBatchError: playBatchErrorSound,
        playAutosave: playAutosaveSound,
        playTaskSuccess: playTaskSuccessSound,
        playTaskError: playTaskErrorSound,
        playInfo: playInfoSound,
        playSubtleClick
    };
};
