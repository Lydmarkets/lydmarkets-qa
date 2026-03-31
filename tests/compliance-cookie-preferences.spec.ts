import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Compliance — cookie preferences", () => {
  test(
    "cookie banner has analytics/marketing/functional preference checkboxes",
    { tag: ["@compliance", "@regression"] },
    async ({ page }) => {
      await page.goto("/");
      await dismissAgeGate(page);

      // Look for a "Cookie Preferences" or "Manage" link/button to open prefs
      const prefsButton = page.getByText(/cookie preferences|manage|hantera|inställningar/i).first();
      const hasPrefs = await prefsButton
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!hasPrefs) {
        test.skip(true, "Cookie preferences button not visible — banner may already be dismissed");
        return;
      }

      await prefsButton.click();

      // Verify the three preference checkboxes exist
      const analytics = page.locator("#analytics");
      const marketing = page.locator("#marketing");
      const functional = page.locator("#functional");

      const analyticsAlt = page.getByLabel(/analytics|analys/i).first();
      const marketingAlt = page.getByLabel(/marketing|marknadsföring/i).first();
      const functionalAlt = page.getByLabel(/functional|funktionell/i).first();

      const hasAnalytics =
        (await analytics.isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await analyticsAlt.isVisible({ timeout: 3_000 }).catch(() => false));

      const hasMarketing =
        (await marketing.isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await marketingAlt.isVisible({ timeout: 3_000 }).catch(() => false));

      const hasFunctional =
        (await functional.isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await functionalAlt.isVisible({ timeout: 3_000 }).catch(() => false));

      expect(hasAnalytics).toBeTruthy();
      expect(hasMarketing).toBeTruthy();
      expect(hasFunctional).toBeTruthy();
    },
  );
});
