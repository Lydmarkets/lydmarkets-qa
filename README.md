# lydmarkets-qa

Playwright E2E regression suite for the Lydmarkets platform. Tests accumulate per Jira ticket across sprints and run against live or local deployments.

## Apps under test

| App | Env var | Default (production) |
|-----|---------|----------------------|
| User-facing (`Lydmarkets-Claude-version`) | `BASE_URL` | `https://web-production-bb35.up.railway.app` |
| Admin panel (`Lydmarkets-Admin`) | `ADMIN_URL` | `https://lydmarkets-admin-production.up.railway.app` |

## Setup

```bash
bun install
bunx playwright install --with-deps chromium
```

## Running tests

Against production (default):
```bash
bun run test:e2e
```

Against a local stack:
```bash
BASE_URL=http://localhost:3000 bun run test:e2e
```

Admin tests only:
```bash
ADMIN_URL=http://localhost:3001 bun run test:e2e -- --grep "SCRUM-405"
```

Single spec:
```bash
bun run test:e2e tests/SCRUM-398-login-happy-path.spec.ts
```

Reports are written to `results/` (gitignored) as JSON and HTML. Open the HTML report:
```bash
bunx playwright show-report results/playwright-report
```

## Project layout

```
tests/                  # One .spec.ts per Jira ticket
fixtures/
  base.ts               # Re-exports { test, expect } from @playwright/test
helpers/
  age-gate.ts           # dismissAgeGate(page) — dismisses the Swedish 18+ modal
  wait-for-app.ts       # waitForApp(url) — polls until the app returns 200
results/                # Reports (gitignored)
playwright.config.ts
```

## Playwright config

| Setting | Value |
|---------|-------|
| `testDir` | `./tests` |
| `fullyParallel` | `true` |
| `workers` | `2` |
| `retries` | `1` |
| `trace` | on first retry |
| `screenshot` | on failure |

## Writing a new spec

1. Create `tests/{TICKET_KEY}-{kebab-slug}.spec.ts`
2. Import from the base fixture:
   ```ts
   import { test, expect } from "../fixtures/base";
   import { dismissAgeGate } from "../helpers/age-gate";
   ```
3. One `test.describe` per ticket, one `test()` per acceptance-criteria point:
   ```ts
   test.describe("SCRUM-123: Feature name", () => {
     test("renders the foo button", async ({ page }) => {
       await page.goto("/foo");
       await dismissAgeGate(page);
       await expect(page.getByRole("button", { name: /foo/i })).toBeVisible();
     });
   });
   ```
4. Call `dismissAgeGate(page)` after every `goto()` on user-facing pages — it gracefully no-ops if the modal is absent.
5. Never modify or delete existing spec files.

## Selector rules

- Use `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`
- Never use raw CSS selectors or `locator('.class-name')`
- For navigation assertions use `page.waitForURL(...)` — not `waitForLoadState('networkidle')`

## Test coverage by sprint

### Sprint 25 — Core flows
| Ticket | Area | Spec |
|--------|------|------|
| SCRUM-398 | Login / BankID happy path | `SCRUM-398-login-happy-path.spec.ts` |
| SCRUM-400 | Market detail order form | `SCRUM-400-market-detail-order-form.spec.ts` |
| SCRUM-401 | Order placement | `SCRUM-401-order-placement.spec.ts` |
| SCRUM-402 | Market search & category filters | `SCRUM-402-market-search-category-filters.spec.ts` |
| SCRUM-403 | Portfolio positions & P&L | `SCRUM-403-portfolio-positions-pnl.spec.ts` |
| SCRUM-404 | Session persistence | `SCRUM-404-session-persistence.spec.ts` |
| SCRUM-405 | Admin market approval | `SCRUM-405-admin-market-approval.spec.ts` |
| SCRUM-406 | User profile page | `SCRUM-406-user-profile-page.spec.ts` |
| SCRUM-407 | Leaderboard rankings | `SCRUM-407-leaderboard-rankings.spec.ts` |
| SCRUM-408 | Mobile navigation | `SCRUM-408-mobile-navigation.spec.ts` |
| SCRUM-409 | Settings & responsible gambling | `SCRUM-409-settings-responsible-gambling.spec.ts` |

### Sprint 26 — E2E tests
| Ticket | Area | Spec | Notes |
|--------|------|------|-------|
| SCRUM-227 | Landing / home page (unauthenticated & authenticated) | `SCRUM-227-landing-home-page.spec.ts` | |
| SCRUM-228 | Market card visual design (thumbnail, Yes/No pills, volume, likes) | `SCRUM-228-market-card-visual-design.spec.ts` | |
| SCRUM-247 | 90-day interrupted market auto-close admin UI (SIFS 7 kap. 4§) | `SCRUM-247-market-auto-close-90-day.spec.ts` | Cron trigger skipped (requires DB access) |
| SCRUM-248 | Deposit confirmation modal >10,000 SEK (SIFS M6) | `SCRUM-248-deposit-confirmation-modal.spec.ts` | |
| SCRUM-249 | Unauthorized login attempt notification (SIFS 9 kap. 4§) | `SCRUM-249-unauthorized-login-notification.spec.ts` | BankID threshold trigger skipped |
| SCRUM-250 | Last login time display on login page (SIFS 9 kap. 5§) | `SCRUM-250-last-login-time-display.spec.ts` | |
| SCRUM-289 | Swish e-commerce payment request flow | `SCRUM-289-swish-ecommerce-payment-flow.spec.ts` | Live mTLS tests skipped; API mocked via `page.route()` |
| SCRUM-290 | Swish m-commerce token flow (deep-link) | `SCRUM-290-swish-mcommerce-token-flow.spec.ts` | Token creation skipped |
| SCRUM-291 | Swish QR code from m-commerce token | `SCRUM-291-swish-qr-code.spec.ts` | QR render mocked |
| SCRUM-292 | Swish callback receiver endpoint UI | `SCRUM-292-swish-callback-receiver.spec.ts` | Callback POST skipped |
| SCRUM-294 | Swish refund API — full and partial | `SCRUM-294-swish-refund-api.spec.ts` | API mocked |
| SCRUM-295 | Swish payout API | `SCRUM-295-swish-payout-api.spec.ts` | API mocked |
| SCRUM-296 | Swish error codes (BE18, RP06) and 429 rate-limiting UI | `SCRUM-296-swish-error-codes.spec.ts` | |
| SCRUM-297 | Swish checkout UI — e-commerce phone input & m-commerce | `SCRUM-297-swish-checkout-ui.spec.ts` | QR/deep-link skipped (requires live Swish) |

## Helpers reference

### `dismissAgeGate(page)`

Clicks the "Jag är 18 år eller äldre" confirmation button if it appears, then waits for it to disappear. Times out silently after 3 s if the modal is not present — safe to call unconditionally.

```ts
import { dismissAgeGate } from "../helpers/age-gate";

await page.goto("/");
await dismissAgeGate(page);
```

### `waitForApp(url?, timeoutMs?, intervalMs?)`

Polls `url` with `fetch` until a 200 response is received. Useful in global setup or `beforeAll` blocks when the local stack may not be ready immediately.

```ts
import { waitForApp } from "../helpers/wait-for-app";

await waitForApp("http://localhost:3000");
```

Defaults: `BASE_URL || http://localhost:3000`, 120 s timeout, 2 s interval.
