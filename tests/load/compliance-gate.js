import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  COMPLIANCE_URL,
  MARKETS_URL,
  TEST_USER_ID,
  TEST_MARKET_ID,
  internalHeaders,
  SLA_THRESHOLDS,
  COMPLIANCE_STAGES,
} from "./config.js";

// Custom metrics
const complianceSuccess = new Rate("compliance_check_success_rate");
const complianceDuration = new Trend("compliance_check_duration", true);

export const options = {
  scenarios: {
    compliance_gate: {
      executor: "ramping-vus",
      stages: COMPLIANCE_STAGES,
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    ...SLA_THRESHOLDS,
    compliance_check_success_rate: ["rate>0.99"],
    // Compliance gate SLA is <3s per the service contract, but target <300ms
    compliance_check_duration: ["p(95)<300", "p(99)<500"],
  },
};

export function setup() {
  let marketId = TEST_MARKET_ID;

  if (!marketId) {
    const res = http.get(`${MARKETS_URL}/markets?status=active&limit=5`, {
      headers: internalHeaders(),
    });
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const markets = body.data || body;
        if (Array.isArray(markets) && markets.length > 0) {
          marketId = markets[0].id;
        }
      } catch (_) {
        // Fall through
      }
    }
  }

  if (!marketId) {
    console.warn(
      "No market ID available — set TEST_MARKET_ID env var for reliable testing.",
    );
  }

  return { marketId };
}

export default function (data) {
  if (!data.marketId) {
    console.error("No market ID — skipping iteration");
    sleep(1);
    return;
  }

  // Randomize amounts to simulate realistic traffic patterns
  const amounts = [1000, 2500, 5000, 10000, 25000]; // öre (10–250 kr)
  const amountCents = amounts[Math.floor(Math.random() * amounts.length)];

  const payload = JSON.stringify({
    userId: TEST_USER_ID,
    marketId: data.marketId,
    amountCents,
    side: Math.random() > 0.5 ? "yes" : "no",
  });

  const start = Date.now();
  const res = http.post(`${COMPLIANCE_URL}/check`, payload, {
    headers: internalHeaders(),
    tags: { name: "POST /check (compliance)" },
  });
  const elapsed = Date.now() - start;

  complianceDuration.add(elapsed);

  const passed = check(res, {
    "status is 200": (r) => r.status === 200,
    "response has allowed field": (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.allowed === "boolean";
      } catch {
        return false;
      }
    },
    "latency < 3s (SLA)": () => elapsed < 3000,
    "latency < 300ms (target)": () => elapsed < 300,
  });

  complianceSuccess.add(passed ? 1 : 0);

  // Minimal sleep — compliance checks happen inline with order placement
  sleep(Math.random() * 0.2 + 0.05);
}

export function handleSummary(data) {
  const now = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return {
    [`results/load-compliance-gate-${now}.json`]: JSON.stringify(
      data,
      null,
      2,
    ),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics || {};
  const duration = metrics.http_req_duration || {};
  const failed = metrics.http_req_failed || {};
  const compDur = metrics.compliance_check_duration || {};
  const compRate = metrics.compliance_check_success_rate || {};

  return [
    "",
    "=== Compliance Gate Load Test Results ===",
    `  Iterations:     ${metrics.iterations?.values?.count || "N/A"}`,
    `  VUs (max):      ${metrics.vus_max?.values?.max || "N/A"}`,
    `  Check p50:      ${compDur.values?.["p(50)"]?.toFixed(1) || "N/A"} ms`,
    `  Check p95:      ${compDur.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    `  Check p99:      ${compDur.values?.["p(99)"]?.toFixed(1) || "N/A"} ms`,
    `  Error rate:     ${((failed.values?.rate || 0) * 100).toFixed(2)}%`,
    `  Success rate:   ${((compRate.values?.rate || 0) * 100).toFixed(2)}%`,
    "",
  ].join("\n");
}
