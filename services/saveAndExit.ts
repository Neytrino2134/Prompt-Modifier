// The tray and close dialog share a single operation. Failure keeps the app
// open; there is no timer that turns an unsuccessful save into an exit.
export function createSaveAndExit(save: () => Promise<void>, close: () => void, failed: (error: unknown) => void) {
    let pending: Promise<void> | null = null;
    return () => {
        if (pending) return pending;
        const operation = Promise.resolve().then(save).then(close).catch(failed);
        pending = operation.finally(() => { pending = null; });
        return pending;
    };
}
