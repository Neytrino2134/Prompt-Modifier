import React from 'react';
import { CustomCheckbox } from '../CustomCheckbox';
import { Trash2 } from 'lucide-react';

interface TaskQueueSettingsProps {
    autoDownloadFromServer: boolean;
    setAutoDownloadFromServer: (val: boolean) => void;
    clearUnusedBatchCache: () => void;
    isCleaningBatchCache: boolean;
    restoreFinishedCards?: boolean;
    setRestoreFinishedCards?: (val: boolean) => void;
    restoreFailedCards?: boolean;
    setRestoreFailedCards?: (val: boolean) => void;
    effectiveDeviceId: string;
    effectiveDeviceName?: string;
    handleDeviceNameChange: (val: string) => void;
    handleRegenerateId: () => void;
    effectiveIsolationEnabled: boolean;
    handleToggleIsolation: (val: boolean) => void;
    clearAllBatchJobs?: () => void;
    clearCompletedTasks?: () => void;
    hasTasks: boolean;
    onClose: () => void;
    addToast?: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    t: (key: string) => string;
}

export const TaskQueueSettings: React.FC<TaskQueueSettingsProps> = ({
    autoDownloadFromServer,
    setAutoDownloadFromServer,
    clearUnusedBatchCache,
    isCleaningBatchCache,
    restoreFinishedCards,
    setRestoreFinishedCards,
    restoreFailedCards,
    setRestoreFailedCards,
    effectiveDeviceId,
    effectiveDeviceName,
    handleDeviceNameChange,
    handleRegenerateId,
    effectiveIsolationEnabled,
    handleToggleIsolation,
    clearAllBatchJobs,
    clearCompletedTasks,
    hasTasks,
    onClose,
    addToast,
    t
}) => {
    return (
        <div className="p-3.5 border-b border-gray-800 bg-gray-900 shadow-inner flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                    </svg>
                    <span>{t('queue.settings') || 'Настройки очереди и пакетов'}</span>
                </span>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white text-xs px-1 rounded hover:bg-gray-800"
                >
                    ✕
                </button>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <CustomCheckbox checked={autoDownloadFromServer} onChange={setAutoDownloadFromServer} />
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-200">{t('batch.autoDownloadFromServerLabel')}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{t('batch.autoDownloadFromServerTooltip')}</span>
                </div>
            </label>

            {/* Restore Cards Options */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-gray-950/70 border border-gray-800/80">
                <button 
                    type="button" 
                    disabled={isCleaningBatchCache}
                    onClick={() => clearUnusedBatchCache()}
                    className="text-xs text-left text-gray-200 hover:text-white disabled:opacity-50 flex items-center gap-2"
                >
                    <Trash2 size={14} />
                    {t(isCleaningBatchCache ? 'batch.cacheCleaning' : 'batch.clearUnusedArchives')}
                </button>
                <span className="text-[10px] text-gray-400">{t('batch.clearUnusedArchivesDescription')}</span>
                {window.electronAPI?.openBatchCacheFolder && (
                    <button 
                        type="button" 
                        className="text-[10px] text-left text-indigo-300 hover:text-indigo-200"
                        onClick={() => window.electronAPI!.openBatchCacheFolder!().catch(() => addToast?.(t('batch.cacheCleanupFailed'), 'error'))}
                    >
                        {t('batch.openCacheFolder')}
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-gray-950/70 border border-gray-800/80">
                <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                    <CustomCheckbox
                        checked={restoreFinishedCards ?? true}
                        onChange={(val) => setRestoreFinishedCards?.(val)}
                    />
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors">
                            {t('queue.restoreFinishedCards') || 'Restore finished cards'}
                        </span>
                        <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                            {t('queue.restoreFinishedCardsDesc') || 'При проверке статуса переносит готовые изображения в карточки на холсте'}
                        </span>
                    </div>
                </label>

                <div className="border-t border-gray-800/60 my-0.5"></div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                    <CustomCheckbox
                        checked={restoreFailedCards ?? true}
                        onChange={(val) => setRestoreFailedCards?.(val)}
                    />
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors">
                            {t('queue.restoreFailedCards') || 'Restore failed cards'}
                        </span>
                        <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                            {t('queue.restoreFailedCardsDesc') || 'При ошибке генерации переводит карточки на холсте в состояние ошибки'}
                        </span>
                    </div>
                </label>
            </div>

            {/* Device & Batch Isolation Settings */}
            <div className="flex flex-col gap-2.5 p-2.5 rounded-lg bg-gray-950/70 border border-gray-800/80">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-200 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{t('queue.deviceIsolation') || 'Устройство и изоляция батчей'}</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300">
                        {effectiveDeviceId}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="flex-1 flex flex-col">
                        <label className="text-[10px] text-gray-400 mb-0.5">{t('queue.deviceNameLabel') || 'Имя устройства'}</label>
                        <input
                            type="text"
                            value={effectiveDeviceName || ''}
                            onChange={(e) => handleDeviceNameChange(e.target.value)}
                            placeholder="например: Домашний ПК, Mac"
                            className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <div className="flex flex-col justify-end pt-3.5">
                        <button
                            onClick={handleRegenerateId}
                            className="px-2 py-1 text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
                            title={t('queue.regenerateDeviceId') || 'Сгенерировать новый универсальный ID устройства'}
                        >
                            {t('queue.newId') || 'Новый ID'}
                        </button>
                    </div>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none group pt-0.5">
                    <CustomCheckbox
                        checked={effectiveIsolationEnabled}
                        onChange={(val) => handleToggleIsolation(val)}
                    />
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors">
                            {t('queue.enableDeviceIsolation') || 'Изоляция батчей по ID устройства'}
                        </span>
                        <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
                            {t('queue.enableDeviceIsolationDesc') || 'Не синхронизировать и не импортировать чужие батчи при общем API ключе'}
                        </span>
                    </div>
                </label>
            </div>

            <div className="flex flex-col gap-2">
                {/* Clear all Batch jobs button */}
                <button
                    onClick={() => {
                        const confirmMsg = t('batch.confirmClearAll') || 'Вы уверены, что хотите удалить ВСЕ Batch задачи? Это действие необратимо.';
                        if (window.confirm(confirmMsg)) {
                            clearAllBatchJobs?.();
                            onClose();
                        }
                    }}
                    className="w-full py-2 px-3 bg-red-950/60 hover:bg-red-900/80 border border-red-800/70 text-red-200 hover:text-white rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
                    title={t('batch.clearAllBatchJobsDesc') || 'Удаляет все пакетные задачи из памяти и локального хранилища'}
                >
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>{t('batch.clearAllBatchJobs') || 'Очистить все Batch jobs'}</span>
                </button>

                {hasTasks && (
                    <button
                        onClick={() => {
                            clearCompletedTasks?.();
                            onClose();
                        }}
                        className="w-full py-1.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <span>{t('queue.clearCompleted') || 'Очистить завершенные задачи'}</span>
                    </button>
                )}
            </div>
        </div>
    );
};
