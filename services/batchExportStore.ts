import type { BatchResultData, BatchResultFolder } from '../components/nodes/image-input/types';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PromptModifierBatchExports', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('exports');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
export async function persistBatchExport(result: BatchResultData): Promise<BatchResultData> {
    if (!result.zipBlob) throw new Error('Missing export archive');
    const archiveKey = `export:${crypto.randomUUID()}`;
    const db = await openDB();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('exports', 'readwrite');
            tx.objectStore('exports').put(result.zipBlob, `${archiveKey}:zip`);
            tx.objectStore('exports').put(result.folders || [], `${archiveKey}:files`);
            tx.oncomplete = () => resolve();
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
        return { ...result, zipBlob: undefined, folders: undefined, archiveKey };
    } finally { db.close(); }
}
async function read<T>(key: string): Promise<T> {
    const db = await openDB();
    try {
        return await new Promise<T>((resolve, reject) => {
            const request = db.transaction('exports').objectStore('exports').get(key);
            request.onsuccess = () => request.result === undefined ? reject(new Error('Export archive is unavailable')) : resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } finally { db.close(); }
}
export async function acquireBatchExportBlob(result: BatchResultData): Promise<Blob> {
    if (result.zipBlob) return result.zipBlob;
    if (!result.archiveKey) throw new Error('Missing export archive reference');
    return read<Blob>(`${result.archiveKey}:zip`);
}
export async function acquireBatchExportFolders(result: BatchResultData): Promise<BatchResultFolder[]> {
    if (result.folders) return result.folders;
    if (!result.archiveKey) return [];
    return read<BatchResultFolder[]>(`${result.archiveKey}:files`);
}

export async function deleteBatchExport(archiveKey: string): Promise<void> {
    const db = await openDB();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('exports', 'readwrite');
            tx.objectStore('exports').delete(`${archiveKey}:zip`);
            tx.objectStore('exports').delete(`${archiveKey}:files`);
            tx.oncomplete = () => resolve();
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}
