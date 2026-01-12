const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron"); // Added globalShortcut
const path = require("path");
const fetch = require("node-fetch"); 

let listenerStarted = false;
const { listen, acceptOffer, declineOffer } = require("./net/udpListener");
const { loadStudent, saveStudent } = require("./data/storage");

let win;
let allowClose = false;
let student = null;
let currentOffer = null;

function createWindow() {
  win = new BrowserWindow({
    fullscreen: false,
    kiosk: false,
    frame: false, // Set to false to remove the top bar (important for lockdown)
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");

  // Prevent closing unless allowClose is true
  win.on("close", (e) => {
    if (!allowClose) {
      e.preventDefault();
      console.log("Close prevented: Session active or lockdown enabled.");
    }
  });

  student = loadStudent();
  
  win.webContents.once("did-finish-load", () => {
    if (!student) {
      win.webContents.send("SHOW_SIGNUP");
    } else {
      startListening();
    }
  });

  // Fullscreen toggle listener
  ipcMain.on('toggle-fullscreen', (event, mode) => {
    if (win) {
        win.setFullScreen(mode);
        win.setMenuBarVisibility(!mode); 
    }
  });
}

// 🔒 THE LINUX PRISON MODE
function enterLockMode() {
  if (!win) return;
  console.log("🔒 Entering HIGH SECURITY lock mode");
  
  // 1. Force the window to be the absolute master of the screen
  win.setKiosk(true); 
  win.setAlwaysOnTop(true, "screen-saver");
  win.setFullScreen(true);
  win.setVisibleOnAllWorkspaces(true); // Linux specific: stay on screen during workspace switches
  
  // 2. Re-register shortcuts (it's safer to unregister first to avoid "already registered" errors)
  globalShortcut.unregisterAll(); 
  
  const shortcuts = ["Alt+Tab", "Alt+F4", "Super", "Alt+Space"];
  shortcuts.forEach(shortcut => {
    const success = globalShortcut.register(shortcut, () => {
      console.log(`Blocked system shortcut: ${shortcut}`);
    });
    if (!success) console.error(`⚠️ Failed to block ${shortcut}. OS may be override.`);
  });

  // 3. 🟢 THE CRITICAL PART: Force focus so the window "owns" the keyboard
  win.focus();
  win.setSkipTaskbar(true); // Hide from the bottom panel
}

// 🔓 THE RELEASE
function exitLockMode() {
  if (!win) return;
  console.log("🔓 Releasing lockdown");
  
  globalShortcut.unregisterAll(); // Give the keys back to the OS
  
  win.setKiosk(false);
  win.setAlwaysOnTop(false);
  win.setFullScreen(false);
  win.setResizable(true);
  
  allowClose = true; // Now the built-in exit button will work
}

// --- REST OF YOUR GO BACKEND LOGIC ---
async function startGoSession(allowedApps) {
  try {
    const response = await fetch("http://localhost:7070/setApps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedApps }),
    });
    console.log("✅ Go backend session started");
  } catch (e) {
    console.error("Error starting Go session:", e);
  }
}

async function stopGoSession() {
  try {
    await fetch("http://localhost:7070/stop", { method: "POST" });
    console.log("✅ Go backend session stopped");
  } catch (e) {
    console.error("Error stopping Go session:", e);
  }
}

function startListening() {
  if (listenerStarted) return;
  listenerStarted = true;

  listen(
    (offer) => {
      currentOffer = offer;
      win.webContents.send("SESSION_OFFER", offer);
    },
    async (sessionData) => {
      const allowedApps = sessionData.allowedApps || [];
      await startGoSession(allowedApps);
      enterLockMode(); // 🔥 LOCKDOWN TRIGGERED HERE
      win.webContents.send("SESSION_STARTED", sessionData);
    },
    async (kicked) => {
      await stopGoSession();
      exitLockMode(); // 🔥 LOCKDOWN RELEASED HERE
      currentOffer = null;
      win.webContents.send("SESSION_ENDED", { kicked });
    }
  );
}

// --- IPC LISTENERS ---
// --- IPC LISTENERS ---
ipcMain.on("ACCEPT_SESSION", async (event, offer) => {
  console.log("Student accepted session locally");
  
  // 1. Lock the screen IMMEDIATELY (Don't wait for network)
  enterLockMode(); 
  
  // 2. Tell the Go Backend which apps are allowed
  const allowedApps = (offer || currentOffer).allowedApps || [];
  await startGoSession(allowedApps);
  
  // 3. Send the UDP response to the teacher
  acceptOffer(offer || currentOffer);
});

ipcMain.on("DECLINE_SESSION", () => {
  declineOffer();
  currentOffer = null;
});

ipcMain.on("EMERGENCY_EXIT", () => {
  allowClose = true; // Important: must set this to true before app.exit
  app.exit(0);
});

ipcMain.on("STUDENT_REGISTERED", (_, data) => {
  saveStudent(data);
  student = data;
  startListening();
});

ipcMain.handle("GET_STUDENT", () => student);

app.whenReady().then(createWindow);