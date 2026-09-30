import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../localization';
import { useAppContext } from '../../contexts/AppContext';
import { FolderIcon, DeleteIcon, SaveIcon, ReloadIcon } from '../icons/AppIcons';
import { generateCanvasScreenshot } from '../../utils/canvasScreenshot';
import { saveSessionToDB, clearAllSessionBackups } from '../../hooks/useTabs';

interface BackupItem {
  filename: string;
  path: string;
  savedAt: number | string;
  tabCount: number;
  tabNames?: string[];
  size?: number;
  screenshot?: string | null;
  tabsData?: any[];
  activeTabId?: string;
  launchFolder?: string | null;
  isCurrentLaunch?: boolean;
}

interface AutosaveSettingsSectionProps {
  isOpen: boolean;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const AUTO_SAVE_OPTIONS = [
  { value: 0, labelKey: 'settings.autoSaveBtn.off', desc: 'Off' },
  { value: 30, labelKey: 'settings.autoSaveBtn.30s', desc: '30s' },
  { value: 60, labelKey: 'settings.autoSaveBtn.1m', desc: '1m' },
  { value: 120, labelKey: 'settings.autoSaveBtn.2m', desc: '2m' },
  { value: 300, labelKey: 'settings.autoSaveBtn.5m', desc: '5m' },
  { value: 600, labelKey: 'settings.autoSaveBtn.10m', desc: '10m' },
];

const HISTORY_LIMIT_OPTIONS = [
  { value: 3, labelKey: 'settings.historyLimit.3', desc: '3' },
  { value: 5, labelKey: 'settings.historyLimit.5', desc: '5' },
  { value: 10, labelKey: 'settings.historyLimit.10', desc: '10' },
  { value: 15, labelKey: 'settings.historyLimit.15', desc: '15' },
  { value: 20, labelKey: 'settings.historyLimit.20', desc: '20' },
  { value: 50, labelKey: 'settings.historyLimit.50', desc: '50' },
  { value: 0, labelKey: 'settings.historyLimit.unlimited', desc: '∞' },
];

const SESSION_LIMIT_OPTIONS = [
  { value: 1, labelKey: 'settings.sessionLimit.1', desc: '1' },
  { value: 2, labelKey: 'settings.sessionLimit.2', desc: '2' },
  { value: 3, labelKey: 'settings.sessionLimit.3', desc: '3' },
  { value: 4, labelKey: 'settings.sessionLimit.4', desc: '4' },
  { value: 5, labelKey: 'settings.sessionLimit.5', desc: '5' },
];

export const AutosaveSettingsSection: React.FC<AutosaveSettingsSectionProps> = ({
  isOpen,
  addToast,
}) => {
  const { t } = useLanguage();
  const {
    autoSaveInterval,
    setAutoSaveInterval,
    autoSaveHistoryLimit = 5,
    setAutoSaveHistoryLimit,
    autoSaveSessionLimit = 2,
    setAutoSaveSessionLimit,
    restoreSession,
    setTabs,
    setActiveTabId,
    tabs,
    activeTabId,
    setConfirmInfo,
  } = useAppContext();

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  const [sessionBackups, setSessionBackups] = useState<BackupItem[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{
    launchFolderName?: string;
    launchStartTime?: number;
    maxStatesPerLaunch?: number;
    sessionLimit?: number;
    userAutosaveDir?: string;
  } | null>(null);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isClearingBackups, setIsClearingBackups] = useState(false);
  const [previewBackup, setPreviewBackup] = useState<BackupItem | null>(null);
  const [downloadPath, setDownloadPath] = useState<string>('');

  // Load backups list and session info without artificial truncating
  const loadBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    try {
      if (isElectron) {
        const api = (window as any).electronAPI;
        if (api) {
          if (typeof api.getSessionInfo === 'function') {
            try {
              const info = await api.getSessionInfo();
              if (info) setSessionInfo(info);
            } catch (e) {}
          }
          if (typeof api.listSessionBackups === 'function') {
            const backups = await api.listSessionBackups();
            if (Array.isArray(backups)) {
              setSessionBackups(backups);
              return;
            }
          }
        }
      }

      // Web Fallback: Retrieve saved backups from history & localStorage
      const webBackups: BackupItem[] = [];
      try {
        const historyRaw = localStorage.getItem('prompt_modifier_session_history');
        if (historyRaw) {
          const list = JSON.parse(historyRaw);
          if (Array.isArray(list)) {
            for (const item of list) {
              webBackups.push({
                filename: item.filename || `snapshot_${new Date(item.savedAt).toLocaleTimeString()}.json`,
                path: item.path || `localStorage://history_${item.savedAt}`,
                savedAt: item.savedAt || Date.now(),
                tabCount: item.tabCount || (item.tabs ? item.tabs.length : 1),
                tabNames: item.tabNames || (item.tabs ? item.tabs.map((tab: any) => tab.name || 'Untitled') : []),
                screenshot: item.screenshot || null,
                tabsData: item.tabs,
                activeTabId: item.activeTabId,
                launchFolder: item.launchFolder || null,
                isCurrentLaunch: item.isCurrentLaunch !== false,
              });
            }
          }
        }

        if (webBackups.length === 0) {
          const saved = localStorage.getItem('prompt_modifier_session_backup');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.tabs)) {
              webBackups.push({
                filename: 'browser_session_backup.json',
                path: 'localStorage://prompt_modifier_session_backup',
                savedAt: parsed.savedAt || Date.now(),
                tabCount: parsed.tabs.length,
                tabNames: parsed.tabs.map((tab: any) => tab.name || 'Untitled'),
                screenshot: parsed.screenshot || null,
                tabsData: parsed.tabs,
                activeTabId: parsed.activeTabId,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse local web backup', err);
      }

      setSessionBackups(webBackups);
    } catch (e) {
      console.error('Failed to load session backups:', e);
      addToast(t('settings.sessionRestoredError') || 'Failed to load backups', 'error');
    } finally {
      setIsLoadingBackups(false);
    }
  }, [isElectron, addToast, t]);

  useEffect(() => {
    if (isOpen) {
      loadBackups();

      if (isElectron) {
        const api = (window as any).electronAPI;
        if (api && typeof api.getDownloadPath === 'function') {
          api.getDownloadPath()
            .then((p: string) => setDownloadPath(p || ''))
            .catch(() => setDownloadPath(localStorage.getItem('settings_downloadPath') || ''));
        }
      }
    }
  }, [isOpen, isElectron, loadBackups]);

  // Open autosave folder in OS explorer
  const handleOpenAutosaveFolder = async () => {
    if (!isElectron) {
      addToast(t('settings.autosaveFolderWebInfo' as any) || 'Backups are stored securely in browser storage', 'info');
      return;
    }
    const api = (window as any).electronAPI;
    if (!api || typeof api.openAutosaveFolder !== 'function') return;
    try {
      await api.openAutosaveFolder();
    } catch (e) {
      console.error(e);
      addToast('Could not open folder', 'error');
    }
  };

  // Create manual screenshot snapshot now
  const handleCreateSnapshotNow = async () => {
    setIsCreatingSnapshot(true);
    try {
      const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
      const screenshot = activeTab?.state ? generateCanvasScreenshot(activeTab.state) : '';

      await saveSessionToDB(tabs, activeTabId, screenshot, true);
      await loadBackups();
      addToast(t('settings.screenshotSuccess' as any) || 'Резервная копия со снимком холста успешно сохранена', 'success');
    } catch (err) {
      console.error('Failed to create canvas snapshot:', err);
      addToast('Failed to save snapshot', 'error');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Clear all backups handler with confirmation dialog
  const handleClearAllBackups = () => {
    if (sessionBackups.length === 0) return;

    const count = sessionBackups.length;
    setConfirmInfo({
      title: t('settings.clearAllConfirmTitle' as any) || 'Очистить историю автосохранений?',
      message: (
        t('settings.clearAllConfirmMessage' as any) ||
        'Вы действительно хотите удалить все сохраненные резервные копии автосохранений ({count} шт.)? Это действие необратимо.'
      ).replace('{count}', String(count)),
      onConfirm: async () => {
        setIsClearingBackups(true);
        try {
          await clearAllSessionBackups();
          setSessionBackups([]);
          setPreviewBackup(null);
          addToast(t('settings.clearAllSuccess' as any) || 'История автосохранений успешно очищена', 'success');
        } catch (e) {
          console.error('Failed to clear session backups:', e);
          addToast('Failed to clear backups', 'error');
        } finally {
          setIsClearingBackups(false);
        }
      },
    });
  };

  // Restore session backup with confirmation and without closing settings dialog
  const handleConfirmRestoreBackup = (backup: BackupItem) => {
    const formattedDate = new Date(backup.savedAt).toLocaleString();
    const count = backup.tabCount || 1;

    setConfirmInfo({
      title: t('settings.confirmRestoreTitle' as any) || 'Восстановление сессии',
      message: (
        t('settings.confirmRestoreMessage' as any) ||
        'Вы уверены, что хотите восстановить резервную копию от {date} ({tabsCount} вкладок)? Все текущие изменения на холсте будут заменены.'
      )
        .replace('{date}', formattedDate)
        .replace('{tabsCount}', String(count)),
      onConfirm: async () => {
        try {
          // 1. Direct tabsData if present in memory/object
          if (backup.tabsData && Array.isArray(backup.tabsData) && backup.tabsData.length > 0) {
            restoreSession(backup.tabsData, backup.activeTabId);
            addToast(t('settings.sessionRestoredSuccess') || 'Session restored successfully', 'success');
            setPreviewBackup(null);
            return;
          }

          // 2. Electron file restoration
          if (isElectron) {
            const api = (window as any).electronAPI;
            if (api) {
              const restoreFn = api.restoreSessionBackup || api.readSessionBackup;
              if (typeof restoreFn === 'function') {
                const data = await restoreFn(backup.path);
                const tabsData = data?.session?.tabs || (Array.isArray(data?.tabs) ? data.tabs : null);
                const activeId = data?.session?.activeTabId || data?.activeTabId || tabsData?.[0]?.id;
                if (tabsData && Array.isArray(tabsData) && tabsData.length > 0) {
                  restoreSession(tabsData, activeId);
                  addToast(t('settings.sessionRestoredSuccess') || 'Session restored successfully', 'success');
                  setPreviewBackup(null);
                  return;
                }
              }
            }
          }

          // 3. Web localStorage history restore
          if (backup.path.startsWith('localStorage://')) {
            const historyRaw = localStorage.getItem('prompt_modifier_session_history');
            if (historyRaw) {
              try {
                const list = JSON.parse(historyRaw);
                const found = Array.isArray(list) && list.find((item: any) => item.path === backup.path || item.savedAt === backup.savedAt);
                if (found && Array.isArray(found.tabs) && found.tabs.length > 0) {
                  restoreSession(found.tabs, found.activeTabId);
                  addToast(t('settings.sessionRestoredSuccess') || 'Session restored successfully', 'success');
                  setPreviewBackup(null);
                  return;
                }
              } catch (e) {}
            }

            const saved = localStorage.getItem('prompt_modifier_session_backup');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
                restoreSession(parsed.tabs, parsed.activeTabId);
                addToast(t('settings.sessionRestoredSuccess') || 'Session restored successfully', 'success');
                setPreviewBackup(null);
                return;
              }
            }
          }

          addToast('Invalid session backup format', 'error');
        } catch (e) {
          console.error('Failed to restore backup:', e);
          addToast(t('settings.sessionRestoredError') || 'Failed to restore session', 'error');
        }
      },
    });
  };

  const handleSelectDownloadFolder = async () => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api) return;
    try {
      const selectFn = api.selectDownloadFolder || api.selectFolder;
      if (typeof selectFn === 'function') {
        const path = await selectFn();
        if (path) {
          setDownloadPath(path);
          if (typeof api.setDownloadPath === 'function') {
            api.setDownloadPath(path);
          }
          localStorage.setItem('settings_downloadPath', path);
          addToast(t('dialog.settings.downloadPathUpdated' as any) || 'Download path updated', 'success');
        }
      }
    } catch (e) {
      console.error('Failed to select download folder', e);
      addToast('Error selecting folder', 'error');
    }
  };

  const handleResetDownloadFolder = async () => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    try {
      if (api && typeof api.setDownloadPath === 'function') {
        await api.setDownloadPath('');
      }
      localStorage.removeItem('settings_downloadPath');
      setDownloadPath('');
      addToast(t('dialog.settings.downloadPathReset' as any) || 'Download path reset to default', 'info');
    } catch (e) {
      console.error('Failed to reset download folder', e);
    }
  };

  const handleHistoryLimitChange = (limit: number) => {
    if (typeof setAutoSaveHistoryLimit === 'function') {
      setAutoSaveHistoryLimit(limit);
    }
  };

  const handleSessionLimitChange = (limit: number) => {
    if (typeof setAutoSaveSessionLimit === 'function') {
      setAutoSaveSessionLimit(limit);
    }
  };

  return (
    <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-700/50 space-y-4">
      {/* 1. Auto-Save Interval Row */}
      <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700/60 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </span>
            <div>
              <label className="block text-xs font-semibold text-gray-200">
                {t('settings.autoSaveLabel')}
              </label>
              <p className="text-[10px] text-gray-400 leading-tight">
                {t('settings.autoSaveDesc')}
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 self-start sm:self-auto">
            {autoSaveInterval === 0 
              ? (t('settings.autoSave.off') || 'Off') 
              : `${autoSaveInterval < 60 ? `${autoSaveInterval}s` : `${autoSaveInterval / 60}m`}`}
          </span>
        </div>

        {/* Switch Buttons for Auto-Save Interval */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-0.5">
          {AUTO_SAVE_OPTIONS.map((opt) => {
            const isSelected = autoSaveInterval === opt.value;
            const localized = t(opt.labelKey as any);
            const labelText = localized && localized !== opt.labelKey ? localized : opt.desc;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAutoSaveInterval(opt.value)}
                className={`flex items-center justify-center py-2 px-1.5 rounded-md text-xs font-medium transition-all cursor-pointer outline-none focus:outline-none select-none border ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.15)] font-semibold'
                    : 'bg-gray-800/70 border-gray-700/60 text-gray-300 hover:bg-gray-700/60 hover:border-gray-600 hover:text-gray-100'
                }`}
              >
                <span className="truncate">{labelText}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Number of Retained Sessions Limit (1-5, default 2) */}
      <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700/60 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </span>
            <div>
              <label className="block text-xs font-semibold text-gray-200">
                {t('settings.sessionLimitLabel' as any) || 'Лимит количества сессий (папок запусков)'}
              </label>
              <p className="text-[10px] text-gray-400 leading-tight">
                {t('settings.sessionLimitDesc' as any) || 'Сколько последних папок запусков сохранять (по умолчанию 2)'}
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 self-start sm:self-auto">
            {autoSaveSessionLimit} {autoSaveSessionLimit === 1 ? 'сессия' : autoSaveSessionLimit < 5 ? 'сессии' : 'сессий'}
          </span>
        </div>

        {/* Switch Buttons for Session Count Limit */}
        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          {SESSION_LIMIT_OPTIONS.map((opt) => {
            const isSelected = autoSaveSessionLimit === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSessionLimitChange(opt.value)}
                className={`flex items-center justify-center py-2 px-1.5 rounded-md text-xs font-medium transition-all cursor-pointer outline-none focus:outline-none select-none border ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.15)] font-semibold'
                    : 'bg-gray-800/70 border-gray-700/60 text-gray-300 hover:bg-gray-700/60 hover:border-gray-600 hover:text-gray-100'
                }`}
              >
                <span className="truncate">{opt.desc} {opt.value === 2 ? '(по умолч.)' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Snapshots per Session Limit Row */}
      <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700/60 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <label className="block text-xs font-semibold text-gray-200">
                {t('settings.historyLimitLabel' as any) || 'Снимков в каждой сессии'}
              </label>
              <p className="text-[10px] text-gray-400 leading-tight">
                {t('settings.historyLimitDesc' as any) || 'Количество сохраняемых снимков в каждой папке сессии'}
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-md font-medium text-amber-400 bg-amber-950/70 border border-amber-800/50 self-start sm:self-auto">
            {autoSaveHistoryLimit === 0
              ? (t('settings.historyLimit.unlimited' as any) || 'Без лимита')
              : `${autoSaveHistoryLimit} ${autoSaveHistoryLimit === 1 ? 'снимок' : autoSaveHistoryLimit < 5 ? 'снимка' : 'снимков'}`}
          </span>
        </div>

        {/* Switch Buttons for Snapshots Limit */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-0.5">
          {HISTORY_LIMIT_OPTIONS.map((opt) => {
            const isSelected = autoSaveHistoryLimit === opt.value;
            const localized = t(opt.labelKey as any);
            const labelText = localized && localized !== opt.labelKey ? localized : opt.desc;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleHistoryLimitChange(opt.value)}
                className={`flex items-center justify-center py-2 px-1.5 rounded-md text-xs font-medium transition-all cursor-pointer outline-none focus:outline-none select-none border ${
                  isSelected
                    ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.15)] font-semibold'
                    : 'bg-gray-800/70 border-gray-700/60 text-gray-300 hover:bg-gray-700/60 hover:border-gray-600 hover:text-gray-100'
                }`}
              >
                <span className="truncate">{labelText}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Quick Actions, Folder Access & Clear All */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCreateSnapshotNow}
          disabled={isCreatingSnapshot}
          className="px-3.5 py-2 bg-gradient-to-r from-cyan-950/70 to-blue-950/70 hover:from-cyan-900/80 hover:to-blue-900/80 text-xs font-semibold text-cyan-200 hover:text-white rounded-lg border border-cyan-600/50 flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <SaveIcon className={`w-3.5 h-3.5 text-cyan-400 ${isCreatingSnapshot ? 'animate-spin' : ''}`} />
          <span>{isCreatingSnapshot ? (t('settings.takingScreenshot' as any) || 'Saving Snapshot...') : (t('settings.takeScreenshotBackup' as any) || 'Создать снимок холста сейчас')}</span>
        </button>

        <button
          type="button"
          onClick={handleOpenAutosaveFolder}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 rounded-lg border border-gray-700 flex items-center gap-1.5 transition-colors"
        >
          <FolderIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('settings.openAutosaveFolder')}</span>
        </button>

        {/* Clear All Backups Button */}
        <button
          type="button"
          onClick={handleClearAllBackups}
          disabled={sessionBackups.length === 0 || isClearingBackups}
          className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-xs font-medium text-red-300 hover:text-red-100 rounded-lg border border-red-800/60 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          title={t('settings.clearAllBackupsDesc' as any) || 'Удалить все сохраненные копии'}
        >
          <DeleteIcon className={`w-3.5 h-3.5 text-red-400 ${isClearingBackups ? 'animate-spin' : ''}`} />
          <span>{t('settings.clearAllBackups' as any) || 'Очистить архивы'}</span>
        </button>

        <button
          type="button"
          onClick={loadBackups}
          disabled={isLoadingBackups}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 rounded-lg border border-gray-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 ml-auto"
          title="Обновить список"
        >
          <ReloadIcon className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingBackups ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {/* Launch Architecture Info Card */}
      {sessionInfo && (
        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-cyan-900/40 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-300 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <div>
              <span className="text-gray-400">Сессия запуска: </span>
              <span className="font-mono text-cyan-300 font-semibold">{sessionInfo.launchFolderName}</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
              до {sessionInfo.maxStatesPerLaunch ?? autoSaveHistoryLimit ?? 5} снимков в сессии
            </span>
            <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
              лимит {sessionInfo.sessionLimit ?? autoSaveSessionLimit ?? 2} {((sessionInfo.sessionLimit ?? autoSaveSessionLimit ?? 2) === 1) ? 'сессия' : 'сессии'}
            </span>
          </div>
        </div>
      )}

      {/* 4. Session Backups with Screenshot Previews */}
      <div className="space-y-2.5 pt-2 border-t border-gray-700/60">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
              <SaveIcon className="w-3.5 h-3.5 text-cyan-400" />
              {t('settings.sessionBackupsLabel')}
            </label>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
              {t('settings.autosaveTabDesc' as any) || 'Сохраненные копии холста по папкам запусков со скриншотами.'}
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-gray-800 text-gray-300 border border-gray-700">
            {sessionBackups.length} {sessionBackups.length === 1 ? 'копия' : 'копий'}
          </span>
        </div>

        {sessionBackups.length === 0 ? (
          <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800 text-center text-xs text-gray-400 italic">
            {isLoadingBackups ? 'Загрузка резервных копий...' : t('settings.noBackupsFound')}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
            {sessionBackups.map((b, idx) => {
              const formattedDate = new Date(b.savedAt).toLocaleString();
              const hasScreenshot = Boolean(b.screenshot && b.screenshot.startsWith('data:image'));

              return (
                <div
                  key={b.path + idx}
                  className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-2.5 rounded-lg text-xs gap-3 transition-all border ${
                    b.isCurrentLaunch
                      ? 'bg-cyan-950/25 hover:bg-cyan-950/40 border-cyan-700/50'
                      : 'bg-gray-900/80 hover:bg-gray-850 border-gray-700/60 hover:border-gray-600'
                  }`}
                >
                  {/* Left: Thumbnail & Meta */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Screenshot Thumbnail */}
                    <div
                      onClick={() => setPreviewBackup(b)}
                      className="relative w-24 h-16 sm:w-28 sm:h-16 rounded-md bg-slate-950 border border-gray-700 overflow-hidden flex-shrink-0 cursor-pointer group shadow-inner"
                      title="Нажмите для увеличения превью"
                    >
                      {hasScreenshot ? (
                        <img
                          src={b.screenshot!}
                          alt={b.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-[10px] p-1 text-center bg-slate-900">
                          <SaveIcon className="w-4 h-4 mb-0.5 opacity-40" />
                          <span>Нет превью</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-medium bg-black/70 px-1.5 py-0.5 rounded shadow">
                          🔍 Увеличить
                        </span>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-semibold text-gray-200 truncate flex items-center gap-2" title={b.path}>
                        <span className="truncate">{b.filename}</span>
                        {b.isCurrentLaunch && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex-shrink-0">
                            Текущий запуск
                          </span>
                        )}
                        {b.launchFolder && !b.isCurrentLaunch && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-gray-400 bg-gray-800 border border-gray-700/60 flex-shrink-0 truncate max-w-[140px]" title={`Папка запуска: ${b.launchFolder}`}>
                            📁 {b.launchFolder}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-400 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <span className="text-gray-300 font-mono">{formattedDate}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                          {t('settings.backupItemTabs').replace('{count}', String(b.tabCount))}
                        </span>
                        {b.size && (
                          <span className="text-gray-500">
                            {(b.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>

                      {/* Tab Names Pills */}
                      {b.tabNames && b.tabNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {b.tabNames.slice(0, 3).map((name, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 border border-gray-700/50 truncate max-w-[120px]"
                            >
                              {name}
                            </span>
                          ))}
                          {b.tabNames.length > 3 && (
                            <span className="text-[9px] text-gray-500">
                              +{b.tabNames.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 justify-end sm:justify-start flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewBackup(b)}
                      className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white font-medium rounded-md border border-gray-700 text-xs transition-colors"
                      title="Просмотреть превью"
                    >
                      Превью
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmRestoreBackup(b)}
                      className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-cyan-200 font-semibold rounded-md border border-cyan-500/50 text-xs transition-colors active:scale-95 shadow-sm"
                    >
                      Восстановить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Download Path (Electron Only) */}
      {isElectron && (
        <div className="space-y-1.5 pt-2 border-t border-gray-700/60">
          <label className="block text-xs font-semibold text-gray-300">
            {t('dialog.settings.downloadPathLabel')}
          </label>
          <div className="flex gap-2">
            <div className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-2 text-xs text-gray-300 truncate" title={downloadPath || 'Default'}>
              {downloadPath || <span className="text-gray-500 italic">Downloads Folder (Default)</span>}
            </div>
            <button
              type="button"
              onClick={handleSelectDownloadFolder}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-md border border-gray-600"
              title={t('dialog.settings.selectFolder')}
            >
              <FolderIcon className="w-4 h-4" />
            </button>
            {downloadPath && (
              <button
                type="button"
                onClick={handleResetDownloadFolder}
                className="p-2 bg-gray-700 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-md border border-gray-600 hover:border-red-800"
                title={t('dialog.settings.resetPath')}
              >
                <DeleteIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. Screenshot Preview Modal */}
      {previewBackup && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewBackup(null)}
        >
          <div
            className="bg-gray-900 border border-cyan-700/60 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 bg-[#18202f] border-b border-gray-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-100 truncate">
                  {previewBackup.filename}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBackup(null)}
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Image and details */}
            <div className="p-4 space-y-3 bg-gray-950/80">
              <div className="w-full aspect-video rounded-lg bg-slate-950 border border-gray-800 overflow-hidden flex items-center justify-center shadow-inner">
                {previewBackup.screenshot && previewBackup.screenshot.startsWith('data:image') ? (
                  <img
                    src={previewBackup.screenshot}
                    alt={previewBackup.filename}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    <SaveIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">{t('settings.previewNotAvailable' as any) || 'Превью изображения недоступно'}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-gray-300 gap-2 px-1">
                <div>
                  <span className="text-gray-400">Дата сохранения: </span>
                  <span className="font-semibold text-white">{new Date(previewBackup.savedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-medium">
                    {previewBackup.tabCount} {previewBackup.tabCount === 1 ? 'вкладка' : 'вкладок'}
                  </span>
                  {previewBackup.size && (
                    <span className="text-gray-400 font-mono">
                      {(previewBackup.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              </div>

              {previewBackup.tabNames && previewBackup.tabNames.length > 0 && (
                <div className="px-1 text-xs">
                  <span className="text-gray-400">Вкладки проекта: </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {previewBackup.tabNames.map((name, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 border border-gray-700 text-[11px]">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-gray-900 border-t border-gray-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPreviewBackup(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white rounded-lg text-xs font-medium border border-gray-700"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestoreBackup(previewBackup)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-600/30"
              >
                {t('settings.previewModalRestore' as any) || 'Восстановить эту сессию'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
