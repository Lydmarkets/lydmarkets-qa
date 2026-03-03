import { test, expect } from "../fixtures/base";

test.describe("Smoke tests — critical user flows", () => {
  test("homepage loads with key elements", async ({ page }) => {
    await page.goto("/");
    // Navbar should be visible
    await expect(page.locator("nav")).toBeVisible();
    // Page should have at least one market card or heading
    await expect(
      page.getByRole("heading").first()
    ).toBeVisible();
  });

  test("auth page renders login form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("auth page switches to signup mode", async ({ page }) => {
    await page.goto("/auth?mode=signup");
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
  });

  test("markets page loads", async ({ page }) => {
    await page.goto("/markets");
    await expect(page.locator("main")).toBeVisible();
  });

  test("search page loads and accepts input", async ({ page }) => {
    await page.goto("/search");
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("test");
    // Should not crash
    await expect(page.locator("main")).toBeVisible();
  });

  test("leaderboard page loads", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.locator("main")).toBeVisible();
  });

  test("how it works page loads", async ({ page }) => {
    await page.goto("/how-it-works");
    await expect(page.locator("main")).toBeVisible();
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
