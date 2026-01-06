// A simple module-level cache to store full-size images outside of React state.
// Structure: Map<tabId, Map<nodeId, Map<frameNumber, dataUrl>>>
const tabCache = new Map<string, Map<string, Map<number, string>>>();

const getNodeCache = (tabId: string, nodeId: string): Map<number, string> | undefined => {
    return tabCache.get(tabId)?.get(nodeId);
};

const getOrCreateNodeCache = (tabId: string, nodeId: string): Map<number, string> => {
    if (!tabCache.has(tabId)) {
        tabCache.set(tabId, new Map());
    }
    const nodeMap = tabCache.get(tabId)!;
    if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, new Map());
    }
    return nodeMap.get(nodeId)!;
};

export const getFullSizeImageFromCache = (tabId: string, nodeId: string, frameNumber: number): string | undefined => {
    return getNodeCache(tabId, nodeId)?.get(frameNumber);
};

export const setFullSizeImageInCache = (tabId: string, nodeId: string, frameNumber: number, dataUrl: string): void => {
    const nodeCache = getOrCreateNodeCache(tabId, nodeId);
    nodeCache.set(frameNumber, dataUrl);
};

export const clearImagesForNodeFromCache = (tabId: string, nodeId: string): void => {
    tabCache.get(tabId)?.delete(nodeId);
};

export const clearImagesForTabFromCache = (tabId: string): void => {
    tabCache.delete(tabId);
};

export const clearAllImagesFromCache = (): void => {
    tabCache.clear();
};
