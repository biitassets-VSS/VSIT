// electron/main.js
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const { mouse, keyboard, Button, Point } = require('@nut-tree/nut-js');

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
  // This prevents the browser from asking the staff "Which screen do you want to share?"
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