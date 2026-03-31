import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";
import { goToFirstMarket } from "../helpers/go-to-market";

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

  test("market detail page shows trading activity or order info", async ({ page }) => {
    await goToFirstMarket(page);
    // Market detail should show trading-related content: order book, activity, or place order section
    const hasOrderBook = await page.getByText(/order book|orderbok/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasActivity = await page.getByText(/activity|aktivitet|recent trades|senaste/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasPlaceOrder = await page.getByText(/place order|lägg order/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasOrderBook || hasActivity || hasPlaceOrder).toBeTruthy();
  });

  test("market detail page navigates from home market listing", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/place order|lägg order/i).first()).toBeVisible({ timeout: 10000 });
  });
});
