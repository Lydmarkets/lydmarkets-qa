/**
 * Full load test suite — runs all three scenarios concurrently.
 *
 * This simulates realistic production traffic: market browsing + order
 * placement + compliance checks all hitting the platform simultaneously.
 *
 * Usage:
 *   k6 run tests/load/full-suite.js
 *   k6 run tests/load/full-suite.js --env BASE_URL=https://staging.example.com
 */
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  BASE_URL,
  TRADING_URL,
  MARKETS_URL,
  COMPLIANCE_URL,
  TEST_USER_ID,
  TEST_MARKET_ID,
  internalHeaders,
  SLA_THRESHOLDS,
} from "./config.js";

// Custom metrics
const orderDuration = new Trend("order_placement_duration", true);
const complianceDuration = new Trend("compliance_check_duration", true);
const browseDuration = new Trend("market_browse_duration", true);
const overallSuccess = new Rate("overall_success_rate");

export const options = {
  scenarios: {
    // Scenario 1: Market browsing (high concurrency, read-heavy)
    browsers: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 25 },
        { duration: "1m", target: 50 },
        { duration: "2m", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      exec: "browseMarkets",
      gracefulRampDown: "10s",
    },
    // Scenario 2: Order placement (10 → 50 OPS)
    traders: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 25 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      exec: "placeOrders",
      gracefulRampDown: "10s",
    },
    // Scenario 3: Compliance gate (50 req/s isolated)
    compliance: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 25 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      exec: "checkCompliance",
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    ...SLA_THRESHOLDS,
    overall_success_rate: ["rate>0.99"],
    order_placement_duration: ["p(95)<300", "p(99)<500"],
    compliance_check_duration: ["p(95)<300", "p(99)<500"],
    market_browse_duration: ["p(95)<500"],
  },
};

export function setup() {
  let marketIds = [];

  const res = http.get(`${MARKETS_URL}/markets?status=active&limit=20`, {
    headers: internalHeaders(),
  });

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      const markets = body.data || body;
      if (Array.isArray(markets)) {
        marketIds = markets.map((m) => m.id);
      }
    } catch (_) {
      // Fall through
    }
  }

  const primaryMarket = TEST_MARKET_ID || marketIds[0] || null;
  if (!primaryMarket) {
    console.warn(
      "No market IDs discovered. Set TEST_MARKET_ID for order/compliance tests.",
    );
  }

  return { marketIds, primaryMarket };
}

// --- Scenario: Market browsing ---
export function browseMarkets(data) {
  group("browse markets", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/markets`, {
      tags: { name: "GET /markets (page)" },
    });
    browseDuration.add(Date.now() - start);

    const passed = check(res, {
      "market list 200": (r) => r.status === 200,
    });
    overallSuccess.add(passed ? 1 : 0);
  });

  if (data.marketIds.length > 0) {
    sleep(Math.random() * 0.3 + 0.1);

    group("market detail", () => {
      const id =
        data.marketIds[Math.floor(Math.random() * data.marketIds.length)];
      const start = Date.now();
      const res = http.get(`${BASE_URL}/markets/${id}`, {
        tags: { name: "GET /markets/:id (page)" },
      });
      browseDuration.add(Date.now() - start);

      const passed = check(res, {
        "detail page 200": (r) => r.status === 200,
      });
      overallSuccess.add(passed ? 1 : 0);
    });
  }

  sleep(Math.random() * 1 + 0.5);
}

// --- Scenario: Order placement ---
export function placeOrders(data) {
  if (!data.primaryMarket) {
    sleep(1);
    return;
  }

  const payload = JSON.stringify({
    userId: TEST_USER_ID,
    marketId: data.primaryMarket,
    side: Math.random() > 0.5 ? "yes" : "no",
    quantity: Math.floor(Math.random() * 10) + 1,
  });

  const start = Date.now();
  const res = http.post(`${TRADING_URL}/orders/place`, payload, {
    headers: internalHeaders(),
    tags: { name: "POST /orders/place" },
  });
  orderDuration.add(Date.now() - start);

  const passed = check(res, {
    "order 200": (r) => r.status === 200,
  });
  overallSuccess.add(passed ? 1 : 0);

  sleep(Math.random() * 0.5 + 0.1);
}

// --- Scenario: Compliance gate ---
export function checkCompliance(data) {
  if (!data.primaryMarket) {
    sleep(1);
    return;
  }

  const amounts = [1000, 2500, 5000, 10000, 25000];
  const payload = JSON.stringify({
    userId: TEST_USER_ID,
    marketId: data.primaryMarket,
    amountCents: amounts[Math.floor(Math.random() * amounts.length)],
    side: Math.random() > 0.5 ? "yes" : "no",
  });

  const start = Date.now();
  const res = http.post(`${COMPLIANCE_URL}/check`, payload, {
    headers: internalHeaders(),
    tags: { name: "POST /check (compliance)" },
  });
  complianceDuration.add(Date.now() - start);

  const passed = check(res, {
    "compliance 200": (r) => r.status === 200,
  });
  overallSuccess.add(passed ? 1 : 0);

  sleep(Math.random() * 0.2 + 0.05);
}

export function handleSummary(data) {
  const now = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return {
    [`results/load-full-suite-${now}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics || {};
  const overall = m.http_req_duration || {};
  const failed = m.http_req_failed || {};
  const orderDur = m.order_placement_duration || {};
  const compDur = m.compliance_check_duration || {};
  const browseDur = m.market_browse_duration || {};

  return [
    "",
    "=== Full Suite Load Test Results ===",
    "",
    "  Overall",
    `    Requests:      ${m.http_reqs?.values?.count || "N/A"}`,
    `    Duration p95:  ${overall.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    `    Duration p99:  ${overall.values?.["p(99)"]?.toFixed(1) || "N/A"} ms`,
    `    Error rate:    ${((failed.values?.rate || 0) * 100).toFixed(2)}%`,
    "",
    "  Order Placement",
    `    p95:           ${orderDur.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    `    p99:           ${orderDur.values?.["p(99)"]?.toFixed(1) || "N/A"} ms`,
    "",
    "  Compliance Gate",
    `    p95:           ${compDur.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    `    p99:           ${compDur.values?.["p(99)"]?.toFixed(1) || "N/A"} ms`,
    "",
    "  Market Browse",
    `    p95:           ${browseDur.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    "",
    `  SoW §10 target: p95 < 300ms, error < 1%`,
    "",
  ].join("\n");
}
