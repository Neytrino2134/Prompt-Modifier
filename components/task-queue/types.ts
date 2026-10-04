import React from 'react';
import { TaskStatus, BatchJobState } from '../../types';

export type TaskQueueTab = 'queue' | 'batch' | 'threed';
export type QueueFilter = 'all' | 'active' | 'completed' | 'failed';
export type QueueTypeFilter = 'all' | 'images' | 'threed';
export type ThreedStatusFilter = 'all' | 'success' | 'running' | 'failed';
export type BatchSortOrder = 'desc' | 'asc';

export interface ViewingJsonlData {
    id: string;
    content: string;
    name: string;
}
