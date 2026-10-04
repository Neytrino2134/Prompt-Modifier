import type { Tab } from '../types';

export interface SessionCandidate { tabs: Tab[]; activeTabId: string; savedAt?: number }

// Callers supply full stores first (disk, IndexedDB) and the lightweight
// localStorage fallback last. Equal timestamps retain the complete first copy.
export function selectLatestSession(candidates: Array<SessionCandidate | null | undefined>): SessionCandidate | undefined {
    let selected: SessionCandidate | undefined;
    for (const candidate of candidates) {
        if (!candidate || !Array.isArray(candidate.tabs) || !candidate.tabs.length
            || !candidate.tabs.every(tab => tab?.state && Array.isArray(tab.state.nodes))) continue;
        if (!selected || (Number(candidate.savedAt) || 0) > (Number(selected.savedAt) || 0)) selected = candidate;
    }
    return selected;
}
