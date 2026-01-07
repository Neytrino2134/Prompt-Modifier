
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Toast, ToastType, LineStyle, Point, DraggingInfo, SmartGuide, ActiveOperation, DockMode, Tool, NodeType, GlobalMediaState, Theme, LogEntry, LogLevel } from '../types';
import { useLanguage } from '../localization';

export const useGlobalState = (nodes: any[]) => {
    const { t } = useLanguage();
    
    // UI State
    const [showWelcome, setShowWelcome] = useState(true); 
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdCounter = useRef(0);
    const [isSnapToGrid, setIsSnapToGrid] = useState(false);
    const [lineStyle, setLineStyle] = useState<LineStyle>('orthogonal');
    const [spawnLine, setSpawnLine] = useState<{ start: Point; end: Point; fading: boolean; } | null>(null);
    const [activeTool, setActiveTool] = useState<Tool>('edit');
    const [draggingInfo, setDraggingInfo] = useState<DraggingInfo | null>(null);
    const [error, setErrorState] = useState<string | null>(null);
    const [fullSizeImageCache, setFullSizeImageCache] = useState<Record<string, Record<number, string>>>({});
    const [clearSelectionsSignal, setClearSelectionsSignal] = useState(0);
    const [globalImageEditor, setGlobalImageEditor] = useState<{ src: string } | null>(null);
    const [isSmartGuidesEnabled, setIsSmartGuidesEnabled] = useState(false);
    const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [isInstantCloseEnabled, setIsInstantCloseEnabled] = useState(false);
    const [isHoverHighlightEnabled, setIsHoverHighlightEnabled] = useState(true); 
    const [nodeAnimationMode, setNodeAnimationMode] = useState<string>('pulse'); 
    const [dockHoverMode, setDockHoverMode] = useState<DockMode | null>(null);
    const [isDockingMenuVisible, setIsDockingMenuVisible] = useState(false);
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    
    // Debug Logs
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false);
    
    // Connection Settings
    const [isConnectionAnimationEnabled, setIsConnectionAnimationEnabled] = useState(true);
    const [connectionOpacity, setConnectionOpacity] = useState(0.4);

    // NEW: Theme State
    const [currentTheme, setCurrentTheme] = useState<Theme>('cyan');

    // NEW: Global Media State (for background play)
    const [globalMedia, setGlobalMedia] = useState<GlobalMediaState | null>(null);
    
    // Active Operations Tracking
    const [activeOperations, setActiveOperations] = useState<Map<string, ActiveOperation>>(new Map());

    useEffect(() => {
        const storedInstant = localStorage.getItem('settings_instantNodeClose');
        setIsInstantCloseEnabled(storedInstant === 'true');

        const storedHoverHighlight = localStorage.getItem('settings_hoverHighlight');
        if (storedHoverHighlight !== null) {
            setIsHoverHighlightEnabled(storedHoverHighlight === 'true');
        }
        
        const storedConnAnim = localStorage.getItem('settings_connectionAnimation');
        if (storedConnAnim !== null) {
            setIsConnectionAnimationEnabled(storedConnAnim === 'true');
        }

        const storedConnOpacity = localStorage.getItem('settings_connectionOpacity');
        if (storedConnOpacity !== null) {
            const parsed = parseFloat(storedConnOpacity);
            if (!isNaN(parsed)) setConnectionOpacity(parsed);
        }

        const storedAnimMode = localStorage.getItem('settings_nodeAnimationMode');
        // Handle legacy boolean migration if necessary, default to 'pulse' if not set
        if (storedAnimMode) {
             setNodeAnimationMode(storedAnimMode);
        } else {
             // Check legacy boolean
             const legacyAnim = localStorage.getItem('settings_nodeAnimation');
             if (legacyAnim === 'false') {
                 setNodeAnimationMode('none');
             } else {
                 setNodeAnimationMode('pulse');
             }
        }
        
        // Initialize Theme from storage or default
        const storedTheme = localStorage.getItem('settings_theme') as Theme;
        if (storedTheme && ['cyan', 'orange', 'pink', 'gray'].includes(storedTheme)) {
            setCurrentTheme(storedTheme);
        }
    }, []);

    // Effect to apply theme to document body
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('settings_theme', currentTheme);
    }, [currentTheme]);

    const setTheme = useCallback((theme: Theme) => {
        setCurrentTheme(theme);
    }, []);
    
    const setConnectionAnimation = useCallback((enabled: boolean) => {
        setIsConnectionAnimationEnabled(enabled);
        localStorage.setItem('settings_connectionAnimation', String(enabled));
    }, []);

    const setOpacity = useCallback((opacity: number) => {
        setConnectionOpacity(opacity);
        localStorage.setItem('settings_connectionOpacity', String(opacity));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = toastIdCounter.current++;
        setToasts(current => [...current, { id, message, type }]);
        setTimeout(() => {
            setToasts(current => current.filter(t => t.id !== id));
        }, 3000);
    }, []);

    // Enhanced Logging
    const addLog = useCallback((level: LogLevel, message: string, details?: any) => {
        setLogs(prev => {
            const newEntry: LogEntry = {
                id: `log-${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                level,
                message,
                details
            };
            // Keep last 100 logs
            const updated = [newEntry, ...prev];
            return updated.slice(0, 100);
        });
        
        // Auto-open console on error if critical
        if (level === 'error') {
            // Optional: setIsDebugConsoleOpen(true); 
        }
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    // Intercept setError to log it
    const setError = useCallback((msg: string | null) => {
        setErrorState(msg);
        if (msg) {
            // Attempt to parse if it looks like JSON to store details separately
            if (msg.trim().startsWith('{') || msg.trim().includes('{"error":')) {
                try {
                    // Extract JSON part if mixed with text
                    const jsonStart = msg.indexOf('{');
                    const jsonEnd = msg.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                         const jsonStr = msg.substring(jsonStart, jsonEnd + 1);
                         const parsed = JSON.parse(jsonStr);
                         const textMsg = msg.substring(0, jsonStart).trim() || parsed.error?.message || "API Error";
                         addLog('error', textMsg, parsed);
                         return;
                    }
                } catch {}
            }
            addLog('error', msg);
        }
    }, [addLog]);

    const registerOperation = useCallback((op: ActiveOperation) => {
        setActiveOperations(prev => {
            const newMap = new Map(prev);
            newMap.set(op.id, op);
            return newMap;
        });
    }, []);

    const unregisterOperation = useCallback((id: string) => {
        setActiveOperations(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
    }, []);

    const clearImagesForNodeFromCache = useCallback((nodeId: string) => {
        setFullSizeImageCache(prev => {
            const newCache = {...prev};
            delete newCache[nodeId];
            return newCache;
        });
    }, []);

    const setFullSizeImage = useCallback((nodeId: string, frameNumber: number, dataUrl: string) => {
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

    const clearUnusedFullSizeImages = useCallback(() => {
        setFullSizeImageCache(prevCache => {
            const currentNodesSet = new Set(nodes.map(n => n.id));
            const newCache: typeof prevCache = {};
            let clearedCount = 0;

            Object.keys(prevCache).forEach(nodeId => {
                if (currentNodesSet.has(nodeId)) {
                    newCache[nodeId] = prevCache[nodeId];
                } else {
                    clearedCount++;
                }
            });

            if (clearedCount > 0) {
                addToast(t('toast.cacheCleared', { count: clearedCount }));
            } else {
                addToast(t('toast.cacheEmpty'));
            }
            return newCache;
        });
    }, [nodes, addToast, t]);

    const openGlobalImageEditor = useCallback((src: string) => {
        setGlobalImageEditor({ src });
    }, []);

    const closeGlobalImageEditor = useCallback(() => {
        setGlobalImageEditor(null);
    }, []);

    const toggleNodeFullScreen = useCallback((nodeId: string | null) => {
        setFocusedNodeId(nodeId);
    }, []);

    return {
        showWelcome, setShowWelcome, 
        toasts, addToast,
        isSnapToGrid, setIsSnapToGrid,
        lineStyle, setLineStyle,
        spawnLine, setSpawnLine,
        activeTool, setActiveTool,
        draggingInfo, setDraggingInfo,
        error, setError,
        logs, addLog, clearLogs, isDebugConsoleOpen, setIsDebugConsoleOpen,
        fullSizeImageCache, setFullSizeImageCache,
        clearSelectionsSignal, setClearSelectionsSignal,
        globalImageEditor, openGlobalImageEditor, closeGlobalImageEditor,
        isSmartGuidesEnabled, setIsSmartGuidesEnabled,
        smartGuides, setSmartGuides,
        selectedNodeIds, setSelectedNodeIds,
        isInstantCloseEnabled, setIsInstantCloseEnabled,
        isHoverHighlightEnabled, setIsHoverHighlightEnabled,
        nodeAnimationMode, setNodeAnimationMode,
        dockHoverMode, setDockHoverMode,
        isDockingMenuVisible, setIsDockingMenuVisible,
        activeOperations, registerOperation, unregisterOperation,
        setFullSizeImage, getFullSizeImage, clearImagesForNodeFromCache, clearUnusedFullSizeImages,
        t,
        focusedNodeId, toggleNodeFullScreen,
        globalMedia, setGlobalMedia,
        currentTheme, setTheme,
        isConnectionAnimationEnabled, setIsConnectionAnimationEnabled: setConnectionAnimation,
        connectionOpacity, setConnectionOpacity: setOpacity
    };
};