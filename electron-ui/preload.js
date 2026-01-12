const { contextBridge, ipcRenderer } = require("electron");

async function safeFetch(url, options) {
  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (e) {
    console.error("Fetch error:", e);
    return null;
  }
}

contextBridge.exposeInMainWorld("api", {
  // --- LOCKDOWN & WINDOW CONTROLS ---
  toggleFullscreen: (mode) => ipcRenderer.send('toggle-fullscreen', mode),
  
  // 🆕 ADD THIS LINE FOR LINUX LOCKDOWN
  toggleLockdown: (mode) => ipcRenderer.send('toggle-lockdown', mode),

  getStatus: () => safeFetch("http://localhost:7070/status"),
  getApps: () => safeFetch("http://localhost:7070/apps"),
  
  launchApp: (id) => {
    ipcRenderer.send("LOWER_WORKSPACE");
    return safeFetch("http://localhost:7070/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: id }),
    });
  },
  
  raiseWorkspace: () => ipcRenderer.send("RAISE_WORKSPACE"),
  emergencyExit: () => ipcRenderer.send("EMERGENCY_EXIT"),
  getStudent: () => ipcRenderer.invoke("GET_STUDENT"),

  // --- SESSION FLOW ---
  onSessionOffer: (cb) =>
    ipcRenderer.on("SESSION_OFFER", (_, offer) => cb(offer)),

  acceptSession: (offer) =>
    ipcRenderer.send("ACCEPT_SESSION", offer),

  declineSession: () =>
    ipcRenderer.send("DECLINE_SESSION"),

  // 🆕 Listen for the end signal to show the Close button in UI
  onSessionEnd: (cb) => 
    ipcRenderer.on("SESSION_ENDED", (_, data) => cb(data)),

  // --- SIGNUP FLOW ---
  onShowSignup: (cb) =>
    ipcRenderer.on("SHOW_SIGNUP", cb),

  submitSignup: (data) =>
    ipcRenderer.send("STUDENT_REGISTERED", data),
});