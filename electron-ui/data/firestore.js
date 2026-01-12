const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(
    require("./serviceAccount.json")
  )
});

const db = admin.firestore();

async function saveStudent(student) {
  await db.collection("students").doc(student.usn).set({
    name: student.name,
    usn: student.usn,
    section: student.section,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

module.exports = { saveStudent };
