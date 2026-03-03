# lydmarkets-qa

E2E regression test suite for the Lydmarkets platform, covering two frontend repos:

| Repo | Purpose | Default port |
|------|---------|-------------|
| `Lydmarkets-Claude-version` | User-facing app (Next.js + Supabase) | 3000 |
| `Lydmarkets-Admin` | Admin panel | 3001 |

Tests are generated per-ticket by QA workers and accumulate across sprints.

## Conventions

- **Selectors**: Use `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder` — never raw CSS selectors
- **Imports**: Always import `{ test, expect }` from `../fixtures/base`
- **Structure**: One `test.describe` block per ticket, file named `{TICKET_KEY}-{kebab-slug}.spec.ts`
- **Existing tests**: Never modify or delete existing test files — only add new ones
- **Assertions**: Test each acceptance criteria point as a separate `test()` within the describe block
- **Resilience**: Use `page.waitForURL(...)` for navigation assertions; rely on `toBeVisible()` retries for dynamic content — avoid `waitForLoadState('networkidle')` as it stalls on failed requests

## Running

```bash
BASE_URL=http://localhost:3000 bun run test:e2e
```

## File Layout

```
tests/              # One .spec.ts per ticket
fixtures/base.ts    # Re-exports { test, expect }
helpers/
  age-gate.ts       # dismissAgeGate(page) — call after goto() on any Lydmarkets-Claude page
  wait-for-app.ts   # waitForApp(url) — polls until the app is healthy
results/            # JSON + HTML reports (gitignored)
```
