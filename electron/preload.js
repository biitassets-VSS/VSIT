// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 🎯 Desktop Source ID for Admin Video Bypass
  getDesktopSourceId: () => ipcRenderer.invoke('get-desktop-source-id'),

  // 🖱️ Mouse Control
  sendMouseMove: (xPercent, yPercent) => ipcRenderer.send('remote-mouse-move', { xPercent, yPercent }),
  sendMouseDown: (button) => ipcRenderer.send('remote-mouse-down', { button }),
  sendMouseUp: (button) => ipcRenderer.send('remote-mouse-up', { button }),
  sendScroll: (deltaY) => ipcRenderer.send('remote-scroll', { deltaY }),

  // ⌨️ Keyboard Control
  sendKeyDown: (key) => ipcRenderer.send('remote-key-down', { key }),
  sendKeyUp: (key) => ipcRenderer.send('remote-key-up', { key }),

  // 🛠️ System & Clipboard
  sendSystemCommand: (command) => ipcRenderer.send('system-command', { command }),
  readClipboard: () => ipcRenderer.invoke('sync-clipboard-read'),
  writeClipboard: (text) => ipcRenderer.send('sync-clipboard-write', { text })
});