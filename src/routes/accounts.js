const express = require("express");
const { getDb } = require("../db/init");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// GET /api/accounts — list user's accounts
router.get("/", (req, res) => {
  const db = getDb();
  const accounts = db.prepare(`
    SELECT id, type, name, balance, currency, credit_limit, interest_rate, created_at
    FROM accounts WHERE user_id = ? ORDER BY type, name
  `).all(req.user.userId);

  const summary = {
    totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
    accountCount: accounts.length,
  };

  res.json({ accounts, summary });
});

// GET /api/accounts/:id — single account detail
router.get("/:id", (req, res) => {
  const db = getDb();
  const account = db.prepare(`
    SELECT * FROM accounts WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user.userId);

  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }

  res.json(account);
});

// GET /api/accounts/:id/transactions — paginated transaction history
router.get("/:id/transactions", (req, res) => {
  const db = getDb();

  // Verify ownership
  const account = db.prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.userId);

  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const category = req.query.category;
  const type = req.query.type;
  const search = req.query.search;

  let where = "WHERE account_id = ?";
  const params = [req.params.id];

  if (category) {
    where += " AND category = ?";
    params.push(category);
  }
  if (type) {
    where += " AND type = ?";
    params.push(type);
  }
  if (search) {
    where += " AND (description LIKE ? OR merchant LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM transactions ${where}`).get(...params).count;

  const transactions = db.prepare(`
    SELECT * FROM transactions ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/accounts/:id/statements — monthly statement summary
router.get("/:id/statements", (req, res) => {
  const db = getDb();

  const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.userId);

  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }

  const statements = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as transaction_count,
      SUM(CASE WHEN type = 'credit' OR type = 'transfer_in' THEN amount ELSE 0 END) as total_credits,
      SUM(CASE WHEN type = 'debit' OR type = 'transfer_out' THEN amount ELSE 0 END) as total_debits
    FROM transactions
    WHERE account_id = ?
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
    LIMIT 12
  `).all(req.params.id);

  res.json({ accountId: account.id, accountName: account.name, statements });
});

module.exports = router;
