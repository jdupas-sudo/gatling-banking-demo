# NovaPay Banking Demo

A fully functional banking application built for [Gatling](https://gatling.io) load-testing demos. It pairs with the [ecommerce demo](https://github.com/jdupas-sudo/se-ecommerce-demo-gatling-tests) to showcase realistic performance testing scenarios, including vendor latency simulation and chaos engineering presets.

## Quick Start

### Run Locally

```bash
npm install
npm run seed
npm start
```

The app starts at **http://localhost:3000**.

### Run with Docker

```bash
docker compose up --build
```

### Development Mode (auto-restart on file changes)

```bash
npm run dev
```

## What's Inside

NovaPay is a banking app with accounts, transactions, transfers, beneficiaries, and a user profile — all backed by an in-memory SQLite database (sql.js) seeded with realistic test data across 5 users.

The key feature for load testing is the **vendor simulation layer**: every transfer calls simulated external APIs (fraud-check, payment-gateway) that introduce realistic latency distributions and transient failures. An admin API lets you inject chaos at runtime — slow responses, elevated error rates, or full degradation — so you can observe how your load tests react to backend issues.

### Test Accounts

All accounts use the password **`password123`**.

| User             | Email                         | Accounts                                 |
|------------------|-------------------------------|------------------------------------------|
| Alice Martin     | alice.martin@example.com      | Checking ($8,542), Savings ($25k), Credit |
| Bob Johnson      | bob.johnson@example.com       | Checking ($3,217), Savings ($5,600)       |
| Carol Williams   | carol.williams@example.com    | Checking ($45k), Savings ($150k), Credit  |
| Dave Brown       | dave.brown@example.com        | Checking ($520)                           |
| Emma Davis       | emma.davis@example.com        | Checking ($4,100), Savings ($12k), Credit |

Each user comes pre-loaded with transactions (8–120), beneficiaries, and notifications.

### Vendor Simulation & Chaos Presets

Four simulated external APIs introduce realistic latency and transient failures during transfers:

| Vendor            | Normal (ms) | Degraded (ms)  | Error % |
|-------------------|-------------|----------------|---------|
| `fraud-check`     | 30–120      | 800–2,500      | 2%      |
| `credit-score`    | 80–200      | 1,000–3,000    | 3%      |
| `payment-gateway` | 50–180      | 600–2,000      | 4%      |
| `kyc-verify`      | 200–500     | 2,000–5,000    | 5%      |

Inject failure modes at runtime via the admin API:

```bash
# Normal operation
curl -X POST localhost:3000/api/admin/chaos \
  -H "Content-Type: application/json" -d '{"preset": "normal"}'

# Full chaos: 4x latency + 20% errors on everything
curl -X POST localhost:3000/api/admin/chaos \
  -H "Content-Type: application/json" -d '{"preset": "chaos"}'
```

| Preset          | Latency | Extra Errors | Description                        |
|-----------------|---------|--------------|------------------------------------|
| `normal`        | 1x      | 0%           | Default operation                  |
| `slow`          | 3x      | 0%           | All vendors respond slowly         |
| `degraded`      | 2x      | +10%         | Slow with elevated error rate      |
| `fraud-slow`    | 1x      | 0%           | Only fraud-check forced slow       |
| `payment-slow`  | 1x      | 0%           | Only payment-gateway forced slow   |
| `chaos`         | 4x      | +20%         | Everything slow, high error rate   |

## Gatling Load Tests

The `gatling/` directory contains a Java + Maven Gatling suite with four simulations following the same patterns as the [ecommerce demo](https://github.com/jdupas-sudo/se-ecommerce-demo-gatling-tests).

### Prerequisites

- Java 17+
- Maven 3.9+
- The banking app running on `localhost:3000`

### Running Simulations

```bash
cd gatling

# Smoke test — quick validation
mvn gatling:test -Dgatling.simulationClass=novapay.BasicSimulation

# Full user journey — login, browse, transfer
mvn gatling:test -Dgatling.simulationClass=novapay.BrowseAndTransferSimulation

# Mixed traffic — 50% browsers, 30% transfers, 20% profile
mvn gatling:test -Dgatling.simulationClass=novapay.MixedWorkloadSimulation

# Raw API throughput — parallel auth/read/write streams
mvn gatling:test -Dgatling.simulationClass=novapay.ApiOnlySimulation
```

### Simulations

**BasicSimulation** — Smoke test that validates infrastructure and API connectivity. Each virtual user logs in, lists their accounts, opens one account, and paginates through transactions. Injects all users at once and asserts zero failures — useful as a quick sanity check before heavier runs.

**BrowseAndTransferSimulation** — Simulates a complete banking session the way a real user would: log in, browse the dashboard, paginate through account transactions, check monthly statements, then execute a money transfer and verify it went through. Includes realistic think times between each step. Users ramp up gradually over the configured duration.

**MixedWorkloadSimulation** — Models production-like traffic where different users do different things. After logging in, each virtual user is randomly assigned one of three behaviors: browsing accounts and filtering transactions (50%), making a transfer (30%), or managing their profile and notifications (20%). This creates a realistic mix of read-heavy and write-heavy load.

**ApiOnlySimulation** — Pure API throughput test with no think times or browser simulation. Runs three parallel scenarios at constant rate: authentication calls, read operations (accounts + transactions), and write operations (transfers with vendor latency). Good for finding raw capacity limits and backend bottlenecks.

### Configuration

All simulations accept system properties via `-D`:

| Property   | Default                | Description                          |
|------------|------------------------|--------------------------------------|
| `baseUrl`  | `http://localhost:3000`| Target application URL               |
| `users`    | `200`                  | Number of virtual users              |
| `duration` | `60`                   | Test duration in seconds             |
| `rate`     | `5`                    | Users per second (ApiOnlySimulation) |

```bash
mvn gatling:test -Dgatling.simulationClass=novapay.BrowseAndTransferSimulation \
  -Dusers=50 -Dduration=120 -DbaseUrl=http://staging:3000
```

### Reports

After each run, Gatling generates an HTML report in `gatling/target/gatling/`.

### Code Organization

```
gatling/src/test/java/novapay/
├── config/          # Centralized config (base URL, think times, injection defaults)
├── endpoints/       # One class per API domain, returns HttpRequestActionBuilder
├── grroups/         # Chain builders composing endpoints into realistic user flows
├── *Simulation.java # Simulation classes wiring chains + injection profiles
└── resources/
    └── data/users.json  # Circular feeder with test user credentials
```

Key patterns: feeders for variable data, session correlation (JWT tokens, account IDs extracted and reused), think times between actions, `exitBlockOnFail()` to stop on first error, and `doIf` guards for conditional steps.

## Project Structure

```
bankling/
├── src/
│   ├── server.js               # Express entry point (port 3000)
│   ├── db/
│   │   ├── init.js             # sql.js database wrapper & schema
│   │   └── seed.js             # Test data seeder
│   ├── middleware/
│   │   └── auth.js             # JWT authentication
│   ├── routes/
│   │   ├── auth.js             # Authentication (login, register, refresh, logout)
│   │   ├── accounts.js         # Accounts, transactions, statements
│   │   ├── transfers.js        # Transfers (with vendor simulation calls)
│   │   ├── user.js             # Profile, beneficiaries, notifications
│   │   ├── vendors.js          # Direct vendor simulation endpoints
│   │   └── admin.js            # Health, chaos presets, reseed
│   └── vendors/
│       └── simulator.js        # Vendor latency & failure simulation engine
├── public/                     # Frontend (vanilla HTML/CSS/JS, dark theme)
├── gatling/                    # Gatling load tests (Java 17, Maven)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Tech Stack

| Layer     | Technology                                       |
|-----------|--------------------------------------------------|
| Backend   | Node.js, Express 4.21                            |
| Database  | sql.js 1.11 (SQLite compiled to WebAssembly)     |
| Auth      | JSON Web Tokens (jsonwebtoken 9.x)               |
| Frontend  | Vanilla HTML/CSS/JS (dark theme)                  |
| Container | Docker, docker compose                           |
| Testing   | Gatling 3.14.9 (Java 17, Maven)                  |

## License

Internal demo — not for redistribution.
