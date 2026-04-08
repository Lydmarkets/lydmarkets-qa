import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";

/**
 * SCRUM-542: Account balance visibility on every screen.
 *
 * SIFS requires the player's balance to be always visible. The balance is shown
 * as "Saldo: X,XX kr" in the header nav, linking to /wallet.
 *
 * NOTE: Requires authenticated session. Tests skip gracefully when unauthenticated.
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
      const loginLink = page.getByRole("link", { name: /logga in|log in|sign in/i });
      const isUnauthenticated = await loginLink
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isUnauthenticated) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      // Balance link should be visible in header, pointing to /wallet
      const balanceLink = page.locator('a[href="/wallet"]').first();
      await expect(balanceLink).toBeVisible({ timeout: 5_000 });
      await expect(balanceLink).toHaveAttribute("href", /\/wallet/);

      // Balance should display a kr amount
      await expect(balanceLink).toHaveText(BALANCE_REGEX);
    },
  );

  for (const { path, name } of AUTHENTICATED_PAGES) {
    test(
      `balance is visible on ${name} page (${path})`,
      { tag: ["@regression", "@compliance"] },
      async ({ page }) => {
        await page.goto(path);
        const loginLink = page.getByRole("link", { name: /logga in|log in|sign in/i });
        const isUnauthenticated = await loginLink
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        if (isUnauthenticated) {
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
      const loginLink = page.getByRole("link", { name: /logga in|log in|sign in/i });
      const isUnauthenticated = await loginLink
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isUnauthenticated) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      const balanceLink = page.locator('a[href="/wallet"]').first();
      await expect(balanceLink).toBeVisible({ timeout: 5_000 });

      const text = await balanceLink.textContent();
      // Should contain a number and "kr", not "Loading..." or a spinner
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

      const loginLink = page.getByRole("link", { name: /logga in|log in|sign in/i });
      const isUnauthenticated = await loginLink
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isUnauthenticated) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      // Read balance on markets page
      const balanceLink = page.locator('a[href="/wallet"]').first();
      await expect(balanceLink).toBeVisible({ timeout: 5_000 });
      const balanceOnMarkets = await balanceLink.textContent();

      // Navigate to wallet
      await page.goto("/wallet");
      await dismissLimitsDialog(page);

      // Balance should still be visible with the same amount
      const balanceLinkAfterNav = page.locator('a[href="/wallet"]').first();
      await expect(balanceLinkAfterNav).toBeVisible({ timeout: 5_000 });
      const balanceOnWallet = await balanceLinkAfterNav.textContent();

      expect(balanceOnMarkets?.trim()).toEqual(balanceOnWallet?.trim());
    },
  );
});
