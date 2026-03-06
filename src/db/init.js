const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/banking.db");

let db = null;
let initPromise = null;

class DbWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
    this._inTransaction = false;
  }

  exec(sql) {
    this._db.run(sql);
  }

  prepare(sql) {
    return new StatementWrapper(this._db, sql, this);
  }

  pragma() {}

  transaction(fn) {
    return (...args) => {
      this._db.run("BEGIN TRANSACTION");
      this._inTransaction = true;
      try {
        const result = fn(...args);
        this._db.run("COMMIT");
        this._inTransaction = false;
        this.save();
        return result;
      } catch (err) {
        this._inTransaction = false;
        try {
          this._db.run("ROLLBACK");
        } catch (_) {
          // Transaction may have already been rolled back by SQLite
        }
        throw err;
      }
    };
  }

  save() {
    if (this._inTransaction) return;
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = this._db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error("Failed to save DB:", e.message);
    }
  }
}

class StatementWrapper {
  constructor(sqlDb, sql, wrapper) {
    this._db = sqlDb;
    this._sql = sql;
    this._wrapper = wrapper;
  }

  run(...params) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    this._db.run(this._sql, flat);
    const changes = this._db.getRowsModified();
    if (/^\s*(INSERT|UPDATE|DELETE)/i.test(this._sql)) {
      this._wrapper.save();
    }
    return { changes };
  }

  get(...params) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this._db.prepare(this._sql);
    stmt.bind(flat);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const results = [];
    const stmt = this._db.prepare(this._sql);
    stmt.bind(flat);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

async function initDb() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs();
    let sqlDb;
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      sqlDb = new SQL.Database(buffer);
    } else {
      sqlDb = new SQL.Database();
    }
    db = new DbWrapper(sqlDb);
    initSchema();
    return db;
  })();

  return initPromise;
}

function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      city TEXT,
      zip_code TEXT,
      country TEXT DEFAULT 'US',
      kyc_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('checking', 'savings', 'credit')),
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      credit_limit REAL DEFAULT NULL,
      interest_rate REAL DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('credit', 'debit', 'transfer_in', 'transfer_out')),
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      description TEXT,
      category TEXT,
      merchant TEXT,
      reference TEXT,
      status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      from_account_id TEXT NOT NULL,
      to_account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
      fraud_check_ms INTEGER,
      payment_gateway_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (from_account_id) REFERENCES accounts(id),
      FOREIGN KEY (to_account_id) REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      bank_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  [
    "CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_account_id)",
    "CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_account_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
  ].forEach(sql => db.exec(sql));
}

module.exports = { getDb, initDb };
