import { app, ipcMain, dialog, shell, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createBatchCache } from './batchCache.js';

let customDownloadPath = app.getPath('downloads');
let localBatchCache = null;
const reservedDownloadPaths = new Set();

export function getDownloadSubfolder(filename, mimeType = '') {
  const extension = path.extname(filename).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.svg', '.avif', '.ico', '.heic', '.heif', '.exr', '.hdr', '.tga'].includes(extension)) return 'Image';
  if (extension === '.zip') return 'ZIP';
  if (extension === '.jsonl' || extension === '.ndjson') return 'JSONL';
  if (extension === '.json') return 'JSON';
  if (extension === '.txt') return 'TXT';
  if (['.gltf', '.glb', '.fbx', '.obj', '.stl', '.ply', '.usdz', '.usd', '.usdc', '.usda', '.blend'].includes(extension)) return '3d Models';
  const mime = mimeType.split(';')[0].trim().toLowerCase();
  if (mime.startsWith('image/')) return 'Image';
  if (mime === 'application/zip' || mime === 'application/x-zip-compressed') return 'ZIP';
  if (['application/jsonl', 'application/x-jsonlines', 'application/x-ndjson'].includes(mime)) return 'JSONL';
  if (mime === 'application/json') return 'JSON';
  if (mime === 'text/plain') return 'TXT';
  if (mime.startsWith('model/')) return '3d Models';
  return '';
}

export function getCustomDownloadPath() {
  return customDownloadPath;
}

export function setCustomDownloadPath(newPath) {
  customDownloadPath = newPath;
}

export function getLocalBatchCache() {
  if (!localBatchCache) {
    localBatchCache = createBatchCache(path.join(app.getPath('documents'), 'Prompt Modifier', 'cache', 'batch-results'));
  }
  return localBatchCache;
}

export function setupFileAndDialogIPC(getMainWindow) {
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
  ipcMain.handle('shell:showItemInFolder', async (event, fullPath) => {
    try {
      if (!fullPath) {
        const fallbackDir = customDownloadPath || app.getPath('downloads');
        await shell.openPath(fallbackDir);
        return true;
      }
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          await shell.openPath(fullPath);
        } else {
          shell.showItemInFolder(fullPath);
        }
        return true;
      } else {
        const dir = path.dirname(fullPath);
        if (fs.existsSync(dir)) {
          await shell.openPath(dir);
        } else {
          await shell.openPath(customDownloadPath || app.getPath('downloads'));
        }
        return true;
      }
    } catch (err) {
      console.warn('Failed in shell:showItemInFolder:', err);
      try {
        await shell.openPath(customDownloadPath || app.getPath('downloads'));
      } catch (e) {}
      return false;
    }
  });

  // Receive download path from Renderer
  ipcMain.on('app:setDownloadPath', (event, newPath) => {
    customDownloadPath = newPath;
  });

  // Return current download path to Renderer
  ipcMain.handle('app:getDownloadPath', () => {
    return customDownloadPath || app.getPath('downloads');
  });

  // Batch cache handlers
  ipcMain.handle('batch-cache:read', (_, key) => getLocalBatchCache().get(key));
  ipcMain.handle('batch-cache:write', (_, key, payload, hashes, relatedKeys) => getLocalBatchCache().put(key, payload, hashes, relatedKeys));
  ipcMain.handle('batch-cache:prune', (_, references) => getLocalBatchCache().prune(references));
  ipcMain.handle('batch-cache:open-folder', async () => {
    const root = getLocalBatchCache().root;
    await fs.promises.mkdir(root, { recursive: true });
    const error = await shell.openPath(root);
    if (error) throw new Error(error);
    return root;
  });

  // Setup will-download interceptor on defaultSession
  session.defaultSession.on('will-download', (event, item, webContents) => {
    let reservedPath;
    let targetFolder = customDownloadPath;
    if (!targetFolder) {
      try {
        targetFolder = app.getPath('downloads');
      } catch (e) {
        targetFolder = app.getPath('userData');
      }
    }

    if (targetFolder) {
      try {
        const filename = path.basename(item.getFilename().replaceAll('\\', '/')) || 'download';
        targetFolder = path.join(targetFolder, getDownloadSubfolder(filename, item.getMimeType?.() || ''));
        fs.mkdirSync(targetFolder, { recursive: true });
        const extension = path.extname(filename);
        const stem = path.basename(filename, extension);
        let savePath = path.join(targetFolder, filename);
        let suffix = 1;
        while (fs.existsSync(savePath) || reservedDownloadPaths.has(savePath.toLowerCase())) {
          savePath = path.join(targetFolder, `${stem} (${suffix++})${extension}`);
        }
        reservedPath = savePath.toLowerCase();
        reservedDownloadPaths.add(reservedPath);
        item.setSavePath(savePath);
      } catch (err) {
        if (reservedPath) reservedDownloadPaths.delete(reservedPath);
        console.warn('Could not create target download directory:', err);
      }
    }

    item.once('done', (event, state) => {
      if (reservedPath) reservedDownloadPaths.delete(reservedPath);
      if (state === 'completed') {
        const savePath = item.getSavePath();
        if (webContents && !webContents.isDestroyed()) {
          webContents.send('app:download-complete', { state, path: savePath });
        }
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents !== webContents) {
          mainWindow.webContents.send('app:download-complete', { state, path: savePath });
        }
      }
    });
  });
}
