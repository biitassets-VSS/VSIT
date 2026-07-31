// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point, Key } = require('@nut-tree-fork/nut-js'); 

// 🌟 THE WGC BYPASS: Disable Windows Graphics Capture
// This forces Electron to use DirectX (DXGI) which allows Administrator screen recording!
app.commandLine.appendSwitch(
  'disable-features', 
  'WebRtcAllowWgcScreenCapturer,WebRtcAllowWgcWindowCapturer,WebRtcAllowWgcDesktopCapturer'
);

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('enable-media-stream');

// Zero-delay for instant mouse control
mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 5000;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Virtual Staffing Portal",
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('https://vsit-teal.vercel.app'); 

  // Native GPU-Accelerated Media Handler
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then((sources) => {
        if (sources && sources.length > 0) callback({ video: sources[0] }); 
        else callback();
      })
      .catch((err) => callback());
  });

  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
}

app.whenReady().then(createWindow);

// Fallback Handler for React Frontend
ipcMain.handle('get-desktop-source-id', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources.length > 0 ? sources[0].id : null;
  } catch (e) {
    return null;
  }
});

// -------------------------------------------------------------
// ⌨️ BROWSER TO NUT.JS KEYBOARD MAPPER
// -------------------------------------------------------------
const DOM_TO_NUTJS_KEY = {
  'Backspace': Key.Backspace, 'Tab': Key.Tab, 'Enter': Key.Enter,
  'Escape': Key.Escape, ' ': Key.Space, 'ArrowUp': Key.Up,
  'ArrowDown': Key.Down, 'ArrowLeft': Key.Left, 'ArrowRight': Key.Right,
  'Shift': Key.LeftShift, 'Control': Key.LeftControl, 'Alt': Key.LeftAlt,
  'Meta': Key.LeftSuper, 'Delete': Key.Delete
};

function mapWebKeyToNutJs(webKey) {
  if (DOM_TO_NUTJS_KEY[webKey]) return DOM_TO_NUTJS_KEY[webKey];
  if (webKey && webKey.length === 1) {
    const upper = webKey.toUpperCase();
    if (Key[upper]) return Key[upper];
  }
  return null; 
}

// -------------------------------------------------------------
// 🎮 OS CONTROL LISTENERS 
// -------------------------------------------------------------
ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  try {
    const { width, height } = screen.getPrimaryDisplay().size;
    await mouse.setPosition(new Point(Math.round((xPercent / 100) * width), Math.round((yPercent / 100) * height)));
    await mouse.click(Button.LEFT);
  } catch (e) {}
});

ipcMain.on('remote-mouse-move', async (event, { xPercent, yPercent }) => {
  try {
    const { width, height } = screen.getPrimaryDisplay().size;
    await mouse.setPosition(new Point(Math.round((xPercent / 100) * width), Math.round((yPercent / 100) * height)));
  } catch (e) {}
});

ipcMain.on('remote-mouse-down', async (event, { button }) => { 
  try { await mouse.pressButton(button === 2 ? Button.RIGHT : Button.LEFT); } catch (e) {} 
});

ipcMain.on('remote-mouse-up', async (event, { button }) => { 
  try { await mouse.releaseButton(button === 2 ? Button.RIGHT : Button.LEFT); } catch (e) {} 
});

ipcMain.on('remote-scroll', async (event, { deltaY }) => { 
  try { await mouse.scrollDown(deltaY > 0 ? -2 : 2); } catch (e) {} 
});

ipcMain.on('remote-key-down', async (event, { key }) => { 
  try { 
    const nutKey = mapWebKeyToNutJs(key);
    if (nutKey !== null) await keyboard.pressKey(nutKey); 
  } catch (e) {} 
});

ipcMain.on('remote-key-up', async (event, { key }) => { 
  try { 
    const nutKey = mapWebKeyToNutJs(key);
    if (nutKey !== null) await keyboard.releaseKey(nutKey); 
  } catch (e) {} 
});

ipcMain.on('sync-clipboard-write', (event, { text }) => { clipboard.writeText(text); });
ipcMain.handle('sync-clipboard-read', () => { return clipboard.readText(); });

ipcMain.on('system-command', async (event, { command }) => {
  try {
    const allowedCommands = { 'lock_windows': 'rundll32.exe user32.dll,LockWorkStation', 'open_explorer': 'explorer.exe' };
    if (command === 'refresh_app') { if (mainWindow) mainWindow.webContents.reloadIgnoringCache(); } 
    else if (command === 'clear_cache') { if (mainWindow) { await mainWindow.webContents.session.clearCache(); await mainWindow.webContents.session.clearStorageData(); mainWindow.webContents.reload(); } } 
    else if (allowedCommands[command]) { exec(allowedCommands[command]); }
  } catch (err) {}
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });