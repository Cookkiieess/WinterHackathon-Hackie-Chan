let wasActive = false;
const appsDiv = document.getElementById("apps");

async function renderApps() {
  const apps = await window.api.getApps();
  appsDiv.innerHTML = "";

  for (const app of apps) {
    const div = document.createElement("div");
    div.className = "app";
    div.innerText = app.name;

    div.onclick = () => window.api.launchApp(app.id);
    appsDiv.appendChild(div);
  }
}

async function pollSession() {
  try {
    const status = await window.api.getStatus();

    if (!wasActive && status.active) {
      renderApps();
    }

    if (wasActive && !status.active) {
      window.api.raiseWorkspace();
      appsDiv.innerHTML = "";
    }

    wasActive = status.active;
  } catch (e) {
    console.error(e);
  }
}

setInterval(pollSession, 1000);
pollSession();

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "q") {
    window.api.emergencyExit();
  }
});
