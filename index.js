const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;
const SECRET = "supersecretkey"; // change in production

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Fake in-memory user store
const users = [];

// Signup
app.post("/api/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(400).json({ error: "User already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { firstName, lastName, email, password: hashedPassword };
  users.push(newUser);
  res.json({ message: "Signup successful" });
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: "Invalid password" });
  }
  const token = jwt.sign({ email: user.email }, SECRET, { expiresIn: "1h" });
  res.json({ message: "Login successful", token });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
