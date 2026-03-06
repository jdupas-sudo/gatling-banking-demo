const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/init");
const { generateToken, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      kycVerified: !!user.kyc_verified,
    },
  });
});

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { email, password, firstName, lastName, phone, address, city, zipCode } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "Email, password, first name, and last name are required" });
  }

  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const userId = uuidv4();

  db.prepare(`
    INSERT INTO users (id, email, password, first_name, last_name, phone, address, city, zip_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, email, password, firstName, lastName, phone || null, address || null, city || null, zipCode || null);

  // Create a default checking account
  const accountId = uuidv4();
  db.prepare(`
    INSERT INTO accounts (id, user_id, type, name, balance)
    VALUES (?, ?, 'checking', 'Primary Checking', 0)
  `).run(accountId, userId);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const token = generateToken(user);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      kycVerified: false,
    },
  });
});

// POST /api/auth/refresh
router.post("/refresh", (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(authorization.replace("Bearer ", ""), JWT_SECRET, { ignoreExpiration: true });

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
