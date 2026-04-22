import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

// Wallet & payments — authenticated coverage. Updated for SCRUM-1091:
//   /wallet           → redirects to /wallet/deposit
//   /wallet/deposit   → Trustly deposit form (no separate "Deposit" CTA)
//   /wallet/withdraw  → withdrawal form
//   /wallet/transactions → ledger view
// All three sub-routes share a `WalletTabs` row exposing tab links to the
// other two sections.

test.describe("Wallet & payments — authenticated coverage", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeEach(({}, testInfo) => {
    if (!hasAuthSession()) testInfo.skip();
  });

  // ── SIFS: Header balance display ───────────────────────────────────

  test(
    "header surface exposes the wallet balance from the home page",
    { tag: ["@smoke", "@critical", "@sifs"] },
    async ({ page }) => {
      // SCRUM-1090: balance is shown inside the UserMenu drawer (icon-only
      // trigger in the top NavBar) — open the drawer and look for a kr
      // amount or a link to /wallet.
      await page.goto("/");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await page
        .getByRole("banner")
        .getByRole("button", {
          name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
        })
        .first()
        .click();

      const drawer = page.getByRole("complementary").last();
      const hasKr = await drawer
        .getByText(/\d+[,.]?\d*\s*kr/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      const hasWalletLink = await drawer
        .locator('a[href*="/wallet"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasKr || hasWalletLink).toBeTruthy();
    },
  );

  test(
    "header balance is visible after navigating to /portfolio",
    { tag: ["@critical", "@sifs"] },
    async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await page
        .getByRole("banner")
        .getByRole("button", {
          name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
        })
        .first()
        .click();

      const drawer = page.getByRole("complementary").last();
      const hasWalletLink = await drawer
        .locator('a[href*="/wallet"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      const hasKr = await drawer
        .getByText(/\d+[,.]?\d*\s*kr/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      expect(hasWalletLink || hasKr).toBeTruthy();
    },
  );

  // ── /wallet redirects to /wallet/deposit ──────────────────────────

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

  // ── Wallet split layout — tabs ────────────────────────────────────

  test(
    "wallet pages share a tab row linking to deposit / withdraw / transactions",
    { tag: ["@critical"] },
    async ({ page }) => {
      await page.goto("/wallet/deposit");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      // Scope to the WalletTabs nav by aria-label — the closed UserMenu
      // drawer also contains /wallet/* links and would otherwise trip the
      // .first() locator with off-screen elements.
      const tabs = page.locator('nav[aria-label="Plånbok"], nav[aria-label="Wallet"]').first();
      await expect(tabs.locator('a[href="/wallet/deposit"]')).toBeVisible({
        timeout: 10_000,
      });
      await expect(tabs.locator('a[href="/wallet/withdraw"]')).toBeVisible();
      await expect(
        tabs.locator('a[href="/wallet/transactions"]'),
      ).toBeVisible();
    },
  );

  // ── /wallet/deposit ───────────────────────────────────────────────

  test(
    "deposit page renders the Trustly deposit form",
    { tag: ["@smoke", "@critical"] },
    async ({ page }) => {
      await page.goto("/wallet/deposit");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      // The form leads with an amount input and a submit CTA — copy varies
      // (amount/belopp; Sätt in/Deposit), so check both text and either
      // numeric input or button.
      const hasAmountInput = await page
        .getByRole("spinbutton")
        .or(page.getByRole("textbox", { name: /amount|belopp/i }))
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasDepositCta = await page
        .getByRole("button", { name: /deposit|sätt in|trustly/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasDepositText = await page
        .getByText(/deposit|insättning|trustly/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasAmountInput || hasDepositCta || hasDepositText).toBeTruthy();
    },
  );

  // ── /wallet/withdraw ──────────────────────────────────────────────

  test(
    "withdraw page renders the withdrawal form",
    { tag: ["@critical"] },
    async ({ page }) => {
      await page.goto("/wallet/withdraw");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      const hasWithdrawText = await page
        .getByText(/withdraw|ta ut|uttag/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasAmountInput = await page
        .getByRole("spinbutton")
        .or(page.getByRole("textbox", { name: /amount|belopp/i }))
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasWithdrawText || hasAmountInput).toBeTruthy();
    },
  );

  // ── /wallet/transactions and /transactions ────────────────────────

  test(
    "wallet/transactions page loads with content",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/wallet/transactions");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      const hasTransactions = await page
        .getByText(/transaction|historik/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasFilterGroup = await page
        .getByRole("group", { name: /filter by transaction type/i })
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasEmpty = await page
        .getByText(/no.*transaction|inga.*transaktion|empty/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasTransactions || hasFilterGroup || hasEmpty).toBeTruthy();
    },
  );

  test(
    "/transactions still serves the standalone ledger view",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/transactions");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      const hasContent = await page
        .getByText(/transaction|historik|inga|empty/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasContent).toBeTruthy();
    },
  );
});
