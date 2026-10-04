import React from 'react';
import { TaskStatus, BatchJobState } from '../../types';

interface StatusBadgeProps {
    status: TaskStatus;
    t: (key: string) => string;
}

export const QueueStatusBadge: React.FC<StatusBadgeProps> = ({ status, t }) => {
    switch (status) {
        case 'running':
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700/50">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    {t('queue.running') || 'Running'}
                </span>
            );
        case 'queued':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/40 text-yellow-300 border border-yellow-700/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                    {t('queue.queued') || 'Queued'}
                </span>
            );
        case 'completed':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                    ✓ {t('queue.completed') || 'Completed'}
                </span>
            );
        case 'failed':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/40 text-red-300 border border-red-700/40">
                    ✕ {t('queue.failed') || 'Failed'}
                </span>
            );
        case 'cancelled':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                    ⊘ {t('queue.cancelled') || 'Cancelled'}
                </span>
            );
        default:
            return null;
    }
};

interface BatchStatusBadgeProps {
    state: BatchJobState;
    t: (key: string) => string;
}

export const BatchStatusBadge: React.FC<BatchStatusBadgeProps> = ({ state, t }) => {
    switch (state) {
        case 'RUNNING':
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-accent-secondary border border-gray-700">
                    <span className="w-2 h-2 rounded-full bg-accent-secondary animate-pulse"></span>
                    {t('batch.running') || 'Processing (Batch)'}
                </span>
            );
        case 'PENDING':
        case 'UNSPECIFIED':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/40 text-yellow-300 border border-yellow-700/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                    {t('batch.pending') || 'Batch Queued'}
                </span>
            );
        case 'SUCCEEDED':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                    ✓ {t('batch.succeeded') || 'Completed'}
                </span>
            );
        case 'FAILED':
        case 'EXPIRED':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/40 text-red-300 border border-red-700/40">
                    ✕ {t('batch.failed') || 'Failed'}
                </span>
            );
        case 'CANCELLED':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                    ⊘ {t('batch.cancelled') || 'Cancelled'}
                </span>
            );
        default:
            return null;
    }
};
