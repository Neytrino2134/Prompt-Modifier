
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LibraryItem, Tab, CanvasState, ConnectingInfo, Point, NodeType } from '../types';
import { defaultCanvasState } from './useTabs';
import type { useContentCatalog } from './useCatalog';

interface UseDialogsAndUIProps {
    setGroups: React.Dispatch<React.SetStateAction<any>>;
    renameCatalogItem: (itemId: string, newName: string) => void;
    updateLibraryItem: (itemId: string, updates: Partial<Pick<LibraryItem, "name" | "content">>) => void;
    handleRenameTab: (tabId: string, newName: string) => void;
    handleCloseTab: (tabId: string) => void;
    handleRenameNode: (nodeId: string, newName: string) => void;
    getCurrentCanvasState: () => CanvasState;
    loadCanvasState: (state: CanvasState) => void;
    tabs: Tab[];
    activeTabId: string;
    t: (key: string, options?: { [key: string]: string | number; }) => string;
    characterCatalog: ReturnType<typeof useContentCatalog>;
    scriptCatalog: ReturnType<typeof useContentCatalog>;
    sequenceCatalog: ReturnType<typeof useContentCatalog>;
}

const QUICK_SLOTS_KEY = 'quick_slots_config';

export const useDialogsAndUI = (props: UseDialogsAndUIProps) => {
    const { setGroups, renameCatalogItem, updateLibraryItem, handleRenameTab, handleCloseTab, handleRenameNode, getCurrentCanvasState, loadCanvasState, tabs, activeTabId, t, characterCatalog, scriptCatalog, sequenceCatalog } = props;
    const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
    const [quickSearchPosition, setQuickSearchPosition] = useState<Point>({ x: 0, y: 0 });
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddPosition, setQuickAddPosition] = useState({ x: 0, y: 0 });
    const [isConnectionQuickAddOpen, setIsConnectionQuickAddOpen] = useState(false);
    const [connectionQuickAddInfo, setConnectionQuickAddInfo] = useState<{ position: Point; connectingInfo: ConnectingInfo; sourceNodeType?: NodeType } | null>(null);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [renameInfo, setRenameInfo] = useState<{ type: 'group' | 'catalog' | 'library' | 'tab' | 'character' | 'script' | 'sequence' | 'node'; id: string; currentTitle: string } | null>(null);
    const [promptEditInfo, setPromptEditInfo] = useState<LibraryItem | null>(null);
    const [confirmInfo, setConfirmInfo] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);
    const [isErrorCopied, setIsErrorCopied] = useState(false);
    const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
    const apiKeyCallbacks = useRef({ onSelect: () => {}, onClose: () => {} });
    const [imageViewer, setImageViewer] = useState<{ sources: { src: string; frameNumber: number; prompt?: string; }[], initialIndex: number } | null>(null);
    
    // Node Deletion Confirmation State
    const [nodeDeleteConfirm, setNodeDeleteConfirm] = useState<{ nodeIds: string[]; position: Point } | null>(null);

    // Context Menu & Quick Slots State
    const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; position: Point } | null>(null);
    const [nodeContextMenu, setNodeContextMenu] = useState<{ isOpen: boolean; position: Point; nodeId: string } | null>(null);
    const [isContextMenuPinned, setIsContextMenuPinned] = useState(false);
    const [quickSlots, setQuickSlots] = useState<(NodeType | null)[]>(Array(8).fill(null));

    // Quick Add Menu Pin State
    const [isQuickAddMenuPinned, setIsQuickAddMenuPinned] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(QUICK_SLOTS_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === 8) {
                    setQuickSlots(parsed);
                }
            } catch (e) { console.error("Failed to load quick slots", e); }
        }
    }, []);

    const updateQuickSlot = useCallback((index: number, type: NodeType) => {
        setQuickSlots(prev => {
            const next = [...prev];
            next[index] = type;
            localStorage.setItem(QUICK_SLOTS_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const setAllQuickSlots = useCallback((newSlots: (NodeType | null)[]) => {
        if (Array.isArray(newSlots) && newSlots.length === 8) {
            setQuickSlots(newSlots);
            localStorage.setItem(QUICK_SLOTS_KEY, JSON.stringify(newSlots));
        }
    }, []);

    const handleOpenContextMenu = useCallback((position: Point) => {
        setContextMenu({ isOpen: true, position });
        // Close other menus
        setNodeContextMenu(null);
        setNodeDeleteConfirm(null); // Close delete confirm if open
    }, []);

    const handleCloseContextMenu = useCallback((force = false) => {
        if (!force && isContextMenuPinned) return;
        setContextMenu(null);
        setIsContextMenuPinned(false); // Reset pin on close
    }, [isContextMenuPinned]);

    const handleOpenNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setNodeContextMenu({ isOpen: true, position: { x: e.clientX, y: e.clientY }, nodeId });
        // Close other menus
        setContextMenu(null);
        setNodeDeleteConfirm(null);
    }, []);

    const handleCloseNodeContextMenu = useCallback(() => {
        setNodeContextMenu(null);
    }, []);
    
    const toggleContextMenuPin = useCallback(() => {
        setIsContextMenuPinned(prev => !prev);
    }, []);

    const toggleQuickAddMenuPin = useCallback(() => {
        setIsQuickAddMenuPinned(prev => !prev);
    }, []);


    const handleOpenQuickSearch = useCallback((pos: Point) => {
        setQuickSearchPosition(pos);
        setIsQuickSearchOpen(true);
    }, []);

    const handleOpenQuickAdd = useCallback((position: { x: number, y: number }) => {
        setIsQuickAddOpen(true);
        setQuickAddPosition(position);
    }, []);
    
    const handleCloseAddNodeMenus = useCallback(() => {
        setIsQuickSearchOpen(false);
        if (!isQuickAddMenuPinned) {
            setIsQuickAddOpen(false);
        }
        if (!isContextMenuPinned) {
            setContextMenu(null);
        }
        setNodeContextMenu(null);
    }, [isContextMenuPinned, isQuickAddMenuPinned]);

    const handleOpenConnectionQuickAdd = useCallback((position: Point, connectingInfo: ConnectingInfo, sourceNodeType?: NodeType) => {
        setConnectionQuickAddInfo({ position, connectingInfo, sourceNodeType });
        setIsConnectionQuickAddOpen(true);
    }, []);

    const handleCloseConnectionQuickAdd = useCallback(() => {
        setIsConnectionQuickAddOpen(false);
        setConnectionQuickAddInfo(null);
    }, []);
    
    const handleToggleCatalog = useCallback(() => setIsCatalogOpen(prev => !prev), []);
    const handleCloseCatalog = useCallback(() => setIsCatalogOpen(false), []);

    const confirmRename = useCallback((newName: string) => {
      if (!renameInfo || !newName || !newName.trim()) { setRenameInfo(null); return; }
      
      const trimmedName = newName.trim();
      
      if (renameInfo.type === 'group') setGroups(currentGroups => currentGroups.map(g => g.id === renameInfo.id ? { ...g, title: trimmedName } : g));
      else if (renameInfo.type === 'catalog') renameCatalogItem(renameInfo.id, trimmedName);
      else if (renameInfo.type === 'library') updateLibraryItem(renameInfo.id, { name: trimmedName });
      else if (renameInfo.type === 'tab') handleRenameTab(renameInfo.id, trimmedName);
      else if (renameInfo.type === 'character') characterCatalog.renameItem(renameInfo.id, trimmedName);
      else if (renameInfo.type === 'script') scriptCatalog.renameItem(renameInfo.id, trimmedName);
      else if (renameInfo.type === 'sequence') sequenceCatalog.renameItem(renameInfo.id, trimmedName);
      else if (renameInfo.type === 'node') handleRenameNode(renameInfo.id, trimmedName);
      
      setRenameInfo(null);
    }, [renameInfo, setGroups, renameCatalogItem, updateLibraryItem, handleRenameTab, characterCatalog, scriptCatalog, sequenceCatalog, handleRenameNode]);
    
    const confirmPromptEdit = useCallback((name: string, content: string) => {
        if (promptEditInfo) updateLibraryItem(promptEditInfo.id, { name: name.trim(), content });
        setPromptEditInfo(null);
    }, [promptEditInfo, updateLibraryItem]);

    const handleClearCanvas = useCallback((e?: React.MouseEvent) => {
        const performClear = () => {
            const emptyState: CanvasState = { nodes: [], connections: [], groups: [], viewTransform: { scale: 1, translate: { x: 0, y: 0 } }, nodeIdCounter: 0, fullSizeImageCache: {} };
            loadCanvasState(emptyState);
        };

        if (e?.shiftKey) {
            performClear();
        } else {
            setConfirmInfo({ title: t('dialog.confirmClear.title'), message: t('dialog.confirmClear.message'), onConfirm: performClear });
        }
    }, [t, loadCanvasState]);

    const handleResetCanvas = useCallback((e?: React.MouseEvent) => {
        const performReset = () => {
            const newState = JSON.parse(JSON.stringify(defaultCanvasState));
            loadCanvasState(newState);
        };

        if (e?.shiftKey) {
            performReset();
        } else {
            setConfirmInfo({
                title: t('dialog.confirmReset.title'),
                message: t('dialog.confirmReset.message'),
                onConfirm: performReset
            });
        }
    }, [t, loadCanvasState]);
    
    const showApiKeyDialog = useCallback((callbacks: { onSelect: () => void; onClose: () => void }) => {
        apiKeyCallbacks.current = callbacks;
        setIsApiKeyDialogOpen(true);
    }, []);
  
    const handleApiKeySelect = useCallback(() => {
      apiKeyCallbacks.current.onSelect();
      setIsApiKeyDialogOpen(false);
    }, []);
  
    const handleApiKeyDialogClose = useCallback(() => {
      apiKeyCallbacks.current.onClose();
      setIsApiKeyDialogOpen(false);
    }, []);
    
    const handleCloseTabWithConfirm = useCallback((tabId: string, e?: React.MouseEvent) => {
        if (tabs.length <= 1) return;
        const tabToClose = tabs.find(t => t.id === tabId);
        if (!tabToClose) return;
        
        const stateToCheck: CanvasState = tabId === activeTabId ? getCurrentCanvasState() : tabToClose.state;
        const isCanvasEmpty = stateToCheck.nodes.length === 0 && stateToCheck.connections.length === 0 && (stateToCheck.groups || []).length === 0;
        
        if (isCanvasEmpty || e?.shiftKey) {
            handleCloseTab(tabId);
        } else {
            setConfirmInfo({
                title: t('dialog.confirmCloseTab.title'),
                message: t('dialog.confirmCloseTab.message', { tabName: tabToClose.name }),
                onConfirm: () => handleCloseTab(tabId),
            });
        }
    }, [tabs, activeTabId, handleCloseTab, setConfirmInfo, t, getCurrentCanvasState]);

    const handleCopyError = useCallback((error: string | null) => {
        if (error) {
          navigator.clipboard.writeText(error).then(() => {
            setIsErrorCopied(true);
          });
        }
      }, []);

    const requestDeleteNodes = useCallback((nodeIds: string[], position: Point) => {
        setNodeDeleteConfirm({ nodeIds, position });
    }, []);

    const cancelDeleteNodes = useCallback(() => {
        setNodeDeleteConfirm(null);
    }, []);

    return {
        isQuickSearchOpen, quickSearchPosition, isQuickAddOpen, quickAddPosition, isCatalogOpen, renameInfo, promptEditInfo, confirmInfo, isErrorCopied, isApiKeyDialogOpen,
        handleOpenQuickSearch, handleOpenQuickAdd, handleCloseAddNodeMenus, handleToggleCatalog, handleCloseCatalog, setRenameInfo, setPromptEditInfo, setConfirmInfo, confirmRename, confirmPromptEdit, setIsErrorCopied, handleClearCanvas, handleResetCanvas,
        showApiKeyDialog, handleApiKeySelect, handleApiKeyDialogClose, 
        handleCloseTab: handleCloseTabWithConfirm,
        handleCopyError,
        loadCanvasState,
        imageViewer,
        setImageViewer,
        isConnectionQuickAddOpen,
        connectionQuickAddInfo,
        handleOpenConnectionQuickAdd,
        handleCloseConnectionQuickAdd,
        contextMenu,
        nodeContextMenu,
        isContextMenuPinned,
        toggleContextMenuPin,
        quickSlots,
        updateQuickSlot,
        setAllQuickSlots,
        handleOpenContextMenu,
        handleCloseContextMenu,
        handleOpenNodeContextMenu,
        handleCloseNodeContextMenu,
        isQuickAddMenuPinned,
        toggleQuickAddMenuPin,
        nodeDeleteConfirm,
        requestDeleteNodes,
        cancelDeleteNodes
    };
};
