// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point, Key } = require('@nut-tree-fork/nut-js');

// -------------------------------------------------------------
// 1. HARDWARE & SANDBOX SETTINGS (Crucial for Admin Mode)
// -------------------------------------------------------------
// MUST bypass sandbox in Admin mode, otherwise Chromium blocks screen capture
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

// Allow media capturing capabilities
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');

// Configure Nut.js input speeds for zero-latency control
mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 5000;

// -------------------------------------------------------------
// 2. KEYBOARD MAPPING (Browser Strings -> OS Keys)
// -------------------------------------------------------------
const KEY_MAP = {
  'Backspace': Key.Backspace,
  'Tab': Key.Tab,
  'Enter': Key.Enter,
  'Shift': Key.LeftShift,
  'Control': Key.LeftControl,
  'Alt': Key.LeftAlt,
  'Pause': Key.Pause,
  'CapsLock': Key.CapsLock,
  'Escape': Key.Escape,
  'Space': Key.Space,
  ' ': Key.Space,
  'PageUp': Key.PageUp,
  'PageDown': Key.PageDown,
  'End': Key.End,
  'Home': Key.Home,
  'ArrowLeft': Key.Left,
  'ArrowUp': Key.Up,
  'ArrowRight': Key.Right,
  'ArrowDown': Key.Down,
  'Insert': Key.Insert,
  'Delete': Key.Delete,
  'Meta': Key.LeftCmd,
  'ContextMenu': Key.Menu,
};

// Add alphanumeric mappings
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

// -------------------------------------------------------------
// 3. WINDOW & MEDIA SETUP
// -------------------------------------------------------------
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Virtual Staffing Portal",
    icon: path.join(__dirname, '../build/icon.ico'), // Ensure this path is correct for your project
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('https://vsit-teal.vercel.app');

  // Display media capture request handler (Hooks into navigator.mediaDevices.getDisplayMedia)
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then((sources) => {
        if (sources && sources.length > 0) {
          callback({ video: sources[0] });
        } else {
          callback();
        }
      })
      .catch((err) => {
        console.error("Desktop capturer error:", err);
        callback();
      });
  });

  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
}

app.whenReady().then(createWindow);

// -------------------------------------------------------------
// 4. OS REMOTE CONTROL HANDLERS
// -------------------------------------------------------------

ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  try {
    const { width, height } = screen.getPrimaryDisplay().size;
    await mouse.setPosition(new Point(Math.round((xPercent / 100) * width), Math.round((yPercent / 100) * height)));
    await mouse.click(Button.LEFT);
  } catch (e) {
    console.error("remote-click error:", e);
  }
});

ipcMain.on('remote-type', async (event, { text }) => {
  try {
    if (text) await keyboard.type(text);
  } catch (e) {
    console.error("remote-type error:", e);
  }
});

ipcMain.on('remote-mouse-move', async (event, { xPercent, yPercent }) => {
  try {
    const { width, height } = screen.getPrimaryDisplay().size;
    await mouse.setPosition(new Point(Math.round((xPercent / 100) * width), Math.round((yPercent / 100) * height)));
  } catch (e) {
    console.error("remote-mouse-move error:", e);
  }
});

ipcMain.on('remote-mouse-down', async (event, { button }) => {
  try {
    // 0 = Left, 1 = Middle, 2 = Right
    await mouse.pressButton(button === 2 ? Button.RIGHT : Button.LEFT);
  } catch (e) {
    console.error("remote-mouse-down error:", e);
  }
});

ipcMain.on('remote-mouse-up', async (event, { button }) => {
  try {
    await mouse.releaseButton(button === 2 ? Button.RIGHT : Button.LEFT);
  } catch (e) {
    console.error("remote-mouse-up error:", e);
  }
});

ipcMain.on('remote-scroll', async (event, { deltaY }) => {
  try {
    if (deltaY > 0) {
      await mouse.scrollDown(2);
    } else {
      await mouse.scrollUp(2);
    }
  } catch (e) {
    console.error("remote-scroll error:", e);
  }
});

ipcMain.on('remote-key-down', async (event, { key }) => {
  try {
    const nutKey = resolveNutKey(key);
    if (nutKey !== null) {
      await keyboard.pressKey(nutKey);
    } else if (key && key.length === 1) {
      // Fallback for typed characters if not mapped in KEY_MAP
      await keyboard.type(key);
    }
  } catch (e) {
    console.error("remote-key-down error:", e);
  }
});

ipcMain.on('remote-key-up', async (event, { key }) => {
  try {
    const nutKey = resolveNutKey(key);
    if (nutKey !== null) {
      await keyboard.releaseKey(nutKey);
    }
  } catch (e) {
    console.error("remote-key-up error:", e);
  }
});

// -------------------------------------------------------------
// 5. CLIPBOARD & SYSTEM COMMANDS
// -------------------------------------------------------------

ipcMain.on('sync-clipboard-write', (event, { text }) => {
  if (text) clipboard.writeText(text);
});

ipcMain.handle('sync-clipboard-read', () => {
  return clipboard.readText();
});

ipcMain.on('system-command', async (event, { command }) => {
  try {
    const allowedCommands = {
      'lock_windows': 'rundll32.exe user32.dll,LockWorkStation',
      'open_explorer': 'explorer.exe'
    };
    
    if (command === 'refresh_app') {
      if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
    } else if (command === 'clear_cache') {
      if (mainWindow) {
        await mainWindow.webContents.session.clearCache();
        await mainWindow.webContents.session.clearStorageData();
        mainWindow.webContents.reload();
      }
    } else if (allowedCommands[command]) {
      exec(allowedCommands[command]);
    }
  } catch (err) {
    console.error("system-command error:", err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});