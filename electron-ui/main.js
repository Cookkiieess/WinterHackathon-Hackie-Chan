const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
let listenerStarted = false;

const { listen, acceptOffer, declineOffer } = require("./net/udpListener");
const { loadStudent, saveStudent } = require("./data/storage");

let win;
let allowClose = false;
let student = null;
let currentOffer = null; // 🆕 Store current offer

function createWindow() {
  win = new BrowserWindow({
    fullscreen: false,
    kiosk: false,
    frame: true,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");

  win.on("close", (e) => {
    if (!allowClose) e.preventDefault();
  });

  student = loadStudent();
  console.log("Loaded student:", student);

  if (!student) {
    win.webContents.once("did-finish-load", () => {
      console.log("Sending SHOW_SIGNUP");
      win.webContents.send("SHOW_SIGNUP");
    });
  } else {
    win.webContents.once("did-finish-load", () => {
      startListening();
    });
  }
}

function enterLockMode() {
  if (!win) return;
  console.log("🔒 Entering lock mode");
  win.setKiosk(true);
  win.setFullScreen(true);
  win.setAlwaysOnTop(true, "screen-saver");
  win.setMenuBarVisibility(false);
  win.setResizable(false);
  win.focus();
}

function exitLockMode() {
  if (!win) return;
  console.log("🔓 Exiting lock mode");
  win.setKiosk(false);
  win.setAlwaysOnTop(false);
  win.setFullScreen(false);
  win.setResizable(true);
}

function startListening() {
  if (listenerStarted) return;
  listenerStarted = true;

  console.log("Starting UDP listener");

  listen(
    // 🆕 Callback 1: When offer is received
    (offer) => {
      console.log("📩 Session offer received:", offer);
      currentOffer = offer;
      win.webContents.send("SESSION_OFFER", offer);
    },
    
    // Callback 2: When session actually starts
    (sessionData) => {
      console.log("✅ Session started:", sessionData);
      win.webContents.send("SESSION_STARTED", sessionData);
      enterLockMode();
    },
    
    // Callback 3: When session ends
    (kicked) => {
      console.log("❌ Session ended. Kicked:", kicked);
      exitLockMode();
      currentOffer = null;
      win.webContents.send("SESSION_ENDED", { kicked });
    }
  );
}

// 🆕 Handle accept from renderer
ipcMain.on("ACCEPT_SESSION", (event, offer) => {
  console.log("Student accepted session");
  acceptOffer(offer || currentOffer);
  // Don't enter lock mode yet - wait for SESSION_START from teacher
});

// 🆕 Handle decline from renderer
ipcMain.on("DECLINE_SESSION", () => {
  console.log("Student declined session");
  declineOffer();
  currentOffer = null;
});

// Workspace controls
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

ipcMain.on("STUDENT_REGISTERED", (_, data) => {
  console.log("Student registered:", data);
  saveStudent(data);
  student = data;
  startListening();
});

ipcMain.handle("GET_STUDENT", () => {
  return student;
});

app.whenReady().then(createWindow);