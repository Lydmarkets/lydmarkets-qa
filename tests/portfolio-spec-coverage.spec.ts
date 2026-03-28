import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";
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
      await dismissAgeGate(page);

      // The page title is rendered via i18n key "portfolio.title" → "Portfolio" (en) or "Portfölj" (sv)
      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Portfolio|Portfölj/i })
      ).toBeVisible({ timeout: 15_000 });

      // Subtitle text
      await expect(
        page.getByText(/open positions and pending orders|öppna positioner och väntande ordrar/i)
      ).toBeVisible();
    });

    test("portfolio page shows summary cards section", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissAgeGate(page);

      // Wait for the page to load
      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Portfolio|Portfölj/i })
      ).toBeVisible({ timeout: 15_000 });

      // Summary cards use CardTitle (<h3>) — scope to heading level 3 to avoid
      // matching nav/footer "Markets" links elsewhere on the page.
      await expect(
        page.getByRole("heading", { level: 3 }).filter({ hasText: /^Markets$|^Marknader$/i })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { level: 3 }).filter({ hasText: /^Open Orders$|^Öppna ordrar$/i })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { level: 3 }).filter({ hasText: /Unrealized P&L|Orealiserad V\/F/i })
      ).toBeVisible();

      await expect(
        page.getByRole("heading", { level: 3 }).filter({ hasText: /^Win Rate$|^Vinstfrekvens$/i })
      ).toBeVisible();
    });

    test("portfolio page shows Open Positions section heading", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissAgeGate(page);

      await expect(
        page.getByRole("heading", { level: 2 }).filter({ hasText: /Open Positions|Öppna positioner/i })
      ).toBeVisible({ timeout: 15_000 });
    });

    test("portfolio page shows Open Orders section heading", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissAgeGate(page);

      await expect(
        page.getByRole("heading", { level: 2 }).filter({ hasText: /Open Orders|Öppna ordrar/i })
      ).toBeVisible({ timeout: 15_000 });
    });

    test("positions table shows empty state or position rows", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissAgeGate(page);

      // Wait for page to load
      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Portfolio|Portfölj/i })
      ).toBeVisible({ timeout: 15_000 });

      // Either the empty state message is visible or the positions table is visible
      const emptyState = page.getByText(/No open positions|Inga öppna positioner/i);
      const positionsTable = page.getByRole("table").first();

      const emptyVisible = await emptyState.isVisible().catch(() => false);
      const tableVisible = await positionsTable.isVisible().catch(() => false);

      expect(emptyVisible || tableVisible).toBeTruthy();
    });

    test("open orders section shows empty state or orders table", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissAgeGate(page);

      // Wait for page to load
      await expect(
        page.getByRole("heading", { level: 2 }).filter({ hasText: /Open Orders|Öppna ordrar/i })
      ).toBeVisible({ timeout: 15_000 });

      // Either no orders message or the orders table
      const emptyState = page.getByText(/No open orders|Inga öppna ordrar/i);
      const ordersTable = page.getByRole("table").last();

      const emptyVisible = await emptyState.isVisible().catch(() => false);
      const tableVisible = await ordersTable.isVisible().catch(() => false);

      expect(emptyVisible || tableVisible).toBeTruthy();
    });

    test("summary cards display numeric values", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissAgeGate(page);

      // Wait for page to load
      await expect(
        page.getByRole("heading", { level: 1 }).filter({ hasText: /Portfolio|Portfölj/i })
      ).toBeVisible({ timeout: 15_000 });

      // The Win Rate card should display a percentage value like "0%" or "50%"
      await expect(
        page.getByText(/%/)
      ).toBeVisible();
    });

    // ── Orders page ────────────────────────────────────────────────────

    test("orders page renders heading and subtitle", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/orders");
      await dismissAgeGate(page);

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
      await dismissAgeGate(page);

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
      await dismissAgeGate(page);

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
      await dismissAgeGate(page);

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
      await dismissAgeGate(page);

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
      await dismissAgeGate(page);

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
      await dismissAgeGate(page);

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
