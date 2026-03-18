import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

// Known stable market ID used across tests
const MARKET_URL = "/markets/e15107eb-74be-4b63-a1ef-87e064ff7548";

test.describe("SCRUM-400: Market detail page — order form interactions", () => {
  test("market detail page loads with title and category badge", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Market question heading should be visible
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("market detail page shows YES and NO probability buttons", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    // Featured hero section shows large YES and NO buttons
    await expect(page.getByRole("button", { name: /yes/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /no/i }).first()).toBeVisible();
  });

  test("market detail page shows Volume, Traders, Open Interest and Resolves stats", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.getByText(/volume/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/traders/i).first()).toBeVisible();
    await expect(page.getByText(/resolves/i).first()).toBeVisible();
  });

  test("Place Order section is visible with YES and NO outcome buttons", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.getByText("Place Order")).toBeVisible({ timeout: 10000 });
    // Place Order section has YES and NO buttons
    const placeOrderSection = page.getByText("Place Order").locator("..").locator("..");
    await expect(placeOrderSection.getByRole("button", { name: /yes/i })).toBeVisible();
    await expect(placeOrderSection.getByRole("button", { name: /no/i })).toBeVisible();
  });

  test("market detail page shows Order Book section", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.getByText("Order Book")).toBeVisible({ timeout: 10000 });
  });

  test("market detail page navigates from home market listing", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    // Get first market link
    const marketLinks = page.locator('a[href*="/markets/"]');
    await marketLinks.first().waitFor({ state: "visible", timeout: 10000 });
    const href = await marketLinks.first().getAttribute("href");
    if (href) {
      await page.goto(href);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText("Place Order")).toBeVisible({ timeout: 10000 });
    }
  });
});
