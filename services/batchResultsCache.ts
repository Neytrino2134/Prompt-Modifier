import type { BatchJobRecord } from '../types';

export interface CacheCleanupReferences { keys: string[]; imageHashes: string[]; before: number }
export interface CacheCleanupResult { removed: number; bytes: number; skipped: number }
const DB_NAME = 'PromptModifierBatchCache';
const STORE = 'archives';
const META_STORE = 'metadata';
export const batchResultKey = (job: Pick<BatchJobRecord, 'id' | 'name'>) => `results:${job.name || job.id}`;

async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
            if (!db.objectStoreNames.contains(META_STORE)) {
                const metadata = db.createObjectStore(META_STORE, { keyPath: 'key' });
                const cursor = request.transaction!.objectStore(STORE).openCursor();
                cursor.onsuccess = () => {
                    const entry = cursor.result;
                    if (!entry) return;
                    const { payload, ...info } = entry.value;
                    metadata.put(info);
                    entry.continue();
                };
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function imageHashes(images: Iterable<string>): Promise<string[]> {
    const hashes: string[] = [];
    for (const image of new Set(images)) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(image));
        hashes.push(Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''));
    }
    return hashes;
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
            const tx = db.transaction([STORE, META_STORE], 'readwrite');
            const metadata = { key, imageHashes: hashes, relatedKeys, savedAt: Date.now() };
            tx.objectStore(STORE).put({ ...metadata, payload });
            tx.objectStore(META_STORE).put(metadata);
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
            const tx = db.transaction([STORE, META_STORE], 'readwrite');
            const store = tx.objectStore(STORE), metadata = tx.objectStore(META_STORE), request = metadata.getAll();
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
                    store.delete(entry.key); metadata.delete(entry.key); removed++;
                }
            };
            tx.oncomplete = () => resolve({ removed, bytes, skipped: 0 });
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}
