const express = require("express");
const { getDb } = require("../db/init");
const { getVendorConfigs, setOverrides, resetOverrides } = require("../vendors/simulator");

const router = express.Router();

// GET /api/admin/status — app health + stats
router.get("/status", (req, res) => {
  const db = getDb();
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const accountCount = db.prepare("SELECT COUNT(*) as count FROM accounts").get().count;
  const txCount = db.prepare("SELECT COUNT(*) as count FROM transactions").get().count;
  const transferCount = db.prepare("SELECT COUNT(*) as count FROM transfers").get().count;

  res.json({
    status: "healthy",
    uptime: process.uptime(),
    database: { users: userCount, accounts: accountCount, transactions: txCount, transfers: transferCount },
    vendors: getVendorConfigs(),
  });
});

// GET /api/admin/vendors — get vendor configs and overrides
router.get("/vendors", (req, res) => {
  res.json(getVendorConfigs());
});

// POST /api/admin/vendors/configure — set vendor overrides
router.post("/vendors/configure", (req, res) => {
  const overrides = setOverrides(req.body);
  res.json({ message: "Vendor overrides updated", overrides });
});

// POST /api/admin/vendors/reset — reset to defaults
router.post("/vendors/reset", (req, res) => {
  const overrides = resetOverrides();
  res.json({ message: "Vendor overrides reset to defaults", overrides });
});

// POST /api/admin/chaos — quick chaos presets
router.post("/chaos", (req, res) => {
  const { preset } = req.body;

  const presets = {
    normal: { latencyMultiplier: 1.0, extraErrorRate: 0.0, forceSlowVendor: null },
    slow: { latencyMultiplier: 3.0, extraErrorRate: 0.0, forceSlowVendor: null },
    degraded: { latencyMultiplier: 2.0, extraErrorRate: 0.1, forceSlowVendor: null },
    "fraud-slow": { latencyMultiplier: 1.0, extraErrorRate: 0.0, forceSlowVendor: "fraud-check" },
    "payment-slow": { latencyMultiplier: 1.0, extraErrorRate: 0.0, forceSlowVendor: "payment-gateway" },
    chaos: { latencyMultiplier: 4.0, extraErrorRate: 0.2, forceSlowVendor: "all" },
  };

  if (!preset || !presets[preset]) {
    return res.status(400).json({
      error: "Unknown preset",
      available: Object.keys(presets),
    });
  }

  const overrides = setOverrides(presets[preset]);
  res.json({ message: `Chaos preset '${preset}' applied`, overrides });
});

// POST /api/admin/seed — reseed the database
router.post("/seed", async (req, res) => {
  try {
    const seed = require("../db/seed");
    await seed();
    res.json({ message: "Database reseeded successfully" });
  } catch (err) {
    res.status(500).json({ error: "Seed failed", details: err.message });
  }
});

module.exports = router;
