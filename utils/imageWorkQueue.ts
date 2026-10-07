// Keep large image decodes bounded and release cancelled queued sources.
const queue: Array<() => void> = [];
let running = 0;
const CONCURRENCY = 2;

function pump() {
    while (running < CONCURRENCY && queue.length) queue.shift()!();
}

export function scheduleImageWork<T>(work: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        let started = false;
        const abort = () => {
            controller.abort();
            if (!started) {
                const index = queue.indexOf(run);
                if (index >= 0) queue.splice(index, 1);
                signal?.removeEventListener('abort', abort);
                reject(new DOMException('Image work cancelled', 'AbortError'));
            }
        };
        const run = () => {
            started = true;
            running++;
            Promise.resolve().then(() => work(controller.signal)).then(resolve, reject).finally(() => {
                running--;
                signal?.removeEventListener('abort', abort);
                pump();
            });
        };
        if (signal?.aborted) { abort(); return; }
        signal?.addEventListener('abort', abort, { once: true });
        queue.push(run);
        pump();
    });
}

export function imageWorkQueueStats() { return { running, queued: queue.length, concurrency: CONCURRENCY }; }
