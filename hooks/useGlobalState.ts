
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Toast, ToastType, LineStyle, Point, DraggingInfo, SmartGuide, ActiveOperation, DockMode, Tool, NodeType, GlobalMediaState, Theme } from '../types';
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
    const [error, setError] = useState<string | null>(null);
    const [fullSizeImageCache, setFullSizeImageCache] = useState<Record<string, Record<number, string>>>({});
    const [clearSelectionsSignal, setClearSelectionsSignal] = useState(0);
    const [globalImageEditor, setGlobalImageEditor] = useState<{ src: string } | null>(null);
    const [isSmartGuidesEnabled, setIsSmartGuidesEnabled] = useState(false);
    const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [isInstantCloseEnabled, setIsInstantCloseEnabled] = useState(false);
    const [nodeAnimationMode, setNodeAnimationMode] = useState<string>('pulse'); 
    const [dockHoverMode, setDockHoverMode] = useState<DockMode | null>(null);
    const [isDockingMenuVisible, setIsDockingMenuVisible] = useState(false);
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    
    // NEW: Theme State
    const [currentTheme, setCurrentTheme] = useState<Theme>('cyan');

    // NEW: Global Media State (for background play)
    const [globalMedia, setGlobalMedia] = useState<GlobalMediaState | null>(null);
    
    // Active Operations Tracking
    const [activeOperations, setActiveOperations] = useState<Map<string, ActiveOperation>>(new Map());

    useEffect(() => {
        const storedInstant = localStorage.getItem('settings_instantNodeClose');
        setIsInstantCloseEnabled(storedInstant === 'true');

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

    const addToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = toastIdCounter.current++;
        setToasts(current => [...current, { id, message, type }]);
        setTimeout(() => {
            setToasts(current => current.filter(t => t.id !== id));
        }, 3000);
    }, []);

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
        fullSizeImageCache, setFullSizeImageCache,
        clearSelectionsSignal, setClearSelectionsSignal,
        globalImageEditor, openGlobalImageEditor, closeGlobalImageEditor,
        isSmartGuidesEnabled, setIsSmartGuidesEnabled,
        smartGuides, setSmartGuides,
        selectedNodeIds, setSelectedNodeIds,
        isInstantCloseEnabled, setIsInstantCloseEnabled,
        nodeAnimationMode, setNodeAnimationMode,
        dockHoverMode, setDockHoverMode,
        isDockingMenuVisible, setIsDockingMenuVisible,
        activeOperations, registerOperation, unregisterOperation,
        setFullSizeImage, getFullSizeImage, clearImagesForNodeFromCache, clearUnusedFullSizeImages,
        t,
        focusedNodeId, toggleNodeFullScreen,
        globalMedia, setGlobalMedia,
        currentTheme, setTheme // Export Theme
    };
};
