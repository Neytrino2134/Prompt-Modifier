import { app, BrowserWindow, shell, session, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  // Force window to front on Windows/Mac/Linux
  targetWin.setAlwaysOnTop(true, 'screen-saver');
  targetWin.show();
  targetWin.focus();
  targetWin.moveTop();

  // Revert temporary always-on-top state after bringing to front (unless it was already pinned)
  setTimeout(() => {
    if (!targetWin.isDestroyed()) {
      targetWin.setAlwaysOnTop(wasAlwaysOnTop, 'floating');
      targetWin.focus();
    }
  }, 150);

  targetWin.flashFrame(true);
}

function createWindow() {
  const isDev = !app.isPackaged;
  
  // Determine correct icon path based on environment
  // In dev, it's in public/. In prod, it's copied to dist/.
  // Note: For Windows, .ico is preferred over .svg for the window icon.
  const iconPath = isDev 
    ? path.join(__dirname, '../public/favicon.svg') 
    : path.join(__dirname, '../dist/favicon.svg');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Prompt Modifier',
    icon: iconPath,
    frame: false, // Frameless window for custom stylish titlebar
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // Load preload script
      // Create a clean session partition to avoid cache conflicts
      partition: 'persist:main', 
    },
  });

  // Notify renderer when maximize state changes
  win.on('maximize', () => {
    win.webContents.send('window:maximized-change', true);
  });
  win.on('unmaximize', () => {
    win.webContents.send('window:maximized-change', false);
  });

  // CRITICAL: Apply the fake User Agent to the main window immediately
  win.webContents.setUserAgent(FAKE_USER_AGENT);

  // Remove the default menu bar for a cleaner "app-like" look
  win.setMenuBarVisibility(false);
  mainWindow = win;

  // --- Close Handler for Custom Dialog ---
  win.on('close', (e) => {
    if (!isQuitting) {
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

  // Load the app
  if (isDev) {
    win.loadURL(`http://localhost:${DEV_PORT}`);
    // win.webContents.openDevTools(); // Uncomment to debug
  } else {
    // In production, load the built index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'));
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
    return nextState;
  }
  return false;
});

ipcMain.on('window:set-always-on-top', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setAlwaysOnTop(Boolean(flag), 'floating');
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:main',
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
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) {
    wins[0].close();
  } else {
    app.quit();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});