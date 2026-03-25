import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

// Auth-required routes (/orders, /portfolio, /wallet, /watchlist) redirect to /login.
// Those flows are covered by SCRUM-401 (order placement) and SCRUM-403 (portfolio).

test.describe("Trading flows", () => {
  test("browse markets page loads with market listings", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);
    await expect(page.locator("main").first()).toBeVisible();
    const hasSearch = await page
      .getByPlaceholder(/search markets|sök marknader/i)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const hasMarkets = await page
      .getByRole("heading", { level: 2 })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    expect(hasMarkets || hasSearch).toBeTruthy();
  });

  test("market detail page loads and shows order form", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);
    // Find first market card link by href pattern
    const marketLink = page.locator('a[href^="/markets/"]').first();
    const href = await marketLink.getAttribute("href", { timeout: 8000 }).catch(() => null);
    if (href) {
      await page.goto(href);
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
      const hasOrderForm =
        (await page
          .getByRole("button", { name: /yes|no/i })
          .first()
          .isVisible({ timeout: 8000 })
          .catch(() => false));
      expect(hasOrderForm).toBeTruthy();
    }
  });

  test("auth-protected pages redirect to login when unauthenticated", async ({ page }) => {
    for (const route of ["/portfolio", "/wallet", "/watchlist"]) {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 8000 });
      expect(page.url()).toMatch(/\/login/);
    }
  });
});
