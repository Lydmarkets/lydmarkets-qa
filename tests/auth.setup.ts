import { test as setup } from "@playwright/test";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import * as fs from "fs";

const AUTH_FILE = "playwright/.auth/user.json";

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
 * Strategy 1: Call the test-only /api/test/create-session endpoint.
 * Requires E2E_TEST_SECRET to be set on both the web app and the test runner.
 * Returns true if a valid session was created.
 */
async function tryTestEndpoint(
  page: import("@playwright/test").Page,
  baseURL: string,
): Promise<boolean> {
  const secret = process.env.E2E_TEST_SECRET;
  if (!secret) return false;

  try {
    const res = await page.request.post(`${baseURL}/api/test/create-session`, {
      data: { secret },
    });

    if (!res.ok()) return false;

    const { token, cookieName } = (await res.json()) as {
      token: string;
      cookieName: string;
    };

    if (!token || !cookieName) return false;

    const domain = new URL(baseURL).hostname;
    const isSecure = baseURL.startsWith("https");

    await page.context().addCookies([
      {
        name: cookieName,
        value: token,
        domain,
        path: "/",
        httpOnly: true,
        secure: isSecure,
        sameSite: "Strict",
        expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      },
    ]);

    // Navigate to trigger server-side session validation and any additional
    // cookies the server needs to set (CSRF, callback URL, etc.)
    await page.goto(`${baseURL}/`);
    await dismissLimitsDialog(page);
    await page.context().storageState({ path: AUTH_FILE });
    console.log("[auth.setup] Authenticated via test endpoint");
    return true;
  } catch (err) {
    console.warn("[auth.setup] Test endpoint failed:", err);
    return false;
  }
}

/**
 * Strategy 2: Authenticate via mock BankID UI flow.
 * Works when the target environment has a BankID test/mock service configured.
 * Returns true if a valid session was created.
 */
async function tryBankIdMock(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  try {
    await page.goto("/login");
    // Dismiss cookie banner if present
    const cookieAccept = page.getByRole("button", { name: /acceptera|accept/i });
    await cookieAccept.click({ timeout: 3_000 }).catch(() => {});

    // Click BankID login
    await page
      .getByRole("button", { name: /sign in with bankid|logga in med bankid/i })
      .click();

    // Wait for BankID mock to resolve — either redirect or "No account found"
    const noAccount = page.getByText(/no account found|inget konto/i);
    const notOnLogin = page.waitForURL(
      (url) => !url.pathname.includes("/login"),
      { timeout: 15_000 },
    );

    await Promise.race([
      noAccount.waitFor({ timeout: 15_000 }),
      notOnLogin,
    ]);

    // If already logged in, save and done
    if (!page.url().includes("/login")) {
      await dismissLimitsDialog(page);
      await page.context().storageState({ path: AUTH_FILE });
      console.log("[auth.setup] Authenticated via BankID mock (existing account)");
      return true;
    }

    // No account — need to register
    await page.goto("/register");
    await cookieAccept.click({ timeout: 2_000 }).catch(() => {});

    await page
      .getByRole("button", { name: /^starta bankid$|^start bankid$/i })
      .click();

    const emailField = page.getByRole("textbox", { name: /e-postadress|email/i });
    await emailField.waitFor({ timeout: 30_000 });
    await emailField.fill("e2e-test@lydmarkets.test");

    const gdprCheckbox = page.getByRole("checkbox").first();
    await gdprCheckbox.check();

    await page
      .getByRole("button", { name: /skapa konto|create account/i })
      .click();

    await page.waitForURL((url) => !url.pathname.includes("/register"), {
      timeout: 30_000,
    });

    if (page.url().includes("/login")) {
      await page
        .getByRole("button", { name: /sign in with bankid|logga in med bankid/i })
        .click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 30_000,
      });
    }

    await dismissLimitsDialog(page);
    await page.context().storageState({ path: AUTH_FILE });
    console.log("[auth.setup] Authenticated via BankID mock (new registration)");
    return true;
  } catch {
    return false;
  }
}

setup("authenticate", { timeout: 90_000 }, async ({ page, baseURL }) => {
  if (hasValidSession()) {
    console.log("[auth.setup] Reusing cached session");
    return;
  }

  const base = baseURL || "https://web-production-bb35.up.railway.app";

  // Try strategies in order of reliability
  if (await tryTestEndpoint(page, base)) return;
  if (await tryBankIdMock(page)) return;

  // All strategies failed — save empty auth so tests run unauthenticated
  console.warn("[auth.setup] All auth strategies failed — running unauthenticated");
  saveEmptyAuth();
});
