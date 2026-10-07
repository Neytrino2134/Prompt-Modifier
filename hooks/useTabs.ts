
import { useState, useCallback, useEffect, useRef } from 'react';
import { type Tab, type CanvasState, NodeType } from '../types';
import { clearImagesForTabFromCache } from '../utils/imageMemoryCache';
import { getTranslation, LanguageCode } from '../localization';
import { generateCanvasScreenshot } from '../utils/canvasScreenshot';
import { selectLatestSession } from '../services/sessionRecovery';

// --- IndexedDB Logic for Session Persistence ---
const SESSION_DB_NAME = 'PromptModifierSessionDB';
const SESSION_STORE = 'AppState';
const SESSION_KEY = 'latest_session';
const SESSION_DB_VERSION = 1;

const getSessionDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(SESSION_DB_NAME, SESSION_DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(SESSION_STORE)) {
                request.result.createObjectStore(SESSION_STORE);
            }
        };
    });
};

let pendingSessionSave: Promise<void> = Promise.resolve();
let lastSessionTimestamp = 0;
export const saveSessionToDB = (
    tabs: Tab[], activeTabId: string, screenshot?: string, isSnapshot = false
): Promise<void> => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location?.search || '').has('detachedNodeId')) return Promise.resolve();
    const operation = pendingSessionSave.then(() => persistSessionToDB(tabs, activeTabId, screenshot, isSnapshot));
    pendingSessionSave = operation.catch(() => {});
    return operation;
};

const persistSessionToDB = async (
    tabs: Tab[],
    activeTabId: string,
    screenshot?: string,
    isSnapshot = false
): Promise<void> => {
    // 1. Identify active tab to generate high-fidelity preview for the active canvas
    const activeTab = (activeTabId ? tabs.find(t => t.id === activeTabId) : null) || tabs[0];
    const screenshotData = screenshot !== undefined && screenshot !== ''
        ? screenshot
        : (activeTab?.state ? generateCanvasScreenshot(activeTab.state) : '');

    const limitStr = typeof window !== 'undefined' ? localStorage.getItem('settings_autoSaveHistoryLimit') : null;
    const historyLimit = limitStr !== null ? parseInt(limitStr, 10) : 5;

    const sessionLimitStr = typeof window !== 'undefined' ? localStorage.getItem('settings_autoSaveSessionLimit') : null;
    const sessionLimit = sessionLimitStr !== null ? Math.max(1, Math.min(5, parseInt(sessionLimitStr, 10))) : 2;

    const sessionObj = {
        id: SESSION_KEY,
        tabs,
        activeTabId,
        savedAt: lastSessionTimestamp = Math.max(Date.now(), lastSessionTimestamp + 1),
        screenshot: screenshotData,
        historyLimit,
        sessionLimit,
        isSnapshot: Boolean(isSnapshot),
    };

    let diskError: unknown;
    let recoveryError: unknown;
    // 1. Electron File Storage (100% durable & crash-resistant on desktop)
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveSession) {
        try {
            const result = await (window as any).electronAPI.saveSession(sessionObj);
            if (result?.success === false) throw new Error(result.error || 'Desktop session save failed');
        } catch (e) {
            diskError = e;
            console.warn("Failed to save session via Electron API:", e);
        }
    }

    // 2. IndexedDB (primary fast local database)
    try {
        const db = await getSessionDB();
        try { await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(SESSION_STORE, 'readwrite');
            const store = transaction.objectStore(SESSION_STORE);
            store.put(sessionObj, SESSION_KEY);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error("Failed to save session to DB"));
            transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
        }); } finally { db.close(); }
    } catch (e) {
        recoveryError = e;
        console.warn("Failed to save session to IndexedDB:", e);
    }

    // 3. LocalStorage Fallback (lightweight without massive binary cache to avoid QuotaExceededError)
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const safeTabs = tabs.map(t => ({
                ...t,
                state: {
                    ...t.state,
                    fullSizeImageCache: {}
                }
            }));
            const payload = {
                tabs: safeTabs,
                activeTabId,
                savedAt: sessionObj.savedAt,
                screenshot: screenshotData
            };
            localStorage.setItem('prompt_modifier_session_backup', JSON.stringify(payload));

            // Only append to history list if this is a snapshot backup
            if (isSnapshot) {
                try {
                    const historyRaw = localStorage.getItem('prompt_modifier_session_history');
                    let historyList = historyRaw ? JSON.parse(historyRaw) : [];
                    if (!Array.isArray(historyList)) historyList = [];

                    const historyItem = {
                        filename: `browser_snapshot_${new Date(sessionObj.savedAt).toLocaleDateString().replace(/\//g, '-')}_${new Date(sessionObj.savedAt).toLocaleTimeString().replace(/:/g, '-')}.json`,
                        path: `localStorage://history_${sessionObj.savedAt}`,
                        savedAt: sessionObj.savedAt,
                        tabCount: safeTabs.length,
                        tabNames: safeTabs.map((tab: any) => tab.name || 'Untitled'),
                        screenshot: screenshotData,
                        tabs: safeTabs,
                        activeTabId,
                    };

                    historyList.unshift(historyItem);
                    const effectiveHistoryLimit = historyLimit > 0 ? historyLimit : 5;
                    const effectiveSessionLimit = sessionLimit > 0 ? sessionLimit : 2;
                    const maxTotalWebSnapshots = effectiveHistoryLimit * effectiveSessionLimit;
                    if (historyList.length > maxTotalWebSnapshots) {
                        historyList = historyList.slice(0, maxTotalWebSnapshots);
                    }

                    try {
                        localStorage.setItem('prompt_modifier_session_history', JSON.stringify(historyList));
                    } catch (quotaErr) {
                        // If near quota, remove screenshots from older history items
                        const pruned = historyList.slice(0, Math.min(10, maxTotalWebSnapshots)).map((item: any, idx: number) => 
                            idx > 1 ? { ...item, screenshot: null } : item
                        );
                        localStorage.setItem('prompt_modifier_session_history', JSON.stringify(pruned));
                    }
                } catch (histErr) {
                    console.warn('Failed to update web history snapshot:', histErr);
                }
            }
        }
    } catch (e) {
        // Safe to ignore if LocalStorage quota is exceeded
    }
    if (diskError) throw diskError;
    if (recoveryError && !window.electronAPI?.saveSession) throw recoveryError;
};

export const normalizeTabs = (rawTabs: any[], rawActiveTabId?: string): { tabs: Tab[], activeTabId: string } => {
    if (!Array.isArray(rawTabs) || rawTabs.length === 0) {
        const defaultTab = createNewTab('Canvas 1', defaultCanvasState);
        return { tabs: [defaultTab], activeTabId: defaultTab.id };
    }

    const tabs: Tab[] = rawTabs.map((t, idx) => {
        const tabId = (t && typeof t.id === 'string' && t.id.trim()) ? t.id.trim() : `tab-${Date.now()}-${idx}`;
        const tabName = (t && typeof t.name === 'string' && t.name.trim()) ? t.name.trim() : `Canvas ${idx + 1}`;
        const rawState = t?.state || {};
        
        const normalizedNodes = Array.isArray(rawState.nodes) ? rawState.nodes : [];
        const normalizedConnections = Array.isArray(rawState.connections) ? rawState.connections : [];
        const normalizedGroups = Array.isArray(rawState.groups) ? rawState.groups : [];
        const normalizedViewTransform = rawState.viewTransform && typeof rawState.viewTransform.scale === 'number'
            ? rawState.viewTransform
            : { scale: 1, translate: { x: 0, y: 0 } };
        
        let counter = typeof rawState.nodeIdCounter === 'number' ? rawState.nodeIdCounter : 0;
        if (counter === 0 && normalizedNodes.length > 0) {
            counter = Math.max(...normalizedNodes.map((n: any) => {
                const match = String(n.id).match(/\d+/g);
                return match ? Math.max(...match.map(Number)) : 0;
            }), 100);
        }

        const normalizedState: CanvasState = {
            canvasOriginalArchiveKey: typeof rawState.canvasOriginalArchiveKey === 'string' ? rawState.canvasOriginalArchiveKey : undefined,
            nodes: normalizedNodes,
            connections: normalizedConnections,
            groups: normalizedGroups,
            viewTransform: normalizedViewTransform,
            nodeIdCounter: counter,
            fullSizeImageCache: (rawState.fullSizeImageCache && typeof rawState.fullSizeImageCache === 'object') ? rawState.fullSizeImageCache : {}
        };

        return {
            id: tabId,
            name: tabName,
            state: normalizedState
        };
    });

    const activeTabId = (rawActiveTabId && tabs.some(t => t.id === rawActiveTabId))
        ? rawActiveTabId
        : tabs[0].id;

    return { tabs, activeTabId };
};

export const clearAllSessionBackups = async (): Promise<void> => {
    // 1. Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI?.clearSessionBackups) {
        try {
            await (window as any).electronAPI.clearSessionBackups();
        } catch (e) {
            console.warn("Failed to clear backups via Electron API:", e);
        }
    }

    // 2. Web LocalStorage
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem('prompt_modifier_session_backup');
            localStorage.removeItem('prompt_modifier_session_history');
        }
    } catch (e) {
        console.warn("Failed to clear web localStorage backups:", e);
    }
};

export const loadSessionFromDB = async (): Promise<{ tabs: Tab[], activeTabId: string } | undefined> => {
    let electronSession: { tabs: Tab[], activeTabId: string, savedAt?: number } | null = null;
    let idbSession: { tabs: Tab[], activeTabId: string, savedAt?: number } | undefined = undefined;
    let localBackupSession: { tabs: Tab[], activeTabId: string, savedAt?: number } | undefined = undefined;

    // 1. Check Electron disk session
    if (typeof window !== 'undefined' && (window as any).electronAPI?.loadSession) {
        try {
            const res = await (window as any).electronAPI.loadSession();
            if (res && Array.isArray(res.tabs) && res.tabs.length > 0 && res.activeTabId) {
                electronSession = res;
            }
        } catch (e) {
            console.warn("Could not load session from Electron API:", e);
        }
    }

    // 2. Check IndexedDB
    try {
        const db = await getSessionDB();
        idbSession = await new Promise((resolve) => {
            const transaction = db.transaction(SESSION_STORE, 'readonly');
            const store = transaction.objectStore(SESSION_STORE);
            const request = store.get(SESSION_KEY);
            request.onerror = () => resolve(undefined);
            request.onsuccess = () => {
                const result = request.result;
                if (result && Array.isArray(result.tabs) && result.tabs.length > 0 && result.activeTabId) {
                    resolve({ tabs: result.tabs, activeTabId: result.activeTabId, savedAt: result.savedAt });
                } else {
                    resolve(undefined);
                }
            };
        });
    } catch (e) {
        console.warn("Could not load session from IndexedDB:", e);
    }

    // 3. Check LocalStorage backup
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = localStorage.getItem('prompt_modifier_session_backup');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0 && parsed.activeTabId) {
                    localBackupSession = parsed;
                }
            }
        }
    } catch (e) {
        console.warn("Could not load session from LocalStorage backup:", e);
    }

    const chosen = selectLatestSession([electronSession, idbSession, localBackupSession]);
    return chosen ? normalizeTabs(chosen.tabs, chosen.activeTabId) : undefined;
};
// --- End IndexedDB Logic ---

export const getLocalizedCanvasState = (lang: LanguageCode): CanvasState => {
  return {
  "nodes": [
    {
      "id": "node-19-1761553959672",
      "type": NodeType.GEMINI_CHAT,
      "position": {
        "x": 80,
        "y": 1160
      },
      "value": "{\"messages\":[],\"currentInput\":\"\"}",
      "title": getTranslation(lang, 'node.title.gemini_chat'),
      "width": 400,
      "height": 640
    },
    {
      "id": "node-46-1761685266349",
      "type": NodeType.TEXT_INPUT,
      "position": {
        "x": 80,
        "y": 380
      },
      "value": "",
      "title": getTranslation(lang, 'node.title.text_input'),
      "width": 460,
      "height": 300
    },
    {
      "id": "node-49-1761685294534",
      "type": NodeType.PROMPT_PROCESSOR,
      "position": {
        "x": 640,
        "y": 320
      },
      "value": "",
      "title": getTranslation(lang, 'node.title.prompt_processor'),
      "width": 460,
      "height": 420
    },
    {
      "id": "node-53-1761685402016",
      "type": NodeType.TEXT_INPUT,
      "position": {
        "x": 80,
        "y": 60
      },
      "value": "",
      "title": getTranslation(lang, 'node.title.text_input'),
      "width": 460,
      "height": 300
    },
    {
      "id": "node-54-1761685404557",
      "type": NodeType.TEXT_INPUT,
      "position": {
        "x": 80,
        "y": 700
      },
      "value": "",
      "title": getTranslation(lang, 'node.title.text_input'),
      "width": 460,
      "height": 300
    },
    {
      "id": "node-55-1761685416437",
      "type": NodeType.IMAGE_OUTPUT,
      "position": {
        "x": 1220,
        "y": 60
      },
      "value": "",
      "title": getTranslation(lang, 'node.title.image_output'),
      "width": 520,
      "height": 940,
      "aspectRatio": "1:1",
      "model": "gemini-2.5-flash-image",
      "autoDownload": true
    },
    {
      "id": "node-82-1761838643720",
      "type": NodeType.TRANSLATOR,
      "position": {
        "x": 560,
        "y": 1160
      },
      "value": "{\"inputText\":\"\",\"targetLanguage\":\"ru\",\"translatedText\":\"\",\"inputHeight\":197}",
      "title": getTranslation(lang, 'node.title.translator'),
      "width": 460,
      "height": 640
    }
  ],
  "connections": [
    {
      "fromNodeId": "node-49-1761685294534",
      "toNodeId": "node-55-1761685416437",
      "id": "conn-1761685421734-dlsqz1009"
    },
    {
      "fromNodeId": "node-53-1761685402016",
      "toNodeId": "node-49-1761685294534",
      "id": "conn-1765381486428-7mzadq6ki"
    },
    {
      "fromNodeId": "node-46-1761685266349",
      "toNodeId": "node-49-1761685294534",
      "id": "conn-1765381487379-rsa3lf6ts"
    },
    {
      "fromNodeId": "node-54-1761685404557",
      "toNodeId": "node-49-1761685294534",
      "id": "conn-1765381488527-69zcwd7sm"
    }
  ],
  "groups": [],
  "viewTransform": {
    "scale": 1,
    "translate": {
      "x": 21.096368784472816,
      "y": 34.78642041088381
    }
  },
  "nodeIdCounter": 85,
  "fullSizeImageCache": {}
  };
};

// Fallback for types that expect a static object (though mostly unused now)
export const defaultCanvasState = getLocalizedCanvasState('en');

export const createNewTab = (name: string, state?: Partial<CanvasState>): Tab => {
  const newId = `tab-${Date.now()}`;
  return {
    id: newId,
    name,
    state: {
      nodes: state?.nodes || [],
      connections: state?.connections || [],
      groups: state?.groups || [],
      viewTransform: state?.viewTransform || { scale: 1, translate: { x: 0, y: 0 } },
      nodeIdCounter: state?.nodeIdCounter || 0,
      fullSizeImageCache: state?.fullSizeImageCache || {},
    },
  };
};

// --- Eager Background Session Preloading ---
let eagerSessionPromise: Promise<{ tabs: Tab[], activeTabId: string } | undefined> | null = null;

export const startBackgroundSessionPreload = () => {
    if (!eagerSessionPromise && typeof window !== 'undefined') {
        eagerSessionPromise = loadSessionFromDB().catch(e => {
            console.warn("Background preload error:", e);
            return undefined;
        });
    }
    return eagerSessionPromise;
};

// Immediately initiate background canvas/session loading on module load
if (typeof window !== 'undefined') {
    startBackgroundSessionPreload();
}

export const useTabs = () => {
    const [tabs, setTabs] = useState<Tab[]>(() => [
        createNewTab('Canvas 1', defaultCanvasState),
    ]);
    const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Auto-save status state (managed centrally in AppContext)
    const [nextAutoSaveTime, setNextAutoSaveTime] = useState<number | null>(null);
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    // Load from DB immediately on mount utilizing the eager preload promise
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                const sessionPromise = eagerSessionPromise || startBackgroundSessionPreload() || loadSessionFromDB();
                const session = await sessionPromise;
                if (!isMounted) return;
                if (session && Array.isArray(session.tabs) && session.tabs.length > 0) {
                    setTabs(session.tabs);
                    const validActiveId = session.tabs.some(t => t.id === session.activeTabId)
                        ? session.activeTabId
                        : session.tabs[0].id;
                    setActiveTabId(validActiveId);
                }
            } catch (e) {
                console.error("Failed to load session from IndexedDB:", e);
            } finally {
                if (isMounted) {
                    setIsLoaded(true);
                }
            }
        };
        load();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleSwitchTab = useCallback((newTabId: string) => {
        if (newTabId !== activeTabId) {
            setActiveTabId(newTabId);
        }
    }, [activeTabId]);

    const handleAddTab = useCallback(() => {
        const newTab = createNewTab(`Canvas ${tabs.length + 1}`);
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
    }, [tabs.length]);
      
    const handleCloseTab = useCallback((tabIdToClose: string) => {
        clearImagesForTabFromCache(tabIdToClose);
        setTabs(prevTabs => {
            if (prevTabs.length <= 1) return prevTabs;

            const closingTabIndex = prevTabs.findIndex(tab => tab.id === tabIdToClose);
            const newTabs = prevTabs.filter(tab => tab.id !== tabIdToClose);

            if (activeTabId === tabIdToClose) {
                const newActiveIndex = Math.max(0, closingTabIndex - 1);
                setActiveTabId(newTabs[newActiveIndex].id);
            }
            return newTabs;
        });
    }, [activeTabId]);
      
    const handleRenameTab = useCallback((tabId: string, newName: string) => {
        setTabs(prevTabs =>
            prevTabs.map(tab => (tab.id === tabId ? { ...tab, name: newName } : tab))
        );
    }, []);

    const handleReorderTabs = useCallback((sourceIndex: number, targetIndex: number) => {
        if (sourceIndex === targetIndex) return;
        setTabs(prevTabs => {
            if (
                sourceIndex < 0 || sourceIndex >= prevTabs.length ||
                targetIndex < 0 || targetIndex >= prevTabs.length
            ) {
                return prevTabs;
            }
            const updated = [...prevTabs];
            const [moved] = updated.splice(sourceIndex, 1);
            updated.splice(targetIndex, 0, moved);
            return updated;
        });
    }, []);
    
    // Function to completely reset all tabs with specific language defaults (Factory Reset)
    const resetTabs = useCallback((lang: LanguageCode) => {
        const newState = getLocalizedCanvasState(lang);
        const newTab = createNewTab('Canvas 1', newState);
        setTabs([newTab]);
        setActiveTabId(newTab.id);
        
        // Also wipe DB to prevent resurrection of old state
        saveSessionToDB([newTab], newTab.id);
    }, []);

    // Function to reset ONLY the current tab to defaults, keeping others intact
    const resetCurrentTab = useCallback((lang: LanguageCode) => {
        const defaultState = getLocalizedCanvasState(lang);
        setTabs(prevTabs => prevTabs.map(tab => {
            if (tab.id === activeTabId) {
                return {
                    ...tab,
                    state: defaultState
                };
            }
            return tab;
        }));
    }, [activeTabId]);

    const loadCanvasState = useCallback((state: CanvasState) => {
        setTabs(prevTabs => prevTabs.map(tab =>
            tab.id === activeTabId ? { ...tab, state } : tab
        ));
    }, [activeTabId]);

    const getCurrentCanvasState = useCallback(() => {
        return tabs.find(tab => tab.id === activeTabId)?.state || createNewTab('').state;
    }, [tabs, activeTabId]);

    const forceSaveSession = useCallback(async (overrideTabs?: Tab[], overrideActiveTabId?: string) => {
        setIsAutoSaving(true);
        try {
            const tabsToSave = overrideTabs || tabs;
            const tabIdToSave = overrideActiveTabId || activeTabId;
            await saveSessionToDB(tabsToSave, tabIdToSave);
        } catch (e) {
            console.error("Failed to force save session:", e);
        } finally {
            setIsAutoSaving(false);
            setNextAutoSaveTime(null);
        }
    }, [tabs, activeTabId]);

    return {
        tabs,
        setTabs,
        activeTabId,
        setActiveTabId,
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        handleReorderTabs,
        loadCanvasState,
        getCurrentCanvasState,
        resetTabs, 
        resetCurrentTab,
        getLocalizedCanvasState, 
        nextAutoSaveTime, 
        setNextAutoSaveTime,
        isAutoSaving,
        setIsAutoSaving,
        isLoaded,
        forceSaveSession
    };
};
