
import { useState, useCallback, useEffect, useRef } from 'react';
import { type Tab, type CanvasState, NodeType } from '../types';
import { clearImagesForTabFromCache } from '../utils/imageMemoryCache';
import { getTranslation, LanguageCode } from '../localization';

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

export const saveSessionToDB = async (tabs: Tab[], activeTabId: string): Promise<void> => {
    const db = await getSessionDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(SESSION_STORE, 'readwrite');
        const store = transaction.objectStore(SESSION_STORE);
        // Save everything as one object, passing the key explicitly as the store uses out-of-line keys.
        store.put({ id: SESSION_KEY, tabs, activeTabId, savedAt: Date.now() }, SESSION_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Failed to save session to DB"));
        transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
    });
};

export const loadSessionFromDB = async (): Promise<{ tabs: Tab[], activeTabId: string } | undefined> => {
    const db = await getSessionDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SESSION_STORE, 'readonly');
        const store = transaction.objectStore(SESSION_STORE);
        const request = store.get(SESSION_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const result = request.result;
            if (result && Array.isArray(result.tabs) && result.tabs.length > 0 && result.activeTabId) {
                resolve({ tabs: result.tabs, activeTabId: result.activeTabId });
            } else {
                resolve(undefined);
            }
        };
    });
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

export const useTabs = () => {
    const [tabs, setTabs] = useState<Tab[]>(() => [
        createNewTab('Canvas 1', defaultCanvasState),
    ]);
    const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Auto-save status state (managed centrally in AppContext)
    const [nextAutoSaveTime, setNextAutoSaveTime] = useState<number | null>(null);
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    // Load from DB on mount
    useEffect(() => {
        const load = async () => {
            try {
                const session = await loadSessionFromDB();
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
                setIsLoaded(true);
            }
        };
        load();
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
