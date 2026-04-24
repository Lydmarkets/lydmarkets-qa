import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";
import {
  getOrderNoBtn,
  getOrderYesBtn,
  ORDER_SECTION_LABEL,
} from "../helpers/order-form";

test.describe("SCRUM-400: Market detail page — order form interactions", () => {
  test("market detail page loads with title and category badge", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    // Market question heading should be visible
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("market detail page shows YES and NO probability buttons", async ({ page }) => {
    await goToFirstMarket(page);
    // Order-form Yes/No buttons (data-side-scoped — card preview buttons skipped)
    await expect(getOrderYesBtn(page)).toBeVisible({ timeout: 10000 });
    await expect(getOrderNoBtn(page)).toBeVisible();
  });

  test("market detail page shows Volume, Traders and close-date stats", async ({ page }) => {
    // SCRUM-797 renamed "Avgörs / Resolves" to "Stänger / Closes" on the
    // detail header, and removed Open Interest.
    await goToFirstMarket(page);
    await expect(page.getByText(/volume|volym/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/traders|handlare/i).first()).toBeVisible();
    await expect(page.getByText(/closes|stänger/i).first()).toBeVisible();
  });

  test("Place Order section is visible with YES and NO outcome buttons", async ({ page }) => {
    await goToFirstMarket(page);
    // SCRUM-797: section labelled "Handla" / "Trade" (kicker div, no longer a heading)
    await expect(page.getByText(ORDER_SECTION_LABEL).first()).toBeVisible({ timeout: 10000 });
    await expect(getOrderYesBtn(page)).toBeVisible();
    await expect(getOrderNoBtn(page)).toBeVisible();
  });

  test("market detail page shows trading activity or order info", async ({ page }) => {
    await goToFirstMarket(page);
    // Market detail shows trading-related content. The old Order Book section
    // was replaced by Market State / Cost Estimates / Market Depth in SCRUM-776.
    const hasMarketState = await page.getByText(/market state|marknadsstatus/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasActivity = await page.getByText(/activity|aktivitet|recent trades|senaste/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasTradePanel = await page.getByText(ORDER_SECTION_LABEL).first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasMarketState || hasActivity || hasTradePanel).toBeTruthy();
  });

  test("market detail page navigates from home market listing", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(ORDER_SECTION_LABEL).first()).toBeVisible({ timeout: 10000 });
  });
});
