import { useState, useCallback, useEffect } from 'react';

export interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
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

  const loadHistory = useCallback(async () => {
    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result as HistoryItem[];
        // Sort by timestamp descending
        items.sort((a, b) => b.timestamp - a.timestamp);
        setHistoryItems(items);
      };
    } catch (e) {
      console.error("Failed to load generation history", e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addToHistory = useCallback(async (url: string, prompt: string) => {
    if (!url || !url.startsWith('data:image')) return; // Store only base64 data URLs

    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url,
      prompt,
      timestamp: Date.now(),
    };

    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.add(newItem);
      
      transaction.oncomplete = () => {
        setHistoryItems(prev => [newItem, ...prev]);
      };
    } catch (e) {
      console.error("Failed to add to generation history", e);
    }
  }, []);

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
    clearHistory
  };
};
