import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

/**
 * SCRUM-541: Session timer — persistent, non-dismissible on all screens.
 *
 * The session timer (HH:MM:SS format) must be visible on every authenticated page.
 * These tests verify the timer element is present and ticking.
 *
 * NOTE: These tests require an authenticated session. When running without auth
 * setup, unauthenticated users see "Logga in" instead — the test will detect
 * this and skip gracefully.
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

test.describe("SCRUM-541: Session timer display", () => {
  test(
    "session timer is visible in the header when logged in",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      await dismissAgeGate(page);

      // Check if user is authenticated (no "Logga in" link)
      const loginLink = page.getByRole("link", { name: /logga in|log in|sign in/i });
      const isUnauthenticated = await loginLink
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isUnauthenticated) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      // Timer should be visible in the header area
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
        await dismissAgeGate(page);

        const loginLink = page.getByRole("link", { name: /logga in|log in|sign in/i });
        const isUnauthenticated = await loginLink
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        if (isUnauthenticated) {
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
      await dismissAgeGate(page);

      const loginLink = page.getByRole("link", { name: /logga in|log in|sign in/i });
      const isUnauthenticated = await loginLink
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isUnauthenticated) {
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
      await dismissAgeGate(page);

      const loginLink = page.getByRole("link", { name: /logga in|log in|sign in/i });
      const isUnauthenticated = await loginLink
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isUnauthenticated) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      // The timer area should not have a close/dismiss button
      const header = page.locator("header, [role='banner']").first();
      const timerEl = header.getByText(TIMER_REGEX);
      await expect(timerEl).toBeVisible({ timeout: 5_000 });

      // No close button near the timer
      const closeBtn = header.getByRole("button", { name: /close|dismiss|stäng|dölj/i });
      await expect(closeBtn).toBeHidden();
    },
  );
});
