import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { SESSION_TIMER_REGEX, openUserMenu } from "../helpers/user-menu";

test.describe("Session timer — persistence across navigation", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test(
    "session timer persists from markets to portfolio",
    { tag: ["@critical"] },
    async ({ page }) => {
      // SCRUM-1090 moved the timer into the UserMenu drawer and changed the
      // format from `HH:MM:SS` to `"X min"` / `"Y tim X min"` — see
      // SESSION_TIMER_REGEX.
      await page.goto("/");
      await dismissLimitsDialog(page);
      await expect(page).not.toHaveURL(/\/login/);

      await openUserMenu(page);
      const timer = page.getByText(SESSION_TIMER_REGEX).first();
      await expect(timer).toBeVisible({ timeout: 10_000 });
      expect(await timer.textContent()).toMatch(SESSION_TIMER_REGEX);

      await page.goto("/portfolio");
      await dismissLimitsDialog(page);
      await expect(page).not.toHaveURL(/\/login/);

      await openUserMenu(page);
      const timerAfterNav = page.getByText(SESSION_TIMER_REGEX).first();
      await expect(timerAfterNav).toBeVisible({ timeout: 10_000 });
      expect(await timerAfterNav.textContent()).toMatch(SESSION_TIMER_REGEX);
    },
  );
});
