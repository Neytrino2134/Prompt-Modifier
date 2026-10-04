import type { BatchJobRecord } from '../types';

export interface CacheCleanupReferences { keys: string[]; imageHashes: string[]; before: number }
export interface CacheCleanupResult { removed: number; bytes: number; skipped: number }
const DB_NAME = 'PromptModifierBatchCache';
const STORE = 'archives';
export const batchResultKey = (job: Pick<BatchJobRecord, 'id' | 'name'>) => `results:${job.name || job.id}`;

async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function imageHashes(images: Iterable<string>): Promise<string[]> {
    return Promise.all([...new Set(images)].map(async image => {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(image));
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    }));
}

export async function readBatchArchive<T>(key: string): Promise<T | null> {
    if (window.electronAPI?.readBatchArchive) return window.electronAPI.readBatchArchive(key);
    const db = await openDB();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const request = tx.objectStore(STORE).get(key);
            request.onsuccess = () => resolve(request.result?.payload ?? null);
            request.onerror = () => reject(request.error);
        });
    } finally { db.close(); }
}

export async function writeBatchArchive(key: string, payload: unknown, images: Iterable<string> = [], relatedKeys: string[] = []): Promise<void> {
    const hashes = await imageHashes(images);
    if (window.electronAPI?.writeBatchArchive) {
        await window.electronAPI.writeBatchArchive(key, payload, hashes, relatedKeys);
        return;
    }
    const db = await openDB();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put({ key, payload, imageHashes: hashes, relatedKeys, savedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}

export async function clearUnusedBatchArchives(references: CacheCleanupReferences): Promise<CacheCleanupResult> {
    if (window.electronAPI?.clearUnusedBatchArchives) return window.electronAPI.clearUnusedBatchArchives(references);
    const db = await openDB();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE), request = store.getAll();
            let removed = 0, bytes = 0;
            request.onsuccess = () => {
                const entries = request.result;
                const keys = new Set(references.keys), hashes = new Set(references.imageHashes);
                for (const entry of entries) if (entry.savedAt >= references.before || entry.imageHashes.some((hash: string) => hashes.has(hash))) keys.add(entry.key);
                let changed;
                do {
                    changed = false;
                    for (const entry of entries) if (keys.has(entry.key)) for (const key of entry.relatedKeys) {
                        if (!keys.has(key)) { keys.add(key); changed = true; }
                    }
                } while (changed);
                for (const entry of entries) if (!keys.has(entry.key)) {
                    store.delete(entry.key); removed++; bytes += new Blob([JSON.stringify(entry)]).size;
                }
            };
            tx.oncomplete = () => resolve({ removed, bytes, skipped: 0 });
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}
