// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendMouseMove: (xPercent, yPercent) => ipcRenderer.send('remote-mouse-move', { xPercent, yPercent }),
  sendMouseDown: (button) => ipcRenderer.send('remote-mouse-down', { button }),
  sendMouseUp: (button) => ipcRenderer.send('remote-mouse-up', { button }),
  sendKeyDown: (key) => ipcRenderer.send('remote-key-down', { key }),
  sendKeyUp: (key) => ipcRenderer.send('remote-key-up', { key }),
  sendScroll: (deltaY) => ipcRenderer.send('remote-scroll', { deltaY }),
  sendSystemCommand: (command) => ipcRenderer.send('system-command', { command }),
  readClipboard: () => ipcRenderer.invoke('sync-clipboard-read'),
  writeClipboard: (text) => ipcRenderer.send('sync-clipboard-write', { text }),
  
  // Expose the desktop capture source ID fetcher for Admin video bypass
  getDesktopSourceId: () => ipcRenderer.invoke('get-desktop-source-id')
});