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
   ```
3. One `test.describe` per ticket, one `test()` per acceptance-criteria point:
   ```ts
   test.describe("SCRUM-123: Feature name", () => {
     test("renders the foo button", async ({ page }) => {
       await page.goto("/foo");
       await expect(page.getByRole("button", { name: /foo/i })).toBeVisible();
     });
   });
   ```
4. Never modify or delete existing spec files.

## Selector rules

- Use `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`
- Never use raw CSS selectors or `locator('.class-name')`
- For navigation assertions use `page.waitForURL(...)` — not `waitForLoadState('networkidle')`

## Test coverage by sprint

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

## Helpers reference

### `waitForApp(url?, timeoutMs?, intervalMs?)`

Polls `url` with `fetch` until a 200 response is received. Useful in global setup or `beforeAll` blocks when the local stack may not be ready immediately.

```ts
import { waitForApp } from "../helpers/wait-for-app";

await waitForApp("http://localhost:3000");
```

Defaults: `BASE_URL || http://localhost:3000`, 120 s timeout, 2 s interval.
