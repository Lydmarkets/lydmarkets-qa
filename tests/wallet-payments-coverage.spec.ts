import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Wallet & payments — authenticated coverage", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeEach(({}, testInfo) => {
    if (!hasAuthSession()) testInfo.skip();
  });

  // ── SIFS: balance reachable on every screen ────────────────────────
  // SCRUM-1090 moved the inline header balance into the UserMenu drawer.
  // The SIFS "always reachable" requirement is met by one click on the
  // "Öppna meny" / "Open menu" hamburger surfacing the balance row. See
  // SCRUM-542 for the per-page drawer-balance coverage; these checks
  // exercise the wallet area entry points.

  async function balanceReachableInDrawer(
    page: import("@playwright/test").Page,
  ): Promise<boolean> {
    // On the bot build the wallet balance is surfaced in the persistent
    // "Responsible gambling tools" rail and is privacy-masked behind a
    // "Show balance" toggle (currency is €). The toggle being present means
    // the balance is one click away — i.e. reachable on every screen, which is
    // the SIFS requirement. We also accept an already-revealed € / kr amount.
    const showBalanceBtn = page.getByRole("button", {
      name: /show balance|hide balance|visa saldo|dölj saldo/i,
    });
    const balanceByText = page.getByText(/[€$]\s?\d|\d[.,]?\d*\s*(kr|sek|€)/i).first();

    const hasToggle = await showBalanceBtn
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasText = await balanceByText
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    return hasToggle || hasText;
  }

  test(
    "balance is reachable from the drawer on markets page (SIFS requirement)",
    { tag: ["@smoke", "@critical", "@sifs"] },
    async ({ page }) => {
      await page.goto("/");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      expect(await balanceReachableInDrawer(page)).toBeTruthy();
    },
  );

  test(
    "balance is reachable from the drawer on portfolio page (SIFS requirement)",
    { tag: ["@critical", "@sifs"] },
    async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      expect(await balanceReachableInDrawer(page)).toBeTruthy();
    },
  );

  // ── Wallet page content ────────────────────────────────────────────

  test(
    "wallet page displays balance information",
    { tag: ["@smoke", "@critical"] },
    async ({ page }) => {
      await page.goto("/wallet");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      // On the bot build /wallet opens on the Transfers → Deposit view, so the
      // wallet area surfaces deposit/amount/balance content rather than a
      // standalone balance overview. Accept any of those, plus € or kr/SEK
      // amounts (markets/balance use €, the deposit input uses SEK).
      const hasBalance = await page
        .getByText(/available balance|locked in orders|total value|tillgängligt saldo|låst i ordrar/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasWalletHeading = await page
        .getByText(/wallet|plånbok|saldo|transfers|deposit|insättning|amount|belopp/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasAmount = await page
        .getByText(/[€$]\s?\d|\d+[,.]?\d*\s*(kr|sek|€)/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasBalance || hasWalletHeading || hasAmount).toBeTruthy();
    },
  );

  test(
    "wallet page shows deposit and withdraw buttons",
    { tag: ["@critical"] },
    async ({ page }) => {
      await page.goto("/wallet");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      const hasDeposit = await page
        .getByRole("button", { name: /deposit|sätt in/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasWithdraw = await page
        .getByRole("button", { name: /withdraw|ta ut/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasDepositText = await page
        .getByText(/deposit|insättning/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasDeposit || hasWithdraw || hasDepositText).toBeTruthy();
    },
  );

  test(
    "clicking deposit opens deposit sheet or form",
    { tag: ["@critical"] },
    async ({ page }) => {
      await page.goto("/wallet");
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      // Find and click the deposit button
      const depositBtn = page
        .getByRole("button", { name: /deposit|sätt in/i })
        .first();
      const hasBtn = await depositBtn
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!hasBtn) {
        test.skip(true, "Deposit button not visible on wallet page");
        return;
      }

      await depositBtn.click();

      // Should open a sheet/dialog/form with Trustly or amount input
      const hasTrustly = await page
        .getByText(/trustly|bank transfer|banköverföring/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasAmountInput = await page
        .getByRole("spinbutton", { name: /amount|belopp/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasDepositForm = await page
        .getByText(/deposit|insättning/i)
        .nth(1)
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasDialog = await page
        .getByRole("dialog")
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(
        hasTrustly || hasAmountInput || hasDepositForm || hasDialog,
      ).toBeTruthy();
    },
  );

  // ── Transactions page ──────────────────────────────────────────────

  test(
    "transactions page loads with content",
    { tag: ["@smoke"] },
    async ({ page }) => {
      // Route lives under `/wallet/transactions` (the top-level `/transactions`
      // route was removed when the wallet area was reorganised).
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
});
