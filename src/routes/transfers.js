const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/init");
const { authMiddleware } = require("../middleware/auth");
const { callVendor } = require("../vendors/simulator");

const router = express.Router();

router.use(authMiddleware);

// GET /api/transfers — list user's transfers
router.get("/", (req, res) => {
  const db = getDb();
  const transfers = db.prepare(`
    SELECT t.*, 
      fa.name as from_account_name, fa.type as from_account_type,
      ta.name as to_account_name, ta.type as to_account_type
    FROM transfers t
    JOIN accounts fa ON t.from_account_id = fa.id
    JOIN accounts ta ON t.to_account_id = ta.id
    WHERE fa.user_id = ? OR ta.user_id = ?
    ORDER BY t.created_at DESC
    LIMIT 50
  `).all(req.user.userId, req.user.userId);

  res.json({ transfers });
});

// POST /api/transfers — initiate a transfer
router.post("/", async (req, res) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;

  if (!fromAccountId || !toAccountId || !amount) {
    return res.status(400).json({ error: "fromAccountId, toAccountId, and amount are required" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Amount must be positive" });
  }

  if (amount > 50000) {
    return res.status(400).json({ error: "Transfer amount exceeds daily limit of $50,000" });
  }

  if (fromAccountId === toAccountId) {
    return res.status(400).json({ error: "Cannot transfer to the same account" });
  }

  const db = getDb();

  // Verify source account ownership
  const fromAccount = db.prepare("SELECT * FROM accounts WHERE id = ? AND user_id = ?")
    .get(fromAccountId, req.user.userId);

  if (!fromAccount) {
    return res.status(404).json({ error: "Source account not found" });
  }

  // Check sufficient funds
  if (fromAccount.type !== "credit" && fromAccount.balance < amount) {
    return res.status(400).json({ error: "Insufficient funds" });
  }

  if (fromAccount.type === "credit") {
    const availableCredit = fromAccount.credit_limit + fromAccount.balance;
    if (availableCredit < amount) {
      return res.status(400).json({ error: "Exceeds available credit" });
    }
  }

  // Verify destination account exists
  const toAccount = db.prepare("SELECT * FROM accounts WHERE id = ?").get(toAccountId);
  if (!toAccount) {
    return res.status(404).json({ error: "Destination account not found" });
  }

  const transferId = uuidv4();

  try {
    // Step 1: Fraud check (vendor call)
    const fraudResult = await callVendor("fraud-check", {
      amount,
      fromAccount: fromAccountId,
      toAccount: toAccountId,
    });

    if (!fraudResult.success) {
      return res.status(503).json({
        error: "Fraud check unavailable, please try again",
        vendor: fraudResult.vendor,
        vendorLatencyMs: fraudResult.latencyMs,
      });
    }

    if (fraudResult.data.flagged) {
      return res.status(403).json({
        error: "Transfer flagged for review by fraud detection",
        riskScore: fraudResult.data.riskScore,
        vendorLatencyMs: fraudResult.latencyMs,
      });
    }

    // Step 2: Payment gateway (vendor call) for external transfers
    let paymentResult = null;
    if (fromAccount.user_id !== toAccount.user_id) {
      paymentResult = await callVendor("payment-gateway", {
        amount,
        currency: "USD",
      });

      if (!paymentResult.success) {
        return res.status(503).json({
          error: "Payment processing failed, please try again",
          vendor: paymentResult.vendor,
          vendorLatencyMs: paymentResult.latencyMs,
        });
      }
    }

    // Step 3: Execute the transfer in a DB transaction
    const executeTransfer = db.transaction(() => {
      // Debit source
      db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?")
        .run(amount, fromAccountId);

      // Credit destination
      db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?")
        .run(amount, toAccountId);

      const newFromBalance = db.prepare("SELECT balance FROM accounts WHERE id = ?")
        .get(fromAccountId).balance;
      const newToBalance = db.prepare("SELECT balance FROM accounts WHERE id = ?")
        .get(toAccountId).balance;

      // Record transactions
      db.prepare(`
        INSERT INTO transactions (id, account_id, type, amount, balance_after, description, category, reference, status, created_at)
        VALUES (?, ?, 'transfer_out', ?, ?, ?, 'transfer', ?, 'completed', datetime('now'))
      `).run(uuidv4(), fromAccountId, amount, newFromBalance, description || "Transfer out", transferId);

      db.prepare(`
        INSERT INTO transactions (id, account_id, type, amount, balance_after, description, category, reference, status, created_at)
        VALUES (?, ?, 'transfer_in', ?, ?, ?, 'transfer', ?, 'completed', datetime('now'))
      `).run(uuidv4(), toAccountId, amount, newToBalance, description || "Transfer in", transferId);

      // Record the transfer
      db.prepare(`
        INSERT INTO transfers (id, from_account_id, to_account_id, amount, description, status, fraud_check_ms, payment_gateway_ms, completed_at)
        VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, datetime('now'))
      `).run(
        transferId, fromAccountId, toAccountId, amount,
        description || null,
        fraudResult.latencyMs,
        paymentResult ? paymentResult.latencyMs : null
      );

      return { newFromBalance, newToBalance };
    });

    const result = executeTransfer();

    res.status(201).json({
      transfer: {
        id: transferId,
        amount,
        status: "completed",
        fromBalance: result.newFromBalance,
        toBalance: result.newToBalance,
      },
      vendorMetrics: {
        fraudCheck: { latencyMs: fraudResult.latencyMs, riskScore: fraudResult.data.riskScore },
        paymentGateway: paymentResult
          ? { latencyMs: paymentResult.latencyMs, transactionId: paymentResult.data.transactionId }
          : null,
      },
    });
  } catch (err) {
    console.error("Transfer error:", err);
    res.status(500).json({ error: "Transfer failed unexpectedly" });
  }
});

module.exports = router;
