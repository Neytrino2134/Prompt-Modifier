import {
    STORAGE_KEY_TRIPO_ENABLED,
    STORAGE_KEY_TRIPO_API_KEY,
    STORAGE_KEY_TRIPO_MODEL_VERSION,
    TRIPO_CONFIG_CHANGE_EVENT,
    DEFAULT_TRIPO_MODEL_VERSION,
    TRIPO_MODEL_OPTIONS,
    TripoModelOption
} from './types';
import { logTripo } from './logger';

/**
 * Check if TRIPO AI API is enabled in settings
 */
export const isTripoEnabled = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY_TRIPO_ENABLED) === 'true';
    } catch {
        return false;
    }
};

/**
 * Enable or disable TRIPO AI API
 */
export const setTripoEnabled = (enabled: boolean): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_ENABLED, String(enabled));
        notifyTripoConfigChanged();
        logTripo('info', `Tripo 3D API integration ${enabled ? 'Enabled' : 'Disabled'}`);
    } catch (e) {
        console.error('Failed to set TRIPO AI enabled status', e);
    }
};

/**
 * Get configured TRIPO AI API Key
 */
export const getTripoApiKey = (): string => {
    try {
        const key = localStorage.getItem(STORAGE_KEY_TRIPO_API_KEY);
        if (key && key.trim()) {
            return key.trim();
        }
    } catch {}
    return typeof process !== 'undefined' ? (process.env.TRIPO_API_KEY || '').trim() : '';
};

/**
 * Save TRIPO AI API Key
 */
export const setTripoApiKey = (key: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_API_KEY, key.trim());
        notifyTripoConfigChanged();
        const masked = key.trim() ? `${'*'.repeat(Math.max(0, key.trim().length - 4))}${key.trim().slice(-4)}` : '(empty)';
        logTripo('info', `Updated Tripo API Key: ${masked}`);
    } catch (e) {
        console.error('Failed to save TRIPO AI API Key', e);
    }
};

/**
 * Get configured TRIPO model version
 */
export const getTripoModelVersion = (): string => {
    try {
        const version = localStorage.getItem(STORAGE_KEY_TRIPO_MODEL_VERSION);
        if (version && version.trim()) {
            return version.trim();
        }
    } catch {}
    return DEFAULT_TRIPO_MODEL_VERSION;
};

/**
 * Save TRIPO model version
 */
export const setTripoModelVersion = (version: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_MODEL_VERSION, version.trim());
        notifyTripoConfigChanged();
        logTripo('info', `Tripo Default Model Version set to: ${version}`);
    } catch (e) {
        console.error('Failed to save TRIPO model version', e);
    }
};

/**
 * Get metadata option for a specific TRIPO model version
 */
export const getTripoModelOption = (version?: string): TripoModelOption => {
    const v = version || getTripoModelVersion();
    return TRIPO_MODEL_OPTIONS.find(m => m.value === v) || {
        value: v,
        label: `Tripo (${v})`,
        description: 'Tripo 3D AI Model'
    };
};

/**
 * Notify subscribers about TRIPO AI config updates
 */
export const notifyTripoConfigChanged = (): void => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(TRIPO_CONFIG_CHANGE_EVENT, {
            detail: {
                enabled: isTripoEnabled(),
                hasKey: !!getTripoApiKey()
            }
        }));
    }
};
