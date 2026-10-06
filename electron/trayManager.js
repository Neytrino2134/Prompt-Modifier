import { app, Tray, Menu, shell, BrowserWindow, ipcMain, Notification } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getTrayIcon } from './config.js';
import { getDocumentsAutosaveDir } from './sessionManager.js';

let tray = null;
const getTraySettingsFilePath = () => path.join(app.getPath('userData'), 'tray_settings.json');

export let traySettings = {
  closeAction: 'ask', // 'ask' | 'tray' | 'quit'
  minimizeAction: 'taskbar', // 'taskbar' | 'tray'
  minimizeToTrayOnClose: false,
  minimizeToTrayOnMinimize: false,
};

// Real-time Batch API Status cache for Tray display
export let currentBatchStatus = {
  isBatchMode: false,
  isPolling: false,
  pending: 0,
  running: 0,
  activeJobs: 0,
  succeeded: 0,
  failed: 0,
  totalItems: 0,
  readyToDownload: 0,
  totalJobs: 0,
};

export function getTray() {
  return tray;
}

export function loadSavedTraySettings() {
  try {
    const filePath = getTraySettingsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const closeAction = parsed.closeAction || (parsed.minimizeToTrayOnClose ? 'tray' : 'ask');
        const minimizeAction = parsed.minimizeAction || (parsed.minimizeToTrayOnMinimize ? 'tray' : 'taskbar');
        traySettings = {
          closeAction,
          minimizeAction,
          minimizeToTrayOnClose: closeAction === 'tray',
          minimizeToTrayOnMinimize: minimizeAction === 'tray',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load tray settings from disk:', err);
  }
}

export function saveTraySettingsSync() {
  try {
    fs.writeFileSync(getTraySettingsFilePath(), JSON.stringify(traySettings, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save tray settings to disk:', err);
  }
}

export function updateTrayContextMenu({
  getMainWindow,
  bringWindowToFront,
  createWindow,
  saveAndExitPending,
  setSaveAndExitPending,
  setIsQuitting
}) {
  if (!tray || tray.isDestroyed()) return;

  const mainWindow = getMainWindow();
  const isVisible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  const isMinimized = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMinimized());
  const isPinned = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isAlwaysOnTop());

  // --- Format Batch API status ---
  const activeBatchCount = (currentBatchStatus.pending || 0) + (currentBatchStatus.running || 0);
  const readyBatchCount = currentBatchStatus.readyToDownload || 0;
  const totalBatchCount = currentBatchStatus.totalJobs || 0;

  let batchMainLabel = '📦 Batch API: Неактивен (Realtime)';
  if (activeBatchCount > 0) {
    const itemsStr = currentBatchStatus.totalItems ? ` (${currentBatchStatus.totalItems} эл.)` : '';
    batchMainLabel = `⏳ Batch API: Ожидается ответов: ${activeBatchCount}${itemsStr}`;
  } else if (readyBatchCount > 0) {
    batchMainLabel = `📥 Batch API: Готово к скачиванию: ${readyBatchCount}`;
  } else if (currentBatchStatus.isBatchMode) {
    batchMainLabel = `📦 Batch API: Режим включен (нет активных задач)`;
  } else {
    batchMainLabel = `⚡ Режим генерации: Прямой (Realtime)`;
  }

  const batchSubmenu = [
    {
      label: `Статус: ${activeBatchCount > 0 ? `⏳ Ожидание ${activeBatchCount} ответов` : readyBatchCount > 0 ? `📥 Готово к скачиванию: ${readyBatchCount}` : currentBatchStatus.isBatchMode ? '📦 Режим активен' : '⚡ Прямой режим (Realtime)'}`,
      enabled: false,
    },
    {
      label: `Режим по умолчанию: ${currentBatchStatus.isBatchMode ? '📦 Batch API (-50% скидка)' : '⚡ Realtime (прямой)'}`,
      enabled: false,
    },
    {
      label: `В обработке на сервере: ${currentBatchStatus.running || 0} задач`,
      enabled: false,
    },
    {
      label: `В очереди ожидания: ${currentBatchStatus.pending || 0} задач`,
      enabled: false,
    },
    {
      label: `Готово к загрузке на холст: ${readyBatchCount} задач`,
      enabled: false,
    },
    {
      label: `Всего задач в сессии: ${totalBatchCount}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: currentBatchStatus.isPolling ? '⏳ Опрос статуса...' : '🔄 Проверить статус Batch API сейчас',
      enabled: Boolean(mainWindow && !mainWindow.isDestroyed() && !currentBatchStatus.isPolling),
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app:tray-action', { action: 'poll-batch' });
        }
      }
    },
    {
      label: currentBatchStatus.isBatchMode ? '⚡ Переключить в режим Realtime' : '📦 Включить режим Batch API (-50%)',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app:tray-action', { action: 'toggle-batch-mode' });
        }
      }
    }
  ];

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Prompt Modifier',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: (isVisible && !isMinimized) ? 'Скрыть в трей' : 'Показать Prompt Modifier',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          createWindow();
          return;
        }
        if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
          mainWindow.hide();
        } else {
          bringWindowToFront(mainWindow);
        }
        updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
      }
    },
    {
      label: 'Развернуть на весь экран',
      enabled: Boolean(mainWindow && !mainWindow.isDestroyed()),
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          bringWindowToFront(mainWindow);
          mainWindow.maximize();
          updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
        }
      }
    },
    {
      label: 'Поверх всех окон (PIN)',
      type: 'checkbox',
      checked: isPinned,
      enabled: Boolean(mainWindow && !mainWindow.isDestroyed()),
      click: (menuItem) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(menuItem.checked, 'floating');
          updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
          mainWindow.webContents.send('window:always-on-top-changed', menuItem.checked);
        }
      }
    },
    { type: 'separator' },
    {
      label: batchMainLabel,
      submenu: batchSubmenu,
    },
    { type: 'separator' },
    {
      label: 'Быстрые действия',
      submenu: [
        {
          label: '➕ Новый холст',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              bringWindowToFront(mainWindow);
              mainWindow.webContents.send('app:tray-action', { action: 'new-tab' });
            }
          }
        },
        {
          label: '⚙️ Настройки приложения',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              bringWindowToFront(mainWindow);
              mainWindow.webContents.send('app:tray-action', { action: 'open-settings' });
            }
          }
        },
        {
          label: '📁 Открыть папку автосохранений',
          click: async () => {
            const docsDir = getDocumentsAutosaveDir();
            if (docsDir && fs.existsSync(docsDir)) {
              await shell.openPath(docsDir);
            } else {
              await shell.openPath(app.getPath('userData'));
            }
          }
        },
        {
          label: '🔄 Перезагрузить холст',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.reload();
            }
          }
        }
      ]
    },
    {
      label: 'Поведение трея',
      submenu: [
        {
          label: 'Действие при закрытии (крестик)',
          submenu: [
            {
              label: 'Спрашивать действие (Диалог)',
              type: 'radio',
              checked: traySettings.closeAction === 'ask',
              click: () => {
                traySettings.closeAction = 'ask';
                traySettings.minimizeToTrayOnClose = false;
                saveTraySettingsSync();
                updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('tray:settings-updated', traySettings);
                }
              }
            },
            {
              label: 'Сворачивать в трей',
              type: 'radio',
              checked: traySettings.closeAction === 'tray',
              click: () => {
                traySettings.closeAction = 'tray';
                traySettings.minimizeToTrayOnClose = true;
                saveTraySettingsSync();
                updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('tray:settings-updated', traySettings);
                }
              }
            },
            {
              label: 'Закрывать приложение',
              type: 'radio',
              checked: traySettings.closeAction === 'quit',
              click: () => {
                traySettings.closeAction = 'quit';
                traySettings.minimizeToTrayOnClose = false;
                saveTraySettingsSync();
                updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('tray:settings-updated', traySettings);
                }
              }
            }
          ]
        },
        {
          label: 'Действие при сворачивании окна',
          submenu: [
            {
              label: 'Сворачивать на панель задач',
              type: 'radio',
              checked: traySettings.minimizeAction === 'taskbar',
              click: () => {
                traySettings.minimizeAction = 'taskbar';
                traySettings.minimizeToTrayOnMinimize = false;
                saveTraySettingsSync();
                updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('tray:settings-updated', traySettings);
                }
              }
            },
            {
              label: 'Сворачивать в трей',
              type: 'radio',
              checked: traySettings.minimizeAction === 'tray',
              click: () => {
                traySettings.minimizeAction = 'tray';
                traySettings.minimizeToTrayOnMinimize = true;
                saveTraySettingsSync();
                updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('tray:settings-updated', traySettings);
                }
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Сворачивать в трей при закрытии',
          type: 'checkbox',
          checked: Boolean(traySettings.minimizeToTrayOnClose),
          click: (menuItem) => {
            traySettings.minimizeToTrayOnClose = menuItem.checked;
            traySettings.closeAction = menuItem.checked ? 'tray' : 'ask';
            saveTraySettingsSync();
            updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tray:settings-updated', traySettings);
            }
          }
        },
        {
          label: 'Сворачивать в трей при сворачивании',
          type: 'checkbox',
          checked: Boolean(traySettings.minimizeToTrayOnMinimize),
          click: (menuItem) => {
            traySettings.minimizeToTrayOnMinimize = menuItem.checked;
            traySettings.minimizeAction = menuItem.checked ? 'tray' : 'taskbar';
            saveTraySettingsSync();
            updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending, setSaveAndExitPending, setIsQuitting });
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tray:settings-updated', traySettings);
            }
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: saveAndExitPending ? 'Сохранение перед выходом…' : 'Сохранить и выйти',
      enabled: !saveAndExitPending,
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          setSaveAndExitPending(true);
          updateTrayContextMenu({ getMainWindow, bringWindowToFront, createWindow, saveAndExitPending: true, setSaveAndExitPending, setIsQuitting });
          mainWindow.webContents.send('app:save-and-exit');
        } else {
          setIsQuitting(true);
          app.quit();
        }
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  let tooltip = 'Prompt Modifier — Нейросетевой редактор промптов';
  if (activeBatchCount > 0) {
    tooltip += `\n📦 Batch API: Ожидается ответов: ${activeBatchCount}`;
  } else if (readyBatchCount > 0) {
    tooltip += `\n📥 Batch API: Готово к скачиванию: ${readyBatchCount}`;
  }
  tray.setToolTip(tooltip);
}

export function createTray(trayContext) {
  if (tray) return;

  try {
    const icon = getTrayIcon();
    tray = new Tray(icon);
    
    updateTrayContextMenu(trayContext);

    tray.on('click', () => {
      const mainWindow = trayContext.getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) {
        trayContext.createWindow();
        return;
      }
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.hide();
      } else {
        trayContext.bringWindowToFront(mainWindow);
      }
      updateTrayContextMenu(trayContext);
    });

    tray.on('double-click', () => {
      const mainWindow = trayContext.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        trayContext.bringWindowToFront(mainWindow);
        updateTrayContextMenu(trayContext);
      }
    });
  } catch (err) {
    console.error('Failed to initialize tray icon:', err);
  }
}

export function setupTrayIPC(trayContext) {
  ipcMain.on('tray:show-notification', (event, payload) => {
    if (!payload || typeof payload !== 'object') return;
    const { title = 'Prompt Modifier', message = '', type = 'info' } = payload;
    
    // 1. Balloon notification on Windows system tray
    if (tray && !tray.isDestroyed()) {
      try {
        const iconType = type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'info');
        tray.displayBalloon({
          title: String(title),
          content: String(message),
          iconType
        });
      } catch (err) {
        // Ignored if balloon is unsupported on platform
      }
    }

    // 2. Native OS desktop Notification
    try {
      if (Notification && Notification.isSupported && Notification.isSupported()) {
        const notif = new Notification({
          title: String(title),
          body: String(message),
          icon: getTrayIcon(),
          silent: false
        });
        notif.show();
        notif.on('click', () => {
          const mainWindow = trayContext.getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            trayContext.bringWindowToFront(mainWindow);
          }
        });
      }
    } catch (notifErr) {
      console.warn('Native notification failed:', notifErr);
    }
  });

  ipcMain.on('batch:sync-status', (event, status) => {
    if (status && typeof status === 'object') {
      currentBatchStatus = { ...currentBatchStatus, ...status };
      updateTrayContextMenu(trayContext);
    }
  });

  ipcMain.on('tray:minimize-to-tray', (event) => {
    const mainWindow = trayContext.getMainWindow();
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) {
      win.hide();
      updateTrayContextMenu(trayContext);
    }
  });

  ipcMain.on('tray:show-window', (event) => {
    const mainWindow = trayContext.getMainWindow();
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) {
      trayContext.bringWindowToFront(win);
      updateTrayContextMenu(trayContext);
    }
  });

  ipcMain.handle('tray:get-settings', () => {
    return { ...traySettings };
  });

  ipcMain.handle('tray:set-settings', (event, newSettings) => {
    if (newSettings && typeof newSettings === 'object') {
      if (newSettings.closeAction) {
        traySettings.closeAction = newSettings.closeAction;
        traySettings.minimizeToTrayOnClose = newSettings.closeAction === 'tray';
      } else if (typeof newSettings.minimizeToTrayOnClose === 'boolean') {
        traySettings.minimizeToTrayOnClose = newSettings.minimizeToTrayOnClose;
        traySettings.closeAction = newSettings.minimizeToTrayOnClose ? 'tray' : 'ask';
      }

      if (newSettings.minimizeAction) {
        traySettings.minimizeAction = newSettings.minimizeAction;
        traySettings.minimizeToTrayOnMinimize = newSettings.minimizeAction === 'tray';
      } else if (typeof newSettings.minimizeToTrayOnMinimize === 'boolean') {
        traySettings.minimizeToTrayOnMinimize = newSettings.minimizeToTrayOnMinimize;
        traySettings.minimizeAction = newSettings.minimizeToTrayOnMinimize ? 'tray' : 'taskbar';
      }

      saveTraySettingsSync();
      updateTrayContextMenu(trayContext);

      // Broadcast update to all windows
      BrowserWindow.getAllWindows().forEach((w) => {
        if (!w.isDestroyed()) {
          w.webContents.send('tray:settings-updated', traySettings);
        }
      });
      return { success: true, settings: traySettings };
    }
    return { success: false, settings: traySettings };
  });
}
