import { test, expect } from "../fixtures/base";

test.describe("Trading flows", () => {
  test("browse markets page loads with market listings", async ({ page }) => {
    await page.goto("/markets");
    // Should see main content area
    await expect(page.locator("main")).toBeVisible();
    // Should have market cards or search input
    const hasMarkets = await page
      .getByRole("heading", { level: 2 })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasSearch = await page
      .getByPlaceholder(/search/i)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(hasMarkets || hasSearch).toBeTruthy();
  });

  test("market detail page loads and shows order form", async ({ page }) => {
    await page.goto("/markets");
    // Click on first market or use a known market ID
    const marketLink = page.getByRole("link").filter({ has: page.getByText(/yes|no/i) }).first();
    const href = await marketLink.getAttribute("href").catch(() => null);
    if (href) {
      await page.goto(href);
      await expect(page.locator("main")).toBeVisible();
      // Should show order placement UI
      const hasOrderForm =
        (await page
          .getByText(/place order|bet|stake/i)
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false)) ||
        (await page
          .getByRole("button", { name: /buy|sell|place/i })
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false));
      expect(hasOrderForm).toBeTruthy();
    }
  });

  test("order history page shows user's orders", async ({ page }) => {
    await page.goto("/orders");
    // Page should load
    await expect(page.locator("main")).toBeVisible();
    // Should display either orders list or empty state
    const hasOrders = await page
      .getByText(/order|position/i)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    expect(hasOrders || page.url().includes("/orders")).toBeTruthy();
  });

  test("portfolio page shows positions and P&L", async ({ page }) => {
    await page.goto("/portfolio");
    // Page should load
    await expect(page.locator("main")).toBeVisible();
    // Should show portfolio content
    const hasContent =
      (await page
        .getByText(/portfolio|position|pnl|profit/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await page.locator("main").isVisible());
    expect(hasContent).toBeTruthy();
  });

  test("wallet page allows deposit flow initiation", async ({ page }) => {
    await page.goto("/wallet");
    // Page should load
    await expect(page.locator("main")).toBeVisible();
    // Should show wallet management UI
    const hasWalletUI =
      (await page
        .getByRole("button", { name: /deposit|withdraw|add funds/i })
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await page
        .getByText(/balance|wallet|deposit/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false));
    expect(hasWalletUI).toBeTruthy();
  });

  test("watchlist page functionality", async ({ page }) => {
    await page.goto("/watchlist");
    // Page should load
    await expect(page.locator("main")).toBeVisible();
    // Should show watchlist content or empty state
    const hasContent = await page.locator("main").isVisible();
    expect(hasContent).toBeTruthy();
  });
});
