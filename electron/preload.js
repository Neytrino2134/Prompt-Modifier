const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  setDownloadPath: (path) => ipcRenderer.send('app:setDownloadPath', path),
  // Listen for close request from Main
  onCloseRequested: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on('app:close-request', subscription);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('app:close-request', subscription);
  },
  // Send force close signal to Main
  forceClose: () => ipcRenderer.send('app:force-close')
});