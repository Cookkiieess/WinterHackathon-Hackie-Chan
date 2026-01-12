const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "student.json");

function loadStudent() {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath));
}

function saveStudent(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { loadStudent, saveStudent };
