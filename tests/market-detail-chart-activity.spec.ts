import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";

// Market detail — recent trades, chart timeframe tabs, header stats,
// breadcrumb. The Order Book region is intentionally absent: principal
// LMSR markets have no resting bids/asks, so the depth surface is a
// slippage curve rather than a price-ladder orderbook.

test.describe("Market detail — chart + activity + header", () => {
  test(
    "Recent Trades section is present (empty-state allowed)",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await expect(page.getByText(/recent trades/i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  );

  test(
    "chart exposes timeframe tabs (Allt default-selected)",
    { tag: ["@trading", "@regression"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      // Swedish-abbreviated timeframe tabs (untranslated on the EN bot build):
      // 1T, 1D, 1V, 1M, 3M, Allt — there is no "1Å" tab, and "Allt" (all
      // history) is the default-selected period.
      for (const name of [/^1T$/, /^1D$/, /^1V$/, /^1M$/, /^3M$/, /^Allt$/i]) {
        await expect(page.getByRole("tab", { name })).toBeVisible({
          timeout: 5_000,
        });
      }

      await expect(page.getByRole("tab", { name: /^Allt$/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    }
  );

  test(
    "header stats row shows 24h volume and trader count",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      // Stats line reads "€0 traded 24h · €948.7 total · 2 traders"
      // (no standalone "Volume 24h" label on the EUR bot build).
      await expect(page.getByText(/traded 24h/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(/traders/i).first()).toBeVisible();
    }
  );

  test(
    "breadcrumb exposes a Markets link above the market title",
    { tag: ["@trading", "@regression"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      // The breadcrumb is a single "Markets" link in the header (the old
      // "Markets / CATEGORY /" text path was removed). The category is shown
      // separately as a kicker above the title.
      const crumb = page.getByRole("link", { name: "Markets", exact: true });
      await expect(crumb.first()).toBeVisible({ timeout: 10_000 });
      await expect(crumb.first()).toHaveAttribute("href", /\/markets$/);
    }
  );
});
