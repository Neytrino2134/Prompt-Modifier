import React from 'react';
import { Box } from 'lucide-react';
import { TaskQueueTab } from './types';

interface TaskQueueHeaderProps {
    isBatchMode: boolean;
    setIsBatchMode: (val: boolean) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    activeTab: TaskQueueTab;
    setActiveTab: (tab: TaskQueueTab) => void;
    tasksCount: number;
    batchJobsCount: number;
    activeBatchJobsCount: number;
    recent3dTasksCount: number;
    onClose: () => void;
    onOpenHistory?: () => void;
    t: (key: string) => string;
}

export const TaskQueueHeader: React.FC<TaskQueueHeaderProps> = ({
    isBatchMode,
    setIsBatchMode,
    isSettingsOpen,
    setIsSettingsOpen,
    activeTab,
    setActiveTab,
    tasksCount,
    batchJobsCount,
    activeBatchJobsCount,
    recent3dTasksCount,
    onClose,
    onOpenHistory,
    t
}) => {
    return (
        <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur-sm z-10 sticky top-0 select-none">
                <div className="flex items-center gap-2 select-none">
                    <div className={`w-2.5 h-2.5 rounded-full ${isBatchMode ? 'bg-accent-secondary animate-pulse' : 'bg-accent-text animate-pulse'}`}></div>
                    <h2 className="text-gray-100 font-semibold text-base flex items-center gap-1.5">
                        <span>{t('queue.title') || 'Task Queue & Batch'}</span>
                    </h2>
                    <button
                        onClick={() => setIsSettingsOpen(prev => !prev)}
                        className={`p-1 rounded-md transition-colors ${
                            isSettingsOpen 
                                ? 'text-accent-secondary bg-gray-800 ring-1 ring-gray-700' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
                        }`}
                        title={t('queue.settings') || 'Settings'}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-1.5 select-none">
                    {onOpenHistory && (
                        <button
                            onClick={onOpenHistory}
                            className="px-2.5 py-1 text-xs font-medium text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-md transition-colors flex items-center gap-1.5"
                            title={t('ui.to_history') || 'To History'}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{t('ui.to_history') || 'To History'}</span>
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Centralized Mode Switcher Banner */}
            <div className="p-3 bg-gray-950 border-b border-gray-800 select-none">
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900 border border-gray-800">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-200">
                                {t('batch.mode') || 'Batch API Mode'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-accent-secondary border border-gray-700 font-mono">
                                -50% Cost
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                            {isBatchMode 
                                ? (t('batch.statusDelayed') || 'Delayed ~24h (Half price)') 
                                : (t('batch.statusImmediate') || 'Standard real-time execution')}
                        </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!isBatchMode}
                            onChange={(e) => setIsBatchMode(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-secondary"></div>
                    </label>
                </div>
            </div>

            {/* Main Tabs Navigation (Queue vs Batch Jobs vs 3D Models) */}
            <div className="flex border-b border-gray-800 bg-gray-950/80 px-2 pt-1 gap-1 select-none">
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === 'queue'
                            ? 'border-accent text-white bg-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                    }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>{t('queue.title') || 'Queue'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
                        {tasksCount}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('batch')}
                    className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === 'batch'
                            ? 'border-accent-secondary text-white bg-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                    }`}
                >
                    <svg className="w-3.5 h-3.5 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>{t('batch.panelTitle') || 'Batch'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
                        {batchJobsCount}
                    </span>
                    {activeBatchJobsCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-accent-secondary animate-pulse"></span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('threed')}
                    className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                        activeTab === 'threed'
                            ? 'border-purple-500 text-white bg-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                    }`}
                >
                    <Box className="w-3.5 h-3.5 text-purple-400" />
                    <span>3D Models</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300">
                        {recent3dTasksCount}
                    </span>
                </button>
            </div>
        </>
    );
};
