import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

// Note: the app has no <footer> element. Responsible gambling is linked from the nav.

test.describe("Compliance — cookie consent", () => {
  test("cookie banner appears for new visitors", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/cookie|kakor/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("accepting cookies dismisses banner", async ({ page }) => {
    await page.goto("/");
    const acceptButton = page.getByRole("button", { name: /accept|acceptera|godkänn/i }).first();
    if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptButton.click();
      await expect(acceptButton).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Compliance — responsible gambling nav link", () => {
  test("nav contains responsible gambling link", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await expect(
      page.getByRole("link", { name: /responsible gambling|ansvarsfullt/i }).first()
    ).toBeVisible();
  });
});

test.describe("Compliance — legal pages accessible", () => {
  test("responsible gambling page loads", async ({ page }) => {
    await page.goto("/responsible-gambling");
    await dismissAgeGate(page);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("terms of service page loads", async ({ page }) => {
    await page.goto("/terms");
    await dismissAgeGate(page);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /terms/i }).first()).toBeVisible();
  });

  test("game rules page loads", async ({ page }) => {
    await page.goto("/game-rules");
    await dismissAgeGate(page);
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /game rules/i })).toBeVisible();
  });
});
