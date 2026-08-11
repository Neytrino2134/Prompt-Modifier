import { useState, useCallback, useRef, useEffect } from 'react';
import { GenerationTask, TaskStatus } from '../types';

export interface EnqueueTaskOptions {
    nodeId: string;
    nodeTitle?: string;
    frameIndex?: number;
    prompt: string;
    type?: 'image_edit' | 'image_gen' | 'sequence_frame' | 'character_gen' | 'video_gen';
    tabId?: string;
    tabName?: string;
    execute: (signal: AbortSignal) => Promise<string>;
    onSuccess?: (resultUrl: string) => void | Promise<void>;
    onError?: (error: any) => void;
}

const MAX_CONCURRENT_TASKS = 6;

export const useTaskQueue = () => {
    const [tasks, setTasks] = useState<GenerationTask[]>([]);
    const [isTaskQueuePanelOpen, setIsTaskQueuePanelOpen] = useState(false);
    const tasksRef = useRef<GenerationTask[]>([]);
    tasksRef.current = tasks;

    // Helper to update a specific task in state
    const updateTask = useCallback((taskId: string, patch: Partial<GenerationTask>) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
    }, []);

    // Main Queue Processor
    const processQueue = useCallback(() => {
        const currentTasks = tasksRef.current;
        const runningTasks = currentTasks.filter(t => t.status === 'running');
        
        if (runningTasks.length >= MAX_CONCURRENT_TASKS) {
            return; // At concurrency limit
        }

        const availableSlots = MAX_CONCURRENT_TASKS - runningTasks.length;
        const queuedTasks = currentTasks.filter(t => t.status === 'queued').slice(0, availableSlots);

        queuedTasks.forEach(task => {
            if (!task.execute) return;

            const abortController = new AbortController();
            const startedAt = Date.now();

            // Mark task as running
            setTasks(prev => prev.map(t => {
                if (t.id === task.id) {
                    return {
                        ...t,
                        status: 'running' as TaskStatus,
                        startedAt,
                        abortController
                    };
                }
                return t;
            }));

            // Execute task asynchronously
            (async () => {
                try {
                    const resultUrl = await task.execute!(abortController.signal);
                    
                    if (abortController.signal.aborted) {
                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'cancelled' as TaskStatus, completedAt: Date.now() } : t));
                        task.onError?.(new Error('Task cancelled'));
                    } else {
                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' as TaskStatus, resultUrl, completedAt: Date.now() } : t));
                        if (task.onSuccess) {
                            await task.onSuccess(resultUrl);
                        }
                    }
                } catch (err: any) {
                    const isAbort = err?.name === 'AbortError' || err?.message === 'Aborted' || abortController.signal.aborted;
                    const finalStatus: TaskStatus = isAbort ? 'cancelled' : 'failed';
                    const errorMessage = err?.message || 'Generation failed';

                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: finalStatus, error: errorMessage, completedAt: Date.now() } : t));
                    
                    if (task.onError) {
                        task.onError(err);
                    }
                } finally {
                    // Trigger queue processor to start next queued item
                    setTimeout(() => processQueue(), 50);
                }
            })();
        });
    }, []);

    // Automatically trigger queue whenever tasks state changes (specifically when new queued items arrive)
    useEffect(() => {
        const hasQueued = tasks.some(t => t.status === 'queued');
        const runningCount = tasks.filter(t => t.status === 'running').length;
        if (hasQueued && runningCount < MAX_CONCURRENT_TASKS) {
            processQueue();
        }
    }, [tasks, processQueue]);

    const enqueueTask = useCallback((options: EnqueueTaskOptions): string => {
        const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const newTask: GenerationTask = {
            id,
            nodeId: options.nodeId,
            nodeTitle: options.nodeTitle || 'Image Editor',
            frameIndex: options.frameIndex,
            prompt: options.prompt,
            type: options.type || 'image_edit',
            status: 'queued',
            createdAt: Date.now(),
            tabId: options.tabId,
            tabName: options.tabName,
            execute: options.execute,
            onSuccess: options.onSuccess,
            onError: options.onError,
        };

        setTasks(prev => [newTask, ...prev]);
        return id;
    }, []);

    const cancelTask = useCallback((taskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                if (t.abortController && t.status === 'running') {
                    t.abortController.abort();
                }
                return {
                    ...t,
                    status: 'cancelled' as TaskStatus,
                    completedAt: Date.now()
                };
            }
            return t;
        }));
    }, []);

    const cancelAllNodeTasks = useCallback((nodeId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.nodeId === nodeId && (t.status === 'running' || t.status === 'queued')) {
                if (t.abortController && t.status === 'running') {
                    t.abortController.abort();
                }
                return {
                    ...t,
                    status: 'cancelled' as TaskStatus,
                    completedAt: Date.now()
                };
            }
            return t;
        }));
    }, []);

    const retryTask = useCallback((taskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return {
                    ...t,
                    status: 'queued' as TaskStatus,
                    error: undefined,
                    resultUrl: undefined,
                    startedAt: undefined,
                    completedAt: undefined,
                    createdAt: Date.now()
                };
            }
            return t;
        }));
    }, []);

    const clearCompletedTasks = useCallback(() => {
        setTasks(prev => prev.filter(t => t.status === 'running' || t.status === 'queued'));
    }, []);

    const removeTask = useCallback((taskId: string) => {
        setTasks(prev => {
            const target = prev.find(t => t.id === taskId);
            if (target && target.status === 'running' && target.abortController) {
                target.abortController.abort();
            }
            return prev.filter(t => t.id !== taskId);
        });
    }, []);

    const isTaskRunningForNode = useCallback((nodeId: string, frameIndex?: number) => {
        return tasks.some(t => 
            t.nodeId === nodeId && 
            (frameIndex === undefined || t.frameIndex === frameIndex) && 
            (t.status === 'running' || t.status === 'queued')
        );
    }, [tasks]);

    const activeTaskCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length;

    return {
        tasks,
        isTaskQueuePanelOpen,
        setIsTaskQueuePanelOpen,
        enqueueTask,
        cancelTask,
        cancelAllNodeTasks,
        retryTask,
        clearCompletedTasks,
        removeTask,
        isTaskRunningForNode,
        activeTaskCount,
    };
};
