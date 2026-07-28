// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendRemoteClick: (xPercent, yPercent) => ipcRenderer.send('remote-click', { xPercent, yPercent }),
  sendRemoteType: (text) => ipcRenderer.send('remote-type', { text }),
  sendSystemCommand: (command) => ipcRenderer.send('system-command', { command }),
  
  // 🌟 REQUIRED FOR SECONDARY FALLBACK ENGINE
  getDesktopSourceId: () => ipcRenderer.invoke('get-desktop-source-id')
});