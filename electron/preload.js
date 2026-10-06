const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectDownloadFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  getDownloadPath: () => ipcRenderer.invoke('app:getDownloadPath'),
  showItemInFolder: (path) => ipcRenderer.invoke('shell:showItemInFolder', path),
  setDownloadPath: (path) => ipcRenderer.send('app:setDownloadPath', path),
  // Session Persistence on Disk for Electron
  saveSession: (sessionData) => ipcRenderer.invoke('session:save', sessionData),
  loadSession: () => ipcRenderer.invoke('session:load'),
  getSessionInfo: () => ipcRenderer.invoke('session:get-info'),
  openAutosaveFolder: () => ipcRenderer.invoke('session:open-folder'),
  listSessionBackups: () => ipcRenderer.invoke('session:list-backups'),
  restoreSessionBackup: (backupPath) => ipcRenderer.invoke('session:restore-backup', backupPath),
  readSessionBackup: (backupPath) => ipcRenderer.invoke('session:read-backup', backupPath),
  readBatchArchive: (key) => ipcRenderer.invoke('batch-cache:read', key),
  writeBatchArchive: (key, payload, hashes, relatedKeys) => ipcRenderer.invoke('batch-cache:write', key, payload, hashes, relatedKeys),
  clearUnusedBatchArchives: (references) => ipcRenderer.invoke('batch-cache:prune', references),
  openBatchCacheFolder: () => ipcRenderer.invoke('batch-cache:open-folder'),
  clearSessionBackups: () => ipcRenderer.invoke('session:clear-backups'),
  // Listen for close request from Main
  onCloseRequested: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on('app:close-request', subscription);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('app:close-request', subscription);
  },
  // Listen for save and exit request from Main / Tray
  onSaveAndExitRequested: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on('app:save-and-exit', subscription);
    return () => ipcRenderer.removeListener('app:save-and-exit', subscription);
  },
  // Listen for download completion
  onDownloadComplete: (callback) => {
    const subscription = (event, data) => callback(data, event);
    ipcRenderer.on('app:download-complete', subscription);
    return () => ipcRenderer.removeListener('app:download-complete', subscription);
  },
  // Send force close signal to Main
  forceClose: () => ipcRenderer.send('app:force-close'),
  cancelSaveAndExit: () => ipcRenderer.send('app:save-and-exit-cancelled'),
  getSessionInfo: () => ipcRenderer.invoke('session:get-info'),

  // Window control methods for custom titlebar and dragging
  moveBy: (deltaX, deltaY) => ipcRenderer.send('window:move-by', { deltaX, deltaY }),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  bringToFront: () => ipcRenderer.send('window:bring-to-front'),
  focus: () => ipcRenderer.send('window:focus'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback) => {
    const subscription = (event, isMax) => callback(isMax);
    ipcRenderer.on('window:maximized-change', subscription);
    return () => ipcRenderer.removeListener('window:maximized-change', subscription);
  },

  // PIN (Always on Top) methods
  isAlwaysOnTop: () => ipcRenderer.invoke('window:is-always-on-top'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window:set-always-on-top', flag),
  onAlwaysOnTopChange: (callback) => {
    const subscription = (event, isTop) => callback(isTop);
    ipcRenderer.on('window:always-on-top-changed', subscription);
    return () => ipcRenderer.removeListener('window:always-on-top-changed', subscription);
  },

  // Batch API Status Sync
  syncBatchStatus: (status) => ipcRenderer.send('batch:sync-status', status),

  // System Tray methods
  minimizeToTray: () => ipcRenderer.send('tray:minimize-to-tray'),
  showWindow: () => ipcRenderer.send('tray:show-window'),
  showTrayNotification: (options) => ipcRenderer.send('tray:show-notification', options),
  getTraySettings: () => ipcRenderer.invoke('tray:get-settings'),
  setTraySettings: (settings) => ipcRenderer.invoke('tray:set-settings', settings),
  onTraySettingsUpdated: (callback) => {
    const subscription = (event, settings) => callback(settings);
    ipcRenderer.on('tray:settings-updated', subscription);
    return () => ipcRenderer.removeListener('tray:settings-updated', subscription);
  },
  onTrayAction: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('app:tray-action', subscription);
    return () => ipcRenderer.removeListener('app:tray-action', subscription);
  },

  // Detached Node Mini-App methods
  openNodeMiniApp: (options) => ipcRenderer.invoke('window:open-node-mini-app', options),
  closeNodeMiniApp: (nodeId) => ipcRenderer.invoke('window:close-node-mini-app', { nodeId }),
  onMiniAppClosed: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('node:mini-app-closed', subscription);
    return () => ipcRenderer.removeListener('node:mini-app-closed', subscription);
  },
  syncNodeAction: (payload) => ipcRenderer.send('node:sync-action', payload),
  onNodeSyncAction: (callback) => {
    const subscription = (event, payload) => callback(payload);
    ipcRenderer.on('node:sync-action', subscription);
    return () => ipcRenderer.removeListener('node:sync-action', subscription);
  }
});
