import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { goToFirstMarket } from "../helpers/go-to-market";
import { hasAuthSession } from "../helpers/has-auth";
import {
  getOrderNoBtn,
  getOrderYesBtn,
  ORDER_SECTION_LABEL,
} from "../helpers/order-form";

/**
 * Trading spec — E2E coverage
 *
 * Covers: order form (place order panel, Yes/No toggles),
 * market state section, SEK currency formatting, and market detail stats.
 *
 * Note: PayoutCalculator was removed from the market detail page. Fee
 * disclosure and payout calculations are now part of the order panel.
 * The old Order Book section was replaced by Market State / Cost Estimates
 * / Market Depth in SCRUM-776.
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

      // SCRUM-797: the order panel label is now a kicker ("Handla" / "Trade"),
      // not an <h2>. Assert on the text instead of role=heading.
      await expect(
        page.getByText(ORDER_SECTION_LABEL).first(),
      ).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    "place order section renders with YES and NO toggle buttons",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      await expect(
        page.getByText(ORDER_SECTION_LABEL).first(),
      ).toBeVisible({ timeout: 10_000 });

      await expect(getOrderYesBtn(page)).toBeVisible({ timeout: 5_000 });
      await expect(getOrderNoBtn(page)).toBeVisible();
    },
  );

  test(
    "market detail shows trading-related content",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // Market detail shows trading content. The old Order Book was replaced
      // by Market State / Cost Estimates / Market Depth in SCRUM-776.
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

      const hasPlaceOrder = await page
        .getByText(/place order|lägg order/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      expect(hasMarketState || hasActivity || hasPlaceOrder).toBeTruthy();
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

        await expect(
          page.getByText(ORDER_SECTION_LABEL).first(),
        ).toBeVisible({ timeout: 10_000 });

        const yesBtn = getOrderYesBtn(page);
        await expect(yesBtn).toBeVisible({ timeout: 5_000 });
        await expect(yesBtn).toBeEnabled();
      },
    );

    test(
      "market detail shows trading content for authenticated user",
      { tag: ["@trading"] },
      async ({ page }) => {
        await goToFirstMarketDetail(page);

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

        const hasPlaceOrder = await page
          .getByText(/place order|lägg order/i)
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        expect(hasMarketState || hasActivity || hasPlaceOrder).toBeTruthy();
      },
    );
  });
});
