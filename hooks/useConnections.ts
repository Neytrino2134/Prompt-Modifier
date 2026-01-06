
import { useState, useCallback } from 'react';
import { Connection, ToastType } from '../types';

export const useConnections = (initialConnections: Connection[], addToast: (message: string, type?: ToastType) => void, t: (key: string) => string) => {
    const [connections, setConnections] = useState<Connection[]>(() => 
        initialConnections.map((c: any, i) => ({
            ...c,
            id: c.id || `initial-conn-${Date.now()}-${i}` 
        }))
    );

    const addConnection = useCallback((newConnection: Omit<Connection, 'id'>) => {
        setConnections(current => {
            // Prevent duplicate connections (checking source AND target handles)
            if (current.some(c => 
                c.fromNodeId === newConnection.fromNodeId && 
                c.toNodeId === newConnection.toNodeId && 
                c.fromHandleId === newConnection.fromHandleId &&
                c.toHandleId === newConnection.toHandleId // Added this check
            )) {
                return current;
            }
            const connectionWithId: Connection = {
                ...newConnection,
                id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
            return [...current, connectionWithId];
        });
    }, []);

    const removeConnectionsByNodeId = useCallback((nodeId: string) => {
        setConnections(current => {
            const filtered = current.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
            if (filtered.length < current.length) {
                addToast(t('toast.connectionsCut'));
            }
            return filtered;
        });
    }, [addToast, t]);

    const removeConnectionById = useCallback((connectionId: string) => {
        setConnections(current => current.filter(c => c.id !== connectionId));
    }, []);
    
    return {
        connections,
        setConnections,
        addConnection,
        removeConnectionsByNodeId,
        removeConnectionById
    };
};
