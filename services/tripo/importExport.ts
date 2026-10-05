import {
    STORAGE_KEY_TRIPO_RECENT_TASKS,
    TRIPO_TASKS_CHANGE_EVENT,
    TripoRecentTask,
    TripoTaskStatus
} from './types';
import { getTripoApiKey, getTripoModelVersion, isTripoEnabled } from './config';
import { logTripo } from './logger';
import { fetchTripoUserBalance, tripoApiRequest } from './httpClient';
import { getTripoRecentTasks, harvestAllLocal3DTasks, saveTripoRecentTask } from './taskHistory';
import { getTripoTaskStatus } from './tasks';

// ==========================================
// Tripo 3D Import / Export & Sync Operations
// ==========================================

/**
 * Helper to download task metadata JSON file
 * Filename format: 3D_Model_{AssetName}_{Index}_{Date}_{Time}.json
 */
export const downloadTaskMetadataJson = (taskData: any, assetName?: string, index?: number | string): string => {
    try {
        const now = new Date(taskData.createdAt || Date.now());
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const cleanName = (assetName || taskData.prompt || 'Asset').slice(0, 30).replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_') || 'Asset';
        const indexStr = index !== undefined && index !== null && String(index).trim() !== '' ? `${String(index).replace(/[^a-zA-Z0-9_-]/g, '')}_` : '';
        const filename = `3D_Model_${cleanName}_${indexStr}${dateStr}_${timeStr}.json`;

        const taskId = taskData.taskId || taskData.task_id || taskData.id;
        const payload = {
            app: 'Prompt Modifier',
            engine: 'Tripo 3D AI',
            exportedAt: new Date().toISOString(),
            task_id: taskId,
            taskId: taskId,
            type: taskData.type || taskData.mode || '3d_generation',
            modelVersion: taskData.modelVersion || getTripoModelVersion(),
            prompt: taskData.prompt || '',
            status: taskData.status || 'unknown',
            progress: taskData.progress ?? (taskData.status === 'success' ? 100 : 0),
            modelUrl: taskData.modelUrl || taskData.output?.model_url || taskData.output?.model || taskData.output?.pbr_model || taskData.output?.base_model,
            thumbnailUrl: taskData.thumbnailUrl || taskData.output?.thumbnail || taskData.output?.rendered_image_url || taskData.output?.rendered_image,
            renderedImageUrl: taskData.renderedImageUrl || taskData.output?.rendered_image_url || taskData.output?.rendered_image,
            creditsConsumed: taskData.creditsConsumed,
            createdAt: taskData.createdAt || Date.now(),
            index: index !== undefined ? index : undefined,
            metadata: taskData
        };

        const jsonStr = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logTripo('success', `Saved Task Metadata JSON: ${filename} (Task ID: ${taskId})`);
        return filename;
    } catch (e: any) {
        console.error('Failed to download task metadata JSON', e);
        return '';
    }
};

/**
 * Import and query an existing task by its Task ID directly from Tripo API
 */
export const importTripoTaskById = async (taskId: string): Promise<TripoRecentTask | null> => {
    const cleanId = taskId.trim();
    if (!cleanId) return null;

    logTripo('info', `Importing task by ID: ${cleanId}...`);

    try {
        const res = await getTripoTaskStatus(cleanId);
        if (res && res.data) {
            const d = res.data;
            const out = d.output || d.result || {};
            const importedTask: TripoRecentTask = {
                taskId: cleanId,
                type: d.type || '3d_generation',
                prompt: (d as any).prompt || (d as any).input?.prompt || 'Imported 3D Generation',
                createdAt: d.created_at ? (typeof d.created_at === 'string' ? Date.parse(d.created_at) : d.created_at < 1e11 ? d.created_at * 1000 : d.created_at) : Date.now(),
                status: (d.status?.toLowerCase() || 'unknown') as TripoTaskStatus,
                progress: d.progress ?? (d.status === 'success' ? 100 : 0),
                modelUrl: out.model || out.pbr_model || out.base_model || out.model_url,
                thumbnailUrl: out.thumbnail || out.rendered_image || out.thumbnail_url || out.rendered_image_url,
                renderedImageUrl: out.rendered_image || out.thumbnail || out.rendered_image_url
            };

            saveTripoRecentTask(importedTask);
            logTripo('success', `Task ${cleanId} imported successfully! Status: ${importedTask.status}`);
            return importedTask;
        }
    } catch (err: any) {
        logTripo('error', `Failed to import task ${cleanId}: ${err?.message || err}`);
        throw err;
    }

    return null;
};

/**
 * Batch query multiple tasks from Tripo API (using POST /v3/tasks/list with fallback)
 */
export const queryTripoTasksBatch = async (taskIds: string[]): Promise<TripoRecentTask[]> => {
    const cleanIds = Array.from(new Set(taskIds.map(id => id.trim()).filter(Boolean)));
    if (cleanIds.length === 0) return [];
    if (cleanIds.length > 100) {
        const chunks: TripoRecentTask[] = [];
        for (let i = 0; i < cleanIds.length; i += 100) chunks.push(...await queryTripoTasksBatch(cleanIds.slice(i, i + 100)));
        return chunks;
    }

    logTripo('info', `Batch querying ${cleanIds.length} tasks from Tripo API...`);

    const results: TripoRecentTask[] = [];

    // Try batch endpoint POST /v3/tasks/list if API key is configured
    const hasKey = Boolean(getTripoApiKey() && isTripoEnabled());
    let batchSucceeded = false;

    if (hasKey) {
        try {
            const listRes = await tripoApiRequest<any>(
                '/v3/tasks/list',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_ids: cleanIds })
                },
                'Batch Tasks Query'
            );

            if (listRes && (listRes.data?.tasks || listRes.tasks || Array.isArray(listRes.data))) {
                const rawItems = listRes.data?.tasks || listRes.tasks || listRes.data;
                const items = Array.isArray(rawItems) ? rawItems : Object.entries(rawItems).map(([id, task]) => ({ ...(task as any), task_id: (task as any).task_id || id }));
                items.forEach((d: any) => {
                    const id = d.task_id || d.taskId || d.id;
                    if (!id) return;
                    const out = d.output || d.result || {};
                    const tItem: TripoRecentTask = {
                        taskId: id,
                        type: d.type || '3d_generation',
                        prompt: d.prompt || d.input?.prompt || '',
                        createdAt: d.created_at ? (typeof d.created_at === 'string' ? Date.parse(d.created_at) : d.created_at < 1e11 ? d.created_at * 1000 : d.created_at) : Date.now(),
                        status: (d.status?.toLowerCase() || 'unknown') as TripoTaskStatus,
                        progress: d.progress ?? (d.status === 'success' ? 100 : 0),
                        modelUrl: out.model || out.pbr_model || out.base_model || out.model_url,
                        thumbnailUrl: out.thumbnail || out.rendered_image || out.thumbnail_url || out.rendered_image_url,
                        renderedImageUrl: out.rendered_image || out.thumbnail || out.rendered_image_url,
                        creditsConsumed: d.credits_consumed ?? d.consumed_credit
                    };
                    saveTripoRecentTask(tItem);
                    results.push(tItem);
                });
                batchSucceeded = results.length > 0;
            }
        } catch {
            // Fall back to parallel individual queries
        }
    }

    const missingIds = cleanIds.filter(id => !results.some(task => task.taskId === id));
    if (!batchSucceeded || missingIds.length) {
        // Recover missed IDs individually, including legacy tasks.
        await Promise.all(
            missingIds.map(async (id) => {
                try {
                    const t = await importTripoTaskById(id);
                    if (t) results.push(t);
                } catch {}
            })
        );
    }

    return results;
};

/**
 * Parse one or multiple uploaded JSON task files and query their live statuses
 */
export const parseTaskJsonFiles = async (files: FileList | File[]): Promise<TripoRecentTask[]> => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return [];

    const discoveredIds = new Set<string>();
    const parsedTasks: Partial<TripoRecentTask>[] = [];

    for (const file of fileList) {
        try {
            const text = await file.text();
            const json = JSON.parse(text);

            const processSingle = (obj: any) => {
                const id = obj.task_id || obj.taskId || obj.id;
                if (id && typeof id === 'string' && id.trim()) {
                    discoveredIds.add(id.trim());
                    parsedTasks.push({
                        taskId: id.trim(),
                        type: obj.type || obj.mode,
                        prompt: obj.prompt,
                        modelUrl: obj.modelUrl || obj.model_url,
                        thumbnailUrl: obj.thumbnailUrl || obj.thumbnail_url || obj.renderedImageUrl,
                        renderedImageUrl: obj.renderedImageUrl || obj.rendered_image_url,
                        createdAt: obj.createdAt ? Number(obj.createdAt) : Date.now(),
                        status: (obj.status?.toLowerCase() || 'success') as TripoTaskStatus
                    });
                }
            };

            if (Array.isArray(json)) {
                json.forEach(processSingle);
            } else if (typeof json === 'object' && json !== null) {
                if (Array.isArray(json.tasks)) {
                    json.tasks.forEach(processSingle);
                } else {
                    processSingle(json);
                }
            }
        } catch (err) {
            console.error(`Failed to parse JSON file ${file.name}:`, err);
        }
    }

    // Save parsed tasks locally first
    parsedTasks.forEach(t => {
        if (t.taskId) {
            saveTripoRecentTask(t as any);
        }
    });

    // Query live statuses for all discovered task IDs
    const idArray = Array.from(discoveredIds);
    if (idArray.length > 0) {
        return await queryTripoTasksBatch(idArray);
    }

    return getTripoRecentTasks();
};

/**
 * Export all saved 3D tasks to a single backup JSON file
 */
export const exportAllTasksToJson = (): void => {
    const tasks = getTripoRecentTasks();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const filename = `Tripo_3D_Tasks_Backup_${dateStr}_${timeStr}.json`;

    const payload = {
        app: 'Prompt Modifier',
        engine: 'Tripo 3D AI',
        exportedAt: new Date().toISOString(),
        totalTasks: tasks.length,
        tasks
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Request recent generations with preview and model download URLs (5, 10, 15, etc.)
 * Queries user's actual Tripo API account and local session records, then filters to requested count.
 */
export const fetchTripoRecentTasks = async (limit: number = 10): Promise<TripoRecentTask[]> => {
    const apiKey = getTripoApiKey();
    const isConfigured = Boolean(apiKey && isTripoEnabled());

    logTripo('info', `Updating recent Tripo 3D models (limit: ${limit})...`);

    // 1. Gather all locally generated/recorded tasks from user's current session & canvas
    const harvestedTasks = harvestAllLocal3DTasks();
    const taskMap = new Map<string, TripoRecentTask>();
    harvestedTasks.forEach(t => {
        if (t && t.taskId && !t.taskId.startsWith('sample_')) {
            taskMap.set(t.taskId, t);
        }
    });

    // 2. Sort all real user tasks by creation date (newest first)
    const allUserTasks = Array.from(taskMap.values())
        .filter(t => t && t.taskId && !t.taskId.startsWith('sample_'))
        .sort((a, b) => b.createdAt - a.createdAt);

    // 3. Take the requested limit (e.g. 5, 10, 15) or all if limit is greater
    const targetSlice = limit > 0 ? allUserTasks.slice(0, limit) : allUserTasks;

    // 4. Query live task statuses for each task ID to refresh GLB download links and preview images
    if (isConfigured && targetSlice.length > 0) {
        await Promise.all(
            targetSlice.map(async (item) => {
                if (item.taskId && !item.taskId.startsWith('node_')) {
                    try {
                        const statusRes = await getTripoTaskStatus(item.taskId);
                        if (statusRes && statusRes.data) {
                            const d = statusRes.data;
                            const out = d.output || d.result || {};
                            item.status = (d.status?.toLowerCase() || item.status) as TripoTaskStatus;
                            item.progress = d.progress ?? item.progress;
                            item.modelUrl = out.model || out.pbr_model || out.base_model || out.model_url || item.modelUrl;
                            item.thumbnailUrl = out.thumbnail_url || out.thumbnail || out.rendered_image_url || out.rendered_image || item.thumbnailUrl;
                            item.renderedImageUrl = out.rendered_image || out.thumbnail || out.rendered_image_url || item.renderedImageUrl;
                            if (d.created_at) {
                                item.createdAt = typeof d.created_at === 'string' ? Date.parse(d.created_at) : d.created_at < 1e11 ? d.created_at * 1000 : d.created_at;
                            }
                            saveTripoRecentTask(item);
                        }
                    } catch {}
                }
            })
        );
        fetchTripoUserBalance().catch(() => {});
    }

    // 5. Persist real user tasks list and dispatch change event
    try {
        localStorage.setItem(STORAGE_KEY_TRIPO_RECENT_TASKS, JSON.stringify(targetSlice));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRIPO_TASKS_CHANGE_EVENT, { detail: targetSlice }));
        }
    } catch {}

    logTripo('success', `Finished updating user Tripo tasks. Count: ${targetSlice.length}`);
    return targetSlice;
};
