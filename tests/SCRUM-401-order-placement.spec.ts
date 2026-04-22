import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";

// SCRUM-401: Order placement on the market detail page.
//
// Editorial-redesign trade surface (SCRUM-1081):
//   - Desktop (>=lg / 1024px): the side-rail TradePanel is the primary
//     trade interface — Yes/No toggle + amount input + "Buy {side} · {cost}"
//     CTA. The StatBand JA/NEJ price cells are `lg:pointer-events-none`.
//   - Mobile (<lg): the StatBand cells become buttons that open the
//     QuickBet modal. There is no side rail.
// Playwright's default 1280×720 viewport hits the desktop layout, so these
// tests assert the TradePanel side flow.

test.describe("SCRUM-401 — Order placement (market detail TradePanel)", () => {
  test("desktop TradePanel exposes Buy YES / Buy NO toggle", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 8000 });

    // The TradePanel renders a Yes/No outcome toggle inside the side rail.
    // The TradePanel SideButton renders <button data-side="yes|no"> inside
    // the side rail. Scope by data-side to skip the StatBand cells that
    // share the "Buy YES" / "Buy NO" copy but are pointer-events-none on
    // desktop.
    await expect(
      page.locator('button[data-side="yes"]').first(),
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.locator('button[data-side="no"]').first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test("desktop TradePanel surfaces the Trade kicker and amount field", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 8000 });

    await expect(
      page.getByText(/^trade$|^handla$/i).first(),
    ).toBeVisible({ timeout: 8000 });
    // The amount field is labelled "Amount" / "Belopp".
    const amount = page
      .getByRole("textbox", { name: /amount|belopp/i })
      .or(page.getByRole("spinbutton"))
      .first();
    await expect(amount).toBeVisible({ timeout: 8000 });
  });

  test("clicking the Yes toggle keeps you in the inline TradePanel (no modal on desktop)", async ({
    page,
  }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 8000 });

    const yesToggle = page.locator('button[data-side="yes"]').first();
    await yesToggle.click();

    // Side toggle changes the active side — no QuickBet modal should appear
    // on the desktop layout. The CTA button text updates to reflect the
    // chosen side.
    const dialog = await page
      .getByRole("dialog")
      .isVisible({ timeout: 1500 })
      .catch(() => false);
    expect(dialog).toBeFalsy();
  });

  test("desktop TradePanel exposes a Buy CTA button", async ({ page }) => {
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 8000 });

    // CTA copy: "Buy {side} · {cost}" / "Köp {side} · {cost}". Match either
    // the active label or the side toggle as a fallback.
    const cta = page
      .getByRole("button", { name: /^(buy|köp)\s+(yes|ja|no|nej)/i })
      .first();
    await expect(cta).toBeVisible({ timeout: 8000 });
  });

  test("mobile viewport opens the QuickBet modal when the JA cell is tapped", async ({
    page,
  }) => {
    // On mobile the StatBand JA cell becomes a real button (not
    // pointer-events-none) and opens the QuickBet modal — same code path
    // home cards use, just rooted at the market detail page.
    await page.setViewportSize({ width: 393, height: 851 });
    await goToFirstMarket(page);
    await expect(page.locator("main")).toBeVisible({ timeout: 8000 });

    // The mobile JA cell still uses an aria-label "Buy YES · X%" (not
    // data-side); on mobile both cells are clickable and there's no
    // pointer-events-none.
    const yesCell = page
      .getByRole("button", { name: /buy yes|köp ja/i })
      .first();
    const isVisible = await yesCell
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!isVisible) {
      // Some markets on staging are inactive (no clickable cells) — skip.
      test.skip(true, "Active YES cell not present on this market");
      return;
    }
    await yesCell.click();

    await expect(
      page.getByRole("dialog"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("/portfolio?tab=history is reachable as the post-order destination", async ({ page }) => {
    // /orders was consolidated into /portfolio?tab=history in SCRUM-776 and
    // remains there post-redesign.
    await page.goto("/portfolio?tab=history");
    const url = page.url();
    const isOnPortfolio = url.includes("/portfolio");
    const isOnAuth = url.includes("/login") || url.includes("/auth");
    if (isOnPortfolio) {
      await expect(page.locator("main")).toBeVisible({ timeout: 8000 });
    }
    expect(isOnPortfolio || isOnAuth).toBeTruthy();
  });
});
