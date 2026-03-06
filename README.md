# NovaPay Banking Demo

A fully functional banking application built for [Gatling](https://gatling.io) load-testing demos. It pairs with the [ecommerce demo](https://github.com/jdupas-sudo/se-ecommerce-demo-gatling-tests) to showcase realistic performance testing scenarios, including vendor latency simulation and chaos engineering presets.

## Project Structure

```
bankling/
├── src/
│   ├── server.js               # Express entry point
│   ├── db/
│   │   ├── init.js             # sql.js database wrapper & schema
│   │   └── seed.js             # Test data seeder (users, accounts, transactions)
│   ├── middleware/
│   │   └── auth.js             # JWT authentication & middleware
│   ├── routes/
│   │   ├── auth.js             # Login, register, refresh, logout
│   │   ├── accounts.js         # Accounts, transactions, statements
│   │   ├── transfers.js        # Money transfers (with vendor calls)
│   │   ├── user.js             # Profile, beneficiaries, notifications
│   │   ├── vendors.js          # Direct vendor simulation endpoints
│   │   └── admin.js            # Health, chaos presets, reseed
│   └── vendors/
│       └── simulator.js        # Vendor latency & failure simulation
├── public/
│   ├── index.html              # Landing page
│   ├── login.html              # Login
│   ├── register.html           # Registration
│   ├── dashboard.html          # Account dashboard
│   ├── account-detail.html     # Account transactions & detail
│   ├── transfer.html           # Money transfer form
│   ├── profile.html            # User profile & notifications
│   ├── css/styles.css          # Dark theme stylesheet
│   └── js/app.js               # Frontend auth, API helpers, rendering
├── gatling/                    # Gatling load test suite (Java + Maven)
│   ├── pom.xml
│   └── src/test/
│       ├── java/novapay/       # Simulations, chains, endpoints, config
│       └── resources/          # Feeder data, gatling.conf, logback
├── Dockerfile
├── docker-compose.yml
└── package.json
```

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

## Test Accounts

All accounts use the password **`password123`**.

| User             | Email                         | Accounts                                 | KYC |
|------------------|-------------------------------|------------------------------------------|-----|
| Alice Martin     | alice.martin@example.com      | Checking ($8,542), Savings ($25k), Credit | Yes |
| Bob Johnson      | bob.johnson@example.com       | Checking ($3,217), Savings ($5,600)       | Yes |
| Carol Williams   | carol.williams@example.com    | Checking ($45k), Savings ($150k), Credit  | Yes |
| Dave Brown       | dave.brown@example.com        | Checking ($520)                           | No  |
| Emma Davis       | emma.davis@example.com        | Checking ($4,100), Savings ($12k), Credit | Yes |

Each user comes pre-loaded with transactions (8-120 per user), beneficiaries, and notifications.

## API Reference

### Authentication

| Method | Endpoint              | Description          | Auth |
|--------|-----------------------|----------------------|------|
| POST   | `/api/auth/login`     | Login, returns JWT   | No   |
| POST   | `/api/auth/register`  | Create new user      | No   |
| POST   | `/api/auth/refresh`   | Refresh JWT token    | Yes  |
| POST   | `/api/auth/logout`    | Logout (clears cookie) | Yes |

### Accounts & Transactions

| Method | Endpoint                                    | Description                        | Auth |
|--------|---------------------------------------------|------------------------------------|------|
| GET    | `/api/accounts`                             | List all user accounts             | Yes  |
| GET    | `/api/accounts/:id`                         | Account detail                     | Yes  |
| GET    | `/api/accounts/:id/transactions`            | Paginated transactions             | Yes  |
| GET    | `/api/accounts/:id/transactions?category=X` | Filter by category                 | Yes  |
| GET    | `/api/accounts/:id/statements`              | Monthly statements                 | Yes  |

### Transfers

| Method | Endpoint          | Description                              | Auth |
|--------|-------------------|------------------------------------------|------|
| POST   | `/api/transfers`  | Create transfer (calls fraud + payment)  | Yes  |
| GET    | `/api/transfers`  | List user's transfers                    | Yes  |

Transfers call simulated vendor APIs (fraud-check, payment-gateway) with realistic latency distributions.

### User Profile

| Method | Endpoint                              | Description              | Auth |
|--------|---------------------------------------|--------------------------|------|
| GET    | `/api/user/profile`                   | Get profile              | Yes  |
| PUT    | `/api/user/profile`                   | Update profile (partial) | Yes  |
| GET    | `/api/user/beneficiaries`             | List beneficiaries       | Yes  |
| POST   | `/api/user/beneficiaries`             | Add beneficiary          | Yes  |
| DELETE | `/api/user/beneficiaries/:id`         | Remove beneficiary       | Yes  |
| GET    | `/api/user/notifications`             | List notifications       | Yes  |
| PUT    | `/api/user/notifications/:id/read`    | Mark as read             | Yes  |

### Admin (no auth required)

| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| GET    | `/api/admin/status`             | Health check & database stats      |
| GET    | `/api/admin/vendors`            | Current vendor configs & overrides |
| POST   | `/api/admin/vendors/configure`  | Set vendor overrides               |
| POST   | `/api/admin/vendors/reset`      | Reset vendors to defaults          |
| POST   | `/api/admin/chaos`              | Apply a chaos preset               |
| POST   | `/api/admin/seed`               | Reseed the database                |

## Vendor Simulation

Four simulated external APIs introduce realistic latency distributions and transient failures during transfers:

| Vendor            | Service             | Fast (ms)  | Slow (ms)     | Slow %  | Error % |
|-------------------|---------------------|------------|---------------|---------|---------|
| `fraud-check`     | FraudShield API     | 30 - 120   | 800 - 2,500   | 10%     | 2%      |
| `credit-score`    | CreditBureau API    | 80 - 200   | 1,000 - 3,000 | 8%      | 3%      |
| `payment-gateway` | PayNet Gateway      | 50 - 180   | 600 - 2,000   | 12%     | 4%      |
| `kyc-verify`      | IdentityCheck API   | 200 - 500  | 2,000 - 5,000 | 15%     | 5%      |

### Chaos Presets

Inject failure modes at runtime via `POST /api/admin/chaos`:

```bash
# Normal operation
curl -X POST localhost:3000/api/admin/chaos -H "Content-Type: application/json" \
  -d '{"preset": "normal"}'

# 3x latency on all vendors
curl -X POST localhost:3000/api/admin/chaos -H "Content-Type: application/json" \
  -d '{"preset": "slow"}'

# 2x latency + 10% extra errors
curl -X POST localhost:3000/api/admin/chaos -H "Content-Type: application/json" \
  -d '{"preset": "degraded"}'

# Force fraud-check into slow mode
curl -X POST localhost:3000/api/admin/chaos -H "Content-Type: application/json" \
  -d '{"preset": "fraud-slow"}'

# Force payment-gateway into slow mode
curl -X POST localhost:3000/api/admin/chaos -H "Content-Type: application/json" \
  -d '{"preset": "payment-slow"}'

# Full chaos: 4x latency + 20% errors on everything
curl -X POST localhost:3000/api/admin/chaos -H "Content-Type: application/json" \
  -d '{"preset": "chaos"}'
```

| Preset          | Latency Multiplier | Extra Error Rate | Force Slow Vendor |
|-----------------|-------------------|------------------|-------------------|
| `normal`        | 1.0x              | 0%               | None              |
| `slow`          | 3.0x              | 0%               | None              |
| `degraded`      | 2.0x              | 10%              | None              |
| `fraud-slow`    | 1.0x              | 0%               | fraud-check       |
| `payment-slow`  | 1.0x              | 0%               | payment-gateway   |
| `chaos`         | 4.0x              | 20%              | All               |

## Gatling Load Tests

The `gatling/` directory contains a Java + Maven Gatling suite with four simulations.

### Prerequisites

- Java 17+
- Maven 3.9+
- The banking app running on `localhost:3000`

### Running Simulations

```bash
cd gatling

# Smoke test (1 user, quick validation)
mvn gatling:test -Dgatling.simulationClass=novapay.BasicSimulation

# Full user journey with ramp-up
mvn gatling:test -Dgatling.simulationClass=novapay.BrowseAndTransferSimulation

# Mixed traffic workload
mvn gatling:test -Dgatling.simulationClass=novapay.MixedWorkloadSimulation

# Raw API throughput
mvn gatling:test -Dgatling.simulationClass=novapay.ApiOnlySimulation
```

### Simulations Overview

#### BasicSimulation
Smoke test — validates infrastructure and API connectivity.

**Flow:** Login &rarr; List accounts &rarr; Account detail &rarr; Paginated transactions

**Injection:** `atOnceUsers(users)` | **Assertion:** 0 failures

---

#### BrowseAndTransferSimulation
Full user journey simulating a realistic frontend session with think times.

**Flow:** Login &rarr; Dashboard &rarr; Browse account (2 pages) &rarr; Statements &rarr; Transfer &rarr; Verify

**Injection:** `rampUsers(users).during(duration)` | **Assertions:** p95 < 800ms, failures < 5%

---

#### MixedWorkloadSimulation
Production-like traffic mix with weighted user behaviors.

| Behavior        | Weight | Actions                                         |
|-----------------|--------|-------------------------------------------------|
| Browsers        | 50%    | Dashboard &rarr; Browse with category filter    |
| Transferors     | 30%    | List accounts &rarr; Create transfer &rarr; Verify |
| Profile Managers| 20%    | View/update profile &rarr; Notifications        |

**Injection:** `rampUsers(users).during(duration)` | **Assertions:** p95 < 5s, failures < 10%

---

#### ApiOnlySimulation
Raw API throughput with three parallel scenarios at constant rate.

| Scenario   | Rate        | Actions                            |
|------------|-------------|------------------------------------|
| Auth       | `rate` /s   | Login                              |
| Read       | `rate/2` /s | Login &rarr; Accounts &rarr; Transactions |
| Write      | `rate/5` /s | Login &rarr; Transfer              |

**Injection:** `constantUsersPerSec(rate).during(duration)` | **Assertions:** p99 < 10s, failures < 15%

### Configuration Parameters

All simulations accept system properties via `-D`:

| Property   | Default | Description                            |
|------------|---------|----------------------------------------|
| `baseUrl`  | `http://localhost:3000` | Target application URL    |
| `users`    | `200`   | Number of virtual users                |
| `duration` | `60`    | Test duration in seconds               |
| `rate`     | `5`     | Users per second (ApiOnlySimulation)   |

Example:
```bash
mvn gatling:test -Dgatling.simulationClass=novapay.BrowseAndTransferSimulation \
  -Dusers=50 -Dduration=120 -DbaseUrl=http://staging:3000
```

### Architecture

The Gatling project follows the same patterns as the [ecommerce demo](https://github.com/jdupas-sudo/se-ecommerce-demo-gatling-tests):

- **`config/`** — Centralized configuration (`Config.java`) and session key constants (`Keys.java`)
- **`endpoints/`** — One class per API domain (`AuthEndpoints`, `AccountEndpoints`, `TransferEndpoints`, `UserEndpoints`), each method returns an `HttpRequestActionBuilder`
- **`grroups/`** — Chain builders that compose endpoints into realistic user flows (`LoginChain`, `BrowseChain`, `TransferChain`, `ProfileChain`)
- **`resources/data/users.json`** — Circular feeder with the 5 test user credentials

Key patterns:
- **Feeders** for variable test data (circular user rotation)
- **Session correlation** — JWT tokens, account IDs, and notification IDs are extracted from responses and reused in subsequent requests
- **Think times** — Random pauses between actions (2-5s short, 5-10s long)
- **`exitBlockOnFail()`** — Stops the scenario on first failure instead of continuing with broken state
- **`doIf` guards** — Conditional execution (e.g., only transfer if a second account exists)

### Reports

After each run, Gatling generates an HTML report:

```
gatling/target/gatling/<simulation-timestamp>/index.html
```

## Tech Stack

| Layer     | Technology                                          |
|-----------|-----------------------------------------------------|
| Backend   | Node.js, Express 4.21                               |
| Database  | sql.js 1.11 (SQLite compiled to WebAssembly)        |
| Auth      | JSON Web Tokens (jsonwebtoken 9.x)                  |
| Frontend  | Vanilla HTML/CSS/JS (dark theme)                    |
| Container | Docker, docker compose                              |
| Testing   | Gatling 3.14.9 (Java 17, Maven)                     |

## License

Internal demo — not for redistribution.
