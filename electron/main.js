// electron/main.js
console.log("Starting Electron App...");

const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session, clipboard, Tray, Menu } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point, Key } = require('@nut-tree-fork/nut-js');

// 🌟 REQUIRED FLAGS
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('disable-features', 'WebRtcWgcCapturer'); 

// ⚡ Ultra-fast instant mouse movement
mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 100000;

// 🌟 AUTO-START ON BOOT
app.setLoginItemSettings({
  openAtLogin: true,
  args: ['--hidden'] // Tells the app to start minimized when booting up
});

const KEY_MAP = {
  'Backspace': Key.Backspace, 'Tab': Key.Tab, 'Enter': Key.Enter,
  'Shift': Key.LeftShift, 'Control': Key.LeftControl, 'Alt': Key.LeftAlt,
  'Pause': Key.Pause, 'CapsLock': Key.CapsLock, 'Escape': Key.Escape,
  'Space': Key.Space, ' ': Key.Space, 'PageUp': Key.PageUp,
  'PageDown': Key.PageDown, 'End': Key.End, 'Home': Key.Home,
  'ArrowLeft': Key.Left, 'ArrowUp': Key.Up, 'ArrowRight': Key.Right,
  'ArrowDown': Key.Down, 'Insert': Key.Insert, 'Delete': Key.Delete,
  'Meta': Key.LeftCmd, 'ContextMenu': Key.Menu,
};

for (let i = 0; i <= 9; i++) KEY_MAP[i.toString()] = Key[`Num${i}`] || Key[i.toString()];
for (let i = 65; i <= 90; i++) {
  const char = String.fromCharCode(i);
  KEY_MAP[char.toLowerCase()] = Key[char];
  KEY_MAP[char] = Key[char];
}

function resolveNutKey(keyStr) {
  if (!keyStr) return null;
  return KEY_MAP[keyStr] || KEY_MAP[keyStr.toLowerCase()] || null;
}

function toPixels(val, maxDimension) {
  if (val === undefined || val === null || isNaN(val)) return 0;
  const normalized = val > 1 ? val / 100 : val;
  return Math.round(Math.max(0, Math.min(1, normalized)) * maxDimension);
}

let mainWindow;
let tray = null; // System Tray reference
let isQuitting = false; // Tracks if user clicked "Quit" from the tray
let primaryScreenBounds = { width: 1920, height: 1080 }; 

// Check if app was started automatically by Windows on boot
const isAutoStartup = process.argv.includes('--hidden');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Always start hidden, we decide to show it later
    title: "Virtual Staffing Portal",
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // Keep WebSockets/Realtime active in background
    }
  });

  mainWindow.setMenuBarVisibility(false);
  
  // 🔗 Set your production web URL here
  const isDev = !app.isPackaged;
  const startUrl = isDev ? 'http://localhost:3000' : 'https://your-production-app-domain.com';
  mainWindow.loadURL(startUrl); 

  mainWindow.once('ready-to-show', () => {
    // Only show the window if it was manually opened by the user
    if (!isAutoStartup) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 🌟 MINIMIZE TO TRAY (Intercept the 'X' close button)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault(); // Prevent app from quitting
      mainWindow.hide();      // Hide to system tray instead
    }
  });

  // 🌟 CREATE SYSTEM TRAY ICON
  tray = new Tray(path.join(__dirname, '../build/icon.ico'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Portal', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Quit App', click: () => { isQuitting = true; app.quit(); } }
  ]);
  
  tray.setToolTip('Virtual Staffing Portal is running in the background');
  tray.setContextMenu(contextMenu);

  // Restore window when tray icon is clicked
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      const primaryScreen = sources.find(s => s.id.startsWith('screen')) || sources[0];
      if (primaryScreen) callback({ video: primaryScreen });
      else callback(); 
    }).catch(() => callback());
  });

  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
}

app.whenReady().then(() => {
  createWindow();
  primaryScreenBounds = screen.getPrimaryDisplay().bounds;
  screen.on('display-metrics-changed', () => {
    primaryScreenBounds = screen.getPrimaryDisplay().bounds;
  });
});

ipcMain.handle('get-desktop-source-id', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    if (sources && sources.length > 0) return sources[0].id;
    return null;
  } catch (err) {
    return null;
  }
});

// ⚡ SMART MOUSE QUEUE
let isMouseMoving = false;
let pendingMousePosition = null;

async function processMouseQueue() {
  if (!pendingMousePosition) {
    isMouseMoving = false; 
    return;
  }
  
  isMouseMoving = true;
  const { x, y } = pendingMousePosition;
  pendingMousePosition = null; 

  try { await mouse.setPosition(new Point(x, y)); } catch (err) {}
  processMouseQueue();
}

ipcMain.on('remote-mouse-move', (event, { xPercent, yPercent }) => {
  const posX = toPixels(xPercent, primaryScreenBounds.width);
  const posY = toPixels(yPercent, primaryScreenBounds.height);
  pendingMousePosition = { x: posX, y: posY };
  if (!isMouseMoving) processMouseQueue();
});

ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  const posX = toPixels(xPercent, primaryScreenBounds.width);
  const posY = toPixels(yPercent, primaryScreenBounds.height);
  try {
    await mouse.setPosition(new Point(posX, posY));
    await mouse.click(Button.LEFT);
  } catch (e) {}
});

ipcMain.on('remote-mouse-down', async (event, { button }) => {
  try { await mouse.pressButton(button === 2 ? Button.RIGHT : Button.LEFT); } catch (e) {}
});

ipcMain.on('remote-mouse-up', async (event, { button }) => {
  try { await mouse.releaseButton(button === 2 ? Button.RIGHT : Button.LEFT); } catch (e) {}
});

ipcMain.on('remote-scroll', async (event, { deltaY }) => {
  try {
    if (deltaY > 0) await mouse.scrollDown(2);
    else await mouse.scrollUp(2);
  } catch (e) {}
});

ipcMain.on('remote-type', async (event, { text }) => {
  try { if (text) await keyboard.type(text); } catch (e) {}
});

ipcMain.on('remote-key-down', async (event, { key }) => {
  try {
    const nutKey = resolveNutKey(key);
    if (nutKey !== null) await keyboard.pressKey(nutKey);
    else if (key && key.length === 1) await keyboard.type(key);
  } catch (e) {}
});

ipcMain.on('remote-key-up', async (event, { key }) => {
  try {
    const nutKey = resolveNutKey(key);
    if (nutKey !== null) await keyboard.releaseKey(nutKey);
  } catch (e) {}
});

ipcMain.on('sync-clipboard-write', (event, { text }) => { if (text) clipboard.writeText(text); });
ipcMain.handle('sync-clipboard-read', () => clipboard.readText());

ipcMain.on('system-command', async (event, { command }) => {
  try {
    const allowedCommands = { 'lock_windows': 'rundll32.exe user32.dll,LockWorkStation', 'open_explorer': 'explorer.exe' };
    if (command === 'refresh_app' && mainWindow) mainWindow.webContents.reloadIgnoringCache();
    else if (command === 'clear_cache' && mainWindow) {
      await mainWindow.webContents.session.clearCache();
      await mainWindow.webContents.session.clearStorageData();
      mainWindow.webContents.reload();
    } else if (allowedCommands[command]) exec(allowedCommands[command]);
  } catch (err) {}
});

// 🌟 Do not quit when windows are closed (Keep running in background)
app.on('window-all-closed', () => {
  // Overriding default behavior to keep app alive in tray
});