import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

/**
 * Portfolio spec — E2E coverage
 *
 * SCRUM-776 consolidated the old /orders page into /portfolio as a tabbed
 * interface. Tabs: Summary | Open | Processing | Settled | History. The
 * `tab` query parameter controls which tab is active (default: summary).
 *
 * Tests cover:
 * - Unauthenticated access redirects for /portfolio (and legacy /orders → 404)
 * - Authenticated portfolio page with summary cards and tab navigation
 * - History tab structure (previously the standalone /orders page)
 */

test.describe("Portfolio spec — E2E coverage", () => {
  // ── Unauthenticated tests ────────────────────────────────────────────

  test("unauthenticated /portfolio redirects to login", { tag: ["@portfolio"] }, async ({ page }) => {
    await page.goto("/portfolio");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect=%2Fportfolio");
  });

  test("legacy /orders route no longer exists (404)", { tag: ["@portfolio"] }, async ({ page }) => {
    const response = await page.goto("/orders");
    // The route was removed in SCRUM-776 — expect a 404 response from Next.js
    expect(response?.status()).toBe(404);
  });

  // ── Authenticated tests ──────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({}, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    // ── Portfolio page (summary tab) ───────────────────────────────────

    test("portfolio page renders heading and subtitle", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1, name: /portfolio|portfölj/i })
      ).toBeVisible({ timeout: 15_000 });
    });

    test("portfolio page shows tab navigation: Summary, Open, Processing, Settled, History", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      await expect(page.getByRole("tab", { name: /^summary$|^översikt$/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("tab", { name: /^open/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /^processing|^bearbetar/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /^settled|^avgjord/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /^history|^historik/i })).toBeVisible();
    });

    test("portfolio summary cards are visible on the default tab", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1, name: /portfolio|portfölj/i })
      ).toBeVisible({ timeout: 15_000 });

      // Summary cards render totals like "Markets", "Net result", "Win rate".
      // The component renders them as cards with numeric content — assert that
      // at least one of the known labels is visible.
      const markets = page.getByText(/^markets$|^marknader$/i).first();
      const winRate = page.getByText(/win rate|vinstfrekvens/i).first();
      const hasAny =
        (await markets.isVisible({ timeout: 5_000 }).catch(() => false)) ||
        (await winRate.isVisible({ timeout: 5_000 }).catch(() => false));
      expect(hasAny).toBeTruthy();
    });

    // ── History tab (replaces legacy /orders page) ─────────────────────

    test("history tab can be activated via ?tab=history", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio?tab=history");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1, name: /portfolio|portfölj/i })
      ).toBeVisible({ timeout: 15_000 });

      // The History tab trigger should be selected (aria-selected="true")
      await expect(
        page.getByRole("tab", { name: /^history|^historik/i })
      ).toHaveAttribute("aria-selected", "true");
    });

    test("history tab shows empty state or orders table", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio?tab=history");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("tab", { name: /^history|^historik/i })
      ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });

      const emptyState = page.getByText(/no orders yet|inga ordrar/i).first();
      const ordersTable = page.getByRole("table");

      const emptyVisible = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
      const tableVisible = await ordersTable.isVisible({ timeout: 3_000 }).catch(() => false);

      expect(emptyVisible || tableVisible).toBeTruthy();
    });

    test("history tab shows pagination controls (Page, Previous, Next)", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio?tab=history");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("tab", { name: /^history|^historik/i })
      ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });

      // Pagination is only rendered when there are orders. Accept either the
      // pagination controls or the empty state.
      const pageLabel = page.getByText(/^page\b|^sida\b/i).first();
      const previous = page.getByRole("button", { name: /previous|föregående/i });
      const next = page.getByRole("button", { name: /next|nästa/i });
      const emptyState = page.getByText(/no orders yet|inga ordrar/i).first();

      const hasPagination =
        (await pageLabel.isVisible({ timeout: 3_000 }).catch(() => false)) &&
        (await previous.isVisible({ timeout: 1_000 }).catch(() => false)) &&
        (await next.isVisible({ timeout: 1_000 }).catch(() => false));
      const isEmpty = await emptyState.isVisible({ timeout: 1_000 }).catch(() => false);

      expect(hasPagination || isEmpty).toBeTruthy();
    });

    // ── Open / Settled tabs ────────────────────────────────────────────

    test("open tab shows positions table or empty state", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio?tab=open");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("tab", { name: /^open/i })
      ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });

      // Either the empty state or a table
      const empty = page.getByText(/no open positions|inga öppna positioner/i).first();
      const table = page.getByRole("table");
      const hasAny =
        (await empty.isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await table.isVisible({ timeout: 3_000 }).catch(() => false));
      expect(hasAny).toBeTruthy();
    });

    test("settled tab shows settled positions or empty state", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio?tab=settled");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("tab", { name: /^settled|^avgjord/i })
      ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });

      const empty = page.getByText(/no settled|inga avgjorda/i).first();
      const table = page.getByRole("table");
      const hasAny =
        (await empty.isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await table.isVisible({ timeout: 3_000 }).catch(() => false));
      expect(hasAny).toBeTruthy();
    });
  });
});
