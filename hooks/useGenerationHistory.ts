import { storeOriginalImage } from '../services/originalImageStore';
import { useState, useCallback, useEffect, useRef } from 'react';
import { recordGenerationEvent, syncWithHistoryItems } from '../utils/generationStats';
import { generateThumbnail } from '../utils/imageUtils';

export interface HistoryItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  originalArchiveKey?: string;
  prompt: string;
  timestamp: number;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  mediaType?: 'image' | 'video' | '3d';
  modelUrl?: string; // Direct download link for 3D GLB model
}

const DB_NAME = 'GenerationHistoryDB';
const STORE_NAME = 'Images';
const DB_VERSION = 2;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      const store = request.transaction!.objectStore(STORE_NAME);
      if (!store.indexNames.contains('timestamp')) store.createIndex('timestamp', 'timestamp');
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

  const loadRevision = useRef(0);
  const compactItem = async (item: HistoryItem): Promise<HistoryItem> => {
    if (!item.url.startsWith('data:image') || item.originalArchiveKey) return item;
    try {
      const originalArchiveKey = await storeOriginalImage(item.url);
      let thumbnailUrl = item.thumbnailUrl;
      if (!thumbnailUrl || thumbnailUrl === item.url) {
        try { thumbnailUrl = await generateThumbnail(item.url, 128, 128); }
        catch { thumbnailUrl = ''; }
      }
      return { ...item, url: '', thumbnailUrl, originalArchiveKey };
    } catch (error) {
      console.warn('History original retained inline because storage failed:', error);
      return item;
    }
  };
  const loadHistory = useCallback(async () => {
    const revision = ++loadRevision.current;
    const db = await getDB();
    try {
      const items = await new Promise<HistoryItem[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const request = tx.objectStore(STORE_NAME).index('timestamp').openCursor(null, 'prev');
        const records: HistoryItem[] = [];
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (records.length < historyLimit) records.push(cursor.value);
          else cursor.delete();
          cursor.continue();
        };
        tx.oncomplete = () => resolve(records);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
      for (let index = 0; index < items.length; index++) {
        if (revision !== loadRevision.current) return;
        const old = items[index];
        const compact = await compactItem(old);
        items[index] = compact;
        if (compact !== old) await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const existing = store.get(compact.id);
          // A concurrent delete must not be undone by migration.
          existing.onsuccess = () => { if (existing.result) store.put(compact); };
          tx.oncomplete = () => resolve();
          tx.onerror = tx.onabort = () => reject(tx.error);
        });
      }
      if (revision === loadRevision.current) {
        setHistoryItems(items);
        syncWithHistoryItems(items);
      }
    } catch (error) { console.error('Failed to load history:', error); }
    finally { db.close(); }
  }, [historyLimit]);

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
      mediaType?: 'image' | 'video' | '3d';
      modelUrl?: string;
      thumbnailUrl?: string;
    } | string, 
    resolutionArg?: string
  ) => {
    if (!url) return;

    let aspectRatio: string | undefined;
    let resolution: string | undefined;
    let isBatch = false;
    let skipStats = false;
    let generationMode: 'normal' | 'batch' = 'normal';
    let mediaType: 'image' | 'video' | '3d' = 'image';
    let modelUrl: string | undefined;
    let explicitThumb: string | undefined;

    if (typeof metadataOrRatio === 'object' && metadataOrRatio !== null) {
      aspectRatio = metadataOrRatio.aspectRatio;
      resolution = metadataOrRatio.resolution;
      isBatch = !!metadataOrRatio.isBatch;
      skipStats = !!metadataOrRatio.skipStats || isBatch;
      generationMode = metadataOrRatio.generationMode || (isBatch ? 'batch' : 'normal');
      mediaType = metadataOrRatio.mediaType || 'image';
      modelUrl = metadataOrRatio.modelUrl;
      explicitThumb = metadataOrRatio.thumbnailUrl;
    } else if (typeof metadataOrRatio === 'string') {
      aspectRatio = metadataOrRatio;
      resolution = resolutionArg;
    }

    // If regular image, ensure it has a valid image URL / data URL
    if (mediaType === 'image' && !url.startsWith('data:image') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
      return;
    }

    // Generate 128x128 compressed thumbnail for fast virtualized list rendering if base64 data URL
    let thumbnailUrl: string | undefined = explicitThumb;
    if (!thumbnailUrl) {
      if (url.startsWith('data:image')) {
        try {
          thumbnailUrl = await generateThumbnail(url, 128, 128);
        } catch (e) {
          console.warn("Failed to generate history thumbnail:", e);
          thumbnailUrl = url;
        }
      } else {
        thumbnailUrl = url;
      }
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
      mediaType,
      modelUrl,
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
        source: mediaType === '3d' ? 'tripo_3d' : (generationMode === 'batch' ? 'batch_api' : 'image_generation'),
        generationMode,
      });
    }

    try {
      const compact = await compactItem(newItem);
      loadRevision.current++;
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.add(compact);
      
      transaction.oncomplete = () => {
        setHistoryItems(prev => {
           const newItems = [compact, ...prev];
           if (newItems.length > historyLimit) {
               // Schedule cleanup of DB in background
               getDB().then(db2 => {
                   const t2 = db2.transaction([STORE_NAME], 'readwrite');
                   const s2 = t2.objectStore(STORE_NAME);
                   newItems.slice(historyLimit).forEach(item => s2.delete(item.id));
                   t2.oncomplete = t2.onerror = t2.onabort = () => db2.close();
               });
               return newItems.slice(0, historyLimit);
           }
           return newItems;
        });
        db.close();
        void loadHistory();
      };
    } catch (e) {
      console.error("Failed to add to generation history", e);
    }
  }, [historyLimit, loadHistory]);

  const removeHistoryItems = useCallback(async (ids: string[]) => {
    loadRevision.current++;
    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      ids.forEach(id => store.delete(id));
      
      transaction.oncomplete = () => {
        setHistoryItems(prev => prev.filter(item => !ids.includes(item.id)));
        db.close();
        void loadHistory();
      };
    } catch (e) {
      console.error("Failed to remove history items", e);
    }
  }, [loadHistory]);

  const clearHistory = useCallback(async () => {
    loadRevision.current++;
    try {
      const db = await getDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      
      transaction.oncomplete = () => {
        setHistoryItems([]);
        db.close();
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
