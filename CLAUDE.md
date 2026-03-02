# lydmarkets-qa

E2E regression test suite for the Lydmarkets platform. Tests are generated per-ticket by QA workers and accumulate across sprints.

## Conventions

- **Selectors**: Use `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder` — never raw CSS selectors
- **Imports**: Always import `{ test, expect }` from `../fixtures/base`
- **Structure**: One `test.describe` block per ticket, file named `{TICKET_KEY}-{kebab-slug}.spec.ts`
- **Existing tests**: Never modify or delete existing test files — only add new ones
- **Assertions**: Test each acceptance criteria point as a separate `test()` within the describe block
- **Resilience**: Use `waitForLoadState('networkidle')` before assertions on dynamic content, reasonable timeouts

## Running

```bash
BASE_URL=http://localhost:3000 bun run test:e2e
```

## File Layout

```
tests/           # One .spec.ts per ticket
fixtures/base.ts # Re-exports { test, expect }
helpers/         # Shared utilities (wait-for-app, auth, etc.)
results/         # JSON + HTML reports (gitignored)
```
