// Install the timer while restoration is in progress; only each tick is gated.
// A ref becoming ready does not cause React to reinstall an effect.
export function startSessionAutosave(intervalMs: number, isReady: () => boolean, save: () => Promise<void>) {
    let running = false;
    const timer = setInterval(async () => {
        if (!isReady() || running) return;
        running = true;
        try { await save(); } finally { running = false; }
    }, intervalMs);
    return () => clearInterval(timer);
}
