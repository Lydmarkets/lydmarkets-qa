import type { Page } from "@playwright/test";

/**
 * Returns true if the current page shows authenticated UI.
 *
 * SSR renders the unauthenticated shell first — the "Logga in" link is briefly
 * visible until NextAuth's client-side session check completes (~3s on staging).
 * This helper waits for an authenticated nav element to appear before deciding.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page
      .locator('a[href="/wallet"], a[href="/settings"], a[href="/portfolio"]')
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}
