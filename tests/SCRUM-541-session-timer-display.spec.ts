import { test, expect } from "../fixtures/base";
import { isAuthenticated } from "../helpers/is-authenticated";
/**
 * SCRUM-541: Session timer — persistent, non-dismissible on all screens.
 *
 * The session timer (HH:MM:SS format) must be visible on every authenticated page.
 * These tests verify the timer element is present and ticking.
 */

/** Matches HH:MM:SS or MM:SS timer format */
const TIMER_REGEX = /\d{1,2}:\d{2}(:\d{2})?/;

/** Pages to verify timer presence across the app */
const AUTHENTICATED_PAGES = [
  { path: "/markets", name: "Markets" },
  { path: "/portfolio", name: "Portfolio" },
  { path: "/wallet", name: "Wallet" },
  { path: "/settings", name: "Settings" },
];

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("SCRUM-541: Session timer display", () => {
  test(
    "session timer is visible in the header when logged in",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const header = page.locator("header, [role='banner']").first();
      await expect(header.getByText(TIMER_REGEX)).toBeVisible({ timeout: 5_000 });
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

        const header = page.locator("header, [role='banner']").first();
        await expect(header.getByText(TIMER_REGEX)).toBeVisible({ timeout: 5_000 });
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

      const header = page.locator("header, [role='banner']").first();
      const timerEl = header.getByText(TIMER_REGEX);
      await expect(timerEl).toBeVisible({ timeout: 5_000 });

      const firstReading = await timerEl.textContent();

      // Wait 3 seconds and verify the timer has changed
      await page.waitForTimeout(3_000);
      const secondReading = await timerEl.textContent();

      expect(firstReading).not.toEqual(secondReading);
    },
  );

  test(
    "session timer has no close/dismiss button",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const header = page.locator("header, [role='banner']").first();
      const timerEl = header.getByText(TIMER_REGEX);
      await expect(timerEl).toBeVisible({ timeout: 5_000 });

      const closeBtn = header.getByRole("button", { name: /close|dismiss|stäng|dölj/i });
      await expect(closeBtn).toBeHidden();
    },
  );
});
