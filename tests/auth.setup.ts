import { test as setup, expect } from "@playwright/test";
import { dismissAgeGate } from "../helpers/age-gate";
import * as fs from "fs";

const AUTH_FILE = "playwright/.auth/user.json";

function hasValidSession(): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
    const sessionCookie = data.cookies?.find(
      (c: { name: string }) =>
        c.name.includes("session-token"),
    );
    if (!sessionCookie?.expires || sessionCookie.expires <= 0) return false;
    // Valid if more than 1 day remaining
    return sessionCookie.expires * 1000 > Date.now() + 86_400_000;
  } catch {
    return false;
  }
}

setup("authenticate via mock BankID", async ({ page }) => {
  // Skip if we already have a valid session (>1 day remaining)
  if (hasValidSession()) {
    return;
  }
  // Try login first
  await page.goto("/login");
  await dismissAgeGate(page);

  // Dismiss cookie banner if present
  const cookieAccept = page.getByRole("button", { name: /acceptera|accept/i });
  await cookieAccept.click({ timeout: 3_000 }).catch(() => {});

  // Button text depends on locale: "Sign in with BankID" (EN) / "Logga in med BankID" (SV)
  await page.getByRole("button", { name: /sign in with bankid|logga in med bankid/i }).click();

  // Wait for BankID mock to resolve — either redirect or "No account found"
  const noAccount = page.getByText(/no account found|inget konto hittat/i);
  const notOnLogin = page.waitForURL(
    (url) => !url.pathname.includes("/login"),
    { timeout: 30_000 },
  );

  await Promise.race([
    noAccount.waitFor({ timeout: 30_000 }),
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

  await page.getByRole("button", { name: /start bankid|starta bankid|mobilt bankid/i }).click();

  // Wait for Step 2 form (identity verified)
  await page.getByRole("textbox", { name: /email/i }).waitFor({ timeout: 30_000 });

  // Fill registration form
  await page.getByRole("textbox", { name: /email/i }).fill("test@lydmarkets.test");

  // Check GDPR consent
  await page.getByRole("checkbox", { name: /terms of service|användarvillkor/i }).check();

  // Submit
  await page.getByRole("button", { name: /create account|skapa konto/i }).click();

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
});
