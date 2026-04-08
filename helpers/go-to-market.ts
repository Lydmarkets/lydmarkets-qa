import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { dismissLimitsDialog } from "./dismiss-limits-dialog";

/**
 * Navigate to the first available market detail page.
 *
 * Loads the home page, extracts the first market link's href, then navigates
 * directly via page.goto() instead of clicking — avoids flaky click-based
 * navigation that times out when the browser intercepts the click.
 */
export async function goToFirstMarket(page: Page): Promise<string> {
  await page.goto("/");
  await dismissLimitsDialog(page);

  // Click "All" filter — "Trending" may be empty on staging
  await page.getByRole("button", { name: /^all$/i }).click().catch(() => {});

  const marketLink = page.locator('main a[href*="/markets/"]').first();
  await expect(marketLink).toBeVisible({ timeout: 15_000 });

  const href = await marketLink.getAttribute("href");
  expect(href).toBeTruthy();

  // Navigate directly instead of clicking (avoids flaky click interception)
  await page.goto(href!);
  await dismissLimitsDialog(page);

  return href!;
}
