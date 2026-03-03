import { test, expect } from "../fixtures/base";

test.describe("Compliance — cookie consent", () => {
  test("cookie banner appears for new visitors", async ({ page }) => {
    await page.goto("/");
    // Cookie banner should be visible
    await expect(
      page.getByText(/cookie|kakor/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("accepting cookies dismisses banner", async ({ page }) => {
    await page.goto("/");
    const acceptButton = page.getByRole("button", { name: /accept|acceptera|godkänn/i }).first();
    if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptButton.click();
      // Banner should disappear
      await expect(acceptButton).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Compliance — responsible gambling footer", () => {
  test("footer contains regulatory links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    // Should contain links to responsible gambling, terms, etc.
    await expect(
      footer.getByText(/responsible|ansvarsfullt|spelregler|game rules/i).first()
    ).toBeVisible();
  });
});

test.describe("Compliance — age gate pages accessible", () => {
  test("responsible gambling page loads", async ({ page }) => {
    await page.goto("/responsible-gambling");
    await expect(page.locator("main")).toBeVisible();
  });

  test("terms of service page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("main")).toBeVisible();
  });

  test("game rules page loads", async ({ page }) => {
    await page.goto("/game-rules");
    await expect(page.locator("main")).toBeVisible();
  });
});
