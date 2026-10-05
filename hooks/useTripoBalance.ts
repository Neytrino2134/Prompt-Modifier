import { useState, useEffect, useCallback } from 'react';
import {
    STORAGE_KEY_TRIPO_LAST_BALANCE,
    TRIPO_BALANCE_CHANGE_EVENT,
    TRIPO_CONFIG_CHANGE_EVENT,
    TripoBalanceData
} from '../services/tripo/types';
import { isTripoEnabled, getTripoApiKey } from '../services/tripo/config';
import { fetchTripoUserBalance } from '../services/tripo/httpClient';

/**
 * React hook to subscribe to TRIPO AI toggle updates in real-time
 */
export const useTripoEnabled = (): boolean => {
    const [enabled, setEnabled] = useState<boolean>(() => isTripoEnabled());

    useEffect(() => {
        const handleUpdate = () => {
            setEnabled(isTripoEnabled());
        };

        window.addEventListener(TRIPO_CONFIG_CHANGE_EVENT, handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener(TRIPO_CONFIG_CHANGE_EVENT, handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    return enabled;
};

/**
 * React hook to access and refresh Tripo 3D account balance in real-time
 */
export const useTripoBalance = () => {
    const [balanceData, setBalanceData] = useState<TripoBalanceData | null>(() => {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_TRIPO_LAST_BALANCE);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshBalance = useCallback(async () => {
        if (!isTripoEnabled() || !getTripoApiKey()) {
            setBalanceData(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTripoUserBalance();
            if (data) setBalanceData(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to fetch balance');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshBalance();

        const handleBalanceUpdate = (e: any) => {
            if (e.detail) setBalanceData(e.detail);
        };
        const handleConfigUpdate = () => {
            refreshBalance();
        };

        window.addEventListener(TRIPO_BALANCE_CHANGE_EVENT, handleBalanceUpdate);
        window.addEventListener(TRIPO_CONFIG_CHANGE_EVENT, handleConfigUpdate);

        return () => {
            window.removeEventListener(TRIPO_BALANCE_CHANGE_EVENT, handleBalanceUpdate);
            window.removeEventListener(TRIPO_CONFIG_CHANGE_EVENT, handleConfigUpdate);
        };
    }, [refreshBalance]);

    return {
        balance: balanceData?.balance ?? null,
        frozen: balanceData?.frozen ?? null,
        balanceData,
        loading,
        error,
        refreshBalance
    };
};
