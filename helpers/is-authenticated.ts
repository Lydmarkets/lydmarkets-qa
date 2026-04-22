import type { Page } from "@playwright/test";

/**
 * Returns true if the page has an authenticated NextAuth session.
 *
 * Pre-SCRUM-1090 the helper waited for nav links (`/wallet`, `/settings`,
 * `/portfolio`) to render in the banner. Those links moved into the unified
 * UserMenu drawer (icon-only trigger), so the previous DOM signal stopped
 * working. We now read the Auth.js session cookie directly — the cookie is
 * set by `auth.setup.ts` via the test endpoint or BankID mock.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some(
    (c) =>
      (c.name === "authjs.session-token" ||
        c.name === "__Secure-authjs.session-token" ||
        c.name === "next-auth.session-token" ||
        c.name === "__Secure-next-auth.session-token") &&
      Boolean(c.value),
  );
}
