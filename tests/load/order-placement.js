import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  BASE_URL,
  TRADING_URL,
  MARKETS_URL,
  HAS_DIRECT_SERVICES,
  TEST_USER_ID,
  TEST_MARKET_ID,
  internalHeaders,
  SLA_THRESHOLDS,
  RAMP_STAGES,
} from "./config.js";

// Custom metrics
const orderSuccess = new Rate("order_success_rate");
const orderDuration = new Trend("order_duration", true);

export const options = {
  scenarios: {
    order_placement: {
      executor: "ramping-vus",
      stages: RAMP_STAGES,
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    ...SLA_THRESHOLDS,
    order_success_rate: ["rate>0.99"],
    order_duration: ["p(95)<300", "p(99)<500"],
  },
};

/**
 * Discover a valid market ID. Tries internal API first (if configured),
 * then falls back to scraping UUIDs from the SSR /markets page.
 */
export function setup() {
  if (TEST_MARKET_ID) {
    return { marketId: TEST_MARKET_ID };
  }

  // Try internal API (when direct service URLs are configured)
  if (MARKETS_URL) {
    const res = http.get(`${MARKETS_URL}/markets?status=active&limit=5`, {
      headers: internalHeaders(),
    });
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const markets = body.data || body;
        if (Array.isArray(markets) && markets.length > 0) {
          return { marketId: markets[0].id };
        }
      } catch (_) {
        // Fall through
      }
    }
  }

  // Scrape market IDs from SSR page
  const res = http.get(`${BASE_URL}/markets`);
  if (res.status === 200) {
    const match = res.body.match(/\/markets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (match) {
      return { marketId: match[1] };
    }
  }

  console.warn(
    "Could not discover market ID. " +
      "Set TEST_MARKET_ID env var for reliable testing.",
  );
  return { marketId: null };
}

export default function (data) {
  if (!data.marketId) {
    console.error("No market ID available — skipping iteration");
    sleep(1);
    return;
  }

  if (!TRADING_URL) {
    console.error(
      "TRADING_URL not set — order placement requires direct service access. " +
        "Set TRADING_URL=http://trading-service:3009",
    );
    sleep(1);
    return;
  }

  const payload = JSON.stringify({
    userId: TEST_USER_ID,
    marketId: data.marketId,
    side: Math.random() > 0.5 ? "yes" : "no",
    quantity: Math.floor(Math.random() * 10) + 1, // 1–10 shares
  });

  const start = Date.now();
  const res = http.post(`${TRADING_URL}/orders/place`, payload, {
    headers: internalHeaders(),
    tags: { name: "POST /orders/place" },
  });
  const elapsed = Date.now() - start;

  orderDuration.add(elapsed);

  const passed = check(res, {
    "status is 200": (r) => r.status === 200,
    "response has orderId": (r) => {
      try {
        return JSON.parse(r.body).orderId !== undefined;
      } catch {
        return false;
      }
    },
    "p95 latency < 300ms": () => elapsed < 300,
  });

  orderSuccess.add(passed ? 1 : 0);

  // Throttle to simulate realistic inter-request gaps
  sleep(Math.random() * 0.5 + 0.1);
}

export function handleSummary(data) {
  const now = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return {
    [`results/load-order-placement-${now}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics || {};
  const duration = metrics.http_req_duration || {};
  const failed = metrics.http_req_failed || {};
  const orderRate = metrics.order_success_rate || {};

  return [
    "",
    "=== Order Placement Load Test Results ===",
    `  Iterations:    ${metrics.iterations?.values?.count || "N/A"}`,
    `  VUs (max):     ${metrics.vus_max?.values?.max || "N/A"}`,
    `  Duration p50:  ${duration.values?.["p(50)"]?.toFixed(1) || "N/A"} ms`,
    `  Duration p95:  ${duration.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    `  Duration p99:  ${duration.values?.["p(99)"]?.toFixed(1) || "N/A"} ms`,
    `  Error rate:    ${((failed.values?.rate || 0) * 100).toFixed(2)}%`,
    `  Order success: ${((orderRate.values?.rate || 0) * 100).toFixed(2)}%`,
    "",
  ].join("\n");
}
