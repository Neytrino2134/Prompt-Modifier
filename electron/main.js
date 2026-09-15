import { app, BrowserWindow, shell, session, ipcMain, dialog, screen, Tray, Menu, nativeImage, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TRAY_ICON_DATA_URL } from './tray_icon_base64.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if running in development mode
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Explicitly lock app identity and userData path across all dev and packaged builds
const APP_TITLE = 'Prompt Modifier';
app.name = APP_TITLE;

// Chromium & Electron anti-flicker & dark theme background configuration
// Prevents white flash when creating, minimizing, restoring, or resizing windows
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.commandLine.appendSwitch('background-color', '0c111e');
app.commandLine.appendSwitch('default-background-color', '0c111e');

// Enforce dark theme internally for native surfaces, devtools, and web views
try {
  nativeTheme.themeSource = 'dark';
} catch (e) {
  console.warn('Could not set nativeTheme.themeSource:', e);
}

try {
  const unifiedUserData = path.join(app.getPath('appData'), APP_TITLE);
  app.setPath('userData', unifiedUserData);
} catch (e) {
  console.warn('Could not set custom userData path:', e);
}

// Single instance lock - prevent duplicate instances and bring existing instance from tray
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // If user tries to open app again, restore window from tray/minimized and focus it
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      bringWindowToFront(mainWindow);
      mainWindow.focus();
      updateTrayContextMenu();
    }
  });
}

// SPOOFING: Use a standard Chrome User Agent to bypass Google's "secure browser" check.
// Using a fixed recent version of Chrome on Windows 10.
const FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Define the dev port - must match vite.config.ts
const DEV_PORT = process.env.PORT || 3000;

// Store user defined download path in memory (syncs from renderer)
let customDownloadPath = app.getPath('downloads');

// Flag to track if we should actually close the app or ask the renderer first
let isQuitting = false;

// Store reference to the main window and any detached mini-app windows
let mainWindow = null;
const miniAppWindows = new Map(); // nodeId -> BrowserWindow

// System Tray Instance & Settings
let tray = null;
const getTraySettingsFilePath = () => path.join(app.getPath('userData'), 'tray_settings.json');

let traySettings = {
  minimizeToTrayOnClose: false,
  minimizeToTrayOnMinimize: false,
};

// Real-time Batch API Status cache for Tray display
let currentBatchStatus = {
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

ipcMain.on('batch:sync-status', (event, status) => {
  if (status && typeof status === 'object') {
    currentBatchStatus = { ...currentBatchStatus, ...status };
    updateTrayContextMenu();
  }
});

function loadSavedTraySettings() {
  try {
    const filePath = getTraySettingsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        traySettings = {
          minimizeToTrayOnClose: Boolean(parsed.minimizeToTrayOnClose),
          minimizeToTrayOnMinimize: Boolean(parsed.minimizeToTrayOnMinimize),
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load tray settings from disk:', err);
  }
}

function saveTraySettingsSync() {
  try {
    fs.writeFileSync(getTraySettingsFilePath(), JSON.stringify(traySettings, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save tray settings to disk:', err);
  }
}

function getAppIcon() {
  const candidatePaths = [
    path.join(__dirname, '../resources/icon.png'),
    path.join(__dirname, '../resources/icon.ico'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../public/favicon.png'),
    path.join(__dirname, '../dist/favicon.png'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          return img;
        }
      } catch (e) {
        console.warn('Failed to load app icon candidate:', p, e);
      }
    }
  }

  try {
    const dataUrlImg = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL);
    if (!dataUrlImg.isEmpty()) {
      return dataUrlImg;
    }
  } catch (e) {
    console.warn('Failed to create app icon from Data URL:', e);
  }

  return nativeImage.createEmpty();
}

function getTrayIcon() {
  const candidatePaths = [
    path.join(__dirname, '../resources/tray-icon.png'),
    path.join(__dirname, '../public/tray-icon.png'),
    path.join(__dirname, '../dist/tray-icon.png'),
    path.join(__dirname, '../resources/tray-icon-16.png'),
    path.join(__dirname, '../public/tray-icon-16.png'),
    path.join(__dirname, '../dist/tray-icon-16.png'),
    path.join(__dirname, '../resources/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../public/favicon.png'),
    path.join(__dirname, '../dist/favicon.png'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          return img;
        }
      } catch (e) {
        console.warn('Failed to load tray icon candidate:', p, e);
      }
    }
  }

  try {
    const dataUrlImg = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL);
    if (!dataUrlImg.isEmpty()) {
      return dataUrlImg;
    }
  } catch (e) {
    console.warn('Failed to create tray icon from Data URL:', e);
  }

  return nativeImage.createEmpty();
}

function updateTrayContextMenu() {
  if (!tray || tray.isDestroyed()) return;

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
        updateTrayContextMenu();
      }
    },
    {
      label: 'Развернуть на весь экран',
      enabled: Boolean(mainWindow && !mainWindow.isDestroyed()),
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          bringWindowToFront(mainWindow);
          mainWindow.maximize();
          updateTrayContextMenu();
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
          updateTrayContextMenu();
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
          label: 'Сворачивать в трей при закрытии (крестик)',
          type: 'checkbox',
          checked: Boolean(traySettings.minimizeToTrayOnClose),
          click: (menuItem) => {
            traySettings.minimizeToTrayOnClose = menuItem.checked;
            saveTraySettingsSync();
            updateTrayContextMenu();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tray:settings-updated', traySettings);
            }
          }
        },
        {
          label: 'Сворачивать в трей при сворачивании окна',
          type: 'checkbox',
          checked: Boolean(traySettings.minimizeToTrayOnMinimize),
          click: (menuItem) => {
            traySettings.minimizeToTrayOnMinimize = menuItem.checked;
            saveTraySettingsSync();
            updateTrayContextMenu();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tray:settings-updated', traySettings);
            }
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Сохранить и выйти',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Send save-and-exit signal to renderer to save all tabs immediately and close
          mainWindow.webContents.send('app:save-and-exit');
          // Safety fallback timeout to ensure exit if renderer is unresponsive
          setTimeout(() => {
            if (!isQuitting) {
              isQuitting = true;
              if (mainWindow && !mainWindow.isDestroyed()) {
                saveWindowStateSync(mainWindow);
              }
              app.quit();
            }
          }, 3000);
        } else {
          isQuitting = true;
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

function createTray() {
  if (tray) return;

  try {
    const icon = getTrayIcon();
    tray = new Tray(icon);
    
    updateTrayContextMenu();

    tray.on('click', () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        return;
      }
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.hide();
      } else {
        bringWindowToFront(mainWindow);
      }
      updateTrayContextMenu();
    });

    tray.on('double-click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        bringWindowToFront(mainWindow);
        updateTrayContextMenu();
      }
    });
  } catch (err) {
    console.error('Failed to initialize tray icon:', err);
  }
}

// --- Window State Persistence (Multi-monitor support) ---
const getWindowStateFilePath = () => path.join(app.getPath('userData'), 'window_state.json');

function loadSavedWindowState() {
  try {
    const filePath = getWindowStateFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load window state from disk:', err);
  }
  return null;
}

function saveWindowStateSync(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const isMaximized = win.isMaximized();
    const bounds = (isMaximized && win.getNormalBounds) ? win.getNormalBounds() : win.getBounds();
    const currentDisplay = screen.getDisplayMatching(bounds);
    const stateToSave = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
      displayId: currentDisplay ? currentDisplay.id : undefined,
    };
    fs.writeFileSync(getWindowStateFilePath(), JSON.stringify(stateToSave), 'utf-8');
  } catch (err) {
    console.warn('Failed to save window state synchronously:', err);
  }
}

function getValidInitialBounds(savedState) {
  const defaultBounds = {
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
  };

  if (!savedState) {
    return defaultBounds;
  }

  const displays = screen.getAllDisplays();
  
  // Try to find if the saved display or any display contains the saved window center/bounds
  const centerX = savedState.x + savedState.width / 2;
  const centerY = savedState.y + savedState.height / 2;

  const displayMatchingCenter = displays.find(display => {
    const b = display.bounds;
    return (
      centerX >= b.x &&
      centerX <= b.x + b.width &&
      centerY >= b.y &&
      centerY <= b.y + b.height
    );
  });

  const displayMatchingBounds = displayMatchingCenter || displays.find(display => {
    const b = display.bounds;
    // Check if at least 100x100 overlap exists
    const overlapX = Math.max(0, Math.min(savedState.x + savedState.width, b.x + b.width) - Math.max(savedState.x, b.x));
    const overlapY = Math.max(0, Math.min(savedState.y + savedState.height, b.y + b.height) - Math.max(savedState.y, b.y));
    return overlapX >= 100 && overlapY >= 100;
  });

  if (displayMatchingBounds) {
    // Ensure width and height are within min/max bounds and fit on the display
    const width = Math.max(900, Math.min(savedState.width, displayMatchingBounds.workArea.width));
    const height = Math.max(600, Math.min(savedState.height, displayMatchingBounds.workArea.height));
    
    // Clamp x and y so window is not positioned off-screen
    const maxX = displayMatchingBounds.workArea.x + displayMatchingBounds.workArea.width - 100;
    const minX = displayMatchingBounds.workArea.x - width + 100;
    const maxY = displayMatchingBounds.workArea.y + displayMatchingBounds.workArea.height - 100;
    const minY = displayMatchingBounds.workArea.y;

    const x = Math.max(minX, Math.min(savedState.x, maxX));
    const y = Math.max(minY, Math.min(savedState.y, maxY));

    return {
      x,
      y,
      width,
      height,
      minWidth: 900,
      minHeight: 600,
      isMaximized: Boolean(savedState.isMaximized)
    };
  }

  // Display was removed / disconnected -> center on primary display
  const primaryDisplay = screen.getPrimaryDisplay();
  const width = Math.min(Math.max(savedState.width || 1280, 900), primaryDisplay.workArea.width);
  const height = Math.min(Math.max(savedState.height || 800, 600), primaryDisplay.workArea.height);
  const x = primaryDisplay.workArea.x + Math.floor((primaryDisplay.workArea.width - width) / 2);
  const y = primaryDisplay.workArea.y + Math.floor((primaryDisplay.workArea.height - height) / 2);

  return {
    x,
    y,
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    isMaximized: Boolean(savedState.isMaximized)
  };
}

/**
 * Bring a window reliably to the foreground, restore if minimized, focus and flash frame.
 */
function bringWindowToFront(targetWin) {
  if (!targetWin || targetWin.isDestroyed()) return;

  if (targetWin.isMinimized()) {
    targetWin.restore();
  }

  if (!targetWin.isVisible()) {
    targetWin.show();
  }

  const wasAlwaysOnTop = targetWin.isAlwaysOnTop();

  if (!wasAlwaysOnTop) {
    // Bring window smoothly to front without OS frame flashing
    targetWin.setAlwaysOnTop(true, 'screen-saver');
    targetWin.show();
    targetWin.focus();
    setTimeout(() => {
      if (!targetWin.isDestroyed() && !targetWin.isAlwaysOnTop()) {
        targetWin.setAlwaysOnTop(false);
        targetWin.focus();
      }
    }, 120);
  } else {
    targetWin.show();
    targetWin.focus();
  }
}

function createWindow() {
  const appIcon = getAppIcon();

  const savedState = loadSavedWindowState();
  const initialBounds = getValidInitialBounds(savedState);

  const windowOptions = {
    width: initialBounds.width,
    height: initialBounds.height,
    minWidth: initialBounds.minWidth,
    minHeight: initialBounds.minHeight,
    title: 'Prompt Modifier',
    icon: appIcon,
    frame: false, // Frameless window for custom stylish titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#0c111e', // Dark navy background prevents white flash
    paintWhenInitiallyHidden: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Prevents compositor freezing/flashing when restored from minimized
      preload: path.join(__dirname, 'preload.js'), // Load preload script
    },
  };

  if (typeof initialBounds.x === 'number' && typeof initialBounds.y === 'number') {
    windowOptions.x = initialBounds.x;
    windowOptions.y = initialBounds.y;
  }

  const win = new BrowserWindow(windowOptions);

  if (initialBounds.isMaximized) {
    win.maximize();
  }

  // Debounced Window Position & State Autosave
  let saveStateTimer = null;
  const queueSaveWindowState = () => {
    if (saveStateTimer) clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
      saveWindowStateSync(win);
    }, 250);
  };

  win.on('resize', queueSaveWindowState);
  win.on('move', queueSaveWindowState);

  // Notify renderer when maximize state changes
  win.on('maximize', () => {
    win.webContents.send('window:maximized-change', true);
    queueSaveWindowState();
  });
  win.on('unmaximize', () => {
    win.webContents.send('window:maximized-change', false);
    queueSaveWindowState();
  });

  // CRITICAL: Apply the fake User Agent to the main window immediately
  win.webContents.setUserAgent(FAKE_USER_AGENT);

  // Remove the default menu bar for a cleaner "app-like" look
  win.setMenuBarVisibility(false);

  // Lock window title strictly to Prompt Modifier without version numbers
  win.on('page-title-updated', (e) => {
    e.preventDefault();
    win.setTitle('Prompt Modifier');
  });

  mainWindow = win;

  // Track window visibility & state for Tray menu updates
  win.on('show', updateTrayContextMenu);
  win.on('hide', updateTrayContextMenu);
  win.on('minimize', (e) => {
    if (traySettings.minimizeToTrayOnMinimize) {
      e.preventDefault();
      win.hide();
    }
    updateTrayContextMenu();
  });
  win.on('restore', updateTrayContextMenu);
  win.on('focus', updateTrayContextMenu);
  win.on('blur', updateTrayContextMenu);
  win.on('always-on-top-changed', (event, isAlwaysOnTop) => {
    updateTrayContextMenu();
    if (!win.isDestroyed()) {
      win.webContents.send('window:always-on-top-changed', isAlwaysOnTop);
    }
  });

  // --- Close Handler with Tray Support & Custom Dialog ---
  win.on('close', (e) => {
    saveWindowStateSync(win);
    if (!isQuitting) {
      if (traySettings.minimizeToTrayOnClose) {
        e.preventDefault();
        win.hide();
        updateTrayContextMenu();
        return;
      }
      e.preventDefault();
      // Ensure the window is brought to front, un-minimized and focused so the Close Project dialog is immediately visible
      bringWindowToFront(win);
      // Send a message to the renderer process to check for unsaved changes
      win.webContents.send('app:close-request');
    } else {
      // Close any open mini-app windows when main window closes
      miniAppWindows.forEach((miniWin) => {
        if (!miniWin.isDestroyed()) {
          miniWin.destroy();
        }
      });
      miniAppWindows.clear();
      if (tray && !tray.isDestroyed()) {
        tray.destroy();
        tray = null;
      }
    }
  });

  // Handle external links (open in default browser)
  win.webContents.setWindowOpenHandler(({ url }) => {
    // If it's a Google Auth URL, allow it to open in a popup window (needed for gapi)
    if (url.includes('accounts.google.com')) {
      return { 
        action: 'allow',
        overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            // CRITICAL: New popups must also behave like Chrome to pass the check
            userAgent: FAKE_USER_AGENT 
        }
      };
    }
    
    // For other external links (like "Learn more"), open in system browser
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    return { action: 'allow' };
  });

  // Ensure any newly created window (like the Google Auth popup) gets the User Agent forced
  // Sometimes setWindowOpenHandler options aren't enough for all redirect flows.
  app.on('browser-window-created', (e, window) => {
      window.webContents.setUserAgent(FAKE_USER_AGENT);
      window.setMenuBarVisibility(false);
  });

  // Modify headers for all requests to strip "Electron" signatures
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = FAKE_USER_AGENT;
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // --- Download Handler ---
  session.defaultSession.on('will-download', (event, item, webContents) => {
    if (customDownloadPath) {
      // If a custom path is set, save the file there automatically
      item.setSavePath(path.join(customDownloadPath, item.getFilename()));
    }
    // If no path is set, Electron's default behavior (usually asking or Downloads folder) applies.

    item.once('done', (event, state) => {
      if (state === 'completed') {
        const savePath = item.getSavePath();
        webContents.send('app:download-complete', { state, path: savePath });
      }
    });
  });

  // Error handling for webContents
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Window failed to load: [${errorCode}] ${errorDescription} (${validatedURL})`);
    // If dev server failed to load, attempt fallback to built files
    if (isDev && validatedURL.startsWith('http://localhost')) {
      const fallbackPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(fallbackPath)) {
        console.log('Falling back to built index.html...');
        win.loadFile(fallbackPath);
      }
    }
  });

  win.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });

  // Load the app
  if (isDev) {
    win.loadURL(`http://localhost:${DEV_PORT}`).catch((err) => {
      console.warn(`Dev server unreachable at http://localhost:${DEV_PORT}, loading built index.html:`, err);
      const fallbackPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(fallbackPath)) {
        win.loadFile(fallbackPath);
      }
    });
  } else {
    // In production, load the built index.html from app package
    const primaryPath = path.join(__dirname, '../dist/index.html');
    const fallbackPath = path.join(app.getAppPath(), 'dist/index.html');
    
    if (fs.existsSync(primaryPath)) {
      win.loadFile(primaryPath);
    } else if (fs.existsSync(fallbackPath)) {
      win.loadFile(fallbackPath);
    } else {
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }
}

// --- IPC Handlers ---

// Handle folder selection dialog
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled) {
    return null;
  } else {
    return result.filePaths[0];
  }
});

// Handle show item in folder
ipcMain.handle('shell:showItemInFolder', (event, fullPath) => {
  shell.showItemInFolder(fullPath);
});

// Receive download path from Renderer
ipcMain.on('app:setDownloadPath', (event, path) => {
  customDownloadPath = path;
});

// Return current download path to Renderer
ipcMain.handle('app:getDownloadPath', () => {
  return customDownloadPath || app.getPath('downloads');
});

// --- Comprehensive Multi-Location Session Persistence on Disk for Electron ---

function getPrimarySessionFilePath() {
  return path.join(app.getPath('userData'), 'prompt_modifier_session.json');
}

function getPrimaryBackupFilePath() {
  return path.join(app.getPath('userData'), 'prompt_modifier_session.backup.json');
}

function getDocumentsAutosaveDir() {
  try {
    const docPath = app.getPath('documents');
    return path.join(docPath, 'Prompt Modifier', 'autosave');
  } catch (e) {
    return null;
  }
}

function getDocumentsSessionFilePath() {
  const dir = getDocumentsAutosaveDir();
  return dir ? path.join(dir, 'prompt_modifier_session.json') : null;
}

function getDocumentsBackupFilePath() {
  const dir = getDocumentsAutosaveDir();
  return dir ? path.join(dir, 'prompt_modifier_session.backup.json') : null;
}

function getAllCandidateSessionPaths() {
  const candidates = [];
  const userData = app.getPath('userData');
  const appData = app.getPath('appData');
  
  // 1. Primary paths in current userData (%APPDATA%/Prompt Modifier)
  candidates.push(path.join(userData, 'prompt_modifier_session.json'));
  candidates.push(path.join(userData, 'prompt_modifier_session.backup.json'));

  // 2. Personal Documents Autosave (100% immune to application uninstallation / update wipes)
  const docsSession = getDocumentsSessionFilePath();
  const docsBackup = getDocumentsBackupFilePath();
  if (docsSession) candidates.push(docsSession);
  if (docsBackup) candidates.push(docsBackup);

  // 3. Check legacy or alternate folder names in AppData (e.g. prompt-modifier vs Prompt Modifier)
  const appNames = ['Prompt Modifier', 'prompt-modifier'];
  for (const name of appNames) {
    const dir = path.join(appData, name);
    candidates.push(path.join(dir, 'prompt_modifier_session.json'));
    candidates.push(path.join(dir, 'prompt_modifier_session.backup.json'));
    candidates.push(path.join(dir, 'Partitions', 'main', 'prompt_modifier_session.json'));
    candidates.push(path.join(dir, 'Partitions', 'main', 'prompt_modifier_session.backup.json'));
  }

  // Deduplicate paths
  return Array.from(new Set(candidates));
}

// Safely write JSON atomically
async function atomicWriteFile(targetPath, dataStr) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tempPath = `${targetPath}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tempPath, dataStr, 'utf-8');
  await fs.promises.rename(tempPath, targetPath);
}

// Check if a session has substantial user content (more than 1 tab, or nodes, or renamed tabs)
function isSubstantialSession(sessionObj) {
  if (!sessionObj || !Array.isArray(sessionObj.tabs) || sessionObj.tabs.length === 0) return false;
  if (sessionObj.tabs.length > 1) return true;
  const firstTab = sessionObj.tabs[0];
  if (!firstTab) return false;
  if (firstTab.name && firstTab.name !== 'Canvas 1') return true;
  if (firstTab.state) {
    const nodes = firstTab.state.nodes;
    if (Array.isArray(nodes) && nodes.length > 0) return true;
    const connections = firstTab.state.connections;
    if (Array.isArray(connections) && connections.length > 0) return true;
    const groups = firstTab.state.groups;
    if (Array.isArray(groups) && groups.length > 0) return true;
  }
  return false;
}

ipcMain.handle('session:save', async (event, sessionData) => {
  try {
    const parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    if (!parsed || !Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
      return { success: false, error: 'Invalid session structure' };
    }

    // Ensure timestamp
    if (!parsed.savedAt) {
      parsed.savedAt = Date.now();
    }
    const jsonStr = JSON.stringify(parsed, null, 2);

    const primaryFile = getPrimarySessionFilePath();
    const primaryBackup = getPrimaryBackupFilePath();

    // Check if existing file has substantial user work
    let existingSession = null;
    if (fs.existsSync(primaryFile)) {
      try {
        const existingData = await fs.promises.readFile(primaryFile, 'utf-8');
        existingSession = JSON.parse(existingData);
      } catch (e) {}
    }

    // Rotate existing session to backup if it had substantial content or if current incoming is valid
    if (existingSession && isSubstantialSession(existingSession)) {
      try {
        await atomicWriteFile(primaryBackup, JSON.stringify(existingSession, null, 2));
      } catch (e) {
        console.warn('Could not rotate primary session to backup:', e);
      }
    }

    // Write to Primary (AppData)
    await atomicWriteFile(primaryFile, jsonStr);

    // Write to User Documents (Autosave location that survives any uninstallation)
    const docsFile = getDocumentsSessionFilePath();
    const docsBackup = getDocumentsBackupFilePath();
    if (docsFile) {
      if (fs.existsSync(docsFile)) {
        try {
          const existingDocsData = await fs.promises.readFile(docsFile, 'utf-8');
          const existingDocsSession = JSON.parse(existingDocsData);
          if (docsBackup && isSubstantialSession(existingDocsSession)) {
            await atomicWriteFile(docsBackup, JSON.stringify(existingDocsSession, null, 2));
          }
        } catch (e) {}
      }
      await atomicWriteFile(docsFile, jsonStr);
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to save session to disk in Electron:', err);
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('session:load', async () => {
  try {
    const candidatePaths = getAllCandidateSessionPaths();
    let bestSession = null;
    let bestSavedAt = -1;
    let bestPath = null;

    for (const filePath of candidatePaths) {
      try {
        if (!fs.existsSync(filePath)) continue;
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          const stats = await fs.promises.stat(filePath);
          const timestamp = Number(parsed.savedAt) || stats.mtimeMs || 0;
          
          // Prefer sessions that have substantial user data
          const isSubstantial = isSubstantialSession(parsed);
          const currentBestIsSubstantial = bestSession ? isSubstantialSession(bestSession) : false;

          if (!bestSession) {
            bestSession = parsed;
            bestSavedAt = timestamp;
            bestPath = filePath;
          } else if (isSubstantial && !currentBestIsSubstantial) {
            // Favor real user project over a blank default canvas even if timestamp was newer
            bestSession = parsed;
            bestSavedAt = timestamp;
            bestPath = filePath;
          } else if (isSubstantial === currentBestIsSubstantial && timestamp > bestSavedAt) {
            bestSession = parsed;
            bestSavedAt = timestamp;
            bestPath = filePath;
          }
        }
      } catch (err) {
        // Continue checking other candidates
      }
    }

    if (bestSession) {
      console.log(`[Session] Restored session with ${bestSession.tabs.length} tabs from: ${bestPath}`);
      
      // Auto-migrate: Ensure the best session is synchronized to current primary and documents paths
      const primaryFile = getPrimarySessionFilePath();
      const docsFile = getDocumentsSessionFilePath();
      const dataToSync = JSON.stringify(bestSession, null, 2);

      if (bestPath !== primaryFile) {
        try {
          await atomicWriteFile(primaryFile, dataToSync);
        } catch (e) {
          console.warn('Failed to auto-migrate session to primary path:', e);
        }
      }
      if (docsFile && bestPath !== docsFile) {
        try {
          await atomicWriteFile(docsFile, dataToSync);
        } catch (e) {
          console.warn('Failed to auto-migrate session to documents path:', e);
        }
      }

      return bestSession;
    }

    return null;
  } catch (err) {
    console.error('Failed to load session from disk in Electron:', err);
    return null;
  }
});

// Open autosave folder in file explorer
ipcMain.handle('session:open-folder', async () => {
  try {
    const docsDir = getDocumentsAutosaveDir();
    if (docsDir) {
      if (!fs.existsSync(docsDir)) {
        await fs.promises.mkdir(docsDir, { recursive: true });
      }
      await shell.openPath(docsDir);
      return { success: true, path: docsDir };
    }
    const userDir = app.getPath('userData');
    await shell.openPath(userDir);
    return { success: true, path: userDir };
  } catch (e) {
    console.error('Failed to open autosave folder:', e);
    return { success: false, error: e?.message || String(e) };
  }
});

// List all session backups found across AppData and Documents
ipcMain.handle('session:list-backups', async () => {
  try {
    const candidatePaths = getAllCandidateSessionPaths();
    const results = [];
    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const stats = await fs.promises.stat(filePath);
          const raw = await fs.promises.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.tabs)) {
            results.push({
              path: filePath,
              filename: path.basename(filePath),
              directory: path.dirname(filePath),
              size: stats.size,
              savedAt: Number(parsed.savedAt) || stats.mtimeMs,
              tabCount: parsed.tabs.length,
              tabNames: parsed.tabs.map(t => t.name || 'Untitled')
            });
          }
        } catch (e) {}
      }
    }
    results.sort((a, b) => b.savedAt - a.savedAt);
    return results;
  } catch (e) {
    console.error('Failed to list session backups:', e);
    return [];
  }
});

// Restore a specific session file
ipcMain.handle('session:restore-backup', async (event, targetPath) => {
  try {
    if (!targetPath || !fs.existsSync(targetPath)) {
      return { success: false, error: 'Backup file does not exist' };
    }
    const raw = await fs.promises.readFile(targetPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tabs) || parsed.tabs.length === 0) {
      return { success: false, error: 'Invalid backup format' };
    }
    // Synchronize to primary
    const primaryFile = getPrimarySessionFilePath();
    await atomicWriteFile(primaryFile, raw);
    return { success: true, session: parsed };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
});

// Window Controls for custom titlebar and canvas drag
ipcMain.on('window:move-by', (event, { deltaX, deltaY }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isMaximized()) {
    const [x, y] = win.getPosition();
    win.setPosition(Math.round(x + deltaX), Math.round(y + deltaY));
  }
});

ipcMain.on('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window:bring-to-front', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) bringWindowToFront(win);
});

ipcMain.on('window:focus', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) bringWindowToFront(win);
});

ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('window:isMaximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isMaximized() : false;
});

// Always on Top (PIN) handlers
ipcMain.handle('window:is-always-on-top', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isAlwaysOnTop() : false;
});

ipcMain.handle('window:toggle-always-on-top', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const nextState = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(nextState, 'floating');
    updateTrayContextMenu();
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed()) {
        w.webContents.send('window:always-on-top-changed', nextState);
      }
    });
    return nextState;
  }
  return false;
});

ipcMain.on('window:set-always-on-top', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const nextState = Boolean(flag);
    win.setAlwaysOnTop(nextState, 'floating');
    updateTrayContextMenu();
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed()) {
        w.webContents.send('window:always-on-top-changed', nextState);
      }
    });
  }
});

// Detached Node Mini-App Window Handlers
ipcMain.handle('window:open-node-mini-app', async (event, { nodeId, title, width, height, alwaysOnTop = false }) => {
  if (!nodeId) return false;

  // If already open, focus it
  if (miniAppWindows.has(nodeId)) {
    const existing = miniAppWindows.get(nodeId);
    if (!existing.isDestroyed()) {
      existing.show();
      existing.focus();
      return true;
    }
    miniAppWindows.delete(nodeId);
  }

  const isDev = !app.isPackaged;
  const iconPath = isDev 
    ? path.join(__dirname, '../public/favicon.svg') 
    : path.join(__dirname, '../dist/favicon.svg');

  const miniWin = new BrowserWindow({
    width: Math.max(500, Math.min(width || 600, 1400)),
    height: Math.max(450, Math.min(height || 700, 1100)),
    minWidth: 380,
    minHeight: 340,
    title: title ? `${title} - Prompt Modifier Mini` : 'Node Mini App',
    icon: iconPath,
    frame: false, // Frameless window for custom stylish titlebar
    titleBarStyle: 'hidden',
    alwaysOnTop: Boolean(alwaysOnTop),
    backgroundColor: '#0c111e',
    paintWhenInitiallyHidden: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  miniWin.webContents.setUserAgent(FAKE_USER_AGENT);
  miniWin.setMenuBarVisibility(false);

  miniAppWindows.set(nodeId, miniWin);

  miniWin.on('maximize', () => {
    miniWin.webContents.send('window:maximized-change', true);
  });
  miniWin.on('unmaximize', () => {
    miniWin.webContents.send('window:maximized-change', false);
  });

  miniWin.on('closed', () => {
    miniAppWindows.delete(nodeId);
    // Broadcast to other windows that this node mini app was closed
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed()) {
        w.webContents.send('node:mini-app-closed', { nodeId });
      }
    });
  });

  const queryStr = `detachedNodeId=${encodeURIComponent(nodeId)}&miniApp=true`;
  if (isDev) {
    miniWin.loadURL(`http://localhost:${DEV_PORT}/?${queryStr}`);
  } else {
    miniWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { detachedNodeId: nodeId, miniApp: 'true' }
    });
  }

  return true;
});

ipcMain.handle('window:close-node-mini-app', (event, { nodeId }) => {
  if (nodeId && miniAppWindows.has(nodeId)) {
    const miniWin = miniAppWindows.get(nodeId);
    if (!miniWin.isDestroyed()) {
      miniWin.close();
    }
    miniAppWindows.delete(nodeId);
  }
  return true;
});

// Relay synchronization events between main window and mini-app windows
ipcMain.on('node:sync-action', (event, payload) => {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed() && w.webContents !== event.sender) {
      w.webContents.send('node:sync-action', payload);
    }
  });
});

// Handle Force Close from Renderer (User confirmed exit in UI)
ipcMain.on('app:force-close', () => {
  isQuitting = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    saveWindowStateSync(mainWindow);
  }
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) {
    wins[0].close();
  } else {
    app.quit();
  }
});

// Tray IPC Handlers
ipcMain.on('tray:minimize-to-tray', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win) {
    win.hide();
    updateTrayContextMenu();
  }
});

ipcMain.on('tray:show-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win) {
    bringWindowToFront(win);
    updateTrayContextMenu();
  }
});

ipcMain.handle('tray:get-settings', () => {
  return { ...traySettings };
});

ipcMain.handle('tray:set-settings', (event, newSettings) => {
  if (newSettings && typeof newSettings === 'object') {
    if (typeof newSettings.minimizeToTrayOnClose === 'boolean') {
      traySettings.minimizeToTrayOnClose = newSettings.minimizeToTrayOnClose;
    }
    if (typeof newSettings.minimizeToTrayOnMinimize === 'boolean') {
      traySettings.minimizeToTrayOnMinimize = newSettings.minimizeToTrayOnMinimize;
    }
    saveTraySettingsSync();
    updateTrayContextMenu();

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

app.whenReady().then(() => {
  loadSavedTraySettings();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      bringWindowToFront(mainWindow);
    }
    updateTrayContextMenu();
  });
});

app.on('window-all-closed', () => {
  if (traySettings.minimizeToTrayOnClose && !isQuitting) {
    return;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});