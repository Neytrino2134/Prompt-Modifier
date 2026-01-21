
import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, ActiveOperation, Toast, ToastType, DraggingInfo, LogEntry, LogLevel, GlobalMediaState, Tool, LineStyle, Point, SmartGuide, DockMode } from '../types';

export const useGlobalState = (currentNodes: Node[]) => {
    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdCounter = useRef(0);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = toastIdCounter.current++;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    // Full Size Image Cache (In-Memory + React State for reactivity if needed)
    const [fullSizeImageCache, setFullSizeImageCache] = useState<Record<string, Record<number, string>>>({});

    const setFullSizeImage = useCallback((nodeId: string, frameNumber: number, dataUrl: string) => {
        // Update local state (for save/export)
        setFullSizeImageCache(prev => ({
            ...prev,
            [nodeId]: {
                ...(prev[nodeId] || {}),
                [frameNumber]: dataUrl
            }
        }));
    }, []);

    const getFullSizeImage = useCallback((nodeId: string, frameNumber: number) => {
        return fullSizeImageCache[nodeId]?.[frameNumber];
    }, [fullSizeImageCache]);

    const clearImagesForNodeFromCache = useCallback((nodeId: string) => {
        setFullSizeImageCache(prev => {
            const next = { ...prev };
            delete next[nodeId];
            return next;
        });
    }, []);

    const clearUnusedFullSizeImages = useCallback(() => {
        setFullSizeImageCache(prev => {
            const newCache: Record<string, Record<number, string>> = {};
            currentNodes.forEach(node => {
                if (prev[node.id]) {
                    newCache[node.id] = prev[node.id];
                }
            });
            const removedCount = Object.keys(prev).length - Object.keys(newCache).length;
            if (removedCount > 0) addToast(`Cleared ${removedCount} unused items from cache`, 'info');
            else addToast('Cache is already optimized', 'info');
            return newCache;
        });
    }, [currentNodes, addToast]);

    // Active Operations
    const [activeOperations, setActiveOperations] = useState<Map<string, ActiveOperation>>(new Map());

    const registerOperation = useCallback((op: ActiveOperation) => {
        setActiveOperations(prev => new Map(prev).set(op.id, op));
    }, []);

    const unregisterOperation = useCallback((id: string) => {
        setActiveOperations(prev => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, []);

    // Selection & Dragging
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [draggingInfo, setDraggingInfo] = useState<DraggingInfo | null>(null);

    // Welcome Screen
    const [showWelcome, setShowWelcome] = useState(false);

    // Error
    const [error, setError] = useState<string | null>(null);

    // Global Media Player
    const [globalMedia, setGlobalMedia] = useState<GlobalMediaState | null>(null);

    // Logs & Debug Console
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false);

    const addLog = useCallback((level: LogLevel, message: string, details?: any) => {
        setLogs(prev => [...prev, {
            id: `log-${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            level,
            message,
            details
        }].slice(-100)); // Keep last 100 logs
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    // View Settings
    const [isSnapToGrid, setIsSnapToGrid] = useState(false);
    const [lineStyle, setLineStyle] = useState<LineStyle>('orthogonal');
    const [isSmartGuidesEnabled, setIsSmartGuidesEnabled] = useState(false);
    const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
    
    // Tools
    const [activeTool, setActiveTool] = useState<Tool>('edit');
    const [spawnLine, setSpawnLine] = useState<{ start: Point; end: Point; fading: boolean; } | null>(null);

    // Docking
    const [dockHoverMode, setDockHoverMode] = useState<DockMode | null>(null);
    const [isDockingMenuVisible, setIsDockingMenuVisible] = useState(false);

    // App Settings (Initialize from localStorage where appropriate)
    const [isInstantCloseEnabled, setIsInstantCloseEnabled] = useState(() => localStorage.getItem('settings_instantNodeClose') === 'true');
    const [isHoverHighlightEnabled, setIsHoverHighlightEnabled] = useState(() => {
        const stored = localStorage.getItem('settings_hoverHighlight');
        return stored === null ? true : stored === 'true';
    });
    const [nodeAnimationMode, setNodeAnimationMode] = useState(() => localStorage.getItem('settings_nodeAnimationMode') || 'pulse');
    const [isConnectionAnimationEnabled, setIsConnectionAnimationEnabled] = useState(true);
    const [connectionOpacity, setConnectionOpacity] = useState(0.4);

    // Capture Console Logs
    useEffect(() => {
        const originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
        };

        console.log = (...args) => {
            originalConsole.log(...args);
        };
        
        console.warn = (...args) => {
            originalConsole.warn(...args);
            addLog('warning', args.map(String).join(' '));
        };

        console.error = (...args) => {
            originalConsole.error(...args);
            addLog('error', args.map(String).join(' '));
        };

        const handleWindowError = (event: ErrorEvent) => {
            addLog('error', event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        };
        window.addEventListener('error', handleWindowError);

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            addLog('error', `Unhandled Promise Rejection: ${event.reason}`, {
                reason: event.reason
            });
        };
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            console.log = originalConsole.log;
            console.info = originalConsole.info;
            console.warn = originalConsole.warn;
            console.error = originalConsole.error;
            window.removeEventListener('error', handleWindowError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [addLog]);

    return {
        toasts,
        addToast,
        fullSizeImageCache,
        setFullSizeImageCache,
        setFullSizeImage,
        getFullSizeImage,
        clearImagesForNodeFromCache,
        clearUnusedFullSizeImages,
        activeOperations,
        registerOperation,
        unregisterOperation,
        selectedNodeIds,
        setSelectedNodeIds,
        draggingInfo,
        setDraggingInfo,
        showWelcome,
        setShowWelcome,
        error,
        setError,
        globalMedia,
        setGlobalMedia,
        logs,
        addLog,
        clearLogs,
        isDebugConsoleOpen,
        setIsDebugConsoleOpen,
        isSnapToGrid, setIsSnapToGrid,
        lineStyle, setLineStyle,
        isSmartGuidesEnabled, setIsSmartGuidesEnabled,
        smartGuides, setSmartGuides,
        activeTool, setActiveTool,
        spawnLine, setSpawnLine,
        dockHoverMode, setDockHoverMode,
        isDockingMenuVisible, setIsDockingMenuVisible,
        isInstantCloseEnabled, setIsInstantCloseEnabled,
        isHoverHighlightEnabled, setIsHoverHighlightEnabled,
        nodeAnimationMode, setNodeAnimationMode,
        isConnectionAnimationEnabled, setIsConnectionAnimationEnabled,
        connectionOpacity, setConnectionOpacity,
    };
};
