# Load Test Results — Lydmarkets Platform

**SoW Reference**: §10 (WS2-16) — 50 orders/second sustained throughput
**Ticket**: SCRUM-341 (merged SCRUM-221)

## Targets (SoW §10)

| Metric | Target |
|--------|--------|
| Sustained throughput | 50 orders/second |
| Order placement p95 | < 300 ms |
| Order placement p99 | < 500 ms |
| Error rate | < 1% |
| Compliance gate p95 | < 300 ms (SLA: < 3 s) |

## Test Scenarios

| Script | What it tests | VU ramp |
|--------|---------------|---------|
| `order-placement.js` | Trading service order flow | 10 → 25 → 50 VUs |
| `market-browse.js` | Market list + detail pages (SSR + API) | 25 → 50 → 100 VUs |
| `compliance-gate.js` | Pre-trade compliance check | 10 → 25 → 50 VUs |
| `full-suite.js` | All three concurrently | Combined |

## How to Run

```bash
# Prerequisites: install k6 (https://k6.io/docs/get-started/installation/)
# macOS:  brew install k6
# Ubuntu: sudo snap install k6
# Docker: docker run --rm -i grafana/k6 run - <tests/load/order-placement.js

# Run individual scenarios
bun run test:load:orders
bun run test:load:browse
bun run test:load:compliance

# Run full suite (all scenarios concurrently)
bun run test:load

# Target a specific environment
BASE_URL=https://staging.example.com bun run test:load

# With direct service URLs and auth
TRADING_URL=http://trading-service:3009 \
MARKETS_URL=http://markets-service:3005 \
COMPLIANCE_URL=http://compliance-service:3007 \
INTERNAL_SECRET=your-secret \
TEST_USER_ID=uuid-of-test-user \
TEST_MARKET_ID=uuid-of-active-market \
bun run test:load
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Frontend/proxy URL | `https://web-production-bb35.up.railway.app` |
| `TRADING_URL` | Direct trading-service URL | `${BASE_URL}/api` |
| `MARKETS_URL` | Direct markets-service URL | `${BASE_URL}/api` |
| `COMPLIANCE_URL` | Direct compliance-service URL | `${BASE_URL}/api` |
| `INTERNAL_SECRET` | X-Internal-Secret header value | (empty) |
| `TEST_USER_ID` | UUID of test user | `00000000-...` |
| `TEST_MARKET_ID` | UUID of target market | (auto-discovered) |

## Baseline Results

> **TODO**: Run initial baseline and record results here.

### Run Date: YYYY-MM-DD

**Environment**: staging Railway
**k6 version**: X.Y.Z

#### Order Placement

| Metric | Value | Target | Pass? |
|--------|-------|--------|-------|
| Iterations | | | |
| p50 | ms | — | |
| p95 | ms | < 300 ms | |
| p99 | ms | < 500 ms | |
| Error rate | % | < 1% | |

#### Market Browse

| Metric | Value | Target | Pass? |
|--------|-------|--------|-------|
| Iterations | | | |
| List p95 | ms | < 500 ms | |
| Detail p95 | ms | < 500 ms | |
| Error rate | % | < 1% | |

#### Compliance Gate

| Metric | Value | Target | Pass? |
|--------|-------|--------|-------|
| Iterations | | | |
| p50 | ms | — | |
| p95 | ms | < 300 ms | |
| p99 | ms | < 500 ms | |
| Error rate | % | < 1% | |

## Bottlenecks Identified

> **TODO**: Document findings after first run.

1. ...
2. ...

## Recommendations

> **TODO**: Based on bottleneck analysis.

1. ...
2. ...
