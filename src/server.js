const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { initDb } = require("./db/init");
const { authMiddleware, generateToken } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// Request logging (useful for demo)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ── API Routes ──────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/accounts", require("./routes/accounts"));
app.use("/api/transfers", require("./routes/transfers"));
app.use("/api/vendors", require("./routes/vendors"));
app.use("/api/user", require("./routes/user"));
app.use("/api/admin", require("./routes/admin"));

// ── Page Routes (HTML) ─────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/register.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

app.get("/accounts/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/account-detail.html"));
});

app.get("/transfer", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/transfer.html"));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/profile.html"));
});

// ── Initialize & Start ─────────────────────────────────
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   NovaPay Banking Demo                   ║`);
    console.log(`  ║   Ready for Gatling load testing         ║`);
    console.log(`  ╠══════════════════════════════════════════╣`);
    console.log(`  ║   http://localhost:${PORT}                  ║`);
    console.log(`  ║   Admin: /api/admin/status               ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
}

start().catch(console.error);

module.exports = app;
