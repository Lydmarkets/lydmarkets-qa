# lydmarkets-qa

E2E regression test suite for the Lydmarkets platform, covering two frontend repos:

| Repo | Purpose | Default port |
|------|---------|-------------|
| `Lydmarkets-Claude-version` | User-facing app (Next.js) | 3000 |
| `Lydmarkets-Admin` | Admin panel | 3001 |

Tests are generated per-ticket by QA workers and accumulate across sprints.

## Conventions

- **Selectors**: Use `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder` — never raw CSS selectors
- **Imports**: Always import `{ test, expect }` from `../fixtures/base`
- **Structure**: One `test.describe` block per ticket, file named `{TICKET_KEY}-{kebab-slug}.spec.ts`
- **Existing tests**: Never modify or delete existing test files — only add new ones
- **Assertions**: Test each acceptance criteria point as a separate `test()` within the describe block
- **Resilience**: Use `page.waitForURL(...)` for navigation assertions; rely on `toBeVisible()` retries for dynamic content — avoid `waitForLoadState('networkidle')` as it stalls on failed requests
- **Age gate**: Call `dismissAgeGate(page)` after **every** `page.goto()` on user-facing pages

## Running

```bash
BASE_URL=http://localhost:3000 bun run test:e2e          # All tests
bun run test:e2e -- --grep "@smoke"                       # Smoke only
bun run test:e2e tests/SCRUM-402-market-search.spec.ts    # Single file
```

## File Layout

```
tests/              # One .spec.ts per ticket
fixtures/base.ts    # Re-exports { test, expect }
helpers/
  age-gate.ts       # dismissAgeGate(page) — call after goto() on any user-facing page
  wait-for-app.ts   # waitForApp(url) — polls until the app is healthy
results/            # JSON + HTML reports (gitignored)
```

---

## Feature Specs → E2E Tests

The main repo (`Lydmarkets-Claude-version`) maintains **feature specs** in
`spec/` with structured E2E test scenarios in YAML format. These specs are the
**source of truth** for what E2E tests should cover.

### Where to find specs

The specs live in the main web repo (sibling directory):

```
../Lydmarkets-Claude-version/spec/
├── _TEMPLATE.md                 # Template for new specs
├── E2E-GENERATION-GUIDE.md      # Translation rules (YAML → Playwright)
├── README.md                    # Index of all specs
├── authentication.md
├── markets.md
├── trading.md
├── portfolio.md
├── wallet-payments.md
├── compliance.md
├── notifications.md
├── leaderboard-analytics.md
├── account-settings.md
├── public-pages.md
└── infrastructure.md            # Backend only — no E2E
```

### How to generate tests from specs

Each spec has an **E2E Test Spec** section containing YAML scenarios. Follow
this workflow:

1. **Read the spec**: `../Lydmarkets-Claude-version/spec/{feature}.md`
2. **Read the guide**: `../Lydmarkets-Claude-version/spec/E2E-GENERATION-GUIDE.md`
3. **Translate YAML → Playwright** using the rules below
4. **Write to**: `tests/{TICKET_KEY}-{kebab-slug}.spec.ts`

### YAML → Playwright translation (quick reference)

| YAML | Playwright |
|------|------------|
| `goto: "/path"` | `await page.goto("/path"); await dismissAgeGate(page);` |
| `wait: 'selector'` | `await expect(page.{selector}).toBeVisible();` |
| `action: "click" + element` | `await page.{element}.click();` |
| `action: "fill" + element + value` | `await page.{element}.fill("{value}");` |
| `assert: { element, state: visible }` | `await expect(page.{element}).toBeVisible();` |
| `assert: { element, state: hidden }` | `await expect(page.{element}).toBeHidden();` |
| `assert: { element, attribute: {name, value} }` | `await expect(page.{element}).toHaveAttribute("{name}", "{value}");` |
| `assert: { url_matches: 'pattern' }` | `await expect(page).toHaveURL(new RegExp("pattern"));` |
| `assert_any: [...]` | `const a = await page.{el1}.isVisible({timeout:5000}).catch(()=>false);` ... `expect(a\|\|b).toBeTruthy();` |
| `store: { variable, from, attribute }` | `const val = await page.{from}.getAttribute("{attribute}");` |

### Important: always add dismissAgeGate

The YAML specs don't include `dismissAgeGate` in every step (the specs describe
the feature, not the test harness). **You must add it after every `page.goto()`
on user-facing pages.**

```typescript
// YAML says: goto: "/markets"
// You write:
await page.goto("/markets");
await dismissAgeGate(page);
```

### Tags → test annotations

Spec scenarios have `tags` like `[smoke, critical, regression, compliance]`.
Map them to Playwright annotations for selective `--grep` runs:

```typescript
test("market page loads", { tag: ["@smoke", "@critical"] }, async ({ page }) => {
  // ...
});
```

### Swedish text selectors

Many compliance components use Swedish text. Key phrases for selectors:

| Selector text | Component |
|---------------|-----------|
| `Åldersbekräftelse` | Age verification modal title |
| `Jag är 18 år eller äldre` | Age confirm button |
| `Lämna sidan` | Age reject button |
| `Verklighetscheck` | Reality check modal |
| `Fortsätt spela` | Continue playing |
| `Ta en paus` | Take a break |
| `Sign in with BankID` | Login page |
| `Create an account` | Register page |
| `Accept All` / `Reject All` | Cookie banner |

### Example: spec scenario → test file

Given this YAML in `spec/markets.md`:

```yaml
name: "'All' pill is checked by default"
tags: [smoke]
steps:
  - goto: "/markets"
  - assert:
      element: 'getByRole("radio", { name: "All" })'
      attribute: { name: "aria-checked", value: "true" }
```

You generate:

```typescript
import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Markets — category filters", () => {
  test("'All' pill is checked by default", { tag: ["@smoke"] }, async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);

    await expect(
      page.getByRole("radio", { name: "All" })
    ).toHaveAttribute("aria-checked", "true");
  });
});
```

### When specs don't exist yet

If a Jira ticket doesn't have a matching feature spec, write tests based on
the ticket acceptance criteria directly. The spec will be created in the main
repo when the feature is implemented.
