import { useState, useCallback, useEffect } from 'react';
import { recordGenerationEvent, syncWithHistoryItems } from '../utils/generationStats';
import { generateThumbnail } from '../utils/imageUtils';

export interface HistoryItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
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

        // Asynchronously generate and backfill 128x128 thumbnails for older items missing them
        const missingThumbs = limitedItems.filter(item => !item.thumbnailUrl && item.url);
        if (missingThumbs.length > 0) {
          Promise.all(
            missingThumbs.map(async (item) => {
              try {
                const thumb = await generateThumbnail(item.url, 128, 128);
                return { id: item.id, thumb };
              } catch {
                return null;
              }
            })
          ).then(async (results) => {
            const valid = results.filter((r): r is { id: string; thumb: string } => r !== null);
            if (valid.length > 0) {
              const thumbMap = new Map(valid.map(v => [v.id, v.thumb]));
              setHistoryItems(prev => prev.map(item => thumbMap.has(item.id) ? { ...item, thumbnailUrl: thumbMap.get(item.id) } : item));
              
              try {
                const db2 = await getDB();
                const writeTx = db2.transaction([STORE_NAME], 'readwrite');
                const writeStore = writeTx.objectStore(STORE_NAME);
                for (const { id, thumb } of valid) {
                  const getReq = writeStore.get(id);
                  getReq.onsuccess = () => {
                    if (getReq.result) {
                      getReq.result.thumbnailUrl = thumb;
                      writeStore.put(getReq.result);
                    }
                  };
                }
              } catch (err) {
                console.warn("Could not backfill thumbnails in DB:", err);
              }
            }
          });
        }
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
    metadataOrRatio?: { 
      aspectRatio?: string; 
      resolution?: string; 
      isBatch?: boolean; 
      skipStats?: boolean;
      generationMode?: 'normal' | 'batch';
      batchJobName?: string;
    } | string, 
    resolutionArg?: string
  ) => {
    if (!url || !url.startsWith('data:image')) return; // Store only base64 data URLs

    let aspectRatio: string | undefined;
    let resolution: string | undefined;
    let isBatch = false;
    let skipStats = false;
    let generationMode: 'normal' | 'batch' = 'normal';

    if (typeof metadataOrRatio === 'object' && metadataOrRatio !== null) {
      aspectRatio = metadataOrRatio.aspectRatio;
      resolution = metadataOrRatio.resolution;
      isBatch = !!metadataOrRatio.isBatch;
      skipStats = !!metadataOrRatio.skipStats || isBatch;
      generationMode = metadataOrRatio.generationMode || (isBatch ? 'batch' : 'normal');
    } else if (typeof metadataOrRatio === 'string') {
      aspectRatio = metadataOrRatio;
      resolution = resolutionArg;
    }

    // Generate 128x128 compressed thumbnail for fast virtualized list rendering
    let thumbnailUrl: string | undefined;
    try {
      thumbnailUrl = await generateThumbnail(url, 128, 128);
    } catch (e) {
      console.warn("Failed to generate history thumbnail:", e);
      thumbnailUrl = url;
    }

    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url,
      thumbnailUrl: thumbnailUrl || url,
      prompt,
      timestamp: Date.now(),
      model: model || undefined,
      aspectRatio: aspectRatio || undefined,
      resolution: resolution || undefined,
    };

    // Record into persistent stats log ONLY if not skipped (Batch downloads are skipped since batch items are recorded on request submission)
    if (!skipStats) {
      recordGenerationEvent({
        id: newItem.id,
        timestamp: newItem.timestamp,
        model: newItem.model,
        aspectRatio: newItem.aspectRatio,
        resolution: newItem.resolution,
        prompt: newItem.prompt,
        generationMode,
      });
    }

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
