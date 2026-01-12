const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const { listen } = require("./net/udpListener");
const { joinSession } = require("./net/wsClient");
const { loadStudent, saveStudent } = require("./data/storage");

let win;
let allowClose = false;
let student = null;

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

  // 👇 LOAD STUDENT
  student = loadStudent();
  console.log("Loaded student:", student);

  if (!student) {
    // Send SHOW_SIGNUP after page loads
    win.webContents.once("did-finish-load", () => {
      console.log("Sending SHOW_SIGNUP");
      win.webContents.send("SHOW_SIGNUP");
    });
  } else {
    // Start listening if student exists
    win.webContents.once("did-finish-load", () => {
      startListening();
    });
  }
}

// 2️⃣ ENTER LOCK MODE (STEP 2)
function enterLockMode() {
  if (!win) return;
  win.setKiosk(true);
  win.setFullScreen(true);
  win.setAlwaysOnTop(true, "screen-saver");
  win.setMenuBarVisibility(false);
  win.setResizable(false);
  win.focus();
}

// 3️⃣ EXIT LOCK MODE (STEP 3)
function exitLockMode() {
  if (!win) return;
  win.setKiosk(false);
  win.setAlwaysOnTop(false);
  win.setFullScreen(false);
  win.setResizable(true);
}

function startListening() {
  console.log("Starting UDP listener for section:", student.section);
  listen(student.section, (offer) => {
    console.log("Received offer, sending to renderer:", offer);
    win.webContents.send("SESSION_OFFER", offer);
  });
}

// Workspace controls (unchanged)
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

// 👇 SESSION JOIN HANDLERS
ipcMain.on("ACCEPT_SESSION", (_, offer) => {
  console.log("Session accepted, joining:", offer);
  enterLockMode(); // Lock the window when session is accepted
  joinSession(offer, student);
});

ipcMain.on("DECLINE_SESSION", () => {
  console.log("Session declined");
  // intentionally empty
});

// 👇 AFTER SIGNUP
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