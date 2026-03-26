import { test as setup, expect } from "@playwright/test";
import { dismissAgeGate } from "../helpers/age-gate";
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

setup("authenticate via mock BankID", { timeout: 90_000 }, async ({ page }) => {
  if (hasValidSession()) {
    return;
  }

  try {
    await page.goto("/login");
    await dismissAgeGate(page);

    // Dismiss cookie banner if present
    const cookieAccept = page.getByRole("button", { name: /acceptera|accept/i });
    await cookieAccept.click({ timeout: 3_000 }).catch(() => {});

    // Click BankID login
    await page.getByRole("button", { name: /sign in with bankid|logga in med bankid/i }).click();

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
      await page.context().storageState({ path: AUTH_FILE });
      return;
    }

    // No account — need to register
    await page.goto("/register");
    await dismissAgeGate(page);

    // Dismiss cookie banner again if needed
    await cookieAccept.click({ timeout: 2_000 }).catch(() => {});

    // Step 1: Start BankID verification
    await page.getByRole("button", { name: /^starta bankid$|^start bankid$/i }).click();

    // Step 2: Wait for identity verified form
    const emailField = page.getByRole("textbox", { name: /e-postadress|email/i });
    await emailField.waitFor({ timeout: 30_000 });

    // Fill email
    await emailField.fill("e2e-test@lydmarkets.test");

    // Check GDPR consent (first checkbox — the required one)
    const gdprCheckbox = page.getByRole("checkbox").first();
    await gdprCheckbox.check();

    // Submit registration
    await page.getByRole("button", { name: /skapa konto|create account/i }).click();

    // Wait for redirect after registration
    await page.waitForURL((url) => !url.pathname.includes("/register"), {
      timeout: 30_000,
    });

    // If redirected to login, log in now
    if (page.url().includes("/login")) {
      await page.getByRole("button", { name: /sign in with bankid|logga in med bankid/i }).click();
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 30_000,
      });
    }

    await page.context().storageState({ path: AUTH_FILE });
  } catch {
    // BankID auth not available — save empty state so unauthenticated tests still run
    saveEmptyAuth();
  }
});
