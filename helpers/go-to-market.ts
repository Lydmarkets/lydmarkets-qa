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

  // Click "All" filter — "Trending/Live" may be empty on staging.
  // View tab buttons include a count badge in their accessible name
  // ("All80", "Live0", "New0"), so match that pattern. Pass a short
  // explicit timeout so a missing button doesn't consume the entire
  // 30s test budget.
  await page
    .getByRole("button", { name: /^(all|alla)\s*\d*$/i })
    .first()
    .click({ timeout: 5_000 })
    .catch(() => {});

  const marketLink = page.locator('main a[href*="/markets/"]').first();
  await expect(marketLink).toBeVisible({ timeout: 15_000 });

  const href = await marketLink.getAttribute("href");
  expect(href).toBeTruthy();

  // Navigate directly instead of clicking (avoids flaky click interception)
  await page.goto(href!);
  await dismissLimitsDialog(page);

  return href!;
}
