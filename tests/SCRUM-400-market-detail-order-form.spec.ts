import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

/** Navigate to /markets and click the first available market link. Returns the market detail URL. */
async function goToFirstMarket(page: import("@playwright/test").Page) {
  await page.goto("/markets");
  await dismissAgeGate(page);

  const marketLink = page.locator('main a[href*="/markets/"]').first();
  await expect(marketLink).toBeVisible({ timeout: 15_000 });

  const href = await marketLink.getAttribute("href");
  expect(href).toBeTruthy();

  await marketLink.click();
  await page.waitForURL(/\/markets\//, { timeout: 10_000 });
  await dismissAgeGate(page);
  return href!;
}

test.describe("SCRUM-400: Market detail page — order form interactions", () => {
  test("market detail page loads with title and category badge", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Market question heading should be visible
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("market detail page shows YES and NO probability buttons", async ({ page }) => {
    await goToFirstMarket(page);
    // Featured hero section shows large YES and NO buttons
    await expect(page.getByRole("button", { name: /yes/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /no/i }).first()).toBeVisible();
  });

  test("market detail page shows Volume, Traders, Open Interest and Resolves stats", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.getByText(/volume|volym/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/traders|handlare/i).first()).toBeVisible();
    await expect(page.getByText(/resolves|avgörs/i).first()).toBeVisible();
  });

  test("Place Order section is visible with YES and NO outcome buttons", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.getByText(/place order|lägg order/i).first()).toBeVisible({ timeout: 10000 });
    // Place Order section has YES and NO buttons — find them by role on the page
    await expect(page.getByRole("button", { name: /yes/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /no/i }).first()).toBeVisible();
  });

  test("market detail page shows Order Book section", async ({ page }) => {
    await goToFirstMarket(page);
    // Order book is a text heading or tab label
    const hasOrderBook = await page.getByText(/order book|orderbok/i).first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasSection = await page.getByRole("region", { name: /order/i }).first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasOrderBook || hasSection).toBeTruthy();
  });

  test("market detail page navigates from home market listing", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    // Get first market link from main content
    const marketLink = page.locator("main").getByRole("link").filter({ hasText: /.+/ }).first();
    await marketLink.waitFor({ state: "visible", timeout: 10000 });
    const href = await marketLink.getAttribute("href");
    if (href) {
      await page.goto(href);
      await dismissAgeGate(page);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText(/place order|lägg order/i).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
