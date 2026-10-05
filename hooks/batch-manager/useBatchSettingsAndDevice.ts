import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getDeviceId,
    setDeviceId,
    regenerateDeviceId,
    getDeviceName,
    setDeviceName,
    isDeviceIsolationEnabled,
    setDeviceIsolationEnabled,
    getDeviceFilterMode,
    setDeviceFilterMode,
    DEVICE_CONFIG_CHANGED_EVENT
} from '../../utils/deviceId';
import {
    STORAGE_KEY_AUTO_DOWNLOAD,
    STORAGE_KEY_BATCH_MODE,
    STORAGE_KEY_RESTORE_FAILED_CARDS,
    STORAGE_KEY_RESTORE_FINISHED_CARDS
} from './types';

export const useBatchSettingsAndDevice = () => {
    // 1. Centralized Batch Mode State (synced with localStorage)
    const [isBatchMode, setIsBatchModeState] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_BATCH_MODE) === 'true';
        } catch {
            return false;
        }
    });

    const setIsBatchMode = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
        setIsBatchModeState(prev => {
            const next = typeof val === 'function' ? val(prev) : val;
            try {
                localStorage.setItem(STORAGE_KEY_BATCH_MODE, String(next));
            } catch (e) {
                console.error("Failed to save batch mode state", e);
            }
            return next;
        });
    }, []);

    const [autoDownloadFromServer, setAutoDownloadFromServerState] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY_AUTO_DOWNLOAD) !== 'false'; }
        catch { return true; }
    });
    const autoDownloadFromServerRef = useRef(autoDownloadFromServer);
    autoDownloadFromServerRef.current = autoDownloadFromServer;

    const setAutoDownloadFromServer = useCallback((enabled: boolean) => {
        autoDownloadFromServerRef.current = enabled;
        setAutoDownloadFromServerState(enabled);
        try { localStorage.setItem(STORAGE_KEY_AUTO_DOWNLOAD, String(enabled)); } catch { }
    }, []);

    // 1b. Restore finished/failed cards settings (synced with localStorage)
    const [restoreFinishedCards, setRestoreFinishedCardsState] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_RESTORE_FINISHED_CARDS);
            return saved !== 'false'; // Default to true
        } catch {
            return true;
        }
    });
    const restoreFinishedCardsRef = useRef(restoreFinishedCards);
    restoreFinishedCardsRef.current = restoreFinishedCards;

    const setRestoreFinishedCards = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
        setRestoreFinishedCardsState(prev => {
            const next = typeof val === 'function' ? val(prev) : val;
            try {
                localStorage.setItem(STORAGE_KEY_RESTORE_FINISHED_CARDS, String(next));
            } catch (e) {
                console.error("Failed to save restoreFinishedCards setting", e);
            }
            return next;
        });
    }, []);

    const [restoreFailedCards, setRestoreFailedCardsState] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_RESTORE_FAILED_CARDS);
            return saved !== 'false'; // Default to true
        } catch {
            return true;
        }
    });
    const restoreFailedCardsRef = useRef(restoreFailedCards);
    restoreFailedCardsRef.current = restoreFailedCards;

    const setRestoreFailedCards = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
        setRestoreFailedCardsState(prev => {
            const next = typeof val === 'function' ? val(prev) : val;
            try {
                localStorage.setItem(STORAGE_KEY_RESTORE_FAILED_CARDS, String(next));
            } catch (e) {
                console.error("Failed to save restoreFailedCards setting", e);
            }
            return next;
        });
    }, []);

    // Device ID and Isolation states
    const [deviceId, setDeviceIdState] = useState<string>(() => getDeviceId());
    const [deviceName, setDeviceNameState] = useState<string>(() => getDeviceName());
    const [deviceIsolationEnabled, setDeviceIsolationEnabledState] = useState<boolean>(() => isDeviceIsolationEnabled());
    const [deviceFilterMode, setDeviceFilterModeState] = useState<string>(() => getDeviceFilterMode());

    useEffect(() => {
        const handleConfigChange = (e: any) => {
            if (e.detail) {
                if (e.detail.deviceId !== undefined) setDeviceIdState(e.detail.deviceId);
                if (e.detail.deviceName !== undefined) setDeviceNameState(e.detail.deviceName);
                if (e.detail.isolationEnabled !== undefined) setDeviceIsolationEnabledState(e.detail.isolationEnabled);
                if (e.detail.filterMode !== undefined) setDeviceFilterModeState(e.detail.filterMode);
            }
        };
        window.addEventListener(DEVICE_CONFIG_CHANGED_EVENT, handleConfigChange);
        return () => window.removeEventListener(DEVICE_CONFIG_CHANGED_EVENT, handleConfigChange);
    }, []);

    const updateDeviceId = useCallback((newId: string) => {
        setDeviceId(newId);
        setDeviceIdState(newId);
    }, []);

    const updateDeviceName = useCallback((name: string) => {
        setDeviceName(name);
        setDeviceNameState(name);
    }, []);

    const regenDeviceId = useCallback(() => {
        const newId = regenerateDeviceId();
        setDeviceIdState(newId);
        return newId;
    }, []);

    const updateDeviceIsolationEnabled = useCallback((enabled: boolean) => {
        setDeviceIsolationEnabled(enabled);
        setDeviceIsolationEnabledState(enabled);
    }, []);

    const updateDeviceFilterMode = useCallback((mode: string) => {
        setDeviceFilterMode(mode);
        setDeviceFilterModeState(mode);
    }, []);

    return {
        isBatchMode,
        setIsBatchMode,
        autoDownloadFromServer,
        autoDownloadFromServerRef,
        setAutoDownloadFromServer,
        restoreFinishedCards,
        restoreFinishedCardsRef,
        setRestoreFinishedCards,
        restoreFailedCards,
        restoreFailedCardsRef,
        setRestoreFailedCards,
        deviceId,
        deviceName,
        updateDeviceId,
        updateDeviceName,
        regenDeviceId,
        deviceIsolationEnabled,
        updateDeviceIsolationEnabled,
        deviceFilterMode,
        updateDeviceFilterMode
    };
};
