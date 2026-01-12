const dgram = require("dgram");
const { UDP_PORT, MSG } = require("../shared/protocol");
const { loadStudent } = require("../data/storage");

let socket = null;
let teacherAddress = null;
let teacherPort = null;

function listen(onSessionOffer, onSessionStart, onSessionEnd) {
  if (socket) {
    console.log("UDP listener already running");
    return;
  }

  socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  socket.on("message", (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      const student = loadStudent();

      if (!student) {
        console.log("No student registered, ignoring UDP message");
        return;
      }

      // 🆕 STEP 1: Teacher broadcasts SESSION_OFFER
      if (data.type === MSG.SESSION_OFFER) {
        console.log("Received SESSION_OFFER:", data);

        // Check if this student is allowed
        if (data.allowedUSNs && !data.allowedUSNs.includes(student.usn)) {
          console.log("Student not in allowed list");
          return;
        }

        // Store teacher's address for reply
        teacherAddress = rinfo.address;
        teacherPort = rinfo.port;

        // Show offer to UI
        onSessionOffer({
          ...data,
          teacher: data.teacherName || "Teacher",
          section: data.section || student.section,
        });
      }

      // STEP 3: Teacher confirms session start
      if (data.type === MSG.SESSION_START) {
        console.log("Session confirmed by teacher:", data);
        onSessionStart(data);
      }

      // Teacher ends session (broadcast)
      if (data.type === MSG.SESSION_END) {
        console.log("Session ended by teacher");
        onSessionEnd(false);
      }

      // Teacher kicks this student (unicast)
      if (data.type === MSG.KICK) {
        if (data.usn === student.usn) {
          console.log("Kicked by teacher");
          onSessionEnd(true);
        }
      }
    } catch (e) {
      console.error("Invalid UDP packet:", e);
    }
  });

  socket.on("error", (err) => {
    console.error("UDP socket error:", err);
    socket.close();
    socket = null;
  });

  socket.bind(UDP_PORT, () => {
    socket.setBroadcast(true);
    console.log("UDP listener started on port", UDP_PORT);
  });
}

// 🆕 STEP 2: Student accepts the offer
function acceptOffer(offer) {
  if (!socket || !teacherAddress || !teacherPort) {
    console.error("Cannot accept: no teacher address");
    return;
  }

  const student = loadStudent();
  if (!student) {
    console.error("No student data");
    return;
  }

  const response = Buffer.from(JSON.stringify({
    type: MSG.STUDENT_JOIN,
    usn: student.usn,
    name: student.name,
    section: student.section,
    sessionId: offer.sessionId || offer.groupId,
  }));

  console.log("Sending STUDENT_JOIN to", teacherAddress, teacherPort);
  socket.send(response, teacherPort, teacherAddress, (err) => {
    if (err) console.error("Failed to send STUDENT_JOIN:", err);
  });
}

// 🆕 Student declines the offer
function declineOffer() {
  if (!socket || !teacherAddress || !teacherPort) {
    console.error("Cannot decline: no teacher address");
    return;
  }

  const student = loadStudent();
  if (!student) return;

  const response = Buffer.from(JSON.stringify({
    type: MSG.STUDENT_DECLINE,
    usn: student.usn,
    name: student.name,
  }));

  console.log("Sending STUDENT_DECLINE");
  socket.send(response, teacherPort, teacherAddress);
}

module.exports = { listen, acceptOffer, declineOffer };