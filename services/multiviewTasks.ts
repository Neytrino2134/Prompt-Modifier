export interface MultiviewTaskState { index: number; stopping: boolean }
const tasks = new Map<string, MultiviewTaskState>();
const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());
export const subscribeMultiviewTasks = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getMultiviewTask = (key: string) => tasks.get(key) || null;
export function cancelMultiviewTask(key: string) {
    const task = tasks.get(key);
    if (task) { tasks.set(key, { ...task, stopping: true }); publish(); }
}

// Tasks are independent of the visible component. Results are patched by item ID
// into the original canvas, so scrolling, edits and tab switching cannot lose them.
export async function runMultiviewTask<T extends { id: string; index: number }>(
    key: string, items: T[], generate: (item: T) => Promise<string>,
    patch: (id: string, updates: Record<string, unknown>) => void
): Promise<void> {
    if (tasks.has(key)) return;
    tasks.set(key, { index: items[0]?.index || 0, stopping: false }); publish();
    try {
        for (const item of items) {
            if (tasks.get(key)?.stopping) break;
            tasks.set(key, { index: item.index, stopping: false }); publish();
            patch(item.id, { status: 'generating', error: undefined });
            try {
                const prompt = await generate(item);
                if (tasks.get(key)?.stopping) { patch(item.id, { status: 'idle' }); break; }
                patch(item.id, { prompt, status: 'completed', error: undefined });
            } catch (error: any) {
                patch(item.id, { status: tasks.get(key)?.stopping ? 'idle' : 'error', error: error?.message || String(error) });
            }
        }
    } finally { tasks.delete(key); publish(); }
}
