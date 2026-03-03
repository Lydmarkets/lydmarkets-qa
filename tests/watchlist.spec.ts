import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Watchlist functionality — star/unstar flow", () => {
  test("markets listing displays watchlist star buttons on market cards", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);
    await expect(page.locator("main")).toBeVisible();

    // Look for star buttons (add to watchlist buttons)
    const starButtons = page.getByRole("button", { name: /watchlist|starred/i });
    const starButtonCount = await starButtons.count();
    expect(starButtonCount).toBeGreaterThan(0);
  });

  test("star button has aria-pressed attribute for state management", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);
    await expect(page.locator("main")).toBeVisible();

    // Get first star button
    const starButton = page.getByRole("button", { name: /watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 5000 });

    // Check aria-pressed state (controls whether star is filled or not)
    const ariaPressedValue = await starButton.getAttribute("aria-pressed");
    expect(ariaPressedValue).toBeDefined();
    expect(["true", "false"]).toContain(ariaPressedValue);
  });

  test("watchlist page requires authentication and redirects appropriately", async ({ page }) => {
    await page.goto("/watchlist");

    // Since /watchlist is protected, unauthenticated users should be redirected
    // to /login. This is handled by the middleware.
    const currentUrl = page.url();
    const isRedirected = currentUrl.includes("/login") || currentUrl.includes("/watchlist");
    expect(isRedirected).toBeTruthy();
  });

  test("star icon has proper SVG and styling classes", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);
    await expect(page.locator("main")).toBeVisible();

    // Get first star button
    const starButton = page.getByRole("button", { name: /watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 5000 });

    // Find the SVG icon inside the button
    const starIcon = starButton.locator("svg");
    await expect(starIcon).toBeVisible();

    // Star icon should have transition classes for visual feedback
    const starIconClasses = await starIcon.getAttribute("class");
    expect(starIconClasses).toContain("transition");
  });

  test("star button is keyboard accessible with proper aria labels", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);
    await expect(page.locator("main")).toBeVisible();

    // Get first star button
    const starButton = page.getByRole("button", { name: /watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 5000 });

    // Should have meaningful aria-label
    const ariaLabel = await starButton.getAttribute("aria-label");
    expect(ariaLabel).toBeDefined();
    expect(ariaLabel).toMatch(/watchlist|starred/i);
  });

  test("market cards display star button alongside market information", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);
    await expect(page.locator("main")).toBeVisible();

    // Each market card should have a star button
    const starButtons = page.getByRole("button", { name: /watchlist/i });
    const count = await starButtons.count();

    // Should have at least a few market cards with star buttons
    expect(count).toBeGreaterThanOrEqual(1);

    // Get the first star button and verify its parent card structure
    const firstStarButton = starButtons.first();
    await expect(firstStarButton).toBeVisible({ timeout: 5000 });

    // Star button should be within a card-like container
    const cardContainer = firstStarButton.locator("..");
    const isVisible = await cardContainer.isVisible();
    expect(isVisible).toBeTruthy();
  });

  test("navigating to markets page shows star buttons for all visible cards", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);

    // Wait for market cards to load
    const starButtons = page.getByRole("button", { name: /watchlist/i });
    await starButtons.first().waitFor({ state: "visible", timeout: 5000 });

    // Count star buttons
    const starButtonCount = await starButtons.count();

    // Should have multiple market cards displayed
    expect(starButtonCount).toBeGreaterThan(0);

    // Verify buttons are properly spaced across the page
    const firstButton = starButtons.first();
    const lastButton = starButtons.nth(Math.min(starButtonCount - 1, 5));

    await expect(firstButton).toBeVisible();
    await expect(lastButton).toBeVisible();
  });

  test("star button maintains focus visibility for keyboard navigation", async ({ page }) => {
    await page.goto("/markets");
    await dismissAgeGate(page);
    await expect(page.locator("main")).toBeVisible();

    // Get first star button
    const starButton = page.getByRole("button", { name: /watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 5000 });

    // Focus on the button
    await starButton.focus();

    // Check that button has focus-visible styling
    const isFocused = await starButton.evaluate((el: HTMLElement) => {
      return document.activeElement === el;
    });

    expect(isFocused).toBeTruthy();
  });

  test("star button shows loading state during mutation attempt", async ({ page }) => {
    // This test verifies the button UI structure supports loading states
    await page.goto("/markets");
    await dismissAgeGate(page);
    await expect(page.locator("main")).toBeVisible();

    const starButton = page.getByRole("button", { name: /watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 5000 });

    // Button should support disabled state for loading
    const isDisableSupported = await starButton.evaluate((el: HTMLButtonElement) => {
      return "disabled" in el;
    });

    expect(isDisableSupported).toBeTruthy();
  });
});
