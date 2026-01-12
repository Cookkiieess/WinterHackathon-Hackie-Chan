// DOM Elements
const signupDiv = document.getElementById("signup");
const waitingDiv = document.getElementById("waiting");
const offerDiv = document.getElementById("session-offer");
const workspaceDiv = document.getElementById("workspace");
const appsDiv = document.getElementById("apps");
const identityDisplay = document.getElementById("student-identity");

// 🆕 New Exit Buttons
const exitWaitingBtn = document.getElementById("exit-waiting-btn");
const exitAppBtn = document.getElementById("exit-app-btn");

// --- 1. INITIALIZATION ---
(async () => {
  const student = await window.api.getStudent();
  console.log("Loaded Student:", student);

  if (!student || !student.usn) {
    showSignup();
  } else {
    // Identity loaded - show waiting screen
    if(identityDisplay) identityDisplay.innerText = `Logged in as: ${student.name} (${student.usn})`;
    showWaiting();
  }
})();

// --- 2. VIEW SWITCHING FUNCTIONS ---

function hideAll() {
  signupDiv.classList.add("hidden");
  waitingDiv.classList.add("hidden");
  offerDiv.classList.add("hidden");
  workspaceDiv.classList.add("hidden");
}

function showSignup() {
  hideAll();
  signupDiv.classList.remove("hidden");
}

function showWaiting() {
  hideAll();
  waitingDiv.classList.remove("hidden");
  // Show exit button while waiting (not in lockdown)
  if (exitWaitingBtn) exitWaitingBtn.classList.remove("hidden");
}

function showWorkspace() {
  hideAll();
  workspaceDiv.classList.remove("hidden");
  // 🔒 Hide exit button during active session (Lockdown)
  if (exitAppBtn) exitAppBtn.classList.add("hidden");
  renderApps(); 
}

// --- 3. EVENT LISTENERS ---

// Handle Exit Buttons (Calls the emergencyExit in main.js)
const handleExit = () => {
  window.api.emergencyExit();
};

if (exitWaitingBtn) exitWaitingBtn.onclick = handleExit;
if (exitAppBtn) exitAppBtn.onclick = handleExit;

// Handle Signup Logic
document.getElementById("signup-btn").addEventListener("click", () => {
  const usn = document.getElementById("usn-input").value;
  const name = document.getElementById("name-input").value;
  
  if(usn && name) {
    window.api.submitSignup({ usn, name });
    if(identityDisplay) identityDisplay.innerText = `Logged in as: ${name} (${usn})`;
    showWaiting();
  } else {
    alert("Please fill in all fields");
  }
});

// Handle Incoming Session Offer
window.api.onSessionOffer((offer) => {
  console.log("🔔 Offer Received:", offer);
  
  offerDiv.innerHTML = `
    <div class="offer-card">
      <h2>📚 Class Started</h2>
      <p><strong>Teacher:</strong> ${offer.teacherName}</p>
      <p><strong>Duration:</strong> ${offer.duration} mins</p>
      <p><strong>Allowed Apps:</strong> ${offer.allowedApps.length > 0 ? offer.allowedApps.join(", ") : "None"}</p>
      
      <div class="btn-group">
        <button id="btn-accept" class="btn-accept">Join Session</button>
        <button id="btn-decline" class="btn-decline">Decline</button>
      </div>
    </div>
  `;

  offerDiv.classList.remove("hidden");

  document.getElementById("btn-accept").onclick = () => {
    window.api.acceptSession(offer);
    // Lockdown triggered automatically by main.js via UDP listener
    showWorkspace();
  };

  document.getElementById("btn-decline").onclick = () => {
    window.api.declineSession();
    showWaiting();
  };
});

// Handle Session End (Teacher stopped it)
window.api.onSessionEnd(() => {
  console.log("Session ended by teacher");
  
  // 1. Exit Fullscreen UI side
  window.api.toggleFullscreen(false); 
  
  // 2. Alert the student
  alert("The teacher has ended the session. You may now close the application.");
  
  // 3. 🔓 Reveal the Exit Button in the header
  if (exitAppBtn) {
    exitAppBtn.classList.remove("hidden");
  }
  
  // Note: We stay in Workspace view so they can see their work, 
  // but they can now use Alt+Tab or click Exit.
});

// --- 4. RENDER APPS ---
async function renderApps() {
  const apps = await window.api.getApps();
  appsDiv.innerHTML = "";

  if (!apps || apps.length === 0) {
    appsDiv.innerHTML = "<p>No apps available. Ensure Go Backend is running.</p>";
    return;
  }

  apps.forEach(app => {
    const div = document.createElement("div");
    div.className = app.allowed ? "app" : "app app-disabled";
    div.innerHTML = `
      <div class="app-icon">${app.icon || '📱'}</div>
      <div class="app-name">${app.name}</div>
    `;
    
    if (app.allowed) {
      div.onclick = () => window.api.launchApp(app.id);
    }
    
    appsDiv.appendChild(div);
  });
}