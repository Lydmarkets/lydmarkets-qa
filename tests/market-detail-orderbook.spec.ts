import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";

// Market detail — order book, recent trades, chart timeframe tabs.
//
// These three surfaces were added alongside the trade-panel rewrite. Each
// must always render on a market detail page so the rest of the page's
// layout calculations don't collapse.

test.describe("Market detail — order book + chart controls", () => {
  test(
    "page renders an Order Book region with PRICE / SIZE / TOTAL columns",
    { tag: ["@trading", "@regression"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      await expect(page.getByText(/order book/i).first()).toBeVisible({
        timeout: 10_000,
      });
      for (const label of [/price\s*\(%\)/i, /^size$/i, /total\s*\(kr\)/i]) {
        await expect(page.getByText(label).first()).toBeVisible({
          timeout: 5_000,
        });
      }
    }
  );

  test(
    "order book shows a Spread + Mid summary line",
    { tag: ["@trading", "@regression"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await expect(page.getByText(/spread\s+\d+%/i)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(/mid\s+\d+%/i)).toBeVisible();
    }
  );

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

      // Timeframe tabs are an aria tablist — labels are 1T/1D/1V/1M/3M/1Å/Allt.
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
      // Breadcrumb is "Markets / <Category> / <Question>" (CSS-uppercased).
      await expect(page.getByText(/^markets\s*\/\s*[A-Z]+\s*\//i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  );
});
