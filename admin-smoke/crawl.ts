/**
 * Step 2 of the admin smoke harness — crawl every admin section.
 *
 * Reuses the session captured by `capture-session.ts`. For each route it
 * records HTTP status, login-redirect (auth/RBAC failure), error-boundary
 * text, console errors, failed network requests, and a full-page screenshot.
 * It then drills one real detail page per list view.
 *
 *   ADMIN_BASE_URL=https://admin.lydmarkets.se bun admin-smoke/crawl.ts
 *
 * Note: `net::ERR_ABORTED` on `?_rsc=` URLs is benign Next.js <Link> prefetch
 * cancellation — filter those out when reading `crawl-results.json`. Only real
 * 4xx/5xx HTTP statuses indicate backend problems.
 */
import { chromium, type Page, type Request } from "@playwright/test";

const BASE = process.env.ADMIN_BASE_URL ?? "https://admin.lydmarkets.se";
const AUTH_FILE = `${import.meta.dir}/admin-auth.json`;
const SHOTS = `${import.meta.dir}/shots`;

const ROUTES: string[] = [
  "/admin",
  "/admin/dashboard",
  "/admin/users",
  "/admin/withdrawals",
  "/admin/trades",
  "/admin/markets",
  "/admin/markets/approval",
  "/admin/markets/circuit-breaker",
  "/admin/markets/create",
  "/admin/categories",
  "/admin/compliance",
  "/admin/compliance/queue",
  "/admin/compliance/cases",
  "/admin/compliance/edd",
  "/admin/compliance/aml-reporting",
  "/admin/compliance/audit-oversight",
  "/admin/compliance/backfill",
  "/admin/aml",
  "/admin/player-activity",
  "/admin/reports",
  "/admin/reports/closed-accounts",
  "/admin/reports/inactive-accounts",
  "/admin/reports/rtp-report",
  "/admin/reports/self-exclusion",
  "/admin/responsible-gambling",
  "/admin/rg-risk",
  "/admin/risk",
  "/admin/risk/collateral",
  "/admin/risk/exposure",
  "/admin/admin-scopes",
  "/admin/settings",
  "/admin/settings/team",
  "/admin/settings/mfa",
  "/admin/translations",
];

const DEEP: { list: string; linkRe: RegExp }[] = [
  { list: "/admin/users", linkRe: /\/admin\/users\/[0-9a-f-]{8,}/ },
  { list: "/admin/markets", linkRe: /\/admin\/markets\/[0-9a-f-]{8,}/ },
  { list: "/admin/compliance/cases", linkRe: /\/admin\/compliance\/cases\/[0-9a-f-]{8,}/ },
  { list: "/admin/player-activity", linkRe: /\/admin\/player-activity\/[0-9a-f-]{8,}/ },
];

const ERROR_SIGNS = [
  /application error/i,
  /something went wrong/i,
  /internal server error/i,
  /unhandled runtime error/i,
  /this page could not be found/i,
  /500\s*[-–]\s*server/i,
];

interface RouteResult {
  route: string;
  finalUrl: string;
  status: number | null;
  redirectedToLogin: boolean;
  errorBoundary: string | null;
  consoleErrors: string[];
  failedRequests: string[];
  rendered: boolean;
  note: string;
}

function slug(route: string) {
  return route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
}

async function visit(page: Page, route: string): Promise<RouteResult> {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  const onConsole = (msg: { type(): string; text(): string }) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  };
  const onFailed = (req: Request) =>
    failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText ?? "failed"})`);
  const onResponse = (res: { status(): number; url(): string; request(): Request }) => {
    const s = res.status();
    if (s >= 400 && res.request().resourceType() !== "image") {
      failedRequests.push(`${s} ${res.url().slice(0, 160)}`);
    }
  };

  page.on("console", onConsole);
  page.on("requestfailed", onFailed);
  page.on("response", onResponse);

  let status: number | null = null;
  let note = "";
  try {
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    status = resp?.status() ?? null;
    await page.waitForTimeout(1800); // let client data fetches settle
  } catch (e) {
    note = `goto error: ${(e as Error).message.slice(0, 160)}`;
  }

  const finalUrl = page.url();
  const redirectedToLogin = finalUrl.includes("/login");

  let errorBoundary: string | null = null;
  let bodyText = "";
  try {
    bodyText = (await page.locator("body").innerText({ timeout: 5000 })) || "";
  } catch {
    /* ignore */
  }
  for (const re of ERROR_SIGNS) {
    const m = bodyText.match(re);
    if (m) {
      errorBoundary = m[0];
      break;
    }
  }

  let rendered = false;
  try {
    rendered =
      (await page.locator("main, [role=main], h1, table, form").first().isVisible({ timeout: 4000 })) ?? false;
  } catch {
    rendered = false;
  }

  try {
    await page.screenshot({ path: `${SHOTS}/${slug(route)}.png`, fullPage: true });
  } catch {
    /* ignore */
  }

  page.off("console", onConsole);
  page.off("requestfailed", onFailed);
  page.off("response", onResponse);

  return {
    route,
    finalUrl,
    status,
    redirectedToLogin,
    errorBoundary,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 8),
    failedRequests: [...new Set(failedRequests)].slice(0, 10),
    rendered: rendered && !redirectedToLogin && !errorBoundary,
    note,
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: AUTH_FILE });
const page = await context.newPage();

await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(1500);
if (page.url().includes("/login")) {
  console.error("SESSION INVALID — /admin redirected to /login. Re-run capture-session.ts.");
  await browser.close();
  process.exit(3);
}
console.log("Session OK — starting crawl.\n");

const results: RouteResult[] = [];
for (const route of ROUTES) {
  const r = await visit(page, route);
  results.push(r);
  const flag = r.rendered ? "OK  " : r.redirectedToLogin ? "AUTH" : r.errorBoundary ? "ERR " : "WARN";
  console.log(
    `[${flag}] ${route}  status=${r.status}` +
      (r.errorBoundary ? ` | boundary="${r.errorBoundary}"` : "") +
      (r.failedRequests.length ? ` | ${r.failedRequests.length} bad reqs` : "") +
      (r.consoleErrors.length ? ` | ${r.consoleErrors.length} console errs` : "") +
      (r.note ? ` | ${r.note}` : ""),
  );
}

const deepResults: RouteResult[] = [];
for (const d of DEEP) {
  try {
    await page.goto(`${BASE}${d.list}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    const href = await page
      .locator(`a[href*="${d.list}/"]`)
      .first()
      .getAttribute("href", { timeout: 4000 })
      .catch(() => null);
    const target = href && d.linkRe.test(href) ? href : null;
    if (!target) {
      console.log(`[skip] no detail link found under ${d.list}`);
      continue;
    }
    const r = await visit(page, target.replace(BASE, ""));
    deepResults.push(r);
    const flag = r.rendered ? "OK  " : r.errorBoundary ? "ERR " : "WARN";
    console.log(`[${flag}] (deep) ${r.route}  status=${r.status}`);
  } catch (e) {
    console.log(`[skip] deep ${d.list}: ${(e as Error).message.slice(0, 120)}`);
  }
}

await browser.close();

const all = [...results, ...deepResults];
await Bun.write(`${import.meta.dir}/crawl-results.json`, JSON.stringify(all, null, 2));

const ok = all.filter((r) => r.rendered).length;
const auth = all.filter((r) => r.redirectedToLogin).length;
const err = all.filter((r) => r.errorBoundary).length;
const warn = all.length - ok - auth - err;
console.log(`\n==== SUMMARY ====`);
console.log(`total=${all.length}  ok=${ok}  errorBoundary=${err}  authRedirect=${auth}  warn=${warn}`);
console.log(`results -> ${import.meta.dir}/crawl-results.json`);
console.log(`shots   -> ${SHOTS}/`);
