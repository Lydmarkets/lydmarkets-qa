import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Notifications — page loads", () => {
  // ── Unauthenticated redirect tests ─────────────────────────────────

  test(
    "unauthenticated /notifications redirects to login",
    { tag: ["@smoke"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/notifications");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
      await context.close();
    },
  );

  test(
    "unauthenticated /watchlist redirects to login",
    { tag: ["@smoke"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/watchlist");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
      await context.close();
    },
  );

  test(
    "unauthenticated /alerts redirects to login",
    { tag: ["@smoke"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/alerts");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
      await context.close();
    },
  );

  // ── Authenticated page load tests ──────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({}, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test(
      "notifications inbox page loads",
      { tag: ["@smoke"] },
      async ({ page }) => {
        await page.goto("/notifications");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        await expect(page.locator("main").first()).toBeVisible({
          timeout: 10_000,
        });

        const hasNotification = await page
          .getByText(/notification|avisering/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasEmpty = await page
          .getByText(/no.*notification|inga.*avisering|empty/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasHeading = await page
          .getByRole("heading")
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasNotification || hasEmpty || hasHeading).toBeTruthy();
      },
    );

    test(
      "watchlist page loads with content or empty state",
      { tag: ["@smoke"] },
      async ({ page }) => {
        await page.goto("/watchlist");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        await expect(page.locator("main").first()).toBeVisible({
          timeout: 10_000,
        });

        const hasWatchlist = await page
          .getByText(/watchlist|bevakningslista/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasEmpty = await page
          .getByText(/no.*watched|empty|inga.*bevakade/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasMarketCards = await page
          .locator('a[href*="/markets/"]')
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasWatchlist || hasEmpty || hasMarketCards).toBeTruthy();
      },
    );

    test(
      "alerts page loads",
      { tag: ["@smoke"] },
      async ({ page }) => {
        await page.goto("/alerts");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        await expect(page.locator("main").first()).toBeVisible({
          timeout: 10_000,
        });

        const hasAlerts = await page
          .getByText(/alert|prisvarning|price alert/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasEmpty = await page
          .getByText(/no.*alert|inga.*varning|empty/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasHeading = await page
          .getByRole("heading")
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasAlerts || hasEmpty || hasHeading).toBeTruthy();
      },
    );
  });
});
