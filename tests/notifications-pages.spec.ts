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
    "unauthenticated /watchlist returns 404 (route removed)",
    { tag: ["@smoke"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const response = await page.goto("/watchlist");
      expect(response?.status()).toBe(404);
      await context.close();
    },
  );

  // /alerts route removed — alerts are admin-only

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

    // /watchlist and /alerts routes have been removed from the user-facing app.
  });
});
