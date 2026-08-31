import { useState, useCallback, useEffect } from 'react';
import { recordGenerationEvent, syncWithHistoryItems } from '../utils/generationStats';

export interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
}

const DB_NAME = 'GenerationHistoryDB';
const STORE_NAME = 'Images';
const DB_VERSION = 1;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const useGenerationHistory = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState<number>(() => {
    const saved = localStorage.getItem('historyLimit');
    return saved ? parseInt(saved, 10) : 100;
  });

  useEffect(() => {
    localStorage.setItem('historyLimit', historyLimit.toString());
  }, [historyLimit]);

  const enforceLimit = useCallback(async (items: HistoryItem[], db: IDBDatabase, limit: number) => {
    if (items.length > limit) {
        const toDelete = items.slice(limit);
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        toDelete.forEach(item => store.delete(item.id));
        return items.slice(0, limit);
    }
    return items;
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const items = request.result as HistoryItem[];
        // Sort by timestamp descending
        items.sort((a, b) => b.timestamp - a.timestamp);
        const limitedItems = await enforceLimit(items, db, historyLimit);
        setHistoryItems(limitedItems);

        // Sync existing history with persistent stats log
        syncWithHistoryItems(limitedItems);
      };
    } catch (e) {
      console.error("Failed to load generation history", e);
    }
  }, [historyLimit, enforceLimit]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addToHistory = useCallback(async (
    url: string, 
    prompt: string, 
    model?: string, 
    metadataOrRatio?: { aspectRatio?: string; resolution?: string } | string, 
    resolutionArg?: string
  ) => {
    if (!url || !url.startsWith('data:image')) return; // Store only base64 data URLs

    let aspectRatio: string | undefined;
    let resolution: string | undefined;

    if (typeof metadataOrRatio === 'object' && metadataOrRatio !== null) {
      aspectRatio = metadataOrRatio.aspectRatio;
      resolution = metadataOrRatio.resolution;
    } else if (typeof metadataOrRatio === 'string') {
      aspectRatio = metadataOrRatio;
      resolution = resolutionArg;
    }

    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url,
      prompt,
      timestamp: Date.now(),
      model: model || undefined,
      aspectRatio: aspectRatio || undefined,
      resolution: resolution || undefined,
    };

    // Record into persistent stats log
    recordGenerationEvent({
      id: newItem.id,
      timestamp: newItem.timestamp,
      model: newItem.model,
      aspectRatio: newItem.aspectRatio,
      resolution: newItem.resolution,
      prompt: newItem.prompt,
    });

    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.add(newItem);
      
      transaction.oncomplete = () => {
        setHistoryItems(prev => {
           const newItems = [newItem, ...prev];
           if (newItems.length > historyLimit) {
               // Schedule cleanup of DB in background
               getDB().then(db2 => {
                   const t2 = db2.transaction([STORE_NAME], 'readwrite');
                   const s2 = t2.objectStore(STORE_NAME);
                   newItems.slice(historyLimit).forEach(item => s2.delete(item.id));
               });
               return newItems.slice(0, historyLimit);
           }
           return newItems;
        });
      };
    } catch (e) {
      console.error("Failed to add to generation history", e);
    }
  }, [historyLimit]);

  const removeHistoryItems = useCallback(async (ids: string[]) => {
    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      ids.forEach(id => store.delete(id));
      
      transaction.oncomplete = () => {
        setHistoryItems(prev => prev.filter(item => !ids.includes(item.id)));
      };
    } catch (e) {
      console.error("Failed to remove history items", e);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      
      transaction.oncomplete = () => {
        setHistoryItems([]);
      };
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  }, []);

  return {
    historyItems,
    isHistoryPanelOpen,
    setIsHistoryPanelOpen,
    addToHistory,
    removeHistoryItems,
    clearHistory,
    historyLimit,
    setHistoryLimit
  };
};
