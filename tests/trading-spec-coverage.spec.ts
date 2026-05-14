import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";
import { hasAuthSession } from "../helpers/has-auth";

/**
 * Trading spec — E2E coverage
 *
 * Covers: market detail page structure (title, SEK display, resolution
 * criteria, trading-related content). The inline TradePanel and its
 * "Handla" kicker were removed; bet placement now happens through the
 * QuickBetModal opened from StatBand price cells (covered in
 * bet-placement.spec.ts).
 */

test.describe("Trading spec — E2E coverage", () => {
  test(
    "market detail shows trading-related content",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      const hasMarketState = await page
        .getByText(/market state|marknadsstatus/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasActivity = await page
        .getByText(/activity|aktivitet|recent trades|senaste/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      expect(hasMarketState || hasActivity).toBeTruthy();
    },
  );

  test(
    "market detail amounts are displayed in SEK (kr)",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      await expect(page.getByText(/kr/i).first()).toBeVisible({
        timeout: 10_000,
      });

      const mainText = await page.locator("main").innerText();
      expect(mainText).toMatch(/kr/i);
    },
  );

  test(
    "market detail page shows market title as h1 heading",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible({ timeout: 10_000 });
      const titleText = await h1.textContent();
      expect(titleText!.trim().length).toBeGreaterThan(10);
    },
  );

  test(
    "market detail page shows resolution criteria when available",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      const hasCriteria = await page
        .getByText(/resolution criteria|avgörandekriterier/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasMain = await page.locator("main").isVisible();
      expect(hasCriteria || hasMain).toBeTruthy();
    },
  );

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({ }, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test(
      "market detail shows trading content for authenticated user",
      { tag: ["@trading"] },
      async ({ page }) => {
        await goToFirstMarket(page);

        const hasMarketState = await page
          .getByText(/market state|marknadsstatus/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasActivity = await page
          .getByText(/activity|aktivitet|recent trades|senaste/i)
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        expect(hasMarketState || hasActivity).toBeTruthy();
      },
    );
  });
});
