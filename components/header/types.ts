import { TaskStatus, BatchJobRecord, ActiveOperation, Theme, PanelAnimation, CursorSkin } from '../../types';

export interface QueueStats {
    running: number;
    queued: number;
    completed: number;
    failed: number;
    total: number;
    currentRunningTask: any;
}

export interface BatchStats {
    pending: number;
    running: number;
    activeJobs: number;
    succeeded: number;
    failed: number;
    totalItems: number;
    readyToDownload: number;
    totalJobs: number;
}
