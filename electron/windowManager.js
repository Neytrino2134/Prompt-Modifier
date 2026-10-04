import { app, BrowserWindow, shell, session, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { __dirname, isDev, DEV_PORT, FAKE_USER_AGENT, getAppIcon } from './config.js';
import { loadSavedWindowState, getValidInitialBounds, saveWindowStateSync } from './windowState.js';
import { traySettings, updateTrayContextMenu } from './trayManager.js';

let mainWindow = null;
const miniAppWindows = new Map(); // nodeId -> BrowserWindow

export let isQuitting = false;
export function setIsQuitting(val) {
  isQuitting = val;
}

export let saveAndExitPending = false;
export function setSaveAndExitPending(val) {
  saveAndExitPending = val;
}

export function getMainWindow() {
  return mainWindow;
}

export function getMiniAppWindows() {
  return miniAppWindows;
}

/**
 * Bring a window reliably to the foreground, restore if minimized, focus and flash frame.
 */
export function bringWindowToFront(targetWin) {
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

export function createMainWindow(onTrayUpdateNeeded) {
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
      preload: path.join(__dirname, 'preload.js'),
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
  win.on('show', () => onTrayUpdateNeeded?.());
  win.on('hide', () => onTrayUpdateNeeded?.());
  win.on('minimize', (e) => {
    if (traySettings.minimizeToTrayOnMinimize) {
      e.preventDefault();
      win.hide();
    }
    onTrayUpdateNeeded?.();
  });
  win.on('restore', () => onTrayUpdateNeeded?.());
  win.on('focus', () => onTrayUpdateNeeded?.());
  win.on('blur', () => onTrayUpdateNeeded?.());
  win.on('always-on-top-changed', (event, isAlwaysOnTop) => {
    onTrayUpdateNeeded?.();
    if (!win.isDestroyed()) {
      win.webContents.send('window:always-on-top-changed', isAlwaysOnTop);
    }
  });

  // --- Close Handler with Tray Support & Custom Dialog ---
  win.on('close', (e) => {
    saveWindowStateSync(win);
    if (!isQuitting) {
      if (traySettings.closeAction === 'tray' || traySettings.minimizeToTrayOnClose) {
        e.preventDefault();
        win.hide();
        onTrayUpdateNeeded?.();
        return;
      }
      if (traySettings.closeAction === 'quit') {
        isQuitting = true;
        app.quit();
        return;
      }
      e.preventDefault();
      bringWindowToFront(win);
      win.webContents.send('app:close-request');
    } else {
      miniAppWindows.forEach((miniWin) => {
        if (!miniWin.isDestroyed()) {
          miniWin.destroy();
        }
      });
      miniAppWindows.clear();
    }
  });

  // Handle external links (open in default browser)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('accounts.google.com')) {
      return { 
        action: 'allow',
        overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            userAgent: FAKE_USER_AGENT 
        }
      };
    }
    
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    return { action: 'allow' };
  });

  // Error handling for webContents
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Window failed to load: [${errorCode}] ${errorDescription} (${validatedURL})`);
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

  return win;
}

export function setupWindowIPC(onTrayUpdateNeeded) {
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
      onTrayUpdateNeeded?.();
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
      onTrayUpdateNeeded?.();
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

    if (miniAppWindows.has(nodeId)) {
      const existing = miniAppWindows.get(nodeId);
      if (!existing.isDestroyed()) {
        existing.show();
        existing.focus();
        return true;
      }
      miniAppWindows.delete(nodeId);
    }

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
      frame: false,
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
}
