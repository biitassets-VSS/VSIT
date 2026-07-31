// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point, Key } = require('@nut-tree-fork/nut-js');

// -------------------------------------------------------------
// 1. ADMINISTRATOR VIDEO FIX FLAGS
// -------------------------------------------------------------
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('in-process-gpu'); 
app.commandLine.appendSwitch('disable-direct-composition');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('enable-media-stream');

mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 5000;

// -------------------------------------------------------------
// 2. KEYBOARD MAPPING
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// 3. WINDOW SETUP
// -------------------------------------------------------------
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

  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
}

app.whenReady().then(createWindow);

// -------------------------------------------------------------
// 4. DESKTOP CAPTURE (Fix for "No handler registered")
// -------------------------------------------------------------
ipcMain.handle('get-desktop-source-id', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    if (sources && sources.length > 0) {
      return sources[0].id; // Returns the exact OS internal screen ID
    }
    return null;
  } catch (err) {
    console.error("Error fetching desktop sources:", err);
    return null;
  }
});

// -------------------------------------------------------------
// 5. OS REMOTE CONTROL HANDLERS
// -------------------------------------------------------------
ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  try {
    const { width, height } = screen.getPrimaryDisplay().size;
    await mouse.setPosition(new Point(Math.round((xPercent / 100) * width), Math.round((yPercent / 100) * height)));
    await mouse.click(Button.LEFT);
  } catch (e) {}
});

ipcMain.on('remote-type', async (event, { text }) => {
  try { if (text) await keyboard.type(text); } catch (e) {}
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
  try {
    if (deltaY > 0) await mouse.scrollDown(2);
    else await mouse.scrollUp(2);
  } catch (e) {}
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

// -------------------------------------------------------------
// 6. CLIPBOARD & SYSTEM COMMANDS
// -------------------------------------------------------------
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