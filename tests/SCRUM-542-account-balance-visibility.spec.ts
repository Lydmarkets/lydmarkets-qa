import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { isAuthenticated } from "../helpers/is-authenticated";
import { BALANCE_REGEX, openUserMenu } from "../helpers/user-menu";

/**
 * SCRUM-542: Account balance visibility on every screen.
 *
 * SIFS requires the player's balance to be always reachable. SCRUM-1090
 * moved the inline `Saldo: X,XX kr` pill out of the top header and into the
 * UserMenu drawer. The balance is still always reachable via one click on
 * the "Öppna meny" / "Open menu" hamburger, satisfying the compliance
 * "always visible to the player on request" interpretation — see the note
 * on SCRUM-1092 for the planned further redesign of the drawer header.
 */

const AUTHENTICATED_PAGES = [
  { path: "/markets", name: "Markets" },
  { path: "/portfolio", name: "Portfolio" },
  { path: "/wallet", name: "Wallet" },
  { path: "/settings", name: "Settings" },
];

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("SCRUM-542: Account balance visibility", () => {
  test(
    "balance is visible inside the UserMenu drawer",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/markets");
      if (!(await isAuthenticated(page))) {
        test.skip(true, "Requires authenticated session — skipping");
        return;
      }

      await openUserMenu(page);
      await expect(
        page.getByText(BALANCE_REGEX).first()
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  for (const { path, name } of AUTHENTICATED_PAGES) {
    test(
      `balance is reachable from the UserMenu on ${name} page (${path})`,
      { tag: ["@regression", "@compliance"] },
      async ({ page }) => {
        await page.goto(path);
        if (!(await isAuthenticated(page))) {
          test.skip(true, "Requires authenticated session — skipping");
          return;
        }

        await openUserMenu(page);
        await expect(
          page.getByText(BALANCE_REGEX).first()
        ).toBeVisible({ timeout: 5_000 });
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

      await openUserMenu(page);
      const balanceEl = page.getByText(BALANCE_REGEX).first();
      await expect(balanceEl).toBeVisible({ timeout: 5_000 });

      const text = await balanceEl.textContent();
      expect(text).toMatch(/\d.*kr/i);
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

      await openUserMenu(page);
      const balanceOnMarkets = (
        await page.getByText(BALANCE_REGEX).first().textContent()
      )?.trim();

      await page.goto("/wallet");
      await dismissLimitsDialog(page);
      await openUserMenu(page);
      const balanceOnWallet = (
        await page.getByText(BALANCE_REGEX).first().textContent()
      )?.trim();

      expect(balanceOnMarkets).toBeTruthy();
      expect(balanceOnMarkets).toEqual(balanceOnWallet);
    },
  );
});
