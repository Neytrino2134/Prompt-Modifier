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
  openAutosaveFolder: () => ipcRenderer.invoke('session:open-folder'),
  listSessionBackups: () => ipcRenderer.invoke('session:list-backups'),
  restoreSessionBackup: (backupPath) => ipcRenderer.invoke('session:restore-backup', backupPath),
  readSessionBackup: (backupPath) => ipcRenderer.invoke('session:restore-backup', backupPath),
  // Listen for close request from Main
  onCloseRequested: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on('app:close-request', subscription);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('app:close-request', subscription);
  },
  // Listen for download completion
  onDownloadComplete: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on('app:download-complete', subscription);
    return () => ipcRenderer.removeListener('app:download-complete', subscription);
  },
  // Send force close signal to Main
  forceClose: () => ipcRenderer.send('app:force-close'),

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