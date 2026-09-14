import React from 'react';
import { useLanguage } from '../../../localization';
import { FolderIcon, DeleteIcon, SaveIcon, ReloadIcon } from '../../icons/AppIcons';

interface ElectronStorageSettingsProps {
  downloadPath: string;
  onSelectDownloadFolder: () => void;
  onResetDownloadFolder: () => void;
  onOpenAutosaveFolder: () => void;
  onToggleBackupsList: () => void;
  showBackupsList: boolean;
  isLoadingBackups: boolean;
  sessionBackups: Array<{ filename: string; path: string; savedAt: string; tabCount: number }>;
  onRestoreBackup: (path: string) => void;
}

export const ElectronStorageSettings: React.FC<ElectronStorageSettingsProps> = ({
  downloadPath,
  onSelectDownloadFolder,
  onResetDownloadFolder,
  onOpenAutosaveFolder,
  onToggleBackupsList,
  showBackupsList,
  isLoadingBackups,
  sessionBackups,
  onRestoreBackup,
}) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Download Path (Electron Only) */}
      <div className="space-y-1.5 pt-2 border-t border-gray-700/50">
        <label className="block text-xs font-medium text-gray-400">
          {t('dialog.settings.downloadPathLabel')}
        </label>
        <div className="flex gap-2">
          <div className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 text-xs text-gray-300 truncate" title={downloadPath || 'Default'}>
            {downloadPath || <span className="text-gray-500 italic">Downloads Folder (Default)</span>}
          </div>
          <button
            type="button"
            onClick={onSelectDownloadFolder}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-md border border-gray-600"
            title={t('dialog.settings.selectFolder')}
          >
            <FolderIcon className="w-4 h-4" />
          </button>
          {downloadPath && (
            <button
              type="button"
              onClick={onResetDownloadFolder}
              className="p-2 bg-gray-700 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-md border border-gray-600 hover:border-red-800"
              title={t('dialog.settings.resetPath')}
            >
              <DeleteIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Session Backups & Resilience (Electron Only) */}
      <div className="space-y-2 pt-2 border-t border-gray-700/50">
        <div>
          <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
            <SaveIcon className="w-3.5 h-3.5 text-accent" />
            {t('settings.sessionBackupsLabel')}
          </label>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
            {t('settings.sessionBackupsDesc')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenAutosaveFolder}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 rounded border border-gray-700 flex items-center gap-1.5 transition-colors"
          >
            <FolderIcon className="w-3.5 h-3.5 text-cyan-400" />
            {t('settings.openAutosaveFolder')}
          </button>
          <button
            type="button"
            onClick={onToggleBackupsList}
            disabled={isLoadingBackups}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 rounded border border-gray-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <ReloadIcon className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingBackups ? 'animate-spin' : ''}`} />
            {t('settings.restoreSessionBtn')}
          </button>
        </div>

        {showBackupsList && (
          <div className="mt-2 p-2.5 bg-gray-900/90 border border-gray-700/80 rounded-lg space-y-2">
            <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
              Доступные резервные копии сессии:
            </div>
            {sessionBackups.length === 0 ? (
              <div className="text-xs text-gray-500 py-1 italic">
                {t('settings.noBackupsFound')}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {sessionBackups.map((b, idx) => (
                  <div
                    key={b.path + idx}
                    className="flex items-center justify-between p-2 bg-gray-800/80 hover:bg-gray-800 border border-gray-700/50 rounded text-xs gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-200 truncate" title={b.path}>
                        {b.filename}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(b.savedAt).toLocaleString()}</span>
                        <span className="text-accent">
                          {t('settings.backupItemTabs').replace('{count}', String(b.tabCount))}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestoreBackup(b.path)}
                      className="px-2.5 py-1 bg-accent/20 hover:bg-accent/30 text-accent font-medium rounded border border-accent/40 text-[11px] shrink-0 transition-colors"
                    >
                      Восстановить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
