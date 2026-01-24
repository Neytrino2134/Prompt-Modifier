
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Group, Node, Connection, NodeType } from '../types';

export enum CatalogItemType {
  FOLDER = 'FOLDER',
  GROUP = 'GROUP',
}

export interface CatalogItem {
  id: string;
  type: CatalogItemType;
  name: string;
  parentId: string | null;
  nodes?: Node[];
  connections?: Connection[];
  fullSizeImages?: Record<string, Record<number, string>>;
  driveFileId?: string;
}

export enum ContentCatalogItemType {
    FOLDER = 'FOLDER',
    ITEM = 'ITEM',
}
  
export interface ContentCatalogItem {
    id: string;
    type: ContentCatalogItemType;
    name: string;
    parentId: string | null;
    content?: any;
    driveFileId?: string;
}

const DB_NAME = 'PromptModifierDB';
const STORE_NAME = 'Catalogs';
const DB_VERSION = 1;

const getDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
    });
};

const idbGet = async <T>(key: string): Promise<T | undefined> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

const idbSet = async (key: string, value: any): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

const STORAGE_KEY_GROUPS = 'group-catalog-items';

const defaultCatalogItems: CatalogItem[] = [
    {
      id: 'default-group-image-editing',
      type: CatalogItemType.GROUP,
      name: "Image Editing",
      parentId: null,
      nodes: [
        {
          "id": "node-28-1761576310796",
          "type": NodeType.IMAGE_EDITOR,
          "position": { "x": 460, "y": 0 },
          "value": "{\"inputImage\":null,\"prompt\":\"\",\"outputImage\":null,\"aspectRatio\":\"1:1\",\"enableOutpainting\":true,\"inputImages\":[],\"outpaintingPrompt\":\"{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.\",\"topPaneHeight\":645.6608879498896,\"leftPaneRatio\":0.4960591133004926}",
          "title": "Редактор изображений",
          "width": 1040,
          "height": 1380,
          "autoDownload": true
        },
        {
          "id": "node-29-1761576319677",
          "type": NodeType.NOTE,
          "position": { "x": 0, "y": 0 },
          "value": "Редактируйте изображения используя современные инновации от Google\n\nEdit images using modern innovations from Google",
          "title": "Заметка",
          "width": 380,
          "height": 240
        }
      ],
      connections: []
    }
];

const getTimestamp = () => {
    return new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];
};

export const useContentCatalog = (
    storageKey: string, 
    rootName: string, 
    t: (key: string) => string, 
    catalogContext: string,
    onRedirectImport?: (data: any) => void,
    defaultItems: ContentCatalogItem[] = []
) => {
    const [items, setItems] = useState<ContentCatalogItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const loadItems = async () => {
            try {
                const storedItems = await idbGet<ContentCatalogItem[]>(storageKey);
                if (storedItems && storedItems.length > 0) {
                    setItems(storedItems);
                } else {
                    const initialItems = defaultItems.length > 0 ? defaultItems : [];
                    setItems(initialItems);
                    if (initialItems.length > 0) {
                       await idbSet(storageKey, initialItems);
                    }
                }
            } catch (error) {
                console.error(`Failed to load catalog from IndexedDB (${storageKey}):`, error);
                setItems(defaultItems);
            } finally {
                setIsInitialized(true);
            }
        };
        loadItems();
    }, [storageKey]);

    const [navigationHistory, setNavigationHistory] = useState<Array<string | null>>([null]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentParentId = navigationHistory[navigationHistory.length - 1];

    const persistItems = async (newItems: ContentCatalogItem[]) => {
        try {
            await idbSet(storageKey, newItems);
        } catch (error) {
            console.error(`Failed to save catalog to ${storageKey}`, error);
        }
    };

    const currentItems = useMemo(() => {
        if (!isInitialized) return [];
        return items
            .filter(item => item.parentId === currentParentId)
            .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === ContentCatalogItemType.FOLDER ? -1 : 1;
            });
    }, [items, currentParentId, isInitialized]);

    const path = useMemo(() => {
        const root: { id: string | null, name: string } = { id: null, name: rootName };
        if (!isInitialized) return [root];
        
        const segments: { id: string | null, name: string }[] = [];
        let currentId = currentParentId;
        
        while (currentId) {
            const folder = items.find(item => item.id === currentId);
            if (folder) {
                segments.unshift({ id: folder.id, name: folder.name });
                currentId = folder.parentId;
            } else break;
        }
        return [root, ...segments];
    }, [currentParentId, items, rootName, isInitialized]);

    const navigateToFolder = useCallback((folderId: string | null) => {
        const historyIndex = navigationHistory.findIndex(id => id === folderId);
        if (historyIndex > -1) setNavigationHistory(prev => prev.slice(0, historyIndex + 1));
        else setNavigationHistory(prev => [...prev, folderId]);
    }, [navigationHistory]);

    const navigateBack = useCallback(() => {
        setNavigationHistory(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
    }, []);

    const createItem = useCallback(async (type: ContentCatalogItemType, name: string, content?: any) => {
        if (!isInitialized) return;
        const newItem: ContentCatalogItem = {
            id: `content-item-${Date.now()}-${Math.random()}`, type, name, parentId: currentParentId, content,
        };
        setItems(prevItems => {
            const updated = [...prevItems, newItem];
            persistItems(updated);
            return updated;
        });
    }, [isInitialized, currentParentId]);

    const renameItem = useCallback(async (itemId: string, newName: string) => {
        if (!isInitialized) return;
        setItems(prevItems => {
            const updated = prevItems.map(item => item.id === itemId ? { ...item, name: newName } : item);
            persistItems(updated);
            return updated;
        });
    }, [isInitialized]);

    const setItemDriveId = useCallback(async (itemId: string, driveFileId: string | undefined) => {
        if (!isInitialized) return;
        setItems(prevItems => {
            const updated = prevItems.map(item => item.id === itemId ? { ...item, driveFileId } : item);
            persistItems(updated);
            return updated;
        });
    }, [isInitialized]);

    const deleteItem = useCallback(async (itemId: string) => {
        if (!isInitialized) return;
        setItems(prevItems => {
            const idsToDelete = new Set<string>([itemId]);
            const queue = [itemId];
            while (queue.length > 0) {
                const currentId = queue.shift();
                for (const item of prevItems) {
                    if (item.parentId === currentId) {
                        idsToDelete.add(item.id);
                        if (item.type === ContentCatalogItemType.FOLDER) queue.push(item.id);
                    }
                }
            }
            const updated = prevItems.filter(item => !idsToDelete.has(item.id));
            persistItems(updated);
            return updated;
        });
    }, [isInitialized]);

    const saveItemToDisk = useCallback((itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        
        let rootData: any;
        if (item.type === ContentCatalogItemType.ITEM) {
             let contentObj;
             try { contentObj = JSON.parse(item.content || '{}'); } catch { contentObj = item.content; }
             rootData = { type: 'item', name: item.name, content: contentObj };
        } else {
            const getFolderContents = (folderId: string): any => {
                const folder = items.find(i => i.id === folderId);
                if (!folder) return null;
                const children = items.filter(i => i.parentId === folderId);
                return {
                    name: folder.name,
                    type: 'folder',
                    children: children.map(child => {
                        if (child.type === ContentCatalogItemType.FOLDER) return getFolderContents(child.id);
                        else {
                            let content = child.content;
                            try { content = JSON.parse(content); } catch {}
                            return { name: child.name, type: 'item', content: content };
                        }
                    })
                };
            };
            rootData = getFolderContents(itemId);
        }
        
        const exportData = { appName: 'Prompt_modifier', catalogContext, root: rootData };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = getTimestamp();
        a.download = `Catalog_${catalogContext}_${item.name.trim().replace(/\s+/g, '_')}_${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [items, catalogContext]);

    const importItemsData = useCallback(async (data: any, remoteFileId?: string) => {
        if (!isInitialized) return;
        setItems(prevItems => {
             const newItems: ContentCatalogItem[] = [];
             const itemsToUpdate = new Map<string, Partial<ContentCatalogItem>>();

             const recursiveImport = (itemData: any, parentId: string | null, isRoot: boolean) => {
                if (!itemData.name || !itemData.type) return;
                const type = itemData.type === 'folder' ? ContentCatalogItemType.FOLDER : ContentCatalogItemType.ITEM;
                
                let existingItem = null;
                if (isRoot && remoteFileId) existingItem = prevItems.find(i => i.driveFileId === remoteFileId);
                if (!existingItem) existingItem = prevItems.find(i => i.name === itemData.name && i.type === type && i.parentId === parentId);

                const content = type === ContentCatalogItemType.ITEM ? JSON.stringify(itemData.content) : undefined;
                let currentId: string;

                if (existingItem) {
                    currentId = existingItem.id;
                    const updates: Partial<ContentCatalogItem> = { content };
                    if (isRoot && remoteFileId) updates.driveFileId = remoteFileId;
                    itemsToUpdate.set(currentId, updates);
                } else {
                    currentId = `content-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    newItems.push({ id: currentId, type, name: itemData.name, parentId, content, driveFileId: (isRoot && remoteFileId) ? remoteFileId : undefined });
                }

                if (type === ContentCatalogItemType.FOLDER && Array.isArray(itemData.children)) {
                    itemData.children.forEach((child: any) => recursiveImport(child, currentId, false));
                }
            };

            recursiveImport(data.root || data, currentParentId, true);
            const mergedItems = prevItems.map(item => itemsToUpdate.has(item.id) ? { ...item, ...itemsToUpdate.get(item.id) } : item);
            const finalResult = [...mergedItems, ...newItems];
            persistItems(finalResult);
            return finalResult;
        });
    }, [isInitialized, currentParentId]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.appName !== 'Prompt_modifier') throw new Error('File not supported.');
                if (!data.root) throw new Error('Invalid catalog structure.');

                if (data.catalogContext && data.catalogContext !== catalogContext) {
                    if (onRedirectImport) { onRedirectImport(data); return; }
                }
                importItemsData(data);
            } catch (err: any) { alert(`Error: ${err.message}`); } 
            finally { if (e.target) e.target.value = ''; }
        };
        reader.readAsText(file);
    }, [catalogContext, onRedirectImport, importItemsData]);

    const triggerLoadFromFile = useCallback(() => fileInputRef.current?.click(), []);

    const moveItem = useCallback(async (itemId: string, newParentId: string | null) => {
        if (!isInitialized) return;
        setItems(prevItems => {
            const itemToMove = prevItems.find(i => i.id === itemId);
            if (!itemToMove || itemToMove.parentId === newParentId) return prevItems;
            const updated = prevItems.map(item => item.id === itemId ? { ...item, parentId: newParentId } : item);
            persistItems(updated);
            return updated;
        });
    }, [isInitialized]);

    const replaceAllItems = useCallback(async (newItems: ContentCatalogItem[]) => {
        if (!isInitialized) return;
        setItems(newItems);
        await persistItems(newItems);
    }, [isInitialized]);

    return {
        items, currentItems, path, navigateToFolder, navigateBack, createItem,
        renameItem, deleteItem, saveItemToDisk, fileInputRef, handleFileChange,
        triggerLoadFromFile, moveItem, replaceAllItems, importItemsData, setItemDriveId
    };
};

export const useCatalog = (t: (key: string) => string, onRedirectImport?: (data: any) => void) => {
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const catalogContext = 'groups';

    useEffect(() => {
        const loadItems = async () => {
            try {
                const storedItems = await idbGet<CatalogItem[]>(STORAGE_KEY_GROUPS);
                if (storedItems && storedItems.length > 0) setCatalogItems(storedItems);
                else { setCatalogItems(defaultCatalogItems); await idbSet(STORAGE_KEY_GROUPS, defaultCatalogItems); }
            } catch (error) { setCatalogItems(defaultCatalogItems); }
            finally { setIsInitialized(true); }
        };
        loadItems();
    }, []);

    const [navigationHistory, setNavigationHistory] = useState<Array<string | null>>([null]);
    const catalogFileInputRef = useRef<HTMLInputElement>(null);
    const currentParentId = navigationHistory[navigationHistory.length - 1];

    const persistItems = async (items: CatalogItem[]) => {
        try { await idbSet(STORAGE_KEY_GROUPS, items); } catch (error) {}
    };

    const currentCatalogItems = useMemo(() => {
        if (!isInitialized) return [];
        return catalogItems.filter(item => item.parentId === currentParentId).sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === CatalogItemType.FOLDER ? -1 : 1;
        });
    }, [catalogItems, currentParentId, isInitialized]);

    const catalogPath = useMemo(() => {
        const root = { id: null, name: t('catalog.tabs.groups') };
        if (!isInitialized) return [root];
        const segments: { id: string | null, name: string }[] = [];
        let currentId = currentParentId;
        while (currentId) {
            const folder = catalogItems.find(item => item.id === currentId);
            if (folder) { segments.unshift({ id: folder.id, name: folder.name }); currentId = folder.parentId; }
            else break;
        }
        return [root, ...segments];
    }, [currentParentId, catalogItems, t, isInitialized]);

    const navigateCatalogToFolder = useCallback((folderId: string | null) => {
        const historyIndex = navigationHistory.findIndex(id => id === folderId);
        if (historyIndex > -1) setNavigationHistory(prev => prev.slice(0, historyIndex + 1));
        else setNavigationHistory(prev => [...prev, folderId]);
    }, [navigationHistory]);

    const navigateCatalogBack = useCallback(() => {
        setNavigationHistory(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
    }, []);

    const createCatalogItem = useCallback(async (type: CatalogItemType) => {
        if (!isInitialized || type !== CatalogItemType.FOLDER) return;
        const newItem: CatalogItem = { id: `cat-item-${Date.now()}`, type, name: t('library.actions.newFolder'), parentId: currentParentId };
        setCatalogItems(prev => { const updated = [...prev, newItem]; persistItems(updated); return updated; });
    }, [currentParentId, t, isInitialized]);

    const saveGroupToCatalog = useCallback(async (group: Group, allNodes: Node[], allConnections: Connection[], fullSizeImageCache?: Record<string, Record<number, string>>) => {
        if (!isInitialized) return;
        const memberNodes = allNodes.filter(n => group.nodeIds.includes(n.id));
        if (memberNodes.length === 0) return;
        const memberNodeIds = new Set(memberNodes.map(n => n.id));
        const internalConnections = allConnections.filter(c => memberNodeIds.has(c.fromNodeId) && memberNodeIds.has(c.toNodeId));
        const nodesToSave: Node[] = JSON.parse(JSON.stringify(memberNodes));
        const connectionsToSave: Connection[] = JSON.parse(JSON.stringify(internalConnections));
        const minX = Math.min(...nodesToSave.map((n: Node) => n.position.x));
        const minY = Math.min(...nodesToSave.map((n: Node) => n.position.y));
        nodesToSave.forEach((n: Node) => { n.position.x -= minX; n.position.y -= minY; });
        const imagesToSave: Record<string, Record<number, string>> = {};
        if (fullSizeImageCache) {
            memberNodes.forEach(node => { if (fullSizeImageCache[node.id]) imagesToSave[node.id] = fullSizeImageCache[node.id]; });
        }
        const newCatalogItem: CatalogItem = { id: `catalog-item-${Date.now()}`, type: CatalogItemType.GROUP, name: group.title, parentId: currentParentId, nodes: nodesToSave, connections: connectionsToSave, fullSizeImages: imagesToSave };
        setCatalogItems(prev => { const updated = [...prev, newCatalogItem]; persistItems(updated); return updated; });
    }, [currentParentId, isInitialized]);

    const renameCatalogItem = useCallback(async (itemId: string, newName: string) => {
        if (!isInitialized || !newName || !newName.trim()) return;
        setCatalogItems(prev => { const updated = prev.map(item => item.id === itemId ? { ...item, name: newName.trim() } : item); persistItems(updated); return updated; });
    }, [isInitialized]);

    const deleteCatalogItem = useCallback(async (itemId: string) => {
        if (!isInitialized) return;
        setCatalogItems(prev => {
            const idsToDelete = new Set<string>([itemId]);
            const queue = [itemId];
            while (queue.length > 0) {
                const currentId = queue.shift();
                for (const item of prev) if (item.parentId === currentId) { idsToDelete.add(item.id); if (item.type === CatalogItemType.FOLDER) queue.push(item.id); }
            }
            const updated = prev.filter(item => !idsToDelete.has(item.id));
            persistItems(updated);
            return updated;
        });
    }, [isInitialized]);

    const saveCatalogItemToDisk = useCallback((itemId: string) => {
        const item = catalogItems.find(i => i.id === itemId);
        if (!item) return;
        let rootData: any;
        if (item.type === CatalogItemType.GROUP) rootData = { type: 'prompModifierGroup', name: item.name, nodes: item.nodes, connections: item.connections, fullSizeImages: item.fullSizeImages };
        else {
            const getFolderContents = (folderId: string): any => {
                const folder = catalogItems.find(i => i.id === folderId);
                if (!folder) return null;
                const children = catalogItems.filter(i => i.parentId === folderId);
                return { name: folder.name, type: 'folder', children: children.map(child => child.type === CatalogItemType.FOLDER ? getFolderContents(child.id) : { type: 'prompModifierGroup', name: child.name, nodes: child.nodes, connections: child.connections, fullSizeImages: child.fullSizeImages }) };
            };
            rootData = getFolderContents(itemId);
        }
        const exportData = { appName: 'Prompt_modifier', catalogContext, root: rootData };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `Catalog_${catalogContext}_${item.name.trim().replace(/\s+/g, '_')}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [catalogItems]);

    const importItemsData = useCallback(async (data: any) => {
        if (!isInitialized) return;
        const newItems: CatalogItem[] = [];
        const recursiveImport = (itemData: any, parentId: string | null) => {
            if (!itemData.name || !itemData.type) return;
            const type = (itemData.type === 'prompModifierGroup' || itemData.type === 'group') ? CatalogItemType.GROUP : CatalogItemType.FOLDER;
            const newId = `cat-item-${Date.now()}-${Math.random()}`;
            newItems.push({ id: newId, type, name: itemData.name, parentId, nodes: type === CatalogItemType.GROUP ? itemData.nodes || [] : undefined, connections: type === CatalogItemType.GROUP ? itemData.connections || [] : undefined, fullSizeImages: type === CatalogItemType.GROUP ? itemData.fullSizeImages : undefined });
            if (type === CatalogItemType.FOLDER && Array.isArray(itemData.children)) itemData.children.forEach((child: any) => recursiveImport(child, newId));
        };
        recursiveImport(data.root || data, currentParentId);
        setCatalogItems(prev => { const updated = [...prev, ...newItems]; persistItems(updated); return updated; });
    }, [isInitialized, currentParentId]);

    const handleCatalogFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isInitialized) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const data = JSON.parse(text);
                if (data.appName !== 'Prompt_modifier') throw new Error('File not supported.');
                if (data.catalogContext && data.catalogContext !== catalogContext) if (onRedirectImport) { onRedirectImport(data); return; }
                importItemsData(data);
            } catch (err: any) { alert(`Error: ${err.message}`); }
            finally { if (e.target) e.target.value = ''; }
        };
        reader.readAsText(file);
    }, [t, isInitialized, onRedirectImport, importItemsData]);

    const triggerLoadFromFile = useCallback(() => catalogFileInputRef.current?.click(), []);
    const moveCatalogItem = useCallback(async (itemId: string, newParentId: string | null) => {
        if (!isInitialized) return;
        setCatalogItems(prev => {
            const updated = prev.map(item => item.id === itemId ? { ...item, parentId: newParentId } : item);
            persistItems(updated); return updated;
        });
    }, [isInitialized]);
    const replaceAllItems = useCallback(async (newItems: CatalogItem[]) => {
        if (!isInitialized) return;
        setCatalogItems(newItems); await persistItems(newItems);
    }, [isInitialized]);

    const setItemDriveId = useCallback(async (itemId: string, driveFileId: string | undefined) => {
        if (!isInitialized) return;
        setCatalogItems(prev => { const updated = prev.map(item => item.id === itemId ? { ...item, driveFileId } : item); persistItems(updated); return updated; });
    }, [isInitialized]);

    return { catalogItems, currentCatalogItems, catalogPath, navigateCatalogBack, navigateCatalogToFolder, createCatalogItem, saveGroupToCatalog, renameCatalogItem, deleteCatalogItem, saveCatalogItemToDisk, catalogFileInputRef, handleCatalogFileChange, triggerLoadFromFile, moveCatalogItem, replaceAllItems, importItemsData, setItemDriveId };
};
