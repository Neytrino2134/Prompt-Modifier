import { app, nativeImage, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRAY_ICON_DATA_URL } from './tray_icon_base64.js';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if running in development mode
export const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Explicitly lock app identity and userData path across all dev and packaged builds
export const APP_TITLE = 'Prompt Modifier';

// SPOOFING: Use a standard Chrome User Agent to bypass Google's "secure browser" check.
export const FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Define the dev port - must match vite.config.ts
export const DEV_PORT = process.env.PORT || 3000;

export function setupAppEnvironment() {
  app.name = APP_TITLE;
  if (process.platform === 'win32') app.setAppUserModelId('com.promptmodifier.app');

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
}

export function getAppIcon() {
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

export function getTrayIcon() {
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
