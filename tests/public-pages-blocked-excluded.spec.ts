import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Public pages — /blocked and /excluded", () => {
  test(
    "geo-blocked page loads with explanatory content",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/blocked");
      await dismissAgeGate(page);

      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });

      const hasHeading = await page
        .getByRole("heading")
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasBlockedText = await page
        .getByText(/blocked|not available|sweden|ej tillgänglig/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasHeading || hasBlockedText).toBeTruthy();
    },
  );

  test(
    "Spelpaus exclusion page loads with explanatory content",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/excluded");
      await dismissAgeGate(page);

      await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });

      const hasHeading = await page
        .getByRole("heading")
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasExcludedText = await page
        .getByText(/excluded|spelpaus|avstängd/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasHeading || hasExcludedText).toBeTruthy();
    },
  );
});
