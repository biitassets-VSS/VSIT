// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point } = require('@nut-tree-fork/nut-js');

// 🌟 MAGIC SWITCHES TO FORCE WEBRTC & SCREEN CAPTURE
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');
// 🌟 FIX 1: Enable modern WebRTC capturer features
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');

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
      // 🌟 FIX 2: Prevent stream blocking due to missing user gestures
      autoplayPolicy: 'no-user-gesture-required' 
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('https://vsit-teal.vercel.app');

  // 🌟 AGGRESSIVE PERMISSION AUTO-APPROVAL
  mainWindow.webContents.session.setPermissionCheckHandler(() => true);
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Force approve media/display requests immediately
    if (permission === 'media' || permission === 'display-capture') {
      callback(true);
    } else {
      callback(true);
    }
  });

  // 🌟 LAYER 1: OFFICIAL DISPLAY HANDLER (React uses getDisplayMedia)
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    // FIX 3: Requesting both types prevents empty array bugs on Windows 11
    desktopCapturer.getSources({ types: ['screen', 'window'], fetchWindowIcons: false }).then((sources) => {
      // Filter out only the actual Monitors/Screens
      const screens = sources.filter(s => s.id.startsWith('screen'));
      
      if (screens && screens.length > 0) {
        // 🌟 FIX 4: You MUST provide audio: 'loopback' in modern Electron, or Chromium rejects the stream!
        callback({ video: screens[0], audio: 'loopback' }); 
      } else if (sources && sources.length > 0) {
        // Fallback to primary source if no explicit 'screen' is labeled
        callback({ video: sources[0], audio: 'loopback' });
      } else {
        callback();
      }
    }).catch(err => {
      console.error("Screen capture failed:", err);
      callback();
    });
  });
}

app.whenReady().then(createWindow);

// 🌟 LAYER 2: HARDWARE ID BYPASS HOOK (React uses getUserMedia)
ipcMain.handle('get-desktop-source-id', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], fetchWindowIcons: false });
    return sources.length > 0 ? sources[0].id : null;
  } catch (e) {
    console.error("Source ID fetch failed:", e);
    return null;
  }
});

// -------------------------------------------------------------
// 🎮 ACTUAL WINDOWS OS CONTROL LISTENERS
// -------------------------------------------------------------
ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const targetX = Math.round((xPercent / 100) * width);
    const targetY = Math.round((yPercent / 100) * height);
    await mouse.setPosition(new Point(targetX, targetY));
    await mouse.click(Button.LEFT);
  } catch (e) {
    console.error("Click failed:", e);
  }
});

ipcMain.on('remote-type', async (event, { text }) => {
  try {
    await keyboard.type(text);
  } catch (e) {
    console.error("Type failed:", e);
  }
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
    console.error("Command failed:", err);
  }
});