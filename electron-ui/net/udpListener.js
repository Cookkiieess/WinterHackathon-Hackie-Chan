const dgram = require("dgram");
const { UDP_PORT, MSG } = require("../shared/protocol");

function listen(section, onOffer) {
  const socket = dgram.createSocket("udp4");

  socket.on("message", (msg, rinfo) => {
    console.log("📡 UDP RECEIVED:", msg.toString(), "FROM", rinfo.address);
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === MSG.SESSION_OFFER && data.section === section) {
        onOffer(data);
      }
    } catch (e) {
      console.error("Invalid UDP packet", e);
    }
  });

  socket.bind(UDP_PORT, () => {
    socket.setBroadcast(true);
    console.log("UDP listener started on port", UDP_PORT);
  });
}

module.exports = { listen };