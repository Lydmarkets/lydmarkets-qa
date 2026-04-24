import type { Page } from "@playwright/test";

/**
 * Returns true if the current browser context holds a NextAuth session cookie.
 *
 * Post-SCRUM-1090 the mobile UserMenu drawer always renders links to /wallet,
 * /settings, and /portfolio — guests see them and get redirected to /login on
 * click — so DOM-based detection is unreliable. Checking the session-token
 * cookie directly is the stable signal: `globalSetup` writes it after the
 * BankID handshake, and tests that need auth apply `storageState`.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some(
    (c) =>
      (c.name.includes("session-token") || c.name.includes("authjs")) &&
      c.value.length > 0 &&
      !c.name.includes("csrf") &&
      !c.name.includes("callback"),
  );
}
