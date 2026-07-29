// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point } = require('@nut-tree-fork/nut-js');

// 🌟 MAGIC SWITCHES TO FORCE WEBRTC & SCREEN CAPTURE IN WINDOWS
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('disable-site-isolation-trials');

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
      autoplayPolicy: 'no-user-gesture-required',
      // Ensure WebRTC security restrictions don't block local streams
      webSecurity: true 
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('https://vsit-teal.vercel.app');

  // 🌟 AGGRESSIVE PERMISSION AUTO-APPROVAL (Updated for all Media/Screen Types)
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const allowedPermissions = [
      'media',
      'display-capture',
      'mediaKeySystem',
      'videoCapture',
      'audioCapture'
    ];
    if (allowedPermissions.includes(permission)) {
      return true;
    }
    return true;
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      'media',
      'display-capture',
      'mediaKeySystem',
      'videoCapture',
      'audioCapture'
    ];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(true);
    }
  });

  // 🌟 LAYER 1: OFFICIAL DISPLAY HANDLER (React uses getDisplayMedia)
  mainWindow.webContents.session.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ 
        types: ['screen', 'window'], 
        fetchWindowIcons: false 
      });
      
      const primaryScreen = sources.find(s => s.id.startsWith('screen'));
      
      if (primaryScreen) {
        // Return ONLY video target without audio constraints to prevent crashes
        callback({ video: primaryScreen });
      } else if (sources && sources.length > 0) {
        callback({ video: sources[0] });
      } else {
        console.error("No screen sources detected by Electron.");
        callback();
      }
    } catch (err) {
      console.error("Screen capture failed in DisplayMediaRequestHandler:", err);
      callback();
    }
  });
}

app.whenReady().then(createWindow);

// 🌟 LAYER 2: HARDWARE ID BYPASS HOOK (React uses getUserMedia fallback)
ipcMain.handle('get-desktop-source-id', async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      fetchWindowIcons: false 
    });
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});