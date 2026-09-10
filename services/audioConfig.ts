// Audio input and microphone configuration management

export const STORAGE_KEY_SELECTED_AUDIO_DEVICE = 'settings_selected_audio_device';
export const AUDIO_CONFIG_CHANGE_EVENT = 'audio-device-config-changed';

export interface AudioInputDevice {
    deviceId: string;
    label: string;
    groupId?: string;
}

/**
 * Get the currently selected audio input device ID (empty string means system default)
 */
export const getSelectedAudioDeviceId = (): string => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_SELECTED_AUDIO_DEVICE);
        return saved ? saved.trim() : '';
    } catch {
        return '';
    }
};

/**
 * Save the selected audio input device ID
 */
export const setSelectedAudioDeviceId = (deviceId: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_SELECTED_AUDIO_DEVICE, deviceId.trim());
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(AUDIO_CONFIG_CHANGE_EVENT, {
                detail: { deviceId: deviceId.trim() }
            }));
        }
    } catch (e) {
        console.error('Failed to save selected audio device:', e);
    }
};

/**
 * Build MediaTrackConstraints using selected device ID with graceful fallback
 */
export const getAudioMediaConstraints = (deviceId?: string): MediaTrackConstraints | boolean => {
    const id = deviceId !== undefined ? deviceId : getSelectedAudioDeviceId();
    if (id && id !== 'default') {
        return {
            deviceId: { exact: id },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        };
    }
    return {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    };
};
