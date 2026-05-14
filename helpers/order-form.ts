import type { Locator, Page } from "@playwright/test";

/**
 * Order-flow locators.
 *
 * The inline TradePanel (Yes/No toggle buttons in the right sidebar of
 * the detail page) has been removed: bet placement on every viewport now
 * happens through the shared QuickBetModal, which is opened from the
 * StatBand price cells at the top of the market detail hero or from the
 * probability pills on MarketCard / FeaturedMarket / MarketsTable rows.
 *
 * Use `getQuickBetYesTrigger` / `getQuickBetNoTrigger` for the modal flow.
 */

export function getQuickBetYesTrigger(page: Page): Locator {
  return page.getByRole("button", { name: /^(köp ja|buy yes)\b/i }).first();
}

export function getQuickBetNoTrigger(page: Page): Locator {
  return page.getByRole("button", { name: /^(köp nej|buy no)\b/i }).first();
}

export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
