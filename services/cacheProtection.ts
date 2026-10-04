// Read durable references as well as React state, so cleanup is safe while a
// history or catalog is still loading. An inaccessible store aborts cleanup.
async function readStore(database: string, store: string): Promise<unknown[]> {
    const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
        const request = indexedDB.open(database);
        let missing = false;
        request.onupgradeneeded = () => { missing = true; request.transaction?.abort(); };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => missing ? resolve(null) : reject(request.error);
    });
    if (!db) return [];
    try {
        if (!db.objectStoreNames.contains(store)) return [];
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readonly'), request = tx.objectStore(store).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } finally { db.close(); }
}

export async function readPersistentCacheProtection(): Promise<unknown[]> {
    const roots: unknown[] = (await Promise.all([
        readStore('GenerationHistoryDB', 'Images'),
        readStore('PromptModifierDB', 'Catalogs'),
        readStore('PromptModifierSessionDB', 'AppState')
    ])).flat();
    for (const key of ['prompt-library-items', 'prompt_modifier_session_history']) {
        const raw = localStorage.getItem(key);
        if (raw) roots.push(JSON.parse(raw));
    }
    if (window.electronAPI?.listSessionBackups && window.electronAPI.readSessionBackup) {
        const backups = await window.electronAPI.listSessionBackups();
        for (const backup of backups) {
            const result = await window.electronAPI.readSessionBackup(backup.path);
            if (!result?.success || !result.session) throw new Error('Could not inspect a session backup');
            roots.push(result.session);
        }
    }
    return roots;
}
