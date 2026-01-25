import { app, BrowserWindow, shell, session, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SPOOFING: Use a standard Chrome User Agent to bypass Google's "secure browser" check.
// Using a fixed recent version of Chrome on Windows 10.
const FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Define the dev port - must match vite.config.ts
const DEV_PORT = process.env.PORT || 5173;

// Store user defined download path in memory (syncs from renderer)
let customDownloadPath = '';

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
    title: 'Prompt Modifier',
    icon: iconPath, 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // Load preload script
      // Create a clean session partition to avoid cache conflicts
      partition: 'persist:main', 
    },
  });

  // CRITICAL: Apply the fake User Agent to the main window immediately
  win.webContents.setUserAgent(FAKE_USER_AGENT);

  // Remove the default menu bar for a cleaner "app-like" look
  win.setMenuBarVisibility(false);

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

// Receive download path from Renderer
ipcMain.on('app:setDownloadPath', (event, path) => {
  customDownloadPath = path;
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