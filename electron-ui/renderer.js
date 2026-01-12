const signupDiv = document.getElementById("signup");
const offerDiv = document.getElementById("session-offer");
const waitingDiv = document.getElementById("waiting");
const workspaceDiv = document.getElementById("workspace");

let wasActive = false;
const appsDiv = document.getElementById("apps");

// Set up signup listener FIRST
window.api.onShowSignup(() => {
  console.log("SHOW_SIGNUP event received");
  showSignup();
});

// Set up session offer listener
window.api.onSessionOffer((offer) => {
  console.log("Renderer received session offer:", offer);
  showOffer(offer);
});

// Check student status after listeners are set up
(async () => {
  const student = await window.api.getStudent();
  console.log("Student data:", student);
  
  if (!student) {
    // If no student, show signup immediately
    showSignup();
  } else {
    // If student exists, show waiting screen
    showWaiting();
  }
})();

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

function showSignup() {
  console.log("Showing signup form");
  signupDiv.hidden = false;
  waitingDiv.hidden = true;
  offerDiv.hidden = true;
  workspaceDiv.hidden = true;
  
  signupDiv.innerHTML = `
    <div style="padding: 40px; max-width: 400px; margin: 0 auto;">
      <h3>Student Registration</h3>
      <input id="name" placeholder="Name" style="width: 100%; padding: 10px; margin: 10px 0;"><br>
      <input id="usn" placeholder="USN" style="width: 100%; padding: 10px; margin: 10px 0;"><br>
      <input id="section" placeholder="Section" style="width: 100%; padding: 10px; margin: 10px 0;"><br>
      <button id="register" style="padding: 10px 20px; margin-top: 10px; cursor: pointer;">Register</button>
    </div>
  `;

  document.getElementById("register").onclick = () => {
    const student = {
      name: document.getElementById("name").value.trim(),
      usn: document.getElementById("usn").value.trim(),
      section: document.getElementById("section").value.trim(),
    };

    if (!student.name || !student.usn || !student.section) {
      alert("Please fill in all fields");
      return;
    }

    console.log("Submitting signup:", student);
    window.api.submitSignup(student);
    showWaiting();
  };
}

function showOffer(offer) {
  console.log("Showing offer");
  waitingDiv.hidden = true;
  offerDiv.hidden = false;
  workspaceDiv.hidden = true;
  signupDiv.hidden = true;

  offerDiv.innerHTML = `
    <div style="padding: 40px; max-width: 400px; margin: 0 auto;">
      <h3>Session Available</h3>
      <p><b>Teacher:</b> ${offer.teacher}</p>
      <p><b>Section:</b> ${offer.section}</p>
      <button id="accept" style="padding: 10px 20px; margin: 10px 5px; cursor: pointer; background: #10b981; color: white; border: none; border-radius: 5px;">Accept</button>
      <button id="decline" style="padding: 10px 20px; margin: 10px 5px; cursor: pointer; background: #ef4444; color: white; border: none; border-radius: 5px;">Decline</button>
    </div>
  `;

  document.getElementById("accept").onclick = () => {
    console.log("Session accepted");
    window.api.acceptSession(offer);
    showWorkspace();
  };

  document.getElementById("decline").onclick = () => {
    console.log("Session declined");
    window.api.declineSession();
    showWaiting();
  };
}

function showWorkspace() {
  console.log("Showing workspace");
  waitingDiv.hidden = true;
  offerDiv.hidden = true;
  workspaceDiv.hidden = false;
  signupDiv.hidden = true;
}

function showWaiting() {
  console.log("Showing waiting screen");
  waitingDiv.hidden = false;
  offerDiv.hidden = true;
  workspaceDiv.hidden = true;
  signupDiv.hidden = true;
}