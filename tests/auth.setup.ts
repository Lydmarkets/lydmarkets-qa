import { test as setup, expect } from "@playwright/test";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import * as fs from "fs";

const AUTH_FILE = "playwright/.auth/user.json";
const BOT_BASE = "https://web-bot-production-518c.up.railway.app";
const REGISTER_PASSWORD = "QaTest1234!";

function hasValidSession(): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
    const sessionCookie = data.cookies?.find(
      (c: { name: string }) =>
        c.name.includes("session-token") || c.name.includes("authjs"),
    );
    if (!sessionCookie?.expires || sessionCookie.expires <= 0) return false;
    return sessionCookie.expires * 1000 > Date.now() + 86_400_000;
  } catch {
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
  if (hasValidSession()) {
    console.log("[auth.setup] Reusing cached session");
    return;
  }

  const base = baseURL || BOT_BASE;

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
