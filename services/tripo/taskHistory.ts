import {
    STORAGE_KEY_TRIPO_RECENT_TASKS,
    TRIPO_TASKS_CHANGE_EVENT,
    TripoRecentTask,
    TripoTaskStatus
} from './types';

// ==========================================
// Tripo 3D Recent Tasks & History Management
// ==========================================

const MAX_SAVED_TASKS = 60;

/**
 * Get locally stored Tripo 3D tasks
 */
export const getTripoRecentTasks = (): TripoRecentTask[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TRIPO_RECENT_TASKS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter(t => t && t.taskId && !t.taskId.startsWith('sample_'));
            }
        }
    } catch {}
    return [];
};

/**
 * Upsert or update a task in recent Tripo tasks history
 */
export const saveTripoRecentTask = (
    taskUpdate: Partial<TripoRecentTask> & { taskId: string }
): void => {
    try {
        const existing = getTripoRecentTasks();
        const index = existing.findIndex(t => t.taskId === taskUpdate.taskId);
        let updated: TripoRecentTask[];

        if (index >= 0) {
            const current = existing[index];
            updated = [...existing];
            updated[index] = {
                ...current,
                ...taskUpdate,
                createdAt: current.createdAt || taskUpdate.createdAt || Date.now()
            };
        } else {
            const newTask: TripoRecentTask = {
                taskId: taskUpdate.taskId,
                type: taskUpdate.type || 'image_to_model',
                prompt: taskUpdate.prompt || '',
                createdAt: taskUpdate.createdAt || Date.now(),
                status: taskUpdate.status || 'queued',
                progress: taskUpdate.progress || 0,
                modelUrl: taskUpdate.modelUrl,
                thumbnailUrl: taskUpdate.thumbnailUrl,
                renderedImageUrl: taskUpdate.renderedImageUrl,
                creditsConsumed: taskUpdate.creditsConsumed,
                error: taskUpdate.error
            };
            updated = [newTask, ...existing];
        }

        if (updated.length > MAX_SAVED_TASKS) {
            updated = updated.slice(0, MAX_SAVED_TASKS);
        }

        localStorage.setItem(STORAGE_KEY_TRIPO_RECENT_TASKS, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRIPO_TASKS_CHANGE_EVENT, { detail: updated }));
        }
    } catch (e) {
        console.warn('Failed to save recent Tripo task:', e);
    }
};

/**
 * Remove a specific task from local recent history
 */
export const removeTripoRecentTask = (taskId: string): void => {
    try {
        const existing = getTripoRecentTasks();
        const updated = existing.filter(t => t.taskId !== taskId);
        localStorage.setItem(STORAGE_KEY_TRIPO_RECENT_TASKS, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRIPO_TASKS_CHANGE_EVENT, { detail: updated }));
        }
    } catch (e) {
        console.warn('Failed to remove recent Tripo task:', e);
    }
};

/**
 * Clear all recent tasks from history
 */
export const clearTripoRecentTasks = (): void => {
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_RECENT_TASKS, JSON.stringify([]));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRIPO_TASKS_CHANGE_EVENT, { detail: [] }));
        }
    } catch (e) {
        console.warn('Failed to clear recent Tripo tasks:', e);
    }
};

/**
 * Helper to harvest all 3D task records and models from across the entire app
 * (local history, canvas node states, tabs state, and recent tasks storage).
 */
export const harvestAllLocal3DTasks = (): TripoRecentTask[] => {
    const taskMap = new Map<string, TripoRecentTask>();

    // 1. Existing recent tasks
    const recent = getTripoRecentTasks();
    recent.forEach(t => {
        if (t && t.taskId) taskMap.set(t.taskId, t);
    });

    // 2. Scan generation history in localStorage
    try {
        const historyKeys = ['generation_history', 'prompt_modifier_history', 'history_items'];
        for (const k of historyKeys) {
            const raw = localStorage.getItem(k);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    parsed.forEach((item: any) => {
                        const is3d = item.mediaType === '3d' || item.aspectRatio === '3d' || !!item.modelUrl || (typeof item.prompt === 'string' && item.prompt.includes('3D'));
                        const taskId = item.taskId || item.id || (item.modelUrl ? `model_${item.timestamp || Date.now()}` : null);
                        if (is3d && taskId && !taskMap.has(taskId)) {
                            taskMap.set(taskId, {
                                taskId: String(taskId),
                                type: '3d_generation',
                                prompt: item.prompt || '3D Model Generation',
                                createdAt: item.timestamp || item.createdAt || Date.now(),
                                status: 'success',
                                progress: 100,
                                modelUrl: item.modelUrl,
                                thumbnailUrl: item.thumbnailUrl || item.imageUrl || item.url,
                                renderedImageUrl: item.imageUrl || item.renderedImageUrl || item.url
                            });
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.warn('Error harvesting from history:', e);
    }

    // 3. Scan canvas tabs and nodes in localStorage
    try {
        const tabKeys = ['canvas_tabs', 'prompt_modifier_tabs', 'session_tabs_state', 'app_nodes'];
        for (const tk of tabKeys) {
            const raw = localStorage.getItem(tk);
            if (raw) {
                const parsed = JSON.parse(raw);
                const nodesList: any[] = [];
                if (Array.isArray(parsed)) {
                    parsed.forEach((tab: any) => {
                        if (Array.isArray(tab.nodes)) nodesList.push(...tab.nodes);
                        else if (tab.id && tab.type) nodesList.push(tab);
                    });
                } else if (parsed && Array.isArray(parsed.nodes)) {
                    nodesList.push(...parsed.nodes);
                }

                nodesList.forEach((n: any) => {
                    if (n && (n.type === 'three_d_generator' || n.type === 'three_d_generation' || n.type === 15 || n.type === 'THREE_D_GENERATOR')) {
                        try {
                            const val = typeof n.value === 'string' ? JSON.parse(n.value) : n.value;
                            if (val && (val.taskId || val.modelUrl || val.renderedImageUrl)) {
                                const tId = val.taskId || `node_${n.id}`;
                                if (!taskMap.has(tId)) {
                                    taskMap.set(tId, {
                                        taskId: tId,
                                        type: val.mode || 'multiview_to_3d',
                                        prompt: val.prompt || n.title || '3D Model',
                                        createdAt: n.createdAt || Date.now(),
                                        status: (val.status as TripoTaskStatus) || 'success',
                                        progress: val.progress ?? 100,
                                        modelUrl: val.modelUrl,
                                        thumbnailUrl: val.thumbnailUrl || val.renderedImageUrl,
                                        renderedImageUrl: val.renderedImageUrl || val.thumbnailUrl
                                    });
                                }
                            }
                        } catch {}
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Error harvesting from canvas nodes:', e);
    }

    return Array.from(taskMap.values()).sort((a, b) => b.createdAt - a.createdAt);
};
