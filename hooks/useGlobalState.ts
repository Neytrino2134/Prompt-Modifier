import { useFullSizeImageCache } from './useFullSizeImageCache';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, ActiveOperation, Toast, ToastType, DraggingInfo, LogEntry, LogLevel, GlobalMediaState, Tool, LineStyle, Point, SmartGuide, DockMode, Theme, CanvasColorMode, InputColorMode, PanelStyle, PanelAnimation, CursorSkin, ConnectionAnimationStyle, ConnectionAnimationConfig, DEFAULT_CONNECTION_ANIMATION_CONFIG } from '../types';
import {
  PanelAnimationConfig,
  DEFAULT_PANEL_ANIMATION_CONFIG,
  DEFAULT_BUBBLE_CONFIG,
  DEFAULT_CYBER_CONFIG,
} from '../components/settings/appearance/panelAnimationDefinitions';
import {
  getTrayNotificationSettings,
  TRAY_SETTINGS_CHANGED_EVENT,
  TrayNotificationSettings,
} from '../services/trayNotificationService';

export const useGlobalState = (currentNodes: Node[]) => {
    // Logs & Debug Console
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logBuffer = useRef<LogEntry[]>([]);
    const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false);

    const addLog = useCallback((level: LogLevel, message: string, details?: any) => {
        const newLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: Date.now(),
            level,
            message,
            details
        };
        logBuffer.current = [...logBuffer.current, newLog].slice(-200);
        // Defer state update to ensure it never fires synchronously during another component's render phase (e.g. console interception)
        setTimeout(() => {
            setLogs(prev => [...prev, newLog].slice(-200));
        }, 0);
    }, []);

    // Sync buffer to state periodically as a safety fallback
    useEffect(() => {
        const handleTripoLog = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent?.detail) {
                const { level, message, details } = customEvent.detail;
                addLog(level, `[Tripo 3D] ${message}`, details);
            }
        };

        window.addEventListener('tripo-log-event', handleTripoLog);

        const interval = setInterval(() => {
            if (logBuffer.current.length > 0) {
                setLogs(prev => {
                    if (prev.length > 0 && logBuffer.current.length > 0) {
                        if (prev[prev.length - 1].id === logBuffer.current[logBuffer.current.length - 1].id) {
                            return prev;
                        }
                    }
                    return [...logBuffer.current];
                });
            }
        }, 1000);
        return () => {
            window.removeEventListener('tripo-log-event', handleTripoLog);
            clearInterval(interval);
        };
    }, [addLog]);

    const clearLogs = useCallback(() => {
        logBuffer.current = [];
        setLogs([]);
    }, []);

    // Toasts (Header Notifications)
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdCounter = useRef(0);

    // Synchronize toasts with mute settings - clear any accumulated toasts when muted
    useEffect(() => {
        const handleTraySettingsChange = (e: CustomEvent<TrayNotificationSettings>) => {
            if (e.detail && e.detail.enabled === false) {
                setToasts([]);
            }
        };
        window.addEventListener(TRAY_SETTINGS_CHANGED_EVENT as any, handleTraySettingsChange as EventListener);
        return () => {
            window.removeEventListener(TRAY_SETTINGS_CHANGED_EVENT as any, handleTraySettingsChange as EventListener);
        };
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info', action?: { label: string, onClick: () => void }) => {
        // Always log every toast notification to System Logs regardless of mute state
        const logLevel: LogLevel = type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info';
        addLog(logLevel, `[Notification] ${message}`, action ? { actionLabel: action.label } : undefined);

        // Check if notifications are muted - if muted, do NOT accumulate in toasts queue
        if (!getTrayNotificationSettings().enabled) {
            return;
        }

        const id = toastIdCounter.current++;
        const newToast: Toast = { id, message, type, action };
        setToasts(prev => [...prev.slice(-3), newToast]);
    }, [addLog]);

    // Full Size Image Cache (In-Memory + React State for reactivity if needed)
    const { fullSizeImageCache, setFullSizeImageCache, setFullSizeImage, getFullSizeImage } = useFullSizeImageCache();

    const clearImagesForNodeFromCache = useCallback((nodeId: string) => {
        setFullSizeImageCache(prev => {
            const next = { ...prev };
            delete next[nodeId];
            return next;
        });
    }, []);

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
    const [selectedNodeIds, _setSelectedNodeIds] = useState<string[]>([]);
    const [draggingInfo, setDraggingInfo] = useState<DraggingInfo | null>(null);
    const [clearSelectionsSignal, setClearSelectionsSignal] = useState(0);

    const setSelectedNodeIds = useCallback((value: string[] | ((prev: string[]) => string[])) => {
         _setSelectedNodeIds(value);
    }, []);

    const prevSelectedCount = useRef(0);
    useEffect(() => {
        if (selectedNodeIds.length === 0 && prevSelectedCount.current > 0) {
            setClearSelectionsSignal(s => s + 1);
        }
        prevSelectedCount.current = selectedNodeIds.length;
    }, [selectedNodeIds.length]);

    // Global Image Editor
    const [globalImageEditor, setGlobalImageEditor] = useState<{ src: string } | null>(null);
    const openGlobalImageEditor = useCallback((src: string) => setGlobalImageEditor({ src }), []);
    const closeGlobalImageEditor = useCallback(() => setGlobalImageEditor(null), []);

    // Welcome Screen
    const [showWelcome, setShowWelcome] = useState(true);

    // Error
    const [error, setError] = useState<string | null>(null);

    // Global Media Player
    const [globalMedia, setGlobalMedia] = useState<GlobalMediaState | null>(null);

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

    // Node Focus (Full Screen)
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const toggleNodeFullScreen = useCallback((nodeId: string | null) => {
        setFocusedNodeId(nodeId);
    }, []);

    // App Settings (Initialize from localStorage where appropriate)
    const [isInstantCloseEnabled, setIsInstantCloseEnabled] = useState(() => localStorage.getItem('settings_instantNodeClose') === 'true');
    const [isImageDropMenuEnabled, setIsImageDropMenuEnabledState] = useState<boolean>(() => {
        const stored = localStorage.getItem('settings_imageDropMenu');
        return stored === null ? true : stored === 'true';
    });
    const setIsImageDropMenuEnabled = useCallback((enabled: boolean) => {
        setIsImageDropMenuEnabledState(enabled);
        localStorage.setItem('settings_imageDropMenu', enabled ? 'true' : 'false');
    }, []);
    const [isHoverHighlightEnabled, setIsHoverHighlightEnabled] = useState(() => {
        const stored = localStorage.getItem('settings_hoverHighlight');
        return stored === null ? true : stored === 'true';
    });
    const [isBringToFrontOnHoverEnabled, setIsBringToFrontOnHoverEnabled] = useState(() => {
        const stored = localStorage.getItem('settings_bringToFrontOnHover');
        return stored === null ? true : stored === 'true';
    });
    const [nodeAnimationMode, setNodeAnimationMode] = useState(() => localStorage.getItem('settings_nodeAnimationMode') || 'pulse');
    const [isConnectionAnimationEnabled, setIsConnectionAnimationEnabled] = useState(() => {
        const stored = localStorage.getItem('settings_connectionAnimation');
        return stored === null ? true : stored === 'true';
    });
    const [connectionOpacity, setConnectionOpacity] = useState(() => {
        const stored = localStorage.getItem('settings_connectionOpacity');
        return stored === null ? 0.4 : parseFloat(stored) || 0.4;
    });
    const [connectionAnimationStyle, setConnectionAnimationStyleState] = useState<ConnectionAnimationStyle>(() => {
        return (localStorage.getItem('settings_connectionAnimationStyle') as ConnectionAnimationStyle) || 'cyber_tron';
    });
    const [connectionAnimationConfig, setConnectionAnimationConfigState] = useState<ConnectionAnimationConfig>(() => {
        try {
            const saved = localStorage.getItem('settings_connectionAnimationConfig');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...DEFAULT_CONNECTION_ANIMATION_CONFIG, ...parsed };
            }
        } catch (e) {
            console.error('Failed to parse connection animation config', e);
        }
        return DEFAULT_CONNECTION_ANIMATION_CONFIG;
    });

    const setConnectionAnimationStyle = useCallback((style: ConnectionAnimationStyle) => {
        setConnectionAnimationStyleState(style);
        localStorage.setItem('settings_connectionAnimationStyle', style);
        setConnectionAnimationConfigState(prev => {
            const updated = { ...prev, style };
            try {
                localStorage.setItem('settings_connectionAnimationConfig', JSON.stringify(updated));
            } catch (e) {
                console.error('Failed to save connection animation config', e);
            }
            return updated;
        });
    }, []);

    const setConnectionAnimationConfig = useCallback((configOrUpdater: React.SetStateAction<ConnectionAnimationConfig>) => {
        setConnectionAnimationConfigState(prev => {
            const next = typeof configOrUpdater === 'function' ? configOrUpdater(prev) : configOrUpdater;
            try {
                localStorage.setItem('settings_connectionAnimationConfig', JSON.stringify(next));
                if (next.style) {
                    localStorage.setItem('settings_connectionAnimationStyle', next.style);
                    setConnectionAnimationStyleState(next.style);
                }
            } catch (e) {
                console.error('Failed to save connection animation config', e);
            }
            return next;
        });
    }, []);

    const updateConnectionAnimationConfig = useCallback((partial: Partial<ConnectionAnimationConfig>) => {
        setConnectionAnimationConfigState(prev => {
            const updated = { ...prev, ...partial };
            try {
                localStorage.setItem('settings_connectionAnimationConfig', JSON.stringify(updated));
                if (partial.style) {
                    localStorage.setItem('settings_connectionAnimationStyle', partial.style);
                    setConnectionAnimationStyleState(partial.style);
                }
            } catch (e) {
                console.error('Failed to save connection animation config', e);
            }
            return updated;
        });
    }, []);

    const resetConnectionAnimationConfig = useCallback(() => {
        setConnectionAnimationConfigState(DEFAULT_CONNECTION_ANIMATION_CONFIG);
        setConnectionAnimationStyleState(DEFAULT_CONNECTION_ANIMATION_CONFIG.style);
        try {
            localStorage.setItem('settings_connectionAnimationConfig', JSON.stringify(DEFAULT_CONNECTION_ANIMATION_CONFIG));
            localStorage.setItem('settings_connectionAnimationStyle', DEFAULT_CONNECTION_ANIMATION_CONFIG.style);
        } catch (e) {
            console.error('Failed to reset connection animation config', e);
        }
    }, []);

    const [isConnectionConfigOpen, setIsConnectionConfigOpen] = useState(false);
    const [autoSaveInterval, setAutoSaveIntervalState] = useState<number>(() => {
        const stored = localStorage.getItem('settings_autoSaveInterval');
        return stored === null ? 60 : parseInt(stored, 10);
    });

    const setAutoSaveInterval = useCallback((val: number) => {
        setAutoSaveIntervalState(val);
        localStorage.setItem('settings_autoSaveInterval', val.toString());
    }, []);

    // Auto-Save History Limit (0 = Unlimited, or 3, 5, 10, 15, 20, 30, 50)
    const [autoSaveHistoryLimit, setAutoSaveHistoryLimitState] = useState<number>(() => {
        const stored = localStorage.getItem('settings_autoSaveHistoryLimit');
        return stored === null ? 5 : parseInt(stored, 10);
    });

    const setAutoSaveHistoryLimit = useCallback((limit: number) => {
        setAutoSaveHistoryLimitState(limit);
        localStorage.setItem('settings_autoSaveHistoryLimit', limit.toString());
    }, []);

    // Auto-Save Session Count Limit (1 to 5, default 2)
    const [autoSaveSessionLimit, setAutoSaveSessionLimitState] = useState<number>(() => {
        const stored = localStorage.getItem('settings_autoSaveSessionLimit');
        return stored === null ? 2 : Math.max(1, Math.min(5, parseInt(stored, 10)));
    });

    const setAutoSaveSessionLimit = useCallback((limit: number) => {
        const val = Math.max(1, Math.min(5, limit));
        setAutoSaveSessionLimitState(val);
        localStorage.setItem('settings_autoSaveSessionLimit', val.toString());
    }, []);

    // Theme Settings
    const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
        return (localStorage.getItem('settings_theme') as Theme) || 'cyan';
    });

    const setTheme = useCallback((theme: Theme) => {
        setCurrentTheme(theme);
        localStorage.setItem('settings_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, []);

    // Canvas Background Color Mode (static dark blue vs dynamic theme-matched)
    const [canvasColorMode, setCanvasColorModeState] = useState<CanvasColorMode>(() => {
        return (localStorage.getItem('settings_canvasColorMode') as CanvasColorMode) || 'dynamic';
    });

    const setCanvasColorMode = useCallback((mode: CanvasColorMode) => {
        setCanvasColorModeState(mode);
        localStorage.setItem('settings_canvasColorMode', mode);
        document.documentElement.setAttribute('data-canvas-bg', mode);
    }, []);

    // Text Fields / Inputs Background Color Mode (static dark blue vs dynamic theme-matched)
    const [inputColorMode, setInputColorModeState] = useState<InputColorMode>(() => {
        return (localStorage.getItem('settings_inputColorMode') as InputColorMode) || 'dynamic';
    });

    const setInputColorMode = useCallback((mode: InputColorMode) => {
        setInputColorModeState(mode);
        localStorage.setItem('settings_inputColorMode', mode);
        document.documentElement.setAttribute('data-input-bg', mode);
    }, []);

    // Panel Style & Auto-hide Settings
    const [panelStyle, setPanelStyleState] = useState<PanelStyle>(() => {
        return (localStorage.getItem('settings_panelStyle') as PanelStyle) || 'modern';
    });

    const setPanelStyle = useCallback((style: PanelStyle) => {
        setPanelStyleState(style);
        localStorage.setItem('settings_panelStyle', style);
    }, []);

    const [isPanelAutoHide, setIsPanelAutoHideState] = useState<boolean>(() => {
        const stored = localStorage.getItem('settings_panelAutoHide');
        return stored === null ? true : stored === 'true';
    });

    const setIsPanelAutoHide = useCallback((autoHide: boolean) => {
        setIsPanelAutoHideState(autoHide);
        localStorage.setItem('settings_panelAutoHide', autoHide ? 'true' : 'false');
    }, []);

    // Top Panel Animation Mode
    const [panelAnimation, setPanelAnimationState] = useState<PanelAnimation>(() => {
        return (localStorage.getItem('settings_panelAnimation') as PanelAnimation) || 'shimmer';
    });

    const setPanelAnimation = useCallback((anim: PanelAnimation) => {
        setPanelAnimationState(anim);
        localStorage.setItem('settings_panelAnimation', anim);
    }, []);

    // Theme Adaptive for Panel Animation
    const [isPanelAnimationAdaptive, setIsPanelAnimationAdaptiveState] = useState<boolean>(() => {
        const stored = localStorage.getItem('settings_panelAnimationAdaptive');
        return stored === null ? true : stored === 'true';
    });

    const setIsPanelAnimationAdaptive = useCallback((adaptive: boolean) => {
        setIsPanelAnimationAdaptiveState(adaptive);
        localStorage.setItem('settings_panelAnimationAdaptive', adaptive ? 'true' : 'false');
    }, []);

    // Panel Animation Config Parameters (Bubbles, Cyber Grid, etc.)
    const [panelAnimationConfig, setPanelAnimationConfigState] = useState<PanelAnimationConfig>(() => {
        try {
            const saved = localStorage.getItem('settings_panelAnimationConfig');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    shapes_bubbles: { ...DEFAULT_BUBBLE_CONFIG, ...(parsed.shapes_bubbles || {}) },
                    shapes_cyber: { ...DEFAULT_CYBER_CONFIG, ...(parsed.shapes_cyber || {}) },
                };
            }
        } catch (e) {
            console.error('Failed to parse panel animation config', e);
        }
        return DEFAULT_PANEL_ANIMATION_CONFIG;
    });

    const setPanelAnimationConfig = useCallback((configOrUpdater: React.SetStateAction<PanelAnimationConfig>) => {
        setPanelAnimationConfigState(prev => {
            const next = typeof configOrUpdater === 'function' ? configOrUpdater(prev) : configOrUpdater;
            try {
                localStorage.setItem('settings_panelAnimationConfig', JSON.stringify(next));
            } catch (e) {
                console.error('Failed to save panel animation config', e);
            }
            return next;
        });
    }, []);

    const updatePanelAnimationConfig = useCallback(<K extends keyof PanelAnimationConfig>(
        animKey: K,
        partial: Partial<PanelAnimationConfig[K]>
    ) => {
        setPanelAnimationConfigState(prev => {
            const updated = {
                ...prev,
                [animKey]: {
                    ...prev[animKey],
                    ...partial,
                },
            };
            try {
                localStorage.setItem('settings_panelAnimationConfig', JSON.stringify(updated));
            } catch (e) {
                console.error('Failed to save panel animation config', e);
            }
            return updated;
        });
    }, []);

    const resetPanelAnimationConfig = useCallback((animKey?: keyof PanelAnimationConfig) => {
        setPanelAnimationConfigState(prev => {
            let updated: PanelAnimationConfig;
            if (animKey === 'shapes_bubbles') {
                updated = { ...prev, shapes_bubbles: { ...DEFAULT_BUBBLE_CONFIG } };
            } else if (animKey === 'shapes_cyber') {
                updated = { ...prev, shapes_cyber: { ...DEFAULT_CYBER_CONFIG } };
            } else {
                updated = {
                    shapes_bubbles: { ...DEFAULT_BUBBLE_CONFIG },
                    shapes_cyber: { ...DEFAULT_CYBER_CONFIG },
                };
            }
            try {
                localStorage.setItem('settings_panelAnimationConfig', JSON.stringify(updated));
            } catch (e) {
                console.error('Failed to reset panel animation config', e);
            }
            return updated;
        });
    }, []);

    // Parameters Dialog Modal State
    const [isPanelAnimationConfigOpen, setIsPanelAnimationConfigOpen] = useState(false);
    const [panelAnimationConfigActiveTab, setPanelAnimationConfigActiveTab] = useState<keyof PanelAnimationConfig>('shapes_bubbles');

    const openPanelAnimationConfig = useCallback((anim?: PanelAnimation) => {
        if (anim === 'shapes_cyber') {
            setPanelAnimationConfigActiveTab('shapes_cyber');
        } else if (anim === 'shapes_bubbles') {
            setPanelAnimationConfigActiveTab('shapes_bubbles');
        } else if (panelAnimation === 'shapes_cyber') {
            setPanelAnimationConfigActiveTab('shapes_cyber');
        } else {
            setPanelAnimationConfigActiveTab('shapes_bubbles');
        }
        setIsPanelAnimationConfigOpen(true);
    }, [panelAnimation]);

    // Cursor Skin Setting
    const [cursorSkin, setCursorSkinState] = useState<CursorSkin>(() => {
        return (localStorage.getItem('settings_cursorSkin') as CursorSkin) || 'default';
    });

    const setCursorSkin = useCallback((skin: CursorSkin) => {
        setCursorSkinState(skin);
        localStorage.setItem('settings_cursorSkin', skin);
        document.documentElement.setAttribute('data-cursor-skin', skin);
    }, []);

    // Cursor Click Feedback Effect Setting
    const [isCursorEffectEnabled, setIsCursorEffectEnabledState] = useState<boolean>(() => {
        const stored = localStorage.getItem('settings_cursorEffect');
        return stored === null ? false : stored === 'true';
    });

    const setIsCursorEffectEnabled = useCallback((enabled: boolean) => {
        setIsCursorEffectEnabledState(enabled);
        localStorage.setItem('settings_cursorEffect', enabled ? 'true' : 'false');
    }, []);

    // Apply theme & cursor & canvas mode on mount/change
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }, [currentTheme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-canvas-bg', canvasColorMode);
    }, [canvasColorMode]);

    useEffect(() => {
        document.documentElement.setAttribute('data-input-bg', inputColorMode);
    }, [inputColorMode]);

    useEffect(() => {
        document.documentElement.setAttribute('data-cursor-skin', cursorSkin);
    }, [cursorSkin]);

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
        removeToast,
        fullSizeImageCache,
        setFullSizeImageCache,
        setFullSizeImage,
        getFullSizeImage,
        clearImagesForNodeFromCache,
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
        focusedNodeId, toggleNodeFullScreen,
        isInstantCloseEnabled, setIsInstantCloseEnabled,
        isImageDropMenuEnabled, setIsImageDropMenuEnabled,
        isHoverHighlightEnabled, setIsHoverHighlightEnabled,
        isBringToFrontOnHoverEnabled, setIsBringToFrontOnHoverEnabled,
        nodeAnimationMode, setNodeAnimationMode,
        isConnectionAnimationEnabled, setIsConnectionAnimationEnabled,
        connectionOpacity, setConnectionOpacity,
        connectionAnimationStyle, setConnectionAnimationStyle,
        connectionAnimationConfig, setConnectionAnimationConfig,
        updateConnectionAnimationConfig, resetConnectionAnimationConfig,
        isConnectionConfigOpen, setIsConnectionConfigOpen,
        autoSaveInterval, setAutoSaveInterval,
        autoSaveHistoryLimit, setAutoSaveHistoryLimit,
        autoSaveSessionLimit, setAutoSaveSessionLimit,
        currentTheme, setTheme,
        canvasColorMode, setCanvasColorMode,
        inputColorMode, setInputColorMode,
        panelStyle, setPanelStyle,
        isPanelAutoHide, setIsPanelAutoHide,
        panelAnimation, setPanelAnimation,
        isPanelAnimationAdaptive, setIsPanelAnimationAdaptive,
        panelAnimationConfig, setPanelAnimationConfig,
        updatePanelAnimationConfig, resetPanelAnimationConfig,
        isPanelAnimationConfigOpen, setIsPanelAnimationConfigOpen,
        panelAnimationConfigActiveTab, setPanelAnimationConfigActiveTab,
        openPanelAnimationConfig,
        cursorSkin, setCursorSkin,
        isCursorEffectEnabled, setIsCursorEffectEnabled,
        clearSelectionsSignal,
        globalImageEditor,
        openGlobalImageEditor,
        closeGlobalImageEditor,
    };
};
