import { TRIPO_LOG_EVENT, TripoLogEntry } from './types';

// ==========================================
// Tripo 3D Logging Subsystem
// ==========================================

const tripoLogBuffer: TripoLogEntry[] = [];
const MAX_TRIPO_LOGS = 100;
const logListeners = new Set<(entry: TripoLogEntry) => void>();

export const logTripo = (level: 'info' | 'success' | 'warning' | 'error', message: string, details?: any): TripoLogEntry => {
    const entry: TripoLogEntry = {
        id: `tripo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        level,
        message,
        details
    };

    tripoLogBuffer.push(entry);
    if (tripoLogBuffer.length > MAX_TRIPO_LOGS) {
        tripoLogBuffer.shift();
    }

    // Console logging with grouped styles
    const prefix = `[Tripo 3D ${new Date(entry.timestamp).toLocaleTimeString()}]`;
    if (level === 'error') {
        console.error(`${prefix} ❌ ${message}`, details || '');
    } else if (level === 'warning') {
        console.warn(`${prefix} ⚠️ ${message}`, details || '');
    } else if (level === 'success') {
        console.log(`%c${prefix} ✅ ${message}`, 'color: #10b981; font-weight: bold;', details || '');
    } else {
        console.log(`%c${prefix} ℹ️ ${message}`, 'color: #06b6d4;', details || '');
    }

    // Dispatch global custom event for AppContext / DebugConsole
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(TRIPO_LOG_EVENT, { detail: entry }));
    }

    // Notify internal subscribers
    logListeners.forEach(listener => {
        try {
            listener(entry);
        } catch (e) {
            console.error('Error in Tripo log listener', e);
        }
    });

    return entry;
};

export const getTripoLogs = (): TripoLogEntry[] => [...tripoLogBuffer];

export const clearTripoLogs = (): void => {
    tripoLogBuffer.length = 0;
};

export const subscribeTripoLogs = (callback: (entry: TripoLogEntry) => void): (() => void) => {
    logListeners.add(callback);
    return () => {
        logListeners.delete(callback);
    };
};
