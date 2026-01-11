const { contextBridge, ipcRenderer } = require("electron");

async function safeFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

contextBridge.exposeInMainWorld("api", {
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
});
