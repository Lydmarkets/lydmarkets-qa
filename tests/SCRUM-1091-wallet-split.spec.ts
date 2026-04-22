import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

// SCRUM-1091 — split /wallet into Deposit / Withdraw / Transactions sub-pages.
//
// /wallet now redirects to /wallet/deposit. All three sub-routes share
// the same layout (PageHeaderV2 + WalletTabs).

test.describe("SCRUM-1091: /wallet split into deposit / withdraw / transactions", () => {
  test(
    "/wallet redirects to /wallet/deposit when unauthenticated → login",
    { tag: ["@critical"] },
    async ({ page }) => {
      await page.goto("/wallet");
      // The route is auth-gated, so unauth users land on /login. The
      // callback URL preserves /wallet/deposit (not /wallet) so the
      // redirect target remains visible after sign-in.
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      const url = new URL(page.url());
      const cb =
        url.searchParams.get("callbackUrl") ||
        url.searchParams.get("redirect");
      expect(cb).toMatch(/\/wallet/);
    },
  );

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({}, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test(
      "/wallet redirects to /wallet/deposit",
      { tag: ["@smoke", "@critical"] },
      async ({ page }) => {
        await page.goto("/wallet");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        await expect(page).toHaveURL(/\/wallet\/deposit$/, { timeout: 10_000 });
      },
    );

    test(
      "shared header renders the kicker, title, and tab row",
      { tag: ["@smoke"] },
      async ({ page }) => {
        await page.goto("/wallet/deposit");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        // Title is "Wallet" / "Plånbok"
        await expect(
          page.getByRole("heading", { name: /^plånbok$|^wallet$/i }),
        ).toBeVisible({ timeout: 10_000 });

        // Tab links — each sub-route is reachable from any sibling
        await expect(
          page.locator('a[href="/wallet/deposit"]').first(),
        ).toBeVisible();
        await expect(
          page.locator('a[href="/wallet/withdraw"]').first(),
        ).toBeVisible();
        await expect(
          page.locator('a[href="/wallet/transactions"]').first(),
        ).toBeVisible();
      },
    );

    test(
      "tab navigation switches the active sub-route without full reload",
      { tag: ["@regression"] },
      async ({ page }) => {
        await page.goto("/wallet/deposit");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        // The UserMenu drawer (closed) and WalletTabs both render
        // /wallet/withdraw links — scope to the WalletTabs nav by aria-label
        // so we don't accidentally click the off-screen drawer link.
        const tabs = page.locator('nav[aria-label="Plånbok"], nav[aria-label="Wallet"]').first();
        await tabs.locator('a[href="/wallet/withdraw"]').click();
        await page.waitForURL(/\/wallet\/withdraw$/, { timeout: 10_000 });

        await tabs.locator('a[href="/wallet/transactions"]').click();
        await page.waitForURL(/\/wallet\/transactions$/, { timeout: 10_000 });
      },
    );
  });
});
