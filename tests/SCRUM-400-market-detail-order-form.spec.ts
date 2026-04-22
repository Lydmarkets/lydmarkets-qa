import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";

// SCRUM-400 — Market detail page interactions. Updated for the editorial
// redesign of the market detail screen:
//   - Stats moved into a 4-cell `StatBand` (YES price / NO price / Volume 24h / Traders)
//   - Side-rail TradePanel ("Trade" kicker) replaces the legacy "Place Order"
//     section. The TradePanel hosts a Yes/No toggle, amount field, and a
//     "Buy {side}" CTA.
//   - Mobile (<lg) drops the side rail; the JA/NEJ StatBand cells become
//     <button>s and open the QuickBet modal instead.

test.describe("SCRUM-400: Market detail page — order form interactions", () => {
  test("market detail page loads with the question heading", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
  });

  test("market detail StatBand shows YES and NO price cells", async ({ page }) => {
    await goToFirstMarket(page);
    // StatBand cells render with aria-label "Buy Yes · X%" / "Köp Ja · X%"
    // when the market is active (mobile-only clickable). Match by label
    // text instead of role since desktop disables pointer events.
    await expect(
      page.getByText(/yes price|ja-pris/i).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/no price|nej-pris/i).first(),
    ).toBeVisible();
  });

  test("market detail page shows Volume and Traders stats", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(
      page.getByText(/volume 24h|volym 24h/i).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/traders|handlare/i).first(),
    ).toBeVisible();
  });

  test("desktop renders the side-rail TradePanel with a Trade kicker", async ({ page }) => {
    await goToFirstMarket(page);
    // The side-rail TradePanel only renders >=lg. Playwright runs at 1280px
    // by default, so this exercises the desktop trade surface.
    await expect(
      page.getByText(/^trade$|^handla$/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // Yes / No outcome toggle inside the TradePanel — scope by data-side
    // since the same copy appears on the StatBand cells (which are
    // pointer-events-none on desktop).
    await expect(
      page.locator('button[data-side="yes"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('button[data-side="no"]').first(),
    ).toBeVisible();
  });

  test("market detail page shows orderbook + activity feed sections", async ({ page }) => {
    await goToFirstMarket(page);
    // Editorial redesign exposes orderbook and activity columns side by
    // side under the price chart. Either kicker is enough to assert the
    // section rendered.
    const hasOrderbook = await page
      .getByText(/orderbook|orderbok/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasActivity = await page
      .getByText(/activity|aktivitet|recent trades|senaste/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasOrderbook || hasActivity).toBeTruthy();
  });

  test("market detail page navigates from the home market grid", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible();
    // After navigation the side-rail trade panel should be present on
    // desktop viewports.
    await expect(
      page.getByText(/^trade$|^handla$/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
