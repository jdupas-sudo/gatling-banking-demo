const { getDb, initDb } = require("./init");
const { v4: uuidv4 } = require("uuid");

const USERS = [
  { email: "alice.martin@example.com", password: "password123", first_name: "Alice", last_name: "Martin", phone: "+1-555-0101", address: "742 Evergreen Terrace", city: "Springfield", zip_code: "62704", kyc_verified: 1 },
  { email: "bob.johnson@example.com", password: "password123", first_name: "Bob", last_name: "Johnson", phone: "+1-555-0102", address: "123 Oak Street", city: "Portland", zip_code: "97201", kyc_verified: 1 },
  { email: "carol.williams@example.com", password: "password123", first_name: "Carol", last_name: "Williams", phone: "+1-555-0103", address: "456 Pine Avenue", city: "Seattle", zip_code: "98101", kyc_verified: 1 },
  { email: "dave.brown@example.com", password: "password123", first_name: "Dave", last_name: "Brown", phone: "+1-555-0104", address: "789 Maple Drive", city: "Denver", zip_code: "80201", kyc_verified: 0 },
  { email: "emma.davis@example.com", password: "password123", first_name: "Emma", last_name: "Davis", phone: "+1-555-0105", address: "321 Birch Lane", city: "Austin", zip_code: "73301", kyc_verified: 1 },
];

const MERCHANTS = [
  { name: "Whole Foods Market", category: "groceries" },
  { name: "Amazon.com", category: "shopping" },
  { name: "Shell Gas Station", category: "fuel" },
  { name: "Netflix", category: "entertainment" },
  { name: "Starbucks", category: "dining" },
  { name: "Target", category: "shopping" },
  { name: "Uber", category: "transport" },
  { name: "Con Edison", category: "utilities" },
  { name: "AT&T Wireless", category: "utilities" },
  { name: "Blue Cross Insurance", category: "insurance" },
  { name: "Planet Fitness", category: "health" },
  { name: "Spotify", category: "entertainment" },
  { name: "Chipotle", category: "dining" },
  { name: "CVS Pharmacy", category: "health" },
  { name: "Home Depot", category: "home" },
  { name: "Delta Airlines", category: "travel" },
  { name: "Hilton Hotels", category: "travel" },
  { name: "Apple Store", category: "shopping" },
];

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60));
  return d.toISOString().replace("T", " ").slice(0, 19);
}

const accountConfigs = [
  { accounts: [{ type: "checking", name: "Primary Checking", balance: 8542.33 }, { type: "savings", name: "Emergency Fund", balance: 25000.0, interest_rate: 0.045 }, { type: "credit", name: "Platinum Card", balance: -1834.56, credit_limit: 15000 }], txCount: 120 },
  { accounts: [{ type: "checking", name: "Main Checking", balance: 3217.89 }, { type: "savings", name: "Vacation Fund", balance: 5600.0, interest_rate: 0.04 }], txCount: 45 },
  { accounts: [{ type: "checking", name: "Premium Checking", balance: 45230.12 }, { type: "savings", name: "Investment Savings", balance: 150000.0, interest_rate: 0.05 }, { type: "credit", name: "Black Card", balance: -5621.0, credit_limit: 50000 }], txCount: 80 },
  { accounts: [{ type: "checking", name: "Basic Checking", balance: 520.0 }], txCount: 8 },
  { accounts: [{ type: "checking", name: "Daily Checking", balance: 4100.5 }, { type: "savings", name: "Rainy Day Fund", balance: 12300.0, interest_rate: 0.042 }, { type: "credit", name: "Rewards Card", balance: -890.25, credit_limit: 10000 }], txCount: 60 },
];

const banks = ["Chase", "Bank of America", "Wells Fargo", "Citibank", "Capital One"];

async function seed() {
  await initDb();
  const db = getDb();

  // Clear existing data
  ["notifications", "transfers", "transactions", "beneficiaries", "accounts", "users"].forEach(t => db.exec(`DELETE FROM ${t}`));

  USERS.forEach((user, i) => {
    const userId = uuidv4();
    db.prepare(
      "INSERT INTO users (id, email, password, first_name, last_name, phone, address, city, zip_code, kyc_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, user.email, user.password, user.first_name, user.last_name, user.phone, user.address, user.city, user.zip_code, user.kyc_verified);

    const config = accountConfigs[i];
    const accountIds = [];

    config.accounts.forEach((acc) => {
      const accountId = uuidv4();
      accountIds.push(accountId);
      db.prepare(
        "INSERT INTO accounts (id, user_id, type, name, balance, credit_limit, interest_rate) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(accountId, userId, acc.type, acc.name, acc.balance, acc.credit_limit || null, acc.interest_rate || null);
    });

    // Generate transactions
    const primaryAccountId = accountIds[0];
    let runningBalance = config.accounts[0].balance;

    for (let t = 0; t < config.txCount; t++) {
      const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
      const isCredit = Math.random() < 0.25;
      const amount = isCredit ? randomBetween(500, 5000) : randomBetween(5, 250);
      runningBalance = isCredit ? runningBalance + amount : runningBalance - amount;

      db.prepare(
        "INSERT INTO transactions (id, account_id, type, amount, balance_after, description, category, merchant, reference, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        uuidv4(), primaryAccountId, isCredit ? "credit" : "debit", amount,
        Math.round(runningBalance * 100) / 100,
        isCredit ? "Direct Deposit" : `Purchase at ${merchant.name}`,
        isCredit ? "income" : merchant.category, isCredit ? "Employer Inc." : merchant.name,
        `REF-${Date.now()}-${t}`, "completed", randomDate(90)
      );
    }

    // Add beneficiaries
    const otherUsers = USERS.filter((_, idx) => idx !== i);
    for (let b = 0; b < Math.min(2, otherUsers.length); b++) {
      const other = otherUsers[b];
      db.prepare("INSERT INTO beneficiaries (id, user_id, name, account_number, bank_name) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), userId, `${other.first_name} ${other.last_name}`, `****${Math.floor(1000 + Math.random() * 9000)}`, banks[Math.floor(Math.random() * banks.length)]);
    }

    // Add notifications
    [
      { type: "transfer", title: "Transfer Completed", message: "Your transfer of $500.00 has been completed successfully." },
      { type: "security", title: "New Login Detected", message: "A new login was detected from Chrome on macOS." },
      { type: "account", title: "Statement Ready", message: "Your monthly statement for February is now available." },
      { type: "promo", title: "New Savings Rate", message: "Earn up to 4.5% APY with our new high-yield savings account." },
    ].forEach((n, ni) => {
      db.prepare("INSERT INTO notifications (id, user_id, type, title, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(uuidv4(), userId, n.type, n.title, n.message, ni < 2 ? 1 : 0, randomDate(30));
    });
  });

  console.log("Database seeded successfully!");
  console.log(`  ${USERS.length} users created`);
  console.log(`  All users have password: password123`);
  console.log(`  Emails: ${USERS.map(u => u.email).join(", ")}`);
}

// Allow running as script or requiring
if (require.main === module) {
  seed().catch(console.error);
} else {
  module.exports = seed;
}
