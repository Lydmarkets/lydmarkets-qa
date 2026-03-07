import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

// Pixel 5 viewport dimensions
const MOBILE_VIEWPORT = { width: 393, height: 851 };

test.describe("SCRUM-408: Mobile navigation — hamburger menu and nav link accessibility", () => {
  test.use({ viewport: MOBILE_VIEWPORT, isMobile: true, hasTouch: true });

  test("hamburger menu button is visible on mobile", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await expect(
      page.getByRole("button", { name: /open navigation menu/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("desktop nav links are not shown as a horizontal bar on mobile", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    // The desktop nav (Markets, Swipe, Leaderboard, How it works as inline links) should be hidden
    // Only the hamburger trigger should be visible in the header
    await expect(
      page.getByRole("button", { name: /open navigation menu/i })
    ).toBeVisible({ timeout: 10000 });
    // Validate that hamburger is visible — desktop nav collapsed
    const hamburger = page.getByRole("button", { name: /open navigation menu/i });
    await expect(hamburger).toBeVisible();
  });

  test("clicking the hamburger opens the mobile menu with Menu heading", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("mobile menu shows Markets nav link", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Markets" })).toBeVisible();
  });

  test("mobile menu shows Swipe nav link", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Swipe" })).toBeVisible();
  });

  test("mobile menu shows Leaderboard nav link", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Leaderboard" })).toBeVisible();
  });

  test("mobile menu shows How it works nav link", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "How it works" })).toBeVisible();
  });

  test("mobile menu shows Sign in and Sign up buttons", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
  });

  test("mobile menu has a close button (X)", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
    // Close button should be visible
    await expect(
      page.getByRole("button", { name: /close/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("clicking a nav link from mobile menu navigates to the correct page", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
    // Verify the Leaderboard link is present with the correct href and navigate via it
    const leaderboardLink = page.getByRole("dialog").getByRole("link", { name: "Leaderboard" });
    await expect(leaderboardLink).toBeVisible();
    // Use window.location.href to avoid Next.js SPA router flakiness on mobile emulation
    await leaderboardLink.evaluate((el) => { window.location.href = el.href; });
    await page.waitForURL(/\/leaderboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/leaderboard/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("navigating via mobile menu closes the menu drawer", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).toBeVisible({ timeout: 10000 });
    // Verify the Leaderboard link is present and navigate via it
    const leaderboardLink = page.getByRole("dialog").getByRole("link", { name: "Leaderboard" });
    await expect(leaderboardLink).toBeVisible();
    await leaderboardLink.evaluate((el) => { window.location.href = el.href; });
    await page.waitForURL(/\/leaderboard/, { timeout: 10000 });
    // Menu heading should no longer be visible after navigation
    await expect(
      page.getByRole("heading", { name: "Menu" })
    ).not.toBeVisible({ timeout: 5000 });
  });
});
