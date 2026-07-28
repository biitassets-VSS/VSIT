// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point } = require('@nut-tree-fork/nut-js');

// 🌟 MAGIC SWITCHES TO FORCE WEBRTC & SCREEN CAPTURE
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Virtual Staffing Portal",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('https://vsit-teal.vercel.app');

  // 🌟 AGGRESSIVE PERMISSION AUTO-APPROVAL
  mainWindow.webContents.session.setPermissionCheckHandler(() => true);
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // 🌟 LAYER 1: OFFICIAL DISPLAY HANDLER
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'], fetchWindowIcons: false }).then((sources) => {
      if (sources && sources.length > 0) {
        callback({ video: sources[0] }); // Auto-selects the primary monitor
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

// 🌟 LAYER 2: HARDWARE ID BYPASS HOOK
ipcMain.handle('get-desktop-source-id', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'], fetchWindowIcons: false });
  return sources.length > 0 ? sources[0].id : null;
});

// -------------------------------------------------------------
// 🎮 ACTUAL WINDOWS OS CONTROL LISTENERS
// -------------------------------------------------------------
ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const targetX = Math.round((xPercent / 100) * width);
  const targetY = Math.round((yPercent / 100) * height);
  await mouse.setPosition(new Point(targetX, targetY));
  await mouse.click(Button.LEFT);
});

ipcMain.on('remote-type', async (event, { text }) => {
  await keyboard.type(text);
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