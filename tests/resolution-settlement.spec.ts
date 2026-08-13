import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";

test.describe("Resolution & Settlement", () => {
  // ── Unauthenticated: resolved market detail page ───────────────────

  // COVERAGE GAP — the post-resolution UI (outcome badge, trading disabled) is
  // NOT covered, and cannot be from here:
  //   * the environment holds no resolved markets (28/28 ACTIVE), so the old
  //     test skipped every single night waiting for data that never arrives;
  //   * the detail page renders the market server-side and only client-fetches
  //     price-history / book-depth / price, so `page.route` cannot inject a
  //     resolved state either.
  // Mocking a RESOLVED market into the listing was tried and rejected: the API
  // never serves resolved markets in the list, so asserting on that path would
  // test behaviour the product does not implement and report a false bug.
  // To close this properly, seed one resolved market in the demo data — then
  // re-add an outcome + trading-disabled assertion here.
  //
  // What IS asserted below is the pre-resolution half of the same contract: a
  // market must state how and when it settles before anyone trades it.
  test(
    "market detail states its settlement terms before trading",
    { tag: ["@smoke", "@critical"] },
    async ({ page }) => {
      await page.goto("/markets");
      const marketLink = page.locator('main a[href*="/markets/"]').first();
      await expect(marketLink).toBeVisible({ timeout: 15_000 });
      await page.goto((await marketLink.getAttribute("href"))!);

      await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });

      // Close date is on the hero, and the "About the market" list carries the
      // resolution date plus the source that will decide the outcome.
      await expect(
        page.getByText(/closes\s+\d|stänger\s+\d/i).first(),
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/^resolves$|^avgörs$/i).first()).toBeVisible();
      await expect(
        page.getByText(/^resolution source$|^verification source$/i).first(),
      ).toBeVisible();
    },
  );

  // ── Authenticated: orders and portfolio settlement info ────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test(
      "order history tab in /portfolio loads and shows order history or empty state",
      { tag: ["@critical"] },
      async ({ page }) => {
        // /orders was consolidated into /portfolio?tab=history in SCRUM-776.
        await page.goto("/portfolio?tab=history");
        await dismissLimitsDialog(page);

        // May redirect to /login if session expired
        await expect(page).not.toHaveURL(/\/login/);

        await expect(page.locator("main").first()).toBeVisible({
          timeout: 10_000,
        });

        // Orders page should show either settled orders or empty state
        const hasSettled = await page
          .getByText(/settled|payout|won|lost|vunnen|förlorad/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasOrders = await page
          .getByText(/order|position/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasEmpty = await page
          .getByText(/no.*orders|inga.*ordrar|empty|tom/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasSettled || hasOrders || hasEmpty).toBeTruthy();
      },
    );

    test(
      "portfolio page loads and shows P&L or empty state",
      { tag: ["@regression"] },
      async ({ page }) => {
        await page.goto("/portfolio");
        await dismissLimitsDialog(page);

        await expect(page).not.toHaveURL(/\/login/);

        await expect(page.locator("main").first()).toBeVisible({
          timeout: 10_000,
        });

        // Portfolio should show P&L info, positions, or empty state
        const hasPnl = await page
          .getByText(/p&l|profit|loss|vinst|förlust|settled|avgjord/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasPositions = await page
          .getByText(/position|holding|innehav/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasEmpty = await page
          .getByText(/no.*position|inga.*position|empty|tom/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasPnl || hasPositions || hasEmpty).toBeTruthy();
      },
    );
  });
});
