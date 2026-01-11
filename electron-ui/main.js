const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let win;
let allowClose = false;

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");

  win.on("close", (e) => {
    if (!allowClose) e.preventDefault();
  });
}

ipcMain.on("LOWER_WORKSPACE", () => {
  if (!win) return;
  win.setAlwaysOnTop(false, "normal");
});

ipcMain.on("RAISE_WORKSPACE", () => {
  if (!win) return;
  win.setAlwaysOnTop(true, "screen-saver");
  win.focus();
});

ipcMain.on("EMERGENCY_EXIT", () => {
  allowClose = true;
  app.exit(0);
});

app.whenReady().then(createWindow);
