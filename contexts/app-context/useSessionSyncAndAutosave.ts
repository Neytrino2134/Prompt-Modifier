import { useCallback, useEffect, useRef, useState } from 'react';
import { Tab, CanvasState } from '../../types';
import { LanguageCode } from '../../localization';
import { saveSessionToDB } from '../../hooks';
import { createNewTab, normalizeTabs } from '../../hooks/useTabs';
import { startSessionAutosave } from '../../services/sessionAutosave';
import { clearImagesForTabFromCache } from '../../utils/imageMemoryCache';
import { playAutosaveSound } from '../../services/soundNotificationService';
import { generateCanvasScreenshot } from '../../utils/canvasScreenshot';

interface UseSessionSyncAndAutosaveParams {
    tabs: Tab[];
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    activeTabId: string;
    setActiveTabId: (id: string) => void;
    isTabsLoaded: boolean;
    getLocalizedCanvasState: (lang: LanguageCode) => CanvasState;
    setNextAutoSaveTime: (time: number | null) => void;
    setIsAutoSaving: (isSaving: boolean) => void;
    autoSaveInterval: number;
    nodes: any[];
    setNodes: (nodes: any[] | ((prev: any[]) => any[])) => void;
    connections: any[];
    setConnections: (connections: any[] | ((prev: any[]) => any[])) => void;
    groups: any[];
    setGroups: (groups: any[] | ((prev: any[]) => any[])) => void;
    viewTransform: { scale: number; translate: { x: number; y: number } };
    setViewTransform: React.Dispatch<React.SetStateAction<{ scale: number; translate: { x: number; y: number } }>>;
    nodeIdCounter: React.MutableRefObject<number>;
    fullSizeImageCache: Record<string, Record<number, string>>;
    setFullSizeImageCache: (cache: Record<string, Record<number, string>>) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    t: (key: string, options?: any) => string;
}

export const useSessionSyncAndAutosave = ({
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    isTabsLoaded,
    getLocalizedCanvasState,
    setNextAutoSaveTime,
    setIsAutoSaving,
    autoSaveInterval,
    nodes,
    setNodes,
    connections,
    setConnections,
    groups,
    setGroups,
    viewTransform,
    setViewTransform,
    nodeIdCounter,
    fullSizeImageCache,
    setFullSizeImageCache,
    addToast,
    t
}: UseSessionSyncAndAutosaveParams) => {
    const isLoadingStateRef = useRef(false);
    const lastLoadedTabIdRef = useRef<string | null>(null);
    const isTabLoadedFromDBRef = useRef(false);
    const [isCanvasLoading, setIsCanvasLoading] = useState(true);

    const getCurrentCanvasState = useCallback((): CanvasState => ({
        nodes,
        connections,
        groups,
        viewTransform,
        nodeIdCounter: nodeIdCounter.current,
        fullSizeImageCache
    }), [nodes, connections, groups, viewTransform, nodeIdCounter, fullSizeImageCache]);

    const loadCanvasState = useCallback((state: any, tabName?: string) => {
        if (!state) return;
        isLoadingStateRef.current = true;
        setNodes(state.nodes || []);
        setConnections(state.connections || []);
        setGroups(state.groups || []);
        setViewTransform(state.viewTransform || { scale: 1, translate: { x: 0, y: 0 } });
        nodeIdCounter.current = state.nodeIdCounter || 0;
        setFullSizeImageCache(state.fullSizeImageCache || {});

        const newState: CanvasState = {
            nodes: state.nodes || [],
            connections: state.connections || [],
            groups: state.groups || [],
            viewTransform: state.viewTransform || { scale: 1, translate: { x: 0, y: 0 } },
            nodeIdCounter: state.nodeIdCounter || 0,
            fullSizeImageCache: state.fullSizeImageCache || {}
        };

        setTabs(prevTabs => {
            const updated = prevTabs.map(tab => tab.id === activeTabId ? {
                ...tab,
                name: (tabName && tabName.trim()) ? tabName.trim() : tab.name,
                state: newState
            } : tab);
            saveSessionToDB(updated, activeTabId).catch(error => console.error('Background session save failed:', error));
            return updated;
        });

        setTimeout(() => {
            isLoadingStateRef.current = false;
        }, 100);
    }, [activeTabId, setNodes, setConnections, setGroups, setViewTransform, nodeIdCounter, setFullSizeImageCache, setTabs]);

    const restoreSession = useCallback((newTabs: Tab[], targetActiveTabId?: string, persist = true) => {
        if (!Array.isArray(newTabs) || newTabs.length === 0) return;

        const { tabs: normalizedTabs, activeTabId: validActiveId } = normalizeTabs(newTabs, targetActiveTabId);
        const targetTab = normalizedTabs.find(t => t.id === validActiveId) || normalizedTabs[0];

        isLoadingStateRef.current = true;
        lastLoadedTabIdRef.current = validActiveId;

        setTabs(normalizedTabs);
        setActiveTabId(validActiveId);

        setNodes(targetTab.state.nodes || []);
        setConnections(targetTab.state.connections || []);
        setGroups(targetTab.state.groups || []);
        setViewTransform(targetTab.state.viewTransform || { scale: 1, translate: { x: 0, y: 0 } });
        nodeIdCounter.current = targetTab.state.nodeIdCounter || 0;
        setFullSizeImageCache(targetTab.state.fullSizeImageCache || {});

        if (persist) {
            saveSessionToDB(normalizedTabs, validActiveId).catch(error => console.error('Background session save failed:', error));
        }

        setTimeout(() => {
            isLoadingStateRef.current = false;
        }, 120);
    }, [setTabs, setActiveTabId, setNodes, setConnections, setGroups, setViewTransform, nodeIdCounter, setFullSizeImageCache]);

    // Initial DB session load into canvas hooks
    useEffect(() => {
        if (!isTabsLoaded) return;
        if (!isTabLoadedFromDBRef.current) {
            isTabLoadedFromDBRef.current = true;
            restoreSession(tabs, activeTabId, false);
            setIsCanvasLoading(false);
        }
    }, [isTabsLoaded, tabs, activeTabId, restoreSession]);

    // Sync live canvas state back to active tab in tabs array
    useEffect(() => {
        if (isLoadingStateRef.current) return;
        if (!isTabsLoaded) return;
        if (lastLoadedTabIdRef.current !== activeTabId) return;

        const currentTab = tabs.find(t => t.id === activeTabId);
        if (!currentTab) return;

        const liveNodes = nodes;
        const liveConnections = connections;
        const liveGroups = groups;
        const liveViewTransform = viewTransform;
        const liveNodeIdCounter = nodeIdCounter.current;

        const prevState = currentTab.state;

        const isIdentical =
            prevState.nodes === liveNodes &&
            prevState.connections === liveConnections &&
            prevState.groups === liveGroups &&
            prevState.viewTransform === liveViewTransform &&
            prevState.fullSizeImageCache === fullSizeImageCache &&
            prevState.nodeIdCounter === liveNodeIdCounter;

        if (isIdentical) return;

        const stateToSave: CanvasState = {
            nodes: liveNodes,
            connections: liveConnections,
            groups: liveGroups,
            viewTransform: liveViewTransform,
            nodeIdCounter: liveNodeIdCounter,
            fullSizeImageCache: fullSizeImageCache,
        };

        setTabs(prevTabs =>
            prevTabs.map(tab => (tab.id === activeTabId ? { ...tab, state: stateToSave } : tab))
        );
    }, [nodes, connections, groups, viewTransform, fullSizeImageCache, activeTabId, isTabsLoaded, setTabs, nodeIdCounter]);

    const getCompleteProjectState = useCallback((): { tabs: Tab[], activeTabId: string } => {
        const liveState: CanvasState = {
            nodes,
            connections,
            groups,
            viewTransform,
            nodeIdCounter: nodeIdCounter.current,
            fullSizeImageCache,
        };

        const latestTabs = tabs.map(tab => 
            tab.id === activeTabId ? { ...tab, state: liveState } : tab
        );

        return { tabs: latestTabs, activeTabId };
    }, [nodes, connections, groups, viewTransform, nodeIdCounter, fullSizeImageCache, tabs, activeTabId]);

    const getCompleteProjectStateRef = useRef(getCompleteProjectState);
    getCompleteProjectStateRef.current = getCompleteProjectState;

    const forceSaveSession = useCallback(async (overrideTabs?: Tab[], overrideActiveTabId?: string, isSnapshot = true): Promise<void> => {
        if (!isTabsLoaded || isLoadingStateRef.current) throw new Error(t('settings.sessionStillLoading'));
        setIsAutoSaving(true);
        try {
            let tabsToSave: Tab[];
            let activeTabIdToSave: string;

            if (overrideTabs && overrideActiveTabId) {
                tabsToSave = overrideTabs;
                activeTabIdToSave = overrideActiveTabId;
            } else {
                const snapshot = getCompleteProjectStateRef.current();
                tabsToSave = snapshot.tabs;
                activeTabIdToSave = snapshot.activeTabId;
                setTabs(tabsToSave);
            }

            const activeTab = (activeTabIdToSave ? tabsToSave.find(t => t.id === activeTabIdToSave) : null) || tabsToSave[0];
            let screenshot = '';
            try { screenshot = activeTab?.state ? generateCanvasScreenshot(activeTab.state) : ''; }
            catch (error) { console.warn('Could not create session preview:', error); }

            await saveSessionToDB(tabsToSave, activeTabIdToSave, screenshot, isSnapshot);
            playAutosaveSound();
        } catch (e) {
            console.error("Failed to save session:", e);
            throw e;
        } finally {
            setIsAutoSaving(false);
        }
    }, [isTabsLoaded, setTabs, setIsAutoSaving, t]);

    // Central Auto-Save Timer
    useEffect(() => {
        if (!isTabsLoaded) return;
        if (new URLSearchParams(window.location.search).has('detachedNodeId')) return;

        const intervalSeconds = autoSaveInterval;
        if (intervalSeconds <= 0) {
            setNextAutoSaveTime(null);
            return;
        }

        const intervalMs = intervalSeconds * 1000;
        setNextAutoSaveTime(Date.now() + intervalMs);

        const stopAutosave = startSessionAutosave(intervalMs, () => !isLoadingStateRef.current, async () => {
            setIsAutoSaving(true);
            try {
                const snapshot = getCompleteProjectStateRef.current();
                const activeTab = (snapshot.activeTabId ? snapshot.tabs.find(t => t.id === snapshot.activeTabId) : null) || snapshot.tabs[0];
                let screenshot = '';
                try { screenshot = activeTab?.state ? generateCanvasScreenshot(activeTab.state) : ''; }
                catch (error) { console.warn('Could not create session preview:', error); }

                await saveSessionToDB(snapshot.tabs, snapshot.activeTabId, screenshot, true);
                addToast(t('toast.autoSaved'), 'success');
                playAutosaveSound();
            } catch (e) {
                console.error("Failed to auto-save session:", e);
                addToast(t('settings.sessionSaveFailed'), 'error');
            } finally {
                setIsAutoSaving(false);
                setNextAutoSaveTime(Date.now() + intervalMs);
            }
        });

        return stopAutosave;
    }, [autoSaveInterval, isTabsLoaded, setNextAutoSaveTime, setIsAutoSaving, addToast, t]);

    const handleSwitchTab = useCallback((targetTabId: string) => {
        if (targetTabId === activeTabId) return;

        const targetTab = tabs.find(t => t.id === targetTabId);
        if (!targetTab) return;

        const currentLiveState: CanvasState = {
            nodes,
            connections,
            groups,
            viewTransform,
            nodeIdCounter: nodeIdCounter.current,
            fullSizeImageCache,
        };

        isLoadingStateRef.current = true;
        lastLoadedTabIdRef.current = targetTabId;

        const updatedTabs = tabs.map(tab => 
            tab.id === activeTabId ? { ...tab, state: currentLiveState } : tab
        );
        setTabs(updatedTabs);
        setActiveTabId(targetTabId);

        setNodes(targetTab.state.nodes || []);
        setConnections(targetTab.state.connections || []);
        setGroups(targetTab.state.groups || []);
        setViewTransform(targetTab.state.viewTransform || { scale: 1, translate: { x: 0, y: 0 } });
        nodeIdCounter.current = targetTab.state.nodeIdCounter || 0;
        setFullSizeImageCache(targetTab.state.fullSizeImageCache || {});

        saveSessionToDB(updatedTabs, targetTabId).catch(error => console.error('Background session save failed:', error));

        setTimeout(() => {
            isLoadingStateRef.current = false;
        }, 80);
    }, [activeTabId, tabs, setTabs, setActiveTabId, nodes, setNodes, connections, setConnections, groups, setGroups, viewTransform, setViewTransform, nodeIdCounter, fullSizeImageCache, setFullSizeImageCache]);

    const handleAddTab = useCallback((customName?: string | unknown) => {
        const currentLiveState: CanvasState = {
            nodes,
            connections,
            groups,
            viewTransform,
            nodeIdCounter: nodeIdCounter.current,
            fullSizeImageCache,
        };

        const safeName = typeof customName === 'string' && customName.trim() ? customName.trim() : `Canvas ${tabs.length + 1}`;
        const newTab = createNewTab(safeName);

        isLoadingStateRef.current = true;
        lastLoadedTabIdRef.current = newTab.id;

        const updatedTabs = tabs.map(tab => 
            tab.id === activeTabId ? { ...tab, state: currentLiveState } : tab
        ).concat(newTab);

        setTabs(updatedTabs);
        setActiveTabId(newTab.id);

        setNodes(newTab.state.nodes || []);
        setConnections(newTab.state.connections || []);
        setGroups(newTab.state.groups || []);
        setViewTransform(newTab.state.viewTransform || { scale: 1, translate: { x: 0, y: 0 } });
        nodeIdCounter.current = newTab.state.nodeIdCounter || 0;
        setFullSizeImageCache(newTab.state.fullSizeImageCache || {});

        saveSessionToDB(updatedTabs, newTab.id).catch(error => console.error('Background session save failed:', error));

        setTimeout(() => {
            isLoadingStateRef.current = false;
        }, 80);
    }, [activeTabId, tabs, setTabs, setActiveTabId, nodes, setNodes, connections, setConnections, groups, setGroups, viewTransform, setViewTransform, nodeIdCounter, fullSizeImageCache, setFullSizeImageCache]);

    const handleCloseTab = useCallback((tabIdToClose: string) => {
        clearImagesForTabFromCache(tabIdToClose);
        if (tabs.length <= 1) return;

        const closingIndex = tabs.findIndex(t => t.id === tabIdToClose);
        const newTabs = tabs.filter(t => t.id !== tabIdToClose);

        if (activeTabId === tabIdToClose) {
            const nextActiveIndex = Math.max(0, closingIndex - 1);
            const nextActiveTab = newTabs[nextActiveIndex] || newTabs[0];

            isLoadingStateRef.current = true;
            lastLoadedTabIdRef.current = nextActiveTab.id;

            setTabs(newTabs);
            setActiveTabId(nextActiveTab.id);

            setNodes(nextActiveTab.state.nodes || []);
            setConnections(nextActiveTab.state.connections || []);
            setGroups(nextActiveTab.state.groups || []);
            setViewTransform(nextActiveTab.state.viewTransform || { scale: 1, translate: { x: 0, y: 0 } });
            nodeIdCounter.current = nextActiveTab.state.nodeIdCounter || 0;
            setFullSizeImageCache(nextActiveTab.state.fullSizeImageCache || {});

            saveSessionToDB(newTabs, nextActiveTab.id).catch(error => console.error('Background session save failed:', error));

            setTimeout(() => {
                isLoadingStateRef.current = false;
            }, 80);
        } else {
            setTabs(newTabs);
            saveSessionToDB(newTabs, activeTabId).catch(error => console.error('Background session save failed:', error));
        }
    }, [tabs, activeTabId, setTabs, setActiveTabId, setNodes, setConnections, setGroups, setViewTransform, setFullSizeImageCache, nodeIdCounter]);

    const handleRenameTab = useCallback((tabId: string, newName: string) => {
        setTabs(prevTabs => {
            const updated = prevTabs.map(tab => (tab.id === tabId ? { ...tab, name: newName } : tab));
            saveSessionToDB(updated, activeTabId).catch(error => console.error('Background session save failed:', error));
            return updated;
        });
    }, [setTabs, activeTabId]);

    const handleReorderTabs = useCallback((sourceIndex: number, targetIndex: number) => {
        if (sourceIndex === targetIndex) return;
        const currentLiveState: CanvasState = {
            nodes,
            connections,
            groups,
            viewTransform,
            nodeIdCounter: nodeIdCounter.current,
            fullSizeImageCache,
        };

        setTabs(prevTabs => {
            if (
                sourceIndex < 0 || sourceIndex >= prevTabs.length ||
                targetIndex < 0 || targetIndex >= prevTabs.length
            ) {
                return prevTabs;
            }
            const updated = prevTabs.map(t => t.id === activeTabId ? { ...t, state: currentLiveState } : t);
            const [moved] = updated.splice(sourceIndex, 1);
            updated.splice(targetIndex, 0, moved);
            
            saveSessionToDB(updated, activeTabId).catch(error => console.error('Background session save failed:', error));
            return updated;
        });
    }, [activeTabId, nodes, connections, groups, viewTransform, nodeIdCounter, fullSizeImageCache, setTabs]);

    const resetTabs = useCallback(async (lang: LanguageCode) => {
        const defaultState = getLocalizedCanvasState(lang);
        const newTab = createNewTab('Canvas 1', defaultState);
        restoreSession([newTab], newTab.id);
        await saveSessionToDB([newTab], newTab.id);
    }, [getLocalizedCanvasState, restoreSession]);

    const resetCurrentTab = useCallback((lang: LanguageCode) => {
        const defaultState = getLocalizedCanvasState(lang);
        isLoadingStateRef.current = true;
        loadCanvasState(defaultState);

        setTabs(prev => {
            const updated = prev.map(tab => 
                tab.id === activeTabId ? { ...tab, state: defaultState } : tab
            );
            saveSessionToDB(updated, activeTabId).catch(error => console.error('Background session save failed:', error));
            return updated;
        });
    }, [activeTabId, getLocalizedCanvasState, loadCanvasState, setTabs]);

    const resetCanvasToDefault = useCallback((lang: LanguageCode) => {
        resetTabs(lang);
    }, [resetTabs]);

    return {
        isLoadingStateRef,
        lastLoadedTabIdRef,
        isCanvasLoading,
        getCurrentCanvasState,
        loadCanvasState,
        restoreSession,
        getCompleteProjectState,
        getCompleteProjectStateRef,
        forceSaveSession,
        handleSwitchTab,
        handleAddTab,
        handleCloseTab,
        handleRenameTab,
        handleReorderTabs,
        resetTabs,
        resetCurrentTab,
        resetCanvasToDefault
    };
};
