// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// This safely exposes OS commands to your React frontend
contextBridge.exposeInMainWorld('electronAPI', {
  sendRemoteClick: (xPercent, yPercent) => ipcRenderer.send('remote-click', { xPercent, yPercent }),
  sendRemoteType: (text) => ipcRenderer.send('remote-type', { text })
});