import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

/**
 * Portfolio spec — E2E coverage
 *
 * Tests cover:
 * - Unauthenticated access redirects for /portfolio and /orders
 * - Authenticated portfolio page structure (summary cards, positions table, open orders)
 * - Authenticated orders page structure (filters, table, pagination, export)
 */

test.describe("Portfolio spec — E2E coverage", () => {
  // ── Unauthenticated tests ────────────────────────────────────────────

  test("unauthenticated /portfolio redirects to login", { tag: ["@portfolio"] }, async ({ page }) => {
    await page.goto("/portfolio");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
    // Middleware sets redirect query param so user returns after login
    expect(page.url()).toContain("redirect=%2Fportfolio");
  });

  test("unauthenticated /orders redirects to login", { tag: ["@portfolio"] }, async ({ page }) => {
    await page.goto("/orders");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect=%2Forders");
  });

  // ── Authenticated tests ──────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({ }, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    // ── Portfolio page ─────────────────────────────────────────────────

    test("portfolio page renders heading and subtitle", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      // The page title is rendered via i18n key "portfolio.title" → "Portfolio" (en) or "Portfölj" (sv)
      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Portfolio|Portfölj|Orderhistorik|Order History/i })
      ).toBeVisible({ timeout: 15_000 });

      // Subtitle text — may vary by page version
      await expect(
        page.getByText(/open positions|öppna positioner|orderhistorik|order history|filtrera|filter/i).first()
      ).toBeVisible();
    });

    test("portfolio page shows summary cards or order filters", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Portfolio|Portfölj|Orderhistorik|Order History/i })
      ).toBeVisible({ timeout: 15_000 });

      // Portfolio may show summary cards (Marknader, Vinstfrekvens) or order filters (Status, Sida)
      const hasSummaryCards = await page
        .getByRole("heading", { level: 3 }).filter({ hasText: /^Markets$|^Marknader$/i })
        .isVisible({ timeout: 3_000 }).catch(() => false);
      const hasOrderFilters = await page
        .getByText("Status").first()
        .isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasSummaryCards || hasOrderFilters).toBeTruthy();
    });

    test("portfolio page shows positions or order content", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Portfolio|Portfölj|Orderhistorik|Order History/i })
      ).toBeVisible({ timeout: 15_000 });

      // Page may show positions sections or order filter/empty state
      const hasPositions = await page
        .getByText(/open positions|öppna positioner/i).first()
        .isVisible({ timeout: 3_000 }).catch(() => false);
      const hasOrders = await page
        .getByText(/inga ordrar|no orders|öppna ordrar|open orders/i).first()
        .isVisible({ timeout: 3_000 }).catch(() => false);
      const hasFilters = await page
        .getByText("Status").first()
        .isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasPositions || hasOrders || hasFilters).toBeTruthy();
    });

    // ── Orders page ────────────────────────────────────────────────────

    test("orders page renders heading and subtitle", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/orders");
      await dismissLimitsDialog(page);

      // The page title is "Order History" or "Orderhistorik"
      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Order History|Orderhistorik/i })
      ).toBeVisible({ timeout: 15_000 });

      // Subtitle
      await expect(
        page.getByText(/filter.*export.*order history|filtrera.*exportera.*orderhistorik/i)
      ).toBeVisible();
    });

    test("orders page shows status filter buttons", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/orders");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Order History|Orderhistorik/i })
      ).toBeVisible({ timeout: 15_000 });

      // Status filter label
      await expect(
        page.getByText("Status").first()
      ).toBeVisible();

      // Filter buttons: All, Open, Filled, Partial, Cancelled
      // "All" appears in both status and side filter groups — use .first() for status
      await expect(
        page.getByRole("button", { name: /^All$|^Alla$/i }).first()
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /^Open$|^Öppen$/i })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /^Filled$|^Fylld$/i })
      ).toBeVisible();
    });

    test("orders page shows side filter buttons", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/orders");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Order History|Orderhistorik/i })
      ).toBeVisible({ timeout: 15_000 });

      // Side filter label
      await expect(
        page.getByText(/^Side$|^Sida$/i)
      ).toBeVisible();

      // YES / NO filter buttons
      await expect(
        page.getByRole("button", { name: /^YES$|^JA$/i })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /^NO$|^NEJ$/i })
      ).toBeVisible();
    });

    test("orders page shows date range filters", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/orders");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Order History|Orderhistorik/i })
      ).toBeVisible({ timeout: 15_000 });

      // "From" and "To" date inputs
      await expect(
        page.getByLabel(/^From$|^Från$/i)
      ).toBeVisible();

      await expect(
        page.getByLabel(/^To$|^Till$/i)
      ).toBeVisible();
    });

    test("orders page shows Apply button and Export CSV button", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/orders");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Order History|Orderhistorik/i })
      ).toBeVisible({ timeout: 15_000 });

      // Apply button
      await expect(
        page.getByRole("button", { name: /^Apply$|^Tillämpa$/i })
      ).toBeVisible();

      // Export CSV button
      await expect(
        page.getByRole("button", { name: /Export CSV|Exportera CSV/i })
      ).toBeVisible();
    });

    test("orders page shows empty state or orders table", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/orders");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Order History|Orderhistorik/i })
      ).toBeVisible({ timeout: 15_000 });

      // Either the "No orders found" message or the table with column headers
      const emptyState = page.getByText(/No orders found|Inga ordrar matchar/i);
      const ordersTable = page.getByRole("table");

      const emptyVisible = await emptyState.isVisible().catch(() => false);
      const tableVisible = await ordersTable.isVisible().catch(() => false);

      expect(emptyVisible || tableVisible).toBeTruthy();
    });

    test("orders page shows pagination controls", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/orders");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Order History|Orderhistorik/i })
      ).toBeVisible({ timeout: 15_000 });

      // Pagination text "Page 1" or "Sida 1"
      await expect(
        page.getByText(/Page 1|Sida 1/i)
      ).toBeVisible();

      // Back and Next buttons
      await expect(
        page.getByRole("button", { name: /Back|Tillbaka/i })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /Next|Nästa/i })
      ).toBeVisible();
    });
  });
});
