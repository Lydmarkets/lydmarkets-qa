import { test, expect } from "../fixtures/base";
import { isNotFoundPage } from "../helpers/not-found";

test.describe("Public pages — /blocked and /excluded", () => {
  // `/blocked` is served only to a visitor the geo gate actually rejected —
  // `apps/web/proxy.ts` 404s it for everyone else, and for everyone when geo
  // isn't enforced. The suite never runs from a blocked location, so 404 is
  // the invariant to guard: the page must not leak as a public route.
  test(
    "geo-blocked page is not reachable from an allowed location",
    { tag: ["@compliance"] },
    async ({ page }) => {
      const response = await page.goto("/blocked");

      expect(response?.status()).toBe(404);
      expect(await isNotFoundPage(page)).toBe(true);
    },
  );

  test(
    "Spelpaus exclusion page loads with explanatory content",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/excluded");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

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
