// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const { exec } = require('child_process'); // Required to execute Windows OS commands

// 🌟 Using the FREE community fork of nut.js
const { mouse, keyboard, Button, Point } = require('@nut-tree-fork/nut-js');

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

  // Load your live portal URL (or localhost for testing)
  mainWindow.loadURL('https://your-virtual-portal.com/staff');

  // 🌟 MAGIC TRICK: Auto-Accept Screen Share!
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' }); // Silently grabs Screen 1
    });
  });
}

app.whenReady().then(createWindow);

// -------------------------------------------------------------
// 🎮 ACTUAL WINDOWS OS CONTROL LISTENERS
// -------------------------------------------------------------

// 1. Physically move the mouse and click
ipcMain.on('remote-click', async (event, { xPercent, yPercent }) => {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  
  // Convert Admin's screen percentages to actual Windows pixels
  const targetX = Math.round((xPercent / 100) * width);
  const targetY = Math.round((yPercent / 100) * height);
  
  await mouse.setPosition(new Point(targetX, targetY));
  await mouse.click(Button.LEFT);
});

// 2. Physically type on the keyboard
ipcMain.on('remote-type', async (event, { text }) => {
  await keyboard.type(text);
});

// 3. Execute Native Windows OS Commands (Lock, Cache, Explorer)
ipcMain.on('system-command', async (event, { command }) => {
  try {
    if (command === 'refresh_app') {
      if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
    } 
    else if (command === 'clear_cache') {
      if (mainWindow) {
        await mainWindow.webContents.session.clearCache();
        await mainWindow.webContents.session.clearStorageData();
        mainWindow.webContents.reload();
      }
    } 
    else if (command === 'lock_windows') {
      // Natively locks the Windows Workstation
      exec('rundll32.exe user32.dll,LockWorkStation');
    } 
    else if (command === 'open_explorer') {
      // Natively opens the Windows File Explorer
      exec('explorer.exe');
    }
  } catch (err) {
    console.error("Failed to execute OS command:", err);
  }
});