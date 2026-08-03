// electron/main.js
console.log("Starting Electron App...");

const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session, clipboard, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point, Key } = require('@nut-tree-fork/nut-js');

// 🌟 1. SINGLE INSTANCE LOCK (Prevents duplicate app launches)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("Another instance is already running. Quitting duplicate process...");
  app.quit();
} else {
  app.on('second-instance', () => {
    // When a 2nd instance is launched, restore and focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 🌟 2. PERFORMANCE & RESOURCE OPTIMIZATION FLAGS (Reduces RAM/CPU)
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('disable-features', 'WebRtcWgcCapturer'); 
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256'); // Restricts JS heap usage
app.commandLine.appendSwitch('disable-site-isolation-trials'); // Reduces RAM footprint

// ⚡ Ultra-fast instant mouse movement setup
mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 100000;

// 🌟 AUTO-START ON BOOT
app.setLoginItemSettings({
  openAtLogin: true,
  args: ['--hidden']
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

let mainWindow = null;
let tray = null; 
let isQuitting = false; 
let primaryScreenBounds = { width: 1920, height: 1080 }; 

const isAutoStartup = process.argv.includes('--hidden');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, 
    title: "Virtual Staffing Portal",
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      partition: 'persist:vsit-session', // 🌟 ADDED: Ensures session persistence across restarts
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Prevents WebRTC/WebSocket timeouts
      spellcheck: false // Saves CPU and RAM
    }
  });

  mainWindow.setMenuBarVisibility(false);
  
  const isDev = !app.isPackaged;
  const startUrl = isDev ? 'http://localhost:3000' : 'https://vsit-teal.vercel.app';
  mainWindow.loadURL(startUrl); 

  mainWindow.once('ready-to-show', () => {
    if (!isAutoStartup) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault(); 
      mainWindow.hide();      
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

// 🌟 3. SINGLE TRAY CREATION GUARD (Fixes Double Tray Icon)
function createSystemTray() {
  if (tray) {
    tray.destroy(); // Safely clean up any leftover tray icon
    tray = null;
  }

  const iconPath = path.join(__dirname, '../build/icon.ico');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Portal', 
      click: () => { 
        if (mainWindow) {
          mainWindow.show(); 
          mainWindow.focus(); 
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit App', 
      click: () => { 
        isQuitting = true; 
        app.quit(); 
      } 
    }
  ]);
  
  tray.setToolTip('Virtual Staffing Portal is running in background');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createSystemTray(); // Create tray exactly once when app is ready

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

// ⚡ SMART MOUSE QUEUE (Prevents CPU Spikes)
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

app.on('window-all-closed', () => {});