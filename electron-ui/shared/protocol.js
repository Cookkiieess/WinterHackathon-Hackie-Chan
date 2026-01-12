module.exports = {
  UDP_PORT: 41234,

  MSG: {
    SESSION_OFFER: "SESSION_OFFER",      // 🆕 Teacher broadcasts offer
    SESSION_START: "SESSION_START",      // Teacher confirms start after accept
    STUDENT_JOIN: "STUDENT_JOIN",        // Student accepts and joins
    STUDENT_DECLINE: "STUDENT_DECLINE",  // 🆕 Student declines
    SESSION_END: "SESSION_END",
    KICK: "KICK"
  }
};