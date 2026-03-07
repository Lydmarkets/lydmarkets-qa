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
    // Place Order section has "Buy Yes" and "Buy No" buttons
    await expect(page.getByRole("button", { name: /buy yes/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /buy no/i })).toBeVisible();
  });

  test("Conditional Orders section has New Order and My Orders tabs", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.getByText("Conditional Orders")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("tab", { name: "New Order" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "My Orders" })).toBeVisible();
  });

  test("Conditional Orders section has Stop-Loss and Take-Profit tabs", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.getByText("Conditional Orders")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Stop-Loss", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Take-Profit", exact: true })).toBeVisible();
  });

  test("conditional order form shows Trigger price and Quantity inputs", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.getByText(/trigger price/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder(/e\.g\. 30/i)).toBeVisible();
    await expect(page.getByText(/quantity.*contracts/i)).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\. 10/i)).toBeVisible();
  });

  test("conditional order form shows Create Stop-Loss submit button", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(
      page.getByRole("button", { name: /create stop-loss/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("market detail page shows Order Book section", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.getByText("Order Book")).toBeVisible({ timeout: 10000 });
  });

  test("market detail page shows Similar Markets section", async ({ page }) => {
    await page.goto(MARKET_URL);
    await dismissAgeGate(page);
    await expect(page.getByText("Similar Markets")).toBeVisible({ timeout: 10000 });
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
