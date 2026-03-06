const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/init");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// GET /api/user/profile
router.get("/profile", (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, email, first_name, last_name, phone, address, city, zip_code, country, kyc_verified, created_at
    FROM users WHERE id = ?
  `).get(req.user.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(user);
});

// PUT /api/user/profile
router.put("/profile", (req, res) => {
  const { firstName, lastName, phone, address, city, zipCode } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE users SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone = COALESCE(?, phone),
      address = COALESCE(?, address),
      city = COALESCE(?, city),
      zip_code = COALESCE(?, zip_code)
    WHERE id = ?
  `).run(
    firstName ?? null,
    lastName ?? null,
    phone ?? null,
    address ?? null,
    city ?? null,
    zipCode ?? null,
    req.user.userId
  );

  const user = db.prepare(`
    SELECT id, email, first_name, last_name, phone, address, city, zip_code, country, kyc_verified
    FROM users WHERE id = ?
  `).get(req.user.userId);

  res.json(user);
});

// GET /api/user/beneficiaries
router.get("/beneficiaries", (req, res) => {
  const db = getDb();
  const beneficiaries = db.prepare(`
    SELECT * FROM beneficiaries WHERE user_id = ? ORDER BY name
  `).all(req.user.userId);

  res.json({ beneficiaries });
});

// POST /api/user/beneficiaries
router.post("/beneficiaries", (req, res) => {
  const { name, accountNumber, bankName } = req.body;

  if (!name || !accountNumber) {
    return res.status(400).json({ error: "Name and account number are required" });
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO beneficiaries (id, user_id, name, account_number, bank_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.userId, name, accountNumber, bankName || null);

  const beneficiary = db.prepare("SELECT * FROM beneficiaries WHERE id = ?").get(id);
  res.status(201).json(beneficiary);
});

// DELETE /api/user/beneficiaries/:id
router.delete("/beneficiaries/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM beneficiaries WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user.userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Beneficiary not found" });
  }

  res.json({ message: "Beneficiary deleted" });
});

// GET /api/user/notifications
router.get("/notifications", (req, res) => {
  const db = getDb();
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.user.userId);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0
  `).get(req.user.userId).count;

  res.json({ notifications, unreadCount });
});

// PUT /api/user/notifications/:id/read
router.put("/notifications/:id/read", (req, res) => {
  const db = getDb();
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user.userId);

  res.json({ message: "Notification marked as read" });
});

module.exports = router;
