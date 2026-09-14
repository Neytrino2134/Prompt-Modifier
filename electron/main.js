import { app, BrowserWindow, shell, session, ipcMain, dialog, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Explicitly lock app identity and userData path across all dev and packaged builds
const APP_TITLE = 'Prompt Modifier';
app.name = APP_TITLE;

try {
  const unifiedUserData = path.join(app.getPath('appData'), APP_TITLE);
  app.setPath('userData', unifiedUserData);
} catch (e) {
  console.warn('Could not set custom userData path:', e);
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

  const savedState = loadSavedWindowState();
  const initialBounds = getValidInitialBounds(savedState);

  const windowOptions = {
    width: initialBounds.width,
    height: initialBounds.height,
    minWidth: initialBounds.minWidth,
    minHeight: initialBounds.minHeight,
    title: 'Prompt Modifier',
    icon: iconPath,
    frame: false, // Frameless window for custom stylish titlebar
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

  // --- Close Handler for Custom Dialog ---
  win.on('close', (e) => {
    saveWindowStateSync(win);
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