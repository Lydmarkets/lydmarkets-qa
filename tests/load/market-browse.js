import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  BASE_URL,
  MARKETS_URL,
  HAS_DIRECT_SERVICES,
  internalHeaders,
  SLA_THRESHOLDS,
  BROWSE_STAGES,
} from "./config.js";

// Custom metrics
const browseSuccess = new Rate("browse_success_rate");
const marketListDuration = new Trend("market_list_duration", true);
const marketDetailDuration = new Trend("market_detail_duration", true);

export const options = {
  scenarios: {
    market_browse: {
      executor: "ramping-vus",
      stages: BROWSE_STAGES,
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    // SSR pages are slower than API calls — use relaxed thresholds
    http_req_duration: ["p(95)<3000", "p(99)<5000"],
    http_req_failed: ["rate<0.01"],
    browse_success_rate: ["rate>0.99"],
    market_list_duration: ["p(95)<3000"],
    market_detail_duration: ["p(95)<3000"],
  },
};

/**
 * Discover market IDs by scraping the SSR /markets page for market links.
 * Falls back to the internal API when MARKETS_URL is set.
 */
export function setup() {
  const marketIds = [];

  // Try internal API first (if configured)
  if (MARKETS_URL) {
    const res = http.get(`${MARKETS_URL}/markets?status=active&limit=20`, {
      headers: internalHeaders(),
    });
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const markets = body.data || body;
        if (Array.isArray(markets)) {
          markets.forEach((m) => marketIds.push(m.id));
        }
      } catch (_) {
        // Fall through to SSR scraping
      }
    }
  }

  // Scrape market IDs from the SSR pages if API didn't work.
  // Try both / and /markets — Next.js RSC payloads change format between
  // versions, so we attempt multiple regex patterns per page.
  if (marketIds.length === 0) {
    const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    const patterns = [
      // Double-escaped JSON (old hydration): \"id\":\"<uuid>\",\"title\":
      new RegExp(`\\\\"id\\\\":\\\\"(${UUID})\\\\",\\\\"title\\\\":`, "gi"),
      // Unescaped JSON (RSC payload): "id":"<uuid>","title":
      new RegExp(`"id":"(${UUID})","title":`, "gi"),
      // href links to market detail pages
      new RegExp(`/markets/(${UUID})`, "gi"),
    ];

    const seen = new Set();
    const pages = [
      { url: `${BASE_URL}/`, tag: "setup: GET /" },
      { url: `${BASE_URL}/markets`, tag: "setup: GET /markets" },
    ];

    for (const { url, tag } of pages) {
      if (seen.size >= 20) break;
      const res = http.get(url, { tags: { name: tag }, redirects: 5 });
      if (res.status !== 200) continue;

      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(res.body)) !== null) {
          if (!seen.has(match[1])) {
            seen.add(match[1]);
            marketIds.push(match[1]);
          }
        }
      }
    }
  }

  console.log(`Discovered ${marketIds.length} market IDs for detail page tests`);
  return { marketIds };
}

export default function (data) {
  // 1. Browse market list (homepage — /markets redirects to /)
  group("market list page", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/`, {
      tags: { name: "GET / (market list)" },
    });
    marketListDuration.add(Date.now() - start);

    const passed = check(res, {
      "market list returns 200": (r) => r.status === 200,
      "page contains market content": (r) =>
        r.body.includes("market") || r.body.includes("Market"),
    });
    browseSuccess.add(passed ? 1 : 0);
  });

  sleep(Math.random() * 0.5 + 0.2);

  // 2. Browse market list API (only when direct service URLs are configured)
  if (HAS_DIRECT_SERVICES && MARKETS_URL) {
    group("market list API", () => {
      const categories = ["", "politics", "sports", "entertainment", "crypto"];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const url = category
        ? `${MARKETS_URL}/markets?status=active&category=${category}&limit=20`
        : `${MARKETS_URL}/markets?status=active&limit=20`;

      const start = Date.now();
      const res = http.get(url, {
        headers: internalHeaders(),
        tags: { name: "GET /markets (API)" },
      });
      marketListDuration.add(Date.now() - start);

      const passed = check(res, {
        "API returns 200": (r) => r.status === 200,
        "response is valid JSON": (r) => {
          try {
            JSON.parse(r.body);
            return true;
          } catch {
            return false;
          }
        },
      });
      browseSuccess.add(passed ? 1 : 0);
    });

    sleep(Math.random() * 0.3 + 0.1);
  }

  // 3. Market detail page (if we have market IDs)
  if (data.marketIds.length > 0) {
    group("market detail page", () => {
      const id =
        data.marketIds[Math.floor(Math.random() * data.marketIds.length)];

      const start = Date.now();
      const res = http.get(`${BASE_URL}/markets/${id}`, {
        tags: { name: "GET /markets/:id (page)" },
      });
      marketDetailDuration.add(Date.now() - start);

      const passed = check(res, {
        "detail page returns 200": (r) => r.status === 200,
      });
      browseSuccess.add(passed ? 1 : 0);
    });

    sleep(Math.random() * 0.3 + 0.1);

    // 4. Market detail API (only when direct service URLs are configured)
    if (HAS_DIRECT_SERVICES && MARKETS_URL) {
      group("market detail API", () => {
        const id =
          data.marketIds[Math.floor(Math.random() * data.marketIds.length)];

        const start = Date.now();
        const res = http.get(`${MARKETS_URL}/markets/${id}`, {
          headers: internalHeaders(),
          tags: { name: "GET /markets/:id (API)" },
        });
        marketDetailDuration.add(Date.now() - start);

        const passed = check(res, {
          "detail API returns 200": (r) => r.status === 200,
          "response has market data": (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.id !== undefined || body.title !== undefined;
            } catch {
              return false;
            }
          },
        });
        browseSuccess.add(passed ? 1 : 0);
      });
    }
  }

  sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data) {
  const now = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  return {
    [`results/load-market-browse-${now}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics || {};
  const duration = metrics.http_req_duration || {};
  const failed = metrics.http_req_failed || {};
  const listDur = metrics.market_list_duration || {};
  const detailDur = metrics.market_detail_duration || {};

  return [
    "",
    "=== Market Browse Load Test Results ===",
    `  Iterations:     ${metrics.iterations?.values?.count || "N/A"}`,
    `  VUs (max):      ${metrics.vus_max?.values?.max || "N/A"}`,
    `  Overall p95:    ${duration.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    `  Overall p99:    ${duration.values?.["p(99)"]?.toFixed(1) || "N/A"} ms`,
    `  List p95:       ${listDur.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    `  Detail p95:     ${detailDur.values?.["p(95)"]?.toFixed(1) || "N/A"} ms`,
    `  Error rate:     ${((failed.values?.rate || 0) * 100).toFixed(2)}%`,
    "",
  ].join("\n");
}
