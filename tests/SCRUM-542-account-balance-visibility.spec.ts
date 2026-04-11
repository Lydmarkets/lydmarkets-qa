import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { isAuthenticated } from "../helpers/is-authenticated";

/**
 * SCRUM-542: Account balance visibility on every screen.
 *
 * SIFS requires the player's balance to be always visible. The balance is shown
 * as "Saldo: X,XX kr" in the header nav, linking to /wallet.
 */

/** Matches Swedish currency format like "0,00 kr" or "1 234,50 kr" */
const BALANCE_REGEX = /[\d\s.,]+\s*kr/;

const AUTHENTICATED_PAGES = [
  { path: "/markets", name: "Markets" },
  { path: "/portfolio", name: "Portfolio" },
  { path: "/wallet", name: "Wallet" },
  { path: "/settings", name: "Settings" },
];

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("SCRUM-542: Account balance visibility", () => {
  test(
    "balance is visible in header linking to wallet",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const balanceLink = page.locator('a[href="/wallet"]').first();
      await expect(balanceLink).toBeVisible({ timeout: 5_000 });
      await expect(balanceLink).toHaveAttribute("href", /\/wallet/);

      await expect(balanceLink).toHaveText(BALANCE_REGEX);
    },
  );

  for (const { path, name } of AUTHENTICATED_PAGES) {
    test(
      `balance is visible on ${name} page (${path})`,
      { tag: ["@regression", "@compliance"] },
      async ({ page }) => {
        await page.goto(path);
        if (!(await isAuthenticated(page))) {
          test.skip(true, "Requires authenticated session — skipping");
          return;
        }

        const header = page.locator("header, [role='banner']").first();
        await expect(header.getByText(BALANCE_REGEX).first()).toBeVisible({
          timeout: 5_000,
        });
      },
    );
  }

  test(
    "balance shows formatted SEK amount, not a spinner",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const balanceLink = page.locator('a[href="/wallet"]').first();
      await expect(balanceLink).toBeVisible({ timeout: 5_000 });

      const text = await balanceLink.textContent();
      expect(text).toMatch(/\d.*kr/);
      expect(text).not.toMatch(/loading|laddar/i);
    },
  );

  test(
    "balance persists after navigating between pages",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      await dismissLimitsDialog(page);

      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const balanceLink = page.locator('a[href="/wallet"]').first();
      await expect(balanceLink).toBeVisible({ timeout: 5_000 });
      const balanceOnMarkets = await balanceLink.textContent();

      await page.goto("/wallet");
      await dismissLimitsDialog(page);

      const balanceLinkAfterNav = page.locator('a[href="/wallet"]').first();
      await expect(balanceLinkAfterNav).toBeVisible({ timeout: 5_000 });
      const balanceOnWallet = await balanceLinkAfterNav.textContent();

      expect(balanceOnMarkets?.trim()).toEqual(balanceOnWallet?.trim());
    },
  );
});
