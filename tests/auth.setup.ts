import { test as setup, expect } from "@playwright/test";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import * as fs from "fs";

const AUTH_FILE = "playwright/.auth/user.json";
const BOT_BASE = "https://web-bot-production-518c.up.railway.app";
const REGISTER_PASSWORD = "QaTest1234!";

type StoredCookie = { name: string; expires?: number };

function readCachedCookies(): StoredCookie[] | null {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
    const cookies = data.cookies as StoredCookie[] | undefined;
    // Match the auth session cookie ONLY. The old `|| includes("authjs")`
    // fallback matched `__Host-authjs.csrf-token` first (it also contains
    // "authjs"), which is a session cookie with expires=-1, so the check below
    // always bailed — the real session-token was never inspected.
    const sessionCookie = cookies?.find((c) => c.name.includes("session-token"));
    // Require at least 1h of cookie life left before we bother probing.
    if (
      !sessionCookie?.expires ||
      sessionCookie.expires * 1000 <= Date.now() + 3_600_000
    ) {
      return null;
    }
    return cookies ?? [];
  } catch {
    return null;
  }
}

/**
 * A non-expired session-token cookie is NOT proof of a usable session.
 * compliance-service force-ends a session server-side (reality-check idle cap,
 * default 4h — see SCRUM-1838) long before the 24h cookie expires, writing a
 * Redis `bl:user` revocation that the web app's jwt() callback rejects on every
 * request → 307 to /login. Since the nightly reuses one cookie for ~23h, it
 * routinely starts on an already-force-ended session. So probe an auth-gated
 * route with the cached cookies and only reuse when the server still serves it
 * (200); re-register otherwise.
 */
async function cachedSessionWorks(
  page: import("@playwright/test").Page,
  baseURL: string,
): Promise<boolean> {
  const cookies = readCachedCookies();
  if (!cookies) return false;
  try {
    await page.context().addCookies(cookies as Parameters<
      ReturnType<typeof page.context>["addCookies"]
    >[0]);
    // /en/portfolio is locale-prefixed + protected, so an authenticated hit is
    // a clean 200 and an unauthenticated (or force-ended) one is a 3xx to
    // /en/login. maxRedirects:0 keeps the redirect visible instead of following.
    const res = await page.request.get(`${baseURL}/en/portfolio`, {
      maxRedirects: 0,
      timeout: 30_000,
    });
    return res.status() === 200;
  } catch {
    // Playwright throws on a redirect with maxRedirects:0 — treat any non-200
    // outcome as "session no longer accepted".
    return false;
  }
}

function saveEmptyAuth(): void {
  fs.mkdirSync("playwright/.auth", { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
}

/**
 * Register a fresh account on the bot legislation build (email/password,
 * no BankID). Each setup run creates a new unique user — there is no shared
 * "e2e user" / test-session backdoor to keep alive. The session is cached in
 * AUTH_FILE for 24h+, so registration only happens about once a day.
 */
async function registerNewUser(
  page: import("@playwright/test").Page,
  baseURL: string,
): Promise<boolean> {
  try {
    // Wake the bot service first — it can cold-start on the first hit of a
    // nightly run, and a cold navigation can otherwise blow the test timeout.
    await page.request.get(`${baseURL}/`, { timeout: 60_000 }).catch(() => {});

    await page.goto(`${baseURL}/register`, { timeout: 60_000 });

    const email = `qa-e2e+${Date.now()}@lydmarkets.test`;
    const submit = page.locator('button[type="submit"]').first();
    await submit.waitFor({ state: "visible", timeout: 30_000 });

    // Re-apply the whole form on each attempt: React hydration can run after the
    // SSR'd inputs are interactive and wipe values entered too early. Both consent
    // checkboxes are required — the submit button only enables once both are
    // ticked, so we use that as the "form is ready + accepted" signal.
    // ponytail: attribute locators because the inputs expose no label/role.
    await expect(async () => {
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(REGISTER_PASSWORD);
      for (const box of await page.getByRole("checkbox").all()) {
        await box.check();
      }
      await expect(submit).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });

    await submit.click();

    // Successful registration logs straight in and leaves /register. Surface
    // the rate-limit case explicitly — it's expected if setup runs many times
    // in quick succession (the 24h session cache means production hits it ~once
    // a day, well under the limit).
    await Promise.race([
      page.waitForURL((url) => !url.pathname.includes("/register"), {
        timeout: 30_000,
      }),
      page
        .getByText(/too many attempts|för många försök/i)
        .waitFor({ timeout: 30_000 })
        .then(() => {
          throw new Error("rate limited by the registration endpoint");
        }),
    ]);

    // Save the session the moment we're authenticated — before any optional
    // post-login dialog handling, so a dialog hiccup can't discard a good session.
    await page.context().storageState({ path: AUTH_FILE });
    await dismissLimitsDialog(page).catch(() => {});
    await page.context().storageState({ path: AUTH_FILE });
    console.log(`[auth.setup] Registered + authenticated as ${email}`);
    return true;
  } catch (err) {
    console.warn("[auth.setup] Registration failed:", err);
    return false;
  }
}

setup("authenticate", { timeout: 90_000 }, async ({ page, baseURL }) => {
  const base = baseURL || BOT_BASE;

  if (await cachedSessionWorks(page, base)) {
    console.log("[auth.setup] Reusing cached session (server still accepts it)");
    return;
  }
  // Probe added the (stale) cached cookies to the context — drop them so the
  // fresh registration below starts from a clean slate.
  await page.context().clearCookies();

  // Force English locale on the saved storageState — middleware reads this
  // cookie to decide which language to serve. Tests use English text selectors.
  await page.context().addCookies([
    {
      name: "locale",
      value: "en",
      domain: new URL(base).hostname,
      path: "/",
    },
  ]);

  // Pre-accept cookie consent so the CookieBanner's modal overlay never renders
  // — it intercepts pointer events and blocks the register form (same approach
  // as fixtures/base.ts, which this setup file doesn't inherit).
  await page.context().addInitScript(() => {
    localStorage.setItem("cookieConsent", "recorded");
    localStorage.setItem("cookieConsentVersion", "1");
  });

  if (await registerNewUser(page, base)) return;

  // Registration failed — save empty auth so tests run unauthenticated
  console.warn("[auth.setup] Registration failed — running unauthenticated");
  saveEmptyAuth();
});
