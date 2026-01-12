const fs = require("fs");
const path = require("path");

// Store student identity locally (one-time setup)
const filePath = path.join(process.cwd(), "student.json");

/*
Get current student identity.
If it does not exist, create a default one (demo-safe).*/
function getStudent() {
  // First run: create identity
  if (!fs.existsSync(filePath)) {
    const student = {
      usn: "USN001",
      name: "Test Student"
    };

    fs.writeFileSync(filePath, JSON.stringify(student, null, 2));
    return student;
  }

  // Normal run: load existing identity
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/*
Update / overwrite student identity
(used later by signup UI)*/
function saveStudent(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 
Backward compatibility
(if any old code still calls loadStudent)*/
function loadStudent() {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

module.exports = {
  getStudent,
  saveStudent,
  loadStudent
};