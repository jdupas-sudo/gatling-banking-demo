const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { callVendor } = require("../vendors/simulator");

const router = express.Router();

router.use(authMiddleware);

// POST /api/vendors/fraud-check
router.post("/fraud-check", async (req, res) => {
  const { amount, fromAccount, toAccount } = req.body;
  const result = await callVendor("fraud-check", { amount, fromAccount, toAccount });

  if (!result.success) {
    return res.status(503).json(result);
  }
  res.json(result);
});

// GET /api/vendors/credit-score/:userId
router.get("/credit-score/:userId", async (req, res) => {
  const result = await callVendor("credit-score", { userId: req.params.userId });

  if (!result.success) {
    return res.status(503).json(result);
  }
  res.json(result);
});

// POST /api/vendors/payment-gateway
router.post("/payment-gateway", async (req, res) => {
  const { amount, currency, recipient } = req.body;
  const result = await callVendor("payment-gateway", { amount, currency, recipient });

  if (!result.success) {
    return res.status(503).json(result);
  }
  res.json(result);
});

// POST /api/vendors/kyc-verify
router.post("/kyc-verify", async (req, res) => {
  const { userId, documentType } = req.body;
  const result = await callVendor("kyc-verify", { userId, documentType });

  if (!result.success) {
    return res.status(503).json(result);
  }
  res.json(result);
});

module.exports = router;
