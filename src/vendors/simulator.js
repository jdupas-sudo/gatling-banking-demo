/**
 * Simulated external vendor calls with realistic latency distributions.
 *
 * Each vendor has:
 *  - A "fast" range (normal operation)
 *  - A "slow" range (degraded performance)
 *  - An error probability
 *
 * The admin endpoint can override these defaults at runtime.
 */

const vendorConfigs = {
  "fraud-check": {
    name: "FraudShield API",
    fastRange: [30, 120],
    slowRange: [800, 2500],
    slowProbability: 0.10,
    errorProbability: 0.02,
    errorMessages: [
      "FraudShield service temporarily unavailable",
      "Fraud check timeout — upstream connection reset",
      "Rate limit exceeded on FraudShield API",
    ],
  },
  "credit-score": {
    name: "CreditBureau API",
    fastRange: [80, 200],
    slowRange: [1000, 3000],
    slowProbability: 0.08,
    errorProbability: 0.03,
    errorMessages: [
      "CreditBureau API returned 503",
      "Credit score lookup failed — connection timeout",
      "Upstream provider maintenance window",
    ],
  },
  "payment-gateway": {
    name: "PayNet Gateway",
    fastRange: [50, 180],
    slowRange: [600, 2000],
    slowProbability: 0.12,
    errorProbability: 0.04,
    errorMessages: [
      "PayNet gateway timeout",
      "Payment processing error — retry later",
      "Transaction declined by upstream processor",
      "PayNet circuit breaker open",
    ],
  },
  "kyc-verify": {
    name: "IdentityCheck API",
    fastRange: [200, 500],
    slowRange: [2000, 5000],
    slowProbability: 0.15,
    errorProbability: 0.05,
    errorMessages: [
      "KYC verification service unavailable",
      "Document validation timeout",
      "Identity provider returned invalid response",
    ],
  },
};

// Runtime overrides (mutable via admin endpoint)
let globalOverrides = {
  latencyMultiplier: 1.0,
  extraErrorRate: 0.0,
  forceSlowVendor: null, // set to vendor key to force slow responses
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Simulate a vendor call with realistic latency.
 * Returns { success, latencyMs, data?, error? }
 */
async function callVendor(vendorKey, inputData = {}) {
  const config = vendorConfigs[vendorKey];
  if (!config) {
    throw new Error(`Unknown vendor: ${vendorKey}`);
  }

  const effectiveErrorRate = config.errorProbability + globalOverrides.extraErrorRate;
  const isForceSlow = globalOverrides.forceSlowVendor === vendorKey || globalOverrides.forceSlowVendor === "all";

  // Determine if this call errors
  if (Math.random() < effectiveErrorRate) {
    const errorLatency = randomBetween(config.slowRange[0], config.slowRange[1]);
    const adjustedLatency = Math.floor(errorLatency * globalOverrides.latencyMultiplier);
    await sleep(adjustedLatency);
    return {
      success: false,
      vendor: config.name,
      latencyMs: adjustedLatency,
      error: pickRandom(config.errorMessages),
    };
  }

  // Determine if this call is slow
  const isSlow = isForceSlow || Math.random() < config.slowProbability;
  const range = isSlow ? config.slowRange : config.fastRange;
  const latency = randomBetween(range[0], range[1]);
  const adjustedLatency = Math.floor(latency * globalOverrides.latencyMultiplier);

  await sleep(adjustedLatency);

  // Generate vendor-specific response data
  const responseData = generateVendorResponse(vendorKey, inputData);

  return {
    success: true,
    vendor: config.name,
    latencyMs: adjustedLatency,
    data: responseData,
  };
}

function generateVendorResponse(vendorKey, input) {
  switch (vendorKey) {
    case "fraud-check":
      return {
        riskScore: Math.random() < 0.9 ? randomBetween(1, 30) : randomBetween(60, 95),
        riskLevel: Math.random() < 0.9 ? "low" : "medium",
        flagged: Math.random() < 0.05,
        checkId: `FC-${Date.now()}`,
      };
    case "credit-score":
      return {
        score: randomBetween(580, 850),
        grade: ["A", "A", "B", "B", "B", "C"][Math.floor(Math.random() * 6)],
        factors: ["Payment history", "Credit utilization", "Account age"],
        reportDate: new Date().toISOString().slice(0, 10),
      };
    case "payment-gateway":
      return {
        transactionId: `PG-${Date.now()}-${randomBetween(1000, 9999)}`,
        processorResponse: "APPROVED",
        authCode: `AUTH${randomBetween(100000, 999999)}`,
        settlementDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      };
    case "kyc-verify":
      return {
        verified: Math.random() < 0.85,
        verificationId: `KYC-${Date.now()}`,
        checks: {
          identity: "passed",
          address: Math.random() < 0.9 ? "passed" : "review_needed",
          sanctions: "clear",
          pep: "clear",
        },
        confidence: randomBetween(75, 99),
      };
    default:
      return {};
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getVendorConfigs() {
  return { vendors: vendorConfigs, overrides: globalOverrides };
}

function setOverrides(overrides) {
  if (overrides.latencyMultiplier !== undefined) {
    globalOverrides.latencyMultiplier = Math.max(0.1, Math.min(10, overrides.latencyMultiplier));
  }
  if (overrides.extraErrorRate !== undefined) {
    globalOverrides.extraErrorRate = Math.max(0, Math.min(1, overrides.extraErrorRate));
  }
  if (overrides.forceSlowVendor !== undefined) {
    globalOverrides.forceSlowVendor = overrides.forceSlowVendor;
  }
  return globalOverrides;
}

function resetOverrides() {
  globalOverrides = { latencyMultiplier: 1.0, extraErrorRate: 0.0, forceSlowVendor: null };
  return globalOverrides;
}

module.exports = { callVendor, getVendorConfigs, setOverrides, resetOverrides };
