// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 🖱️ Mouse Control
  sendRemoteClick: (xPercent, yPercent) => ipcRenderer.send('remote-click', { xPercent, yPercent }),
  sendMouseMove: (xPercent, yPercent) => ipcRenderer.send('remote-mouse-move', { xPercent, yPercent }),
  sendMouseDown: (button) => ipcRenderer.send('remote-mouse-down', { button }),
  sendMouseUp: (button) => ipcRenderer.send('remote-mouse-up', { button }),
  sendScroll: (deltaY) => ipcRenderer.send('remote-scroll', { deltaY }),

  // ⌨️ Keyboard Control
  sendRemoteType: (text) => ipcRenderer.send('remote-type', { text }),
  sendKeyDown: (key) => ipcRenderer.send('remote-key-down', { key }),
  sendKeyUp: (key) => ipcRenderer.send('remote-key-up', { key }),

  // 📋 Clipboard Sync
  writeClipboard: (text) => ipcRenderer.send('sync-clipboard-write', { text }),
  readClipboard: () => ipcRenderer.invoke('sync-clipboard-read'),

  // 🛠️ OS Diagnostics & System Commands
  sendSystemCommand: (command) => ipcRenderer.send('system-command', { command })
});