// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { mouse, keyboard, Button, Point } = require('@nut-tree-fork/nut-js');

// 🌟 FIX 1: Keep Hardware Acceleration disabled for hybrid GPUs
app.disableHardwareAcceleration();

// 🌟 FIX 2: We REMOVED 'enable-usermedia-screen-capturing' 
// (Electron docs state this flag conflicts with getDisplayMedia and causes NotReadableError)
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
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL('http://localhost:3000'); // Or your vercel URL when deployed

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

// 🌟 HARDWARE ID HOOK (TESTING WINDOW CAPTURE INSTEAD OF SCREEN)
ipcMain.handle('get-desktop-source-id', async () => {
  try {
    // We changed 'screen' to 'window' here to bypass full-desktop OS blocks
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
    
    // Find the first actual application window (not a background process)
    const validWindow = sources.find(s => s.id.startsWith('window') && s.name !== 'Virtual Staffing Portal');
    
    if (validWindow) {
      console.log("Returning Window ID instead of Screen ID:", validWindow.id);
      return validWindow.id;
    }
    
    return sources.length > 0 ? sources[0].id : null;
  } catch (e) {
    console.error("Source ID fetch failed:", e);
    return null;
  }
});
// -------------------------------------------------------------
// 🎮 OS CONTROL LISTENERS
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
  if (process.platform !== 'darwin') app.quit();
});