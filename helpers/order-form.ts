import type { Locator, Page } from "@playwright/test";

/**
 * Order-flow locators.
 *
 * Since the Kalshi redesign (SCRUM-797), the detail page has two separate
 * order entry points with distinct UI on desktop vs mobile:
 *
 *   Desktop (≥lg) — inline TradePanel in the right sidebar. Yes/No toggle
 *   buttons carry `data-side="yes|no"` + `aria-pressed`. Clicking them only
 *   selects a side; there is no dialog.
 *
 *   Mobile (<lg) — the TradePanel is hidden; the StatBand price cells at the
 *   top of the hero become clickable (`lg:pointer-events-none` disables them
 *   on desktop) and open the shared QuickBetModal. The same QuickBet modal
 *   is also triggered from probability pills on MarketCard / FeaturedMarket
 *   on mobile.
 *
 * Use `getOrderYesBtn` / `getOrderNoBtn` for the desktop inline panel and
 * `getQuickBetYesTrigger` / `getQuickBetNoTrigger` for the mobile modal.
 *
 * The panel's section label is a `.lm-kicker` div reading "Handla" / "Trade"
 * (used to be an `<h2>Lägg order</h2>` before SCRUM-797).
 */
export function getOrderYesBtn(page: Page): Locator {
  return page.locator('button[data-side="yes"]');
}

export function getOrderNoBtn(page: Page): Locator {
  return page.locator('button[data-side="no"]');
}

export function getQuickBetYesTrigger(page: Page): Locator {
  return page.getByRole("button", { name: /^(köp ja|buy yes)\b/i }).first();
}

export function getQuickBetNoTrigger(page: Page): Locator {
  return page.getByRole("button", { name: /^(köp nej|buy no)\b/i }).first();
}

export const ORDER_SECTION_LABEL = /^handla$|^trade$/i;

export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;
