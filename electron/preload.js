const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  setDownloadPath: (path) => ipcRenderer.send('app:setDownloadPath', path)
});