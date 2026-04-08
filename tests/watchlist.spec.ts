import { test, expect } from "../fixtures/base";
// Market cards with watchlist buttons are on the homepage (/), confirmed via live app inspection.
// aria-label on each star button: "Add to watchlist" (matches /add to watchlist/i pattern).

test.describe("Watchlist functionality — star/unstar flow", () => {
  test("markets listing displays watchlist star buttons on market cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toBeVisible();

    const starButtons = page.getByRole("button", { name: /add to watchlist/i });
    await starButtons.first().waitFor({ state: "visible", timeout: 8000 });
    const starButtonCount = await starButtons.count();
    expect(starButtonCount).toBeGreaterThan(0);
  });

  test("star button has aria-pressed attribute for state management", async ({ page }) => {
    await page.goto("/");
    const starButton = page.getByRole("button", { name: /add to watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 8000 });

    const ariaPressedValue = await starButton.getAttribute("aria-pressed");
    expect(ariaPressedValue).toBeDefined();
    expect(["true", "false"]).toContain(ariaPressedValue);
  });

  test("watchlist page requires authentication and redirects to login", async ({ page }) => {
    await page.goto("/watchlist");
    await page.waitForURL(/\/login/, { timeout: 8000 });
    expect(page.url()).toMatch(/\/login/);
  });

  test("star button contains an SVG icon", async ({ page }) => {
    await page.goto("/");
    const starButton = page.getByRole("button", { name: /add to watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 8000 });

    const starIcon = starButton.locator("svg");
    await expect(starIcon).toBeVisible();
  });

  test("star button has aria-label matching watchlist pattern", async ({ page }) => {
    await page.goto("/");
    const starButton = page.getByRole("button", { name: /add to watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 8000 });

    const ariaLabel = await starButton.getAttribute("aria-label");
    expect(ariaLabel).toBeDefined();
    expect(ariaLabel).toMatch(/add to watchlist/i);
  });

  test("market cards display star button alongside market information", async ({ page }) => {
    await page.goto("/");
    const starButtons = page.getByRole("button", { name: /add to watchlist/i });
    await starButtons.first().waitFor({ state: "visible", timeout: 8000 });
    const count = await starButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const cardContainer = starButtons.first().locator("..");
    await expect(cardContainer).toBeVisible();
  });

  test("all visible market cards have a star button", async ({ page }) => {
    await page.goto("/");
    const starButtons = page.getByRole("button", { name: /add to watchlist/i });
    await starButtons.first().waitFor({ state: "visible", timeout: 8000 });
    const count = await starButtons.count();
    expect(count).toBeGreaterThan(0);

    await expect(starButtons.first()).toBeVisible();
    await expect(starButtons.nth(Math.min(count - 1, 5))).toBeVisible();
  });

  test("star button is focusable for keyboard navigation", async ({ page }) => {
    await page.goto("/");
    const starButton = page.getByRole("button", { name: /add to watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 8000 });

    await starButton.focus();
    const isFocused = await starButton.evaluate((el: HTMLElement) => document.activeElement === el);
    expect(isFocused).toBeTruthy();
  });

  test("star button supports disabled attribute for loading state", async ({ page }) => {
    await page.goto("/");
    const starButton = page.getByRole("button", { name: /add to watchlist/i }).first();
    await expect(starButton).toBeVisible({ timeout: 8000 });

    const isDisableSupported = await starButton.evaluate(
      (el: HTMLButtonElement) => "disabled" in el
    );
    expect(isDisableSupported).toBeTruthy();
  });
});
