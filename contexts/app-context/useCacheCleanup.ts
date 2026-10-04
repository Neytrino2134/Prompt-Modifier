import { useCallback, useRef } from 'react';
import { Tab, CanvasState } from '../../types';
import { readPersistentCacheProtection } from '../../services/cacheProtection';
import { collectCacheReferences, pruneCanvasImageCache } from '../../utils/cacheReferences';
import { saveSessionToDB } from '../../hooks';

interface UseCacheCleanupParams {
    isTabsLoaded: boolean;
    tabs: Tab[];
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    activeTabId: string;
    nodes: any[];
    fullSizeImageCache: Record<string, Record<number, string>>;
    setFullSizeImageCache: (cache: Record<string, Record<number, string>>) => void;
    getCurrentCanvasState: () => CanvasState;
    tasks: any[];
    historyItems: any[];
    catalogs: any[];
    globalImageEditor: any;
    imageViewer: any;
    getDeletedNodeCacheReferences: () => any[];
    clearUnusedBatchCache: () => Promise<any>;
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    t: (key: string) => string;
}

export const useCacheCleanup = ({
    isTabsLoaded,
    tabs,
    setTabs,
    activeTabId,
    nodes,
    fullSizeImageCache,
    setFullSizeImageCache,
    getCurrentCanvasState,
    tasks,
    historyItems,
    catalogs,
    globalImageEditor,
    imageViewer,
    getDeletedNodeCacheReferences,
    clearUnusedBatchCache,
    addToast,
    t
}: UseCacheCleanupParams) => {
    const cacheProtectionState = {
        loaded: isTabsLoaded,
        tabs,
        activeTabId,
        nodes,
        fullSizeImageCache,
        canvasState: getCurrentCanvasState(),
        tasks,
        history: historyItems,
        catalogs,
        previews: [globalImageEditor, imageViewer] as unknown[],
        deletedNodes: getDeletedNodeCacheReferences
    };

    const cacheProtectionRef = useRef(cacheProtectionState);
    cacheProtectionRef.current = {
        loaded: isTabsLoaded,
        tabs,
        activeTabId,
        nodes,
        fullSizeImageCache,
        canvasState: getCurrentCanvasState(),
        tasks,
        history: historyItems,
        catalogs,
        previews: [globalImageEditor, imageViewer] as unknown[],
        deletedNodes: getDeletedNodeCacheReferences
    };

    const getCacheProtection = useCallback(async () => {
        if (!cacheProtectionRef.current.loaded) throw new Error('Session is still loading');
        const persistent = await readPersistentCacheProtection();
        const current = cacheProtectionRef.current;
        const canvases = current.tabs.map((tab: Tab) => tab.id === current.activeTabId
            ? { ...tab.state, nodes: current.nodes, fullSizeImageCache: current.fullSizeImageCache } : tab.state);
        return [...persistent, ...canvases, current.tasks, current.history, current.catalogs, current.previews, current.deletedNodes()];
    }, []);

    const cacheCleanupRef = useRef(false);

    const clearUnusedFullSizeImages = useCallback(async () => {
        if (cacheCleanupRef.current) return;
        cacheCleanupRef.current = true;
        try {
            const roots = await getCacheProtection();
            const references = collectCacheReferences(roots);
            const current = cacheProtectionRef.current;
            let removed = 0;
            const cleanedTabs = current.tabs.map((tab: Tab) => {
                const isActive = tab.id === current.activeTabId;
                const state = isActive ? { ...tab.state, ...current.canvasState } : tab.state;
                const cleaned = pruneCanvasImageCache(state.nodes, state.fullSizeImageCache || {}, references.images);
                removed += cleaned.removed;
                return { ...tab, state: { ...state, fullSizeImageCache: cleaned.cache } };
            });
            setFullSizeImageCache(cleanedTabs.find((tab: Tab) => tab.id === current.activeTabId)?.state.fullSizeImageCache || {});
            setTabs(cleanedTabs);
            await saveSessionToDB(cleanedTabs, current.activeTabId);
            addToast(t('cache.imagesCleared').replace('{count}', String(removed)), 'info');
            await clearUnusedBatchCache();
        } catch (error) {
            console.error('Unused cache cleanup failed:', error);
            addToast(t('batch.cacheCleanupFailed'), 'error');
        } finally {
            cacheCleanupRef.current = false;
        }
    }, [getCacheProtection, setFullSizeImageCache, setTabs, clearUnusedBatchCache, addToast, t]);

    return {
        getCacheProtection,
        cacheProtectionRef,
        clearUnusedFullSizeImages
    };
};
