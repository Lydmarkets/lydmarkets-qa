import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";
// Auth-required routes (/orders, /portfolio, /wallet, /watchlist) redirect to /login.
// Those flows are covered by SCRUM-401 (order placement) and SCRUM-403 (portfolio).

test.describe("Trading flows", () => {
  test("browse markets page loads with market listings", async ({ page }) => {
    await page.goto("/markets");
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
    await goToFirstMarket(page);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /yes|no/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test("auth-protected pages redirect to login when unauthenticated", async ({ page }) => {
    // Post-SCRUM-797 /watchlist is publicly browsable; only /portfolio and
    // /wallet enforce auth redirects.
    for (const route of ["/portfolio", "/wallet"]) {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 8000 });
      expect(page.url()).toMatch(/\/login/);
    }
  });
});
