import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Resolution & Settlement", () => {
  // ── Unauthenticated: resolved market detail page ───────────────────

  test(
    "resolved market displays outcome and disables trading",
    { tag: ["@smoke", "@critical"] },
    async ({ page }) => {
      await page.goto("/");
      // Look for any market card that shows a "Resolved" badge or status
      const resolvedBadge = page
        .getByText(/resolved|avgjord|stängd|closed/i)
        .first();
      const hasResolved = await resolvedBadge
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!hasResolved) {
        // Try scrolling to load more markets or check if there's a filter
        const loadMore = page.getByRole("button", {
          name: /load more|ladda fler/i,
        });
        const hasLoadMore = await loadMore
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        if (hasLoadMore) {
          await loadMore.click();
          await page.waitForTimeout(2_000);
        }

        const hasResolvedAfterLoad = await resolvedBadge
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        if (!hasResolvedAfterLoad) {
          test.skip(
            true,
            "No resolved markets visible on homepage — staging may not have any",
          );
          return;
        }
      }

      // Find and navigate to a resolved market
      const resolvedLink = page
        .locator('a[href*="/markets/"]')
        .filter({ hasText: /resolved|avgjord/i })
        .first();
      const hasLink = await resolvedLink
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (!hasLink) {
        test.skip(
          true,
          "Cannot find a clickable link to a resolved market",
        );
        return;
      }

      const href = await resolvedLink.getAttribute("href");
      await page.goto(href!);
      // Verify the resolved market page shows the outcome
      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      // Should show resolved status indicator
      await expect(
        page.getByText(/resolved|avgjord|settled/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      // Trading buttons (Buy Yes / Buy No) should be hidden or disabled
      const buyYes = page.getByRole("button", { name: /buy yes/i });
      const isBuyYesVisible = await buyYes
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isBuyYesVisible) {
        // If visible, it should be disabled
        await expect(buyYes).toBeDisabled();
      }
      // If not visible at all, that's also correct (hidden)
    },
  );

  // ── Authenticated: orders and portfolio settlement info ────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({}, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test(
      "orders page loads and shows order history or empty state",
      { tag: ["@critical"] },
      async ({ page }) => {
        await page.goto("/orders");
        await dismissLimitsDialog(page);

        // May redirect to /login if session expired
        if (page.url().includes("/login")) {
          test.skip(true, "Session expired — redirected to login");
          return;
        }

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

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired — redirected to login");
          return;
        }

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
