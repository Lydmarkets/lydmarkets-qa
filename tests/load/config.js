/**
 * Shared k6 load test configuration.
 *
 * Environment variables:
 *   BASE_URL           — Frontend/proxy URL (default: staging Railway)
 *   TRADING_URL        — Direct trading-service URL (optional, falls back to BASE_URL proxy)
 *   MARKETS_URL        — Direct markets-service URL (optional, falls back to BASE_URL proxy)
 *   COMPLIANCE_URL     — Direct compliance-service URL (optional, falls back to BASE_URL proxy)
 *   INTERNAL_SECRET    — X-Internal-Secret header for direct service calls
 *   TEST_USER_ID       — UUID of a test user for authenticated requests
 *   TEST_MARKET_ID     — UUID of a test market for order placement
 */

// Default staging URL
export const BASE_URL =
  __ENV.BASE_URL || "https://web-production-bb35.up.railway.app";

// Direct service URLs — only set when targeting backend services directly.
// When unset, scripts use frontend SSR pages instead of internal APIs.
export const TRADING_URL = __ENV.TRADING_URL || "";
export const MARKETS_URL = __ENV.MARKETS_URL || "";
export const COMPLIANCE_URL = __ENV.COMPLIANCE_URL || "";

// Auth
export const INTERNAL_SECRET = __ENV.INTERNAL_SECRET || "";

// True when direct service URLs are configured (enables internal API tests)
export const HAS_DIRECT_SERVICES =
  !!__ENV.TRADING_URL || !!__ENV.MARKETS_URL || !!__ENV.COMPLIANCE_URL;

// Test fixtures
export const TEST_USER_ID =
  __ENV.TEST_USER_ID || "00000000-0000-0000-0000-000000000000";
export const TEST_MARKET_ID = __ENV.TEST_MARKET_ID || "";

/**
 * Standard headers for internal service calls.
 */
export function internalHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (INTERNAL_SECRET) {
    headers["X-Internal-Secret"] = INTERNAL_SECRET;
  }
  return headers;
}

/**
 * Standard thresholds aligned with SoW §10 targets.
 * p95 < 300 ms, p99 < 500 ms, error rate < 1 %.
 */
export const SLA_THRESHOLDS = {
  http_req_duration: ["p(95)<300", "p(99)<500"],
  http_req_failed: ["rate<0.01"],
};

/**
 * Ramp stages: 10 → 25 → 50 VUs over 5 minutes, then cool down.
 */
export const RAMP_STAGES = [
  { duration: "30s", target: 10 },
  { duration: "1m", target: 25 },
  { duration: "2m", target: 50 },
  { duration: "1m", target: 50 }, // sustain at peak
  { duration: "30s", target: 0 }, // cool down
];

/**
 * Browse-focused stages: higher concurrency for read-heavy traffic.
 */
export const BROWSE_STAGES = [
  { duration: "30s", target: 25 },
  { duration: "1m", target: 50 },
  { duration: "2m", target: 100 },
  { duration: "1m", target: 100 }, // sustain at peak
  { duration: "30s", target: 0 },
];

/**
 * Compliance gate stages: isolated 50 req/s test.
 */
export const COMPLIANCE_STAGES = [
  { duration: "30s", target: 10 },
  { duration: "1m", target: 25 },
  { duration: "2m", target: 50 },
  { duration: "1m", target: 50 },
  { duration: "30s", target: 0 },
];
