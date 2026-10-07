// Called inside the global decode queue, so at most two workers can be active.
// Dispose after each operation/cancellation to release decoder and GPU buffers.
export function tryWorkerThumbnail(src: string, width: number, height: number, signal: AbortSignal): Promise<string | null> {
    if (!src.startsWith('data:image/') || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        let worker: Worker;
        try { worker = new Worker(new URL('../workers/thumbnail.worker.ts', import.meta.url), { type: 'module' }); }
        catch { resolve(null); return; }
        let reader: FileReader | undefined;
        let settled = false;
        const timeout = setTimeout(() => finish(null), 30000);
        const clean = () => {
            clearTimeout(timeout);
            signal.removeEventListener('abort', abort);
            worker.terminate(); worker.onmessage = worker.onerror = null;
        };
        const finish = (url: string | null) => { if (!settled) { settled = true; clean(); resolve(url); } };
        const abort = () => {
            if (settled) return;
            settled = true; reader?.abort(); clean();
            reject(new DOMException('Thumbnail cancelled', 'AbortError'));
        };
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) { abort(); return; }
        worker.onerror = () => finish(null);
        worker.onmessage = event => {
            if (settled) return;
            if (!event.data.blob) { finish(null); return; }
            reader = new FileReader();
            reader.onload = () => finish(reader!.result as string);
            reader.onerror = () => finish(null);
            reader.readAsDataURL(event.data.blob);
        };
        try { worker.postMessage({ src, width, height }); }
        catch { finish(null); }
    });
}
