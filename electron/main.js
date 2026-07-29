// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point } = require('@nut-tree-fork/nut-js');

// 🌟 FIX 2: CRITICAL FLAG RESTORED! 
// This is strictly required for the native 'getUserMedia' bypass to work!
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');

app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('enable-media-stream');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Virtual Staffing Portal",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('https://vsit-teal.vercel.app'); // Live Vercel URL

  // 🌟 SET DISPLAY MEDIA HANDLER ON DEFAULT SESSION
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] })
      .then((sources) => {
        if (sources.length > 0) {
          // Pass primary desktop screen
          callback({ video: sources[0] });
        } else {
          console.error("No desktop sources found.");
          callback();
        }
      })
      .catch((err) => {
        console.error("Display media request failed:", err);
        callback();
      });
  });

  // 🌟 PERMISSION APPROVALS
  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
}

app.whenReady().then(createWindow);

// 🌟 HARDWARE ID HOOK (FORCING FULL SCREEN FOR IT ADMIN)
ipcMain.handle('get-desktop-source-id', async () => {
  try {
    // We MUST use 'screen' so the IT Admin sees the whole desktop, not just a random window.
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    
    if (sources.length > 0) {
      console.log("🎯 Desktop Screen ID retrieved:", sources[0].id);
      return sources[0].id;
    }
    
    return null;
  } catch (e) {
    console.error("Source ID fetch failed:", e);
    return null;
  }
});

// -------------------------------------------------------------
// 🎮 OS CONTROL LISTENERS (ADVANCED ENTERPRISE SUITE)
// -------------------------------------------------------------

// Basic Clicks & Typing (Legacy Fallback)
ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    await mouse.setPosition(new Point(Math.round((xPercent / 100) * width), Math.round((yPercent / 100) * height)));
    await mouse.click(Button.LEFT);
  } catch (e) { console.error("Click failed:", e); }
});

ipcMain.on('remote-type', async (event, { text }) => {
  try { await keyboard.type(text); } catch (e) { console.error("Type failed:", e); }
});

// 🌟 ADVANCED MOUSE CONTROL (Zero-Latency Dragging & Scrolling)
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

// 🌟 ADVANCED KEYBOARD CONTROL (Modifier Keys & Holding)
ipcMain.on('remote-key-down', async (event, { key }) => {
  try { await keyboard.pressKey(key); } catch (e) {}
});

ipcMain.on('remote-key-up', async (event, { key }) => {
  try { await keyboard.releaseKey(key); } catch (e) {}
});

// 🌟 CLIPBOARD SYNCING
ipcMain.on('sync-clipboard-write', (event, { text }) => {
  clipboard.writeText(text);
});

ipcMain.handle('sync-clipboard-read', () => {
  return clipboard.readText();
});

// 🌟 SYSTEM DIAGNOSTICS COMMANDS
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
    console.error("Command failed:", err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});