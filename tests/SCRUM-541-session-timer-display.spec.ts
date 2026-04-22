import { test, expect } from "../fixtures/base";
import { isAuthenticated } from "../helpers/is-authenticated";

/**
 * SCRUM-541: Session timer — persistent, non-dismissible on every authenticated
 * page. SCRUM-1090 moved the timer from the banner into the unified UserMenu
 * drawer (icon-only trigger in the top NavBar). The timer renders as a
 * mono-tabular `HH:MM:SS` string next to a Clock icon and is updated by the
 * shared `useSessionTimer` hook on every page.
 */

const TIMER_REGEX = /\d{1,2}:\d{2}(:\d{2})?/;

const AUTHENTICATED_PAGES = [
  { path: "/markets", name: "Markets" },
  { path: "/portfolio", name: "Portfolio" },
  { path: "/wallet", name: "Wallet" },
  { path: "/settings", name: "Settings" },
];

async function openUserMenu(page: import("@playwright/test").Page) {
  await page
    .getByRole("banner")
    .getByRole("button", {
      name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
    })
    .first()
    .click();
  const drawer = page.getByRole("complementary").last();
  // The drawer initially renders the anonymous shell; the session resolves
  // client-side via NextAuth and re-renders the authenticated rows (Sign
  // out + identity + clock + balance). Wait for that re-render before
  // returning so subsequent timer assertions don't race the hydration.
  await drawer
    .getByRole("button", { name: /sign out|logga ut|log ?out/i })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => {
      // Fall through — caller may still want the closed/anon drawer.
    });
  return drawer;
}

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("SCRUM-541: Session timer display (UserMenu drawer)", () => {
  test(
    "session timer is visible in the user menu drawer when logged in",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const drawer = await openUserMenu(page);
      await expect(
        drawer.getByText(TIMER_REGEX).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  for (const { path, name } of AUTHENTICATED_PAGES) {
    test(
      `session timer is visible on ${name} page (${path})`,
      { tag: ["@regression", "@compliance"] },
      async ({ page }) => {
        await page.goto(path);
        if (!(await isAuthenticated(page))) {
          test.skip(true, "Requires authenticated session — skipping");
          return;
        }

        const drawer = await openUserMenu(page);
        await expect(
          drawer.getByText(TIMER_REGEX).first(),
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

      const drawer = await openUserMenu(page);
      const timerEl = drawer.getByText(TIMER_REGEX).first();
      await expect(timerEl).toBeVisible({ timeout: 5_000 });

      const firstReading = await timerEl.textContent();
      // Wait at least a full second past the next tick so the formatted
      // value mutates. The hook ticks on a 1s interval.
      await page.waitForTimeout(2_000);
      const secondReading = await timerEl.textContent();

      expect(firstReading).not.toEqual(secondReading);
    },
  );

  test(
    "session timer cannot be dismissed from the drawer",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const drawer = await openUserMenu(page);
      await expect(
        drawer.getByText(TIMER_REGEX).first(),
      ).toBeVisible({ timeout: 5_000 });

      // The clock row has no close/dismiss control adjacent to it — only
      // the drawer itself can be closed via the top-right Close button.
      const dismissNearTimer = drawer.locator(
        "div:has(> span:has-text(/\\d{1,2}:\\d{2}/)) >> button:has-text(/close|dismiss|stäng|dölj/i)",
      );
      await expect(dismissNearTimer).toHaveCount(0);
    },
  );
});
