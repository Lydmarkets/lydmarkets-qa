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
    "chart exposes timeframe tabs (1D default-selected)",
    { tag: ["@trading", "@regression"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      for (const name of [/^1T$/, /^1D$/, /^1V$/, /^1M$/, /^3M$/, /^1Å$/, /^Allt$/i]) {
        await expect(page.getByRole("tab", { name })).toBeVisible({
          timeout: 5_000,
        });
      }

      await expect(page.getByRole("tab", { name: /^1D$/ })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    }
  );

  test(
    "header stats row shows Volume 24h and Traders",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await expect(page.getByText(/^volume\s*24h$/i)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(/^traders$/i).first()).toBeVisible();
    }
  );

  test(
    "breadcrumb path is rendered above the market title",
    { tag: ["@trading", "@regression"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await expect(page.getByText(/^markets\s*\/\s*[A-Z]+\s*\//i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  );
});
