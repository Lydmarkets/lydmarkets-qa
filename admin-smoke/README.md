# Admin smoke harness

A broad, low-effort smoke crawl of the **admin panel** (`apps/admin`). It walks
every admin section, asserts each page renders, and surfaces failing backend
calls, console errors, error boundaries, and login-redirects — plus a full-page
screenshot per route.

Unlike the user-app suite in `tests/`, the admin panel enforces
email + password + **TOTP MFA**, so there is no headless login. The harness
captures a session from a real human login once, then crawls headlessly.

## Prerequisites

- `bun`, an X11/Wayland display (the capture step opens a visible browser).
- Playwright's Chromium: `bunx playwright install chromium`.

## Usage

```bash
# 1. Capture a session — opens a Chromium window; log in + MFA manually.
ADMIN_BASE_URL=https://admin.lydmarkets.se bun admin-smoke/capture-session.ts

# 2. Crawl every admin section headlessly using that session.
ADMIN_BASE_URL=https://admin.lydmarkets.se bun admin-smoke/crawl.ts

# 3. (optional) Distil the results down to real HTTP errors.
bun admin-smoke/report.ts
```

`ADMIN_BASE_URL` defaults to `https://admin.lydmarkets.se`. Point it at any
environment (staging, prod, `http://localhost:3001`).

## Output (gitignored)

| File | Contents |
|------|----------|
| `admin-auth.json` | Captured session cookies. **Live admin credential — never commit; delete after use.** |
| `crawl-results.json` | Per-route status, errors, failed requests |
| `shots/*.png` | Full-page screenshot per route |

## Reading the results

`crawl.ts` records every failed request, but most are **benign**:
`net::ERR_ABORTED` on `?_rsc=` URLs is just Next.js `<Link>` prefetch
cancellation as the crawler navigates away. `report.ts` strips those — only the
real 4xx/5xx responses it prints are worth acting on.

The route list in `crawl.ts` is a static snapshot of `apps/admin/app/(admin)`.
When admin sections are added or renamed, update `ROUTES` (and `DEEP` for new
list→detail drill-downs).
