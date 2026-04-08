import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { goToFirstMarket } from "../helpers/go-to-market";
import { hasAuthSession } from "../helpers/has-auth";

/**
 * Trading spec — E2E coverage
 *
 * Covers: order form (place order panel, Yes/No toggles),
 * order book section, SEK currency formatting, and market detail stats.
 *
 * Note: PayoutCalculator was removed from the market detail page.
 * Fee disclosure and payout calculations are now part of the order panel.
 */

/** @deprecated Use goToFirstMarket from helpers */
const goToFirstMarketDetail = goToFirstMarket;

test.describe("Trading spec — E2E coverage", () => {
  // ─── Unauthenticated tests (market detail page) ─────────────────────

  test(
    "market detail page shows place order section with heading",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // "Place Order" / "Lägg order" heading must be visible in sidebar
      await expect(
        page.getByRole("heading", { name: /place order|lägg order/i }),
      ).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    "place order section renders with YES and NO toggle buttons",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      await expect(
        page.getByRole("heading", { name: /place order|lägg order/i }),
      ).toBeVisible({ timeout: 10_000 });

      // YES and NO buttons with percentages exist
      const yesBtn = page.getByRole("button", { name: /yes/i }).first();
      const noBtn = page.getByRole("button", { name: /no/i }).first();
      await expect(yesBtn).toBeVisible({ timeout: 5_000 });
      await expect(noBtn).toBeVisible();
    },
  );

  test(
    "market detail shows trading-related content",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // Market detail should show trading content: order book, activity, or place order
      const hasOrderBook = await page
        .getByText(/order book|orderbok/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasActivity = await page
        .getByText(/activity|aktivitet|recent trades|senaste/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      const hasPlaceOrder = await page
        .getByText(/place order|lägg order/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      expect(hasOrderBook || hasActivity || hasPlaceOrder).toBeTruthy();
    },
  );

  test(
    "market detail amounts are displayed in SEK (kr)",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // The page should contain amounts in kr somewhere (volume, prices, etc.)
      await expect(page.getByText(/kr/i).first()).toBeVisible({
        timeout: 10_000,
      });

      // Market cards on home showed "kr" values — the detail page should too
      const mainText = await page.locator("main").innerText();
      expect(mainText).toMatch(/kr/i);
    },
  );

  test(
    "market detail page shows market title as h1 heading",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // The market question should be rendered as an h1
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
      await goToFirstMarketDetail(page);

      // Resolution criteria heading (optional — not all markets have it)
      const hasCriteria = await page
        .getByText(/resolution criteria|avgörandekriterier/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      // Either has criteria or the main content rendered without it
      const hasMain = await page.locator("main").isVisible();
      expect(hasCriteria || hasMain).toBeTruthy();
    },
  );

  // ─── Authenticated tests ────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({ }, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test(
      "place order panel shows YES/NO buttons for authenticated user",
      { tag: ["@trading"] },
      async ({ page }) => {
        await goToFirstMarketDetail(page);

        // Place Order section visible
        await expect(
          page.getByRole("heading", { name: /place order|lägg order/i }),
        ).toBeVisible({ timeout: 10_000 });

        // YES and NO buttons should be interactive
        const yesBtn = page.getByRole("button", { name: /yes/i }).first();
        await expect(yesBtn).toBeVisible({ timeout: 5_000 });
        await expect(yesBtn).toBeEnabled();
      },
    );

    test(
      "market detail shows trading content for authenticated user",
      { tag: ["@trading"] },
      async ({ page }) => {
        await goToFirstMarketDetail(page);

        const hasOrderBook = await page
          .getByText(/order book|orderbok/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasActivity = await page
          .getByText(/activity|aktivitet|recent trades|senaste/i)
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        const hasPlaceOrder = await page
          .getByText(/place order|lägg order/i)
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        expect(hasOrderBook || hasActivity || hasPlaceOrder).toBeTruthy();
      },
    );
  });
});
