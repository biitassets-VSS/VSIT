// electron/main.js
console.log("Starting Electron App...");

const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point, Key } = require('@nut-tree-fork/nut-js');

// 🌟 REQUIRED FLAGS: Bypasses Admin screen capture block
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('disable-features', 'WebRtcWgcCapturer'); 

// ⚡ Ultra-fast instant mouse movement (prevents cursor gliding lag)
mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 100000;

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

// Helper to convert coordinate whether sent as 0.0 - 1.0 or 0 - 100 percentage
function toPixels(val, maxDimension) {
  if (val === undefined || val === null || isNaN(val)) return 0;
  const normalized = val > 1 ? val / 100 : val;
  return Math.round(Math.max(0, Math.min(1, normalized)) * maxDimension);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, 
    title: "Virtual Staffing Portal",
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('http://localhost:3000'); 

  console.log("Window created and loading URL!");

  mainWindow.once('ready-to-show', () => {
    console.log("App is ready to show on screen!");
    mainWindow.show();
    mainWindow.focus();
  });

  // Native Media Handler
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    console.log("Frontend requested video stream. Searching for screens...");
    
    desktopCapturer.getSources({ types: ['screen', 'window'] })
      .then((sources) => {
        const primaryScreen = sources.find(s => s.id.startsWith('screen')) || sources[0];
        
        if (primaryScreen) {
          console.log(`SUCCESS: Found display source: ${primaryScreen.name} (${primaryScreen.id})`);
          callback({ video: primaryScreen });
        } else {
          console.error("CRITICAL ERROR: Windows returned zero screens or windows to capture!");
          callback(); 
        }
      })
      .catch((err) => {
        console.error("DesktopCapturer failed entirely:", err);
        callback();
      });
  });

  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
}

app.whenReady().then(createWindow);

ipcMain.handle('get-desktop-source-id', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    if (sources && sources.length > 0) return sources[0].id;
    return null;
  } catch (err) {
    console.error("Error fetching desktop sources:", err);
    return null;
  }
});

// Remote Mouse Controls
ipcMain.on('remote-mouse-move', async (event, { xPercent, yPercent }) => {
  try {
    const display = screen.getPrimaryDisplay();
    const width = display.bounds.width;
    const height = display.bounds.height;

    const posX = toPixels(xPercent, width);
    const posY = toPixels(yPercent, height);

    await mouse.setPosition(new Point(posX, posY));
  } catch (e) {}
});

ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  try {
    const display = screen.getPrimaryDisplay();
    const width = display.bounds.width;
    const height = display.bounds.height;

    const posX = toPixels(xPercent, width);
    const posY = toPixels(yPercent, height);

    await mouse.setPosition(new Point(posX, posY));
    await mouse.click(Button.LEFT);
  } catch (e) { console.error("Mouse click failed:", e); }
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

// Remote Keyboard Controls
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

// Clipboard & System Command Handlers
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

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });