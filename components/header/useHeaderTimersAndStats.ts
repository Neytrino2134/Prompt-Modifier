import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { ActiveOperation, BatchJobRecord, TaskStatus } from '../../types';
import { QueueStats, BatchStats } from './types';
import {
    matchesDeviceFilter,
    getDeviceId,
    isDeviceIsolationEnabled,
    getDeviceFilterMode
} from '../../utils/deviceId';

export const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
};

const useFps = () => {
    const [fps, setFps] = useState(0);
    const frameCount = useRef(0);
    const lastFrameTime = useRef(performance.now());
    const animationFrameId = useRef(0);

    useEffect(() => {
        const loop = () => {
            const now = performance.now();
            frameCount.current++;
            if (now >= lastFrameTime.current + 1000) {
                setFps(frameCount.current);
                frameCount.current = 0;
                lastFrameTime.current = now;
            }
            animationFrameId.current = requestAnimationFrame(loop);
        };
        animationFrameId.current = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    return fps;
};

export const useHeaderTimersAndStats = () => {
    const context = useAppContext();
    const fps = useFps();

    // Timer State
    const [elapsedTime, setElapsedTime] = useState(0);
    const [lastResult, setLastResult] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const timerRafRef = useRef<number | null>(null);

    // Auto-Save Countdown State
    const [secondsToSave, setSecondsToSave] = useState<number | null>(null);
    const [showSavedState, setShowSavedState] = useState(false);
    const prevAutoSavingRef = useRef(false);

    const {
        activeOperations = new Map(),
        logs = [],
        tasks = [],
        batchJobs = [],
        deviceId,
        deviceIsolationEnabled,
        deviceFilterMode,
        nextAutoSaveTime,
        isAutoSaving
    } = context || {};

    const effectiveDeviceId = deviceId || getDeviceId();
    const effectiveIsolationEnabled = deviceIsolationEnabled ?? isDeviceIsolationEnabled();
    const effectiveFilterMode = deviceFilterMode || getDeviceFilterMode();

    const operations: ActiveOperation[] = Array.from(activeOperations.values());
    const currentOp = operations.length > 0 ? operations[operations.length - 1] : null;
    const isProcessing = operations.length > 0;
    const errorCount = logs.filter(l => l.level === 'error').length;

    // Timer Loop
    useEffect(() => {
        if (isProcessing) {
            if (startTimeRef.current === null) {
                startTimeRef.current = performance.now();
                setElapsedTime(0);
            }
            const loop = () => {
                if (startTimeRef.current !== null) {
                    setElapsedTime(performance.now() - startTimeRef.current);
                    timerRafRef.current = requestAnimationFrame(loop);
                }
            };
            timerRafRef.current = requestAnimationFrame(loop);
        } else {
            if (startTimeRef.current !== null) {
                const finalTime = performance.now() - startTimeRef.current;
                setLastResult(finalTime);
                setElapsedTime(0);
                startTimeRef.current = null;
            }
            if (timerRafRef.current) {
                cancelAnimationFrame(timerRafRef.current);
                timerRafRef.current = null;
            }
        }
        return () => {
            if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
        };
    }, [isProcessing]);

    const timeDisplay = isProcessing ? elapsedTime : lastResult;

    // Auto-Save countdown tracker
    useEffect(() => {
        if (!nextAutoSaveTime) {
            setSecondsToSave(null);
            return;
        }
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = nextAutoSaveTime - now;
            if (diff > 0 && diff <= 10000) {
                 setSecondsToSave(Math.ceil(diff / 1000));
            } else {
                setSecondsToSave(null);
            }
        }, 200);
        return () => clearInterval(interval);
    }, [nextAutoSaveTime]);

    // Handle "Saved" status flash
    useEffect(() => {
        if (prevAutoSavingRef.current && !isAutoSaving) {
            setShowSavedState(true);
            const timer = setTimeout(() => setShowSavedState(false), 2000);
            return () => clearTimeout(timer);
        }
        prevAutoSavingRef.current = Boolean(isAutoSaving);
    }, [isAutoSaving]);

    // Calculate Realtime Task Queue Stats
    const queueStats: QueueStats = useMemo(() => {
        let running = 0;
        let queued = 0;
        let completed = 0;
        let failed = 0;
        let currentRunningTask: any = null;

        for (const task of tasks) {
            if (task.status === 'running') {
                running++;
                if (!currentRunningTask) currentRunningTask = task;
            } else if (task.status === 'queued') {
                queued++;
            } else if (task.status === 'completed') {
                completed++;
            } else if (task.status === 'failed') {
                failed++;
            }
        }

        return {
            running,
            queued,
            completed,
            failed,
            total: tasks.length,
            currentRunningTask,
        };
    }, [tasks]);

    // Calculate Batch API Stats
    const batchStats: BatchStats = useMemo(() => {
        let pending = 0;
        let running = 0;
        let succeeded = 0;
        let failed = 0;
        let totalItems = 0;
        let readyToDownload = 0;
        let totalFilteredJobs = 0;

        for (const job of (batchJobs as BatchJobRecord[])) {
            if (!job) continue;

            if (effectiveIsolationEnabled) {
                if (job.deviceId && job.deviceId !== effectiveDeviceId) {
                    continue;
                }
            } else if (!matchesDeviceFilter(job.deviceId, effectiveDeviceId, effectiveFilterMode)) {
                continue;
            }

            totalFilteredJobs++;
            const itemCount = Array.isArray(job.items) ? job.items.length : 0;
            if (job.state === 'PENDING') {
                pending++;
                totalItems += itemCount;
            } else if (job.state === 'RUNNING') {
                running++;
                totalItems += itemCount;
            } else if (job.state === 'SUCCEEDED') {
                succeeded++;
                const hasPendingDownloads = Array.isArray(job.items) && job.items.some(it => !it.resultUrl);
                if (hasPendingDownloads) {
                    readyToDownload++;
                }
            } else if (job.state === 'FAILED') {
                failed++;
            }
        }

        return {
            pending,
            running,
            activeJobs: pending + running,
            succeeded,
            failed,
            totalItems,
            readyToDownload,
            totalJobs: totalFilteredJobs,
        };
    }, [batchJobs, effectiveDeviceId, effectiveIsolationEnabled, effectiveFilterMode]);

    const hasAnyActiveWork = queueStats.running > 0 || queueStats.queued > 0 || batchStats.activeJobs > 0 || batchStats.readyToDownload > 0;

    return {
        fps,
        timeDisplay,
        isProcessing,
        currentOp,
        errorCount,
        secondsToSave,
        showSavedState,
        queueStats,
        batchStats,
        hasAnyActiveWork
    };
};
