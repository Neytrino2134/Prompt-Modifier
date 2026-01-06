




import React, { useState, useCallback, useMemo, useRef } from 'react';
import { LibraryItem, LibraryItemType } from '../types';

const STORAGE_KEY = 'prompt-library-items';

const defaultLibraryItems: LibraryItem[] = [
    { id: 'folder-1', type: LibraryItemType.FOLDER, name: 'Basic Promts', parentId: null },
    { id: 'prompt-1', type: LibraryItemType.PROMPT, name: 'Fill background', parentId: 'folder-1', content: 'Fill the white background with the surroundings' },
    { id: 'prompt-2', type: LibraryItemType.PROMPT, name: 'Remove all watermarks', parentId: 'folder-1', content: 'Remove all watermarks, logos, text overlays, and advertisement banners from the image. Restore the original background naturally, blending colors and textures smoothly. Keep all other visual elements unchanged and realistic.' },
    { id: 'prompt-3', type: LibraryItemType.PROMPT, name: 'Character concept', parentId: 'folder-1', content: 'Create a character concept based on the provided image. The character is standing full-length against a gray background.' }
];

const getTimestamp = () => {
    return new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];
};

export const usePromptLibrary = (t: (key: string) => string, onRedirectImport?: (data: any) => void) => {
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : defaultLibraryItems;
        } catch (error) {
            console.error("Failed to load prompt library from storage", error);
            return defaultLibraryItems;
        }
    });
    const catalogContext = 'library';
    
    const [navigationHistory, setNavigationHistory] = useState<Array<string | null>>([null]);
    const libraryFileInputRef = useRef<HTMLInputElement>(null);
    
    const currentParentId = navigationHistory[navigationHistory.length - 1];

    const persistItems = (items: LibraryItem[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error("Failed to save prompt library to storage", error);
        }
    };

    const currentLibraryItems = useMemo(() => {
        return libraryItems
            .filter(item => item.parentId === currentParentId)
            .sort((a, b) => {
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type === LibraryItemType.FOLDER ? -1 : 1;
            });
    }, [libraryItems, currentParentId]);

    const libraryPath = useMemo(() => {
        const path: { id: string | null; name: string }[] = [{ id: null, name: t('catalog.tabs.library') }];
        navigationHistory.slice(1).forEach(folderId => {
            if (!folderId) return;
            const folder = libraryItems.find(item => item.id === folderId);
            if (folder) {
                path.push({ id: folder.id, name: folder.name });
            }
        });
        return path;
    }, [navigationHistory, libraryItems, t]);

    const navigateToFolder = useCallback((folderId: string | null) => {
        const historyIndex = navigationHistory.findIndex(id => id === folderId);
        if (historyIndex > -1) {
            setNavigationHistory(prev => prev.slice(0, historyIndex + 1));
        } else {
            setNavigationHistory(prev => [...prev, folderId]);
        }
    }, [navigationHistory]);

    const navigateBack = useCallback(() => {
        setNavigationHistory(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
    }, []);
    
    const createLibraryItem = useCallback((type: LibraryItemType) => {
        const name = type === LibraryItemType.FOLDER ? t('library.actions.newFolder') : t('library.actions.newPrompt');
        const newItem: LibraryItem = {
            id: `lib-item-${Date.now()}`,
            type,
            name,
            parentId: currentParentId,
            content: type === LibraryItemType.PROMPT ? '' : undefined
        };
        setLibraryItems(prev => {
            const updated = [...prev, newItem];
            persistItems(updated);
            return updated;
        });
    }, [currentParentId, t]);

    const addPromptToLibrary = useCallback((name: string, content: string) => {
        const newItem: LibraryItem = {
            id: `lib-item-${Date.now()}`,
            type: LibraryItemType.PROMPT,
            name,
            parentId: currentParentId,
            content
        };
        setLibraryItems(prev => {
            const updated = [...prev, newItem];
            persistItems(updated);
            return updated;
        });
    }, [currentParentId]);

    const saveToLibrary = useCallback((content: string, folderName: string) => {
        if (!content) return;

        setLibraryItems(prevItems => {
            let folder = prevItems.find(item => item.type === LibraryItemType.FOLDER && item.parentId === null && item.name === folderName);
            let folderId: string;
            let updatedItems = [...prevItems];

            if (!folder) {
                folderId = `lib-item-folder-${Date.now()}`;
                const newFolder: LibraryItem = { id: folderId, type: LibraryItemType.FOLDER, name: folderName, parentId: null };
                updatedItems.push(newFolder);
            } else {
                folderId = folder.id;
            }

            const words = content.split(/[\s,]+/).filter(Boolean).slice(0, 4);
            let promptName = words.join(' ');
            if (promptName.length > 30) {
                promptName = promptName.substring(0, 30) + '...';
            }
            if (!promptName) {
                promptName = 'New Prompt';
            }

            // check for duplicate name
            let finalPromptName = promptName;
            let counter = 1;
            while (updatedItems.some(item => item.parentId === folderId && item.name === finalPromptName)) {
                finalPromptName = `${promptName} (${counter++})`;
            }

            const newPrompt: LibraryItem = {
                id: `lib-item-prompt-${Date.now()}`,
                type: LibraryItemType.PROMPT,
                name: finalPromptName,
                parentId: folderId,
                content
            };

            updatedItems.push(newPrompt);
            persistItems(updatedItems);
            return updatedItems;
        });
    }, []);

    const saveProcessorPrompt = useCallback((content: string) => {
        saveToLibrary(content, "Processor Prompts");
    }, [saveToLibrary]);

    const updateLibraryItem = useCallback((itemId: string, updates: Partial<Pick<LibraryItem, 'name' | 'content'>>) => {
        setLibraryItems(prev => {
            const updated = prev.map(item => item.id === itemId ? { ...item, ...updates } : item);
            persistItems(updated);
            return updated;
        });
    }, []);

    const deleteLibraryItem = useCallback((itemId: string) => {
        setLibraryItems(prev => {
            const itemMap = new Map(prev.map(item => [item.id, item]));
            const idsToDelete = new Set<string>([itemId]);
            const queue = [itemId];

            while (queue.length > 0) {
                const currentId = queue.shift();
                for (const item of prev) {
                    if (item.parentId === currentId) {
                        idsToDelete.add(item.id);
                        if (item.type === LibraryItemType.FOLDER) {
                            queue.push(item.id);
                        }
                    }
                }
            }
            
            const updated = prev.filter(item => !idsToDelete.has(item.id));
            persistItems(updated);
            return updated;
        });
    }, []);
    
    const saveLibraryItemToDisk = useCallback((item: LibraryItem) => {
        let exportData: any;
        let filename: string;
        const timestamp = getTimestamp();

        if (item.type === LibraryItemType.PROMPT) {
            // Plain text export for single prompts, no context wrapper needed as it's just a txt file
            const content = item.content || '';
            filename = `${item.name.trim().replace(/\s+/g, '_')}_${timestamp}.txt`;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            return;
        } else { // Folder
            const getFolderContents = (folderId: string): any => {
                const folder = libraryItems.find(i => i.id === folderId);
                if (!folder) return null;
                
                const children = libraryItems.filter(i => i.parentId === folderId);
                return {
                    name: folder.name,
                    type: 'folder',
                    children: children.map(child => {
                        return child.type === LibraryItemType.FOLDER
                            ? getFolderContents(child.id)
                            : { name: child.name, type: 'prompt', content: child.content || '' }
                    })
                };
            };
            exportData = {
                appName: 'Prompt_modifier',
                catalogContext,
                root: getFolderContents(item.id)
            };
            filename = `Catalog_${catalogContext}_${item.name.trim().replace(/\s+/g, '_')}_${timestamp}.json`;
        }

        const content = JSON.stringify(exportData, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    }, [libraryItems]);

    const importItemsData = useCallback(async (data: any) => {
        const newItems: LibraryItem[] = [];
    
        const recursiveImport = (itemData: any, parentId: string | null) => {
            const newId = `lib-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            if (!itemData.name || !itemData.type) return;

            const type = itemData.type === 'folder' ? LibraryItemType.FOLDER : LibraryItemType.PROMPT;
            
            const newItem: LibraryItem = {
                id: newId,
                type: type,
                name: itemData.name,
                parentId: parentId,
                content: type === LibraryItemType.PROMPT ? itemData.content || '' : undefined
            };
            newItems.push(newItem);

            if (type === LibraryItemType.FOLDER && Array.isArray(itemData.children)) {
                itemData.children.forEach((child: any) => recursiveImport(child, newId));
            }
        };

        // Handle wrapped format
        const rootItem = data.root || data;
        recursiveImport(rootItem, currentParentId);

        setLibraryItems(prev => {
            const updated = [...prev, ...newItems];
            persistItems(updated);
            return updated;
        });
    }, [currentParentId]);

    const handleLibraryFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                if (!text) throw new Error("Empty file");
                
                // If it's just text content (old single prompt export or basic txt file)
                if (file.name.endsWith('.txt')) {
                     // Just import as a prompt
                     const name = file.name.replace('.txt', '');
                     addPromptToLibrary(name, text);
                     return;
                }

                const loadedData = JSON.parse(text);

                // VALIDATION LOGIC
                if (loadedData.appName !== 'Prompt_modifier') {
                    throw new Error(t('alert.fileNotSupported') || 'File not supported. Missing "appName": "Prompt_modifier".');
                }
                if (!loadedData.root) {
                    throw new Error(t('alert.invalidCatalogStructure') || 'Invalid catalog structure. Missing "root".');
                }

                if (loadedData.catalogContext && loadedData.catalogContext !== catalogContext) {
                    if (onRedirectImport) {
                        onRedirectImport(loadedData);
                        return;
                    }
                }

                importItemsData(loadedData);
            } catch (err: any) {
                alert(`${t('alert.loadCatalogFailed')}: ${err.message}`);
            } finally {
                if (e.target) e.target.value = '';
            }
        };
        reader.onerror = () => {
            alert("Error reading the selected file.");
        };
        reader.readAsText(file);
    }, [importItemsData, onRedirectImport, catalogContext, t, addPromptToLibrary]);

    const triggerLoadLibraryFromFile = useCallback(() => {
        libraryFileInputRef.current?.click();
    }, []);

    const moveLibraryItem = useCallback((itemId: string, newParentId: string | null) => {
        setLibraryItems(prev => {
            const itemToMove = prev.find(i => i.id === itemId);
            if (!itemToMove || itemToMove.parentId === newParentId) {
                return prev;
            }
    
            if (itemToMove.type === LibraryItemType.FOLDER) {
                let currentParent = newParentId;
                while (currentParent) {
                    if (currentParent === itemId) {
                        return prev; 
                    }
                    const parentFolder = prev.find(i => i.id === currentParent);
                    currentParent = parentFolder ? parentFolder.parentId : null;
                }
            }
    
            const updated = prev.map(item =>
                item.id === itemId ? { ...item, parentId: newParentId } : item
            );
            persistItems(updated);
            return updated;
        });
    }, []);

    const replaceAllItems = useCallback((newItems: LibraryItem[]) => {
        setLibraryItems(newItems);
        persistItems(newItems);
    }, []);

    return {
        libraryItems,
        currentLibraryItems,
        libraryPath,
        navigateBack,
        navigateToFolder,
        createLibraryItem,
        updateLibraryItem,
        deleteLibraryItem,
        saveLibraryItemToDisk,
        libraryFileInputRef,
        handleLibraryFileChange,
        triggerLoadLibraryFromFile,
        moveLibraryItem,
        addPromptToLibrary,
        saveProcessorPrompt,
        saveToLibrary,
        replaceAllItems,
        importItemsData
    };
};