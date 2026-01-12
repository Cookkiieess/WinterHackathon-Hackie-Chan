const WebSocket = require("ws");
const { MSG } = require("../shared/protocol");

function joinSession(offer, student, onMessage) {
  const ws = new WebSocket(`ws://${offer.host}:${offer.wsPort}`);

  ws.on("open", () => {
    console.log("WebSocket connected");
    ws.send(JSON.stringify({
      type: MSG.JOIN_REQUEST,
      sessionId: offer.sessionId,
      name: student.name,
      usn: student.usn,
      section: student.section,
    }));
  });

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      console.log("WS MESSAGE:", data);
      if (onMessage) onMessage(data);
    } catch (e) {
      console.error("Invalid WS message", e);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket closed");
  });

  ws.on("error", (err) => {
    console.error("WebSocket error", err);
  });

  return ws;
}

module.exports = { joinSession };
