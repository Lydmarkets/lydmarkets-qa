import { test, expect } from "../fixtures/base";
import { isAuthenticated } from "../helpers/is-authenticated";
import { SESSION_TIMER_REGEX, openUserMenu } from "../helpers/user-menu";

/**
 * SCRUM-541: Session timer — persistent, non-dismissible on all screens.
 *
 * SCRUM-1090 relocated the session timer from the top header into the
 * UserMenu drawer (opened via the "Öppna meny" / "Open menu" hamburger).
 * The format also changed from `HH:MM:SS` to `"X min"` / `"Y tim X min"`.
 * The SessionTimer component still renders with `role="timer"` and
 * `aria-label="Session time: ..."` — it just isn't inside `<header>` /
 * `[role="banner"]` anymore.
 */

const AUTHENTICATED_PAGES = [
  { path: "/markets", name: "Markets" },
  { path: "/portfolio", name: "Portfolio" },
  { path: "/wallet", name: "Wallet" },
  { path: "/settings", name: "Settings" },
];

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("SCRUM-541: Session timer display", () => {
  test(
    "session timer is visible inside the UserMenu drawer when logged in",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      await openUserMenu(page);
      await expect(
        page.getByText(SESSION_TIMER_REGEX).first()
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  for (const { path, name } of AUTHENTICATED_PAGES) {
    test(
      `session timer is reachable from the UserMenu on ${name} page (${path})`,
      { tag: ["@regression", "@compliance"] },
      async ({ page }) => {
        await page.goto(path);
        if (!(await isAuthenticated(page))) {
          test.skip(true, "Requires authenticated session — skipping");
          return;
        }

        await openUserMenu(page);
        await expect(
          page.getByText(SESSION_TIMER_REGEX).first()
        ).toBeVisible({ timeout: 5_000 });
      },
    );
  }

  test(
    "session timer increments over time",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      await openUserMenu(page);
      const timerEl = page.getByText(SESSION_TIMER_REGEX).first();
      await expect(timerEl).toBeVisible({ timeout: 5_000 });

      const firstReading = await timerEl.textContent();

      // The new minute-level format only ticks once per minute, so wait at
      // least 60s to observe a change. Test is tagged @regression and runs
      // on the nightly cron where 70s is acceptable.
      await page.waitForTimeout(70_000);
      const secondReading = await timerEl.textContent();

      expect(firstReading).not.toEqual(secondReading);
    },
  );

  test(
    "session timer has no close/dismiss button inside the drawer",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      await openUserMenu(page);
      const timerEl = page.getByText(SESSION_TIMER_REGEX).first();
      await expect(timerEl).toBeVisible({ timeout: 5_000 });

      // The only "close" in the drawer closes the drawer itself ("Stäng meny"
      // / "Close menu") — the timer has no dedicated dismiss control.
      const timerDismiss = page.getByRole("button", {
        name: /dismiss timer|stäng timer|dölj timer/i,
      });
      await expect(timerDismiss).toBeHidden();
    },
  );
});
