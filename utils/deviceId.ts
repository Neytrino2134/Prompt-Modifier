/**
 * Device ID and Batch Isolation Utilities
 * Provides persistent unique Device IDs and filter capabilities
 * so multiple devices sharing a single API key don't mix up their batches.
 */

export const STORAGE_KEY_DEVICE_ID = 'settings_device_id';
export const STORAGE_KEY_DEVICE_NAME = 'settings_device_name';
export const STORAGE_KEY_BATCH_DEVICE_FILTER = 'batch_device_filter';
export const STORAGE_KEY_DEVICE_ISOLATION_ENABLED = 'settings_device_isolation_enabled';
export const DEVICE_CONFIG_CHANGED_EVENT = 'device-config-changed';

/**
 * Generate a random short device ID (e.g. dev_a8f3b2)
 */
export const generateRandomDeviceId = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `dev_${result}`;
};

/**
 * Get current persistent Device ID. Initializes one if missing.
 */
export const getDeviceId = (): string => {
    try {
        let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
        if (!id || !id.trim()) {
            id = generateRandomDeviceId();
            localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
        }
        return id.trim();
    } catch {
        return 'dev_default';
    }
};

/**
 * Set custom Device ID
 */
export const setDeviceId = (newId: string): void => {
    try {
        const cleanId = (newId || '').trim() || generateRandomDeviceId();
        localStorage.setItem(STORAGE_KEY_DEVICE_ID, cleanId);
        notifyDeviceConfigChanged();
    } catch (e) {
        console.error('Failed to set Device ID', e);
    }
};

/**
 * Regenerate a new random Device ID
 */
export const regenerateDeviceId = (): string => {
    const newId = generateRandomDeviceId();
    setDeviceId(newId);
    return newId;
};

/**
 * Get optional friendly Device Name (e.g. "Work PC", "MacBook Pro")
 */
export const getDeviceName = (): string => {
    try {
        return (localStorage.getItem(STORAGE_KEY_DEVICE_NAME) || '').trim();
    } catch {
        return '';
    }
};

/**
 * Set friendly Device Name
 */
export const setDeviceName = (name: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_DEVICE_NAME, (name || '').trim());
        notifyDeviceConfigChanged();
    } catch (e) {
        console.error('Failed to set Device Name', e);
    }
};

/**
 * Is strict device isolation enabled (i.e. do not automatically import remote batches from other devices)
 */
export const isDeviceIsolationEnabled = (): boolean => {
    try {
        const val = localStorage.getItem(STORAGE_KEY_DEVICE_ISOLATION_ENABLED);
        // Default to true so batches don't automatically mix across devices sharing an API key
        if (val === null) return true;
        return val === 'true';
    } catch {
        return true;
    }
};

/**
 * Set device isolation mode
 */
export const setDeviceIsolationEnabled = (enabled: boolean): void => {
    try {
        localStorage.setItem(STORAGE_KEY_DEVICE_ISOLATION_ENABLED, String(enabled));
        notifyDeviceConfigChanged();
    } catch (e) {
        console.error('Failed to set Device Isolation', e);
    }
};

/**
 * Device filter in TaskQueue batch list: 'current' | 'all' | string (specific device ID)
 */
export const getDeviceFilterMode = (): string => {
    try {
        return localStorage.getItem(STORAGE_KEY_BATCH_DEVICE_FILTER) || 'current';
    } catch {
        return 'current';
    }
};

/**
 * Set device filter mode
 */
export const setDeviceFilterMode = (mode: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY_BATCH_DEVICE_FILTER, mode);
        notifyDeviceConfigChanged();
    } catch (e) {
        console.error('Failed to set Device Filter Mode', e);
    }
};

/**
 * Notify subscribers when device settings change
 */
export const notifyDeviceConfigChanged = (): void => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(DEVICE_CONFIG_CHANGED_EVENT, {
            detail: {
                deviceId: getDeviceId(),
                deviceName: getDeviceName(),
                isolationEnabled: isDeviceIsolationEnabled(),
                filterMode: getDeviceFilterMode()
            }
        }));
    }
};

/**
 * Extract deviceId tag from displayName (e.g. "[dev_abc123] Batch Title")
 * or from OpenAI batch custom_id / batch ID (e.g. "dev_abc123__openai_batch_...")
 */
export const extractDeviceId = (str?: string): string | undefined => {
    if (!str) return undefined;
    // Format 1: [dev_xxx] in displayName
    const bracketMatch = str.match(/\[([a-zA-Z0-9_\-]+)\]/);
    if (bracketMatch && bracketMatch[1]) {
        return bracketMatch[1];
    }
    // Format 2: dev_xxx__ prefix or openai_batch_dev_xxx_
    const prefixMatch = str.match(/^([a-zA-Z0-9_\-]+)__/);
    if (prefixMatch && prefixMatch[1]) {
        return prefixMatch[1];
    }
    const openaiDevMatch = str.match(/openai_batch_([a-zA-Z0-9_\-]+?)_\d+/);
    if (openaiDevMatch && openaiDevMatch[1]) {
        return openaiDevMatch[1];
    }
    return undefined;
};

/**
 * Tag a display name or ID with the current device ID: "[dev_xxx] My Batch"
 */
export const formatWithDeviceTag = (text: string, deviceId: string = getDeviceId()): string => {
    if (!text) return `[${deviceId}]`;
    if (text.startsWith(`[${deviceId}]`)) return text;
    return `[${deviceId}] ${text}`;
};

/**
 * Check if a batch record belongs to the active filter
 */
export const matchesDeviceFilter = (
    jobDeviceId?: string,
    currentDeviceId: string = getDeviceId(),
    filterMode: string = getDeviceFilterMode()
): boolean => {
    if (filterMode === 'all') return true;
    if (filterMode === 'current') {
        // If job has no deviceId (legacy batch), consider it current device
        if (!jobDeviceId) return true;
        return jobDeviceId === currentDeviceId;
    }
    // Specific device ID
    return jobDeviceId === filterMode;
};
