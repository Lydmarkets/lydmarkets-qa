import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { dismissLimitsDialog } from "./dismiss-limits-dialog";

/**
 * Navigate to a tradable market detail page (non-zero probability on both sides).
 *
 * Scans market cards on the home page, skipping any that show a "0%" button
 * (one side has zero probability, so the QuickBet breakdown can't calculate).
 * Falls back to the second link if all cards are 0%.
 */
export async function goToFirstMarket(page: Page): Promise<string> {
  await page.goto("/");
  await dismissLimitsDialog(page);

  // Click "All" filter — "Trending/Live" may be empty on staging.
  await page
    .getByRole("button", { name: /^(all|alla)\s*\d*$/i })
    .first()
    .click({ timeout: 5_000 })
    .catch(() => {});

  // SCRUM-797 renders duplicate desktop/mobile hero sections — one is always
  // hidden via `hidden lg:block` / `lg:hidden`. Filter to visible matches so
  // the helper works on both mobile and desktop viewports.
  const marketLinks = page.locator('main a[href*="/markets/"]:visible');
  await marketLinks.first().waitFor({ state: "visible", timeout: 15_000 });
  const count = await marketLinks.count();

  // Pick the first market whose card doesn't show a "0%" button (dead side)
  for (let i = 0; i < Math.min(count, 10); i++) {
    const link = marketLinks.nth(i);
    const href = await link.getAttribute("href");
    if (!href) continue;

    const card = link.locator("..");
    const hasZero = await card
      .getByRole("button", { name: /\b0%/ })
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    if (hasZero) continue;

    await page.goto(href);
    await dismissLimitsDialog(page);
    return href;
  }

  // Fallback: skip the Featured hero card (index 0), use index 1
  const fallback = marketLinks.nth(Math.min(1, count - 1));
  const href = (await fallback.getAttribute("href"))!;
  await page.goto(href);
  await dismissLimitsDialog(page);
  return href;
}
