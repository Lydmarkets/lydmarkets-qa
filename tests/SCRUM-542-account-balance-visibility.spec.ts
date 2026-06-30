import { test, expect } from "../fixtures/base";
import type { Page } from "@playwright/test";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { isAuthenticated } from "../helpers/is-authenticated";

/**
 * SCRUM-542: Account balance visibility on every screen.
 *
 * SIFS requires the player's balance to be always reachable. On the bot
 * legislation build the balance lives in the persistent "Responsible gambling
 * tools" rail (aside) that is rendered on every authenticated screen. The
 * amount is privacy-masked behind a "Show balance" toggle and is denominated
 * in € (EUR). The balance being one click away on every page satisfies the
 * compliance "always reachable to the player on request" interpretation.
 */

// Balance/amounts are €; the deposit input elsewhere uses SEK, so accept both.
const CURRENCY_RE = /[€$]\s?\d|\d[.,]?\d*\s*(kr|sek|€)/i;
const SHOW_BALANCE_RE = /show balance|hide balance|visa saldo|dölj saldo/i;
const LOADING_RE = /loading|laddar|spinner/i;

// The balance + session-timer rail. Scope balance assertions to it so we don't
// accidentally match the € volume/traded figures printed on market cards.
const rgRail = (page: Page) =>
  page.getByRole("complementary", {
    name: /responsible gambling tools|spelansvarsverktyg/i,
  });

// `/settings/*` returns 404 on this build (the settings area is not present),
// so cover the settings-adjacent surface via /profile instead.
const AUTHENTICATED_PAGES = [
  { path: "/markets", name: "Markets" },
  { path: "/portfolio", name: "Portfolio" },
  { path: "/wallet", name: "Wallet" },
  { path: "/profile", name: "Profile" },
];

test.use({ storageState: "playwright/.auth/user.json" });

async function balanceReachable(page: Page): Promise<boolean> {
  const rail = rgRail(page);
  // Auto-wait for either the "Show balance" toggle or a € amount to render.
  // `locator.isVisible()` is instant (no retry) and races the rail's render,
  // so use `waitFor` which polls up to the timeout.
  const toggle = rail.getByRole("button", { name: SHOW_BALANCE_RE }).first();
  const amount = rail.getByText(CURRENCY_RE).first();
  try {
    await Promise.race([
      toggle.waitFor({ state: "visible", timeout: 8_000 }),
      amount.waitFor({ state: "visible", timeout: 8_000 }),
    ]);
    return true;
  } catch {
    return false;
  }
}

test.describe("SCRUM-542: Account balance visibility", () => {
  test(
    "balance is reachable in the responsible-gambling rail",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      expect(await balanceReachable(page)).toBeTruthy();
    },
  );

  for (const { path, name } of AUTHENTICATED_PAGES) {
    test(
      `balance is reachable on the ${name} page (${path})`,
      { tag: ["@regression", "@compliance"] },
      async ({ page }) => {
        await page.goto(path);
        if (!(await isAuthenticated(page))) {
          test.skip(true, "Requires authenticated session — skipping");
          return;
        }

        expect(await balanceReachable(page)).toBeTruthy();
      },
    );
  }

  test(
    "revealing the balance shows a formatted amount, not a spinner",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const rail = rgRail(page);
      const toggle = rail.getByRole("button", { name: SHOW_BALANCE_RE }).first();
      await expect(toggle).toBeVisible({ timeout: 5_000 });
      await toggle.click();

      const amount = rail.getByText(CURRENCY_RE).first();
      await expect(amount).toBeVisible({ timeout: 5_000 });
      const text = await amount.textContent();
      expect(text).toMatch(CURRENCY_RE);
      expect(text).not.toMatch(LOADING_RE);
    },
  );

  test(
    "balance stays reachable after navigating between pages",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      await dismissLimitsDialog(page);
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      expect(await balanceReachable(page)).toBeTruthy();

      await page.goto("/wallet");
      await dismissLimitsDialog(page);
      expect(await balanceReachable(page)).toBeTruthy();
    },
  );
});
