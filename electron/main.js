import { app, BrowserWindow, session, ipcMain } from 'electron';
import { setupAppEnvironment, FAKE_USER_AGENT } from './config.js';
import { saveWindowStateSync } from './windowState.js';
import { 
  createMainWindow, 
  getMainWindow, 
  bringWindowToFront, 
  setupWindowIPC, 
  isQuitting, 
  setIsQuitting, 
  saveAndExitPending, 
  setSaveAndExitPending 
} from './windowManager.js';
import { 
  createTray, 
  updateTrayContextMenu, 
  loadSavedTraySettings, 
  setupTrayIPC, 
  traySettings,
  getTray 
} from './trayManager.js';
import { setupSessionIPC, sessionWriteQueue } from './sessionManager.js';
import { setupFileAndDialogIPC } from './fileHandlers.js';

// 1. Initialize core environment settings (switches, paths, theme)
setupAppEnvironment();

// 2. Single instance lock - prevent duplicate instances and bring existing instance from tray
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      bringWindowToFront(mainWindow);
      mainWindow.focus();
      triggerTrayUpdate();
    }
  });
}

function getTrayContext() {
  return {
    getMainWindow,
    bringWindowToFront,
    createWindow: () => createMainWindow(triggerTrayUpdate),
    saveAndExitPending,
    setSaveAndExitPending,
    setIsQuitting
  };
}

function triggerTrayUpdate() {
  updateTrayContextMenu(getTrayContext());
}

// 3. Register IPC handlers and subsystem modules
setupWindowIPC(triggerTrayUpdate);
setupSessionIPC(getMainWindow);
setupFileAndDialogIPC(getMainWindow);
setupTrayIPC(getTrayContext());

// 4. Force spoofed User Agent across all web requests and new popup windows
app.on('browser-window-created', (e, window) => {
  window.webContents.setUserAgent(FAKE_USER_AGENT);
  window.setMenuBarVisibility(false);
});

// 5. Force-close and Save-and-exit cancellation handlers
ipcMain.on('app:force-close', async () => {
  await sessionWriteQueue.idle();
  setIsQuitting(true);
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    saveWindowStateSync(mainWindow);
  }
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) {
    (mainWindow && !mainWindow.isDestroyed() ? mainWindow : wins[0]).close();
  } else {
    app.quit();
  }
});

ipcMain.on('app:save-and-exit-cancelled', () => {
  setSaveAndExitPending(false);
  triggerTrayUpdate();
});

app.on('before-quit', () => {
  setIsQuitting(true);
});

// 6. App Lifecycle Initialization
app.whenReady().then(() => {
  // Strip Electron signatures from network requests
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = FAKE_USER_AGENT;
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  loadSavedTraySettings();
  createMainWindow(triggerTrayUpdate);
  createTray(getTrayContext());

  app.on('activate', () => {
    const mainWindow = getMainWindow();
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(triggerTrayUpdate);
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      bringWindowToFront(mainWindow);
    }
    triggerTrayUpdate();
  });
});

app.on('window-all-closed', () => {
  if ((traySettings.closeAction === 'tray' || traySettings.minimizeToTrayOnClose) && !isQuitting) {
    return;
  }
  const tray = getTray();
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
