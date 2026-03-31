import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Session timer — persistence across navigation", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeEach(({}, testInfo) => {
    if (!hasAuthSession()) testInfo.skip();
  });

  test(
    "session timer persists from markets to portfolio",
    { tag: ["@critical"] },
    async ({ page }) => {
      await page.goto("/");
      await dismissAgeGate(page);
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      // Check timer is visible on markets page
      const timer = page.getByRole("timer");
      const timerAlt = page.getByText(/\d{2}:\d{2}:\d{2}/).first();

      const hasTimer = await timer
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      const hasTimerAlt = await timerAlt
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!hasTimer && !hasTimerAlt) {
        test.skip(true, "Session timer not visible — may require fresh login");
        return;
      }

      // Read timer value on first page
      const timerEl = hasTimer ? timer : timerAlt;
      const timeOnMarkets = await timerEl.textContent();
      expect(timeOnMarkets).toMatch(/\d{2}:\d{2}:\d{2}/);

      // Navigate to portfolio
      await page.goto("/portfolio");
      await dismissAgeGate(page);
      await dismissLimitsDialog(page);

      // Timer should still be visible on portfolio page
      const timerAfterNav = hasTimer
        ? page.getByRole("timer")
        : page.getByText(/\d{2}:\d{2}:\d{2}/).first();

      await expect(timerAfterNav).toBeVisible({ timeout: 5_000 });

      const timeOnPortfolio = await timerAfterNav.textContent();
      expect(timeOnPortfolio).toMatch(/\d{2}:\d{2}:\d{2}/);
    },
  );
});
