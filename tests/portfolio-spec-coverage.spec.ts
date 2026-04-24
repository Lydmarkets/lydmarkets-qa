import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

/**
 * Portfolio spec — E2E coverage
 *
 * /portfolio renders a "Welcome." h1 masthead with an editorial "Portfolio"
 * eyebrow, followed by a `region[aria-label="Portfolio summary"]` with an
 * Open/Closed/History tablist (Closed selected by default). The earlier
 * Summary/Processing/Settled tab names were dropped in the redesign.
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

    test("portfolio page renders the Welcome masthead", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      // H1 is a "Welcome." / "Välkommen." masthead; the "Portfolio" label is
      // a kicker/eyebrow above it, not the heading itself.
      await expect(
        page.getByRole("heading", { level: 1, name: /^welcome|^välkommen/i })
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText(/^portfolio$|^portfölj$/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    test("portfolio page shows Open / Closed / History tablist", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      await expect(page.getByRole("tab", { name: /^open|^öppn/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("tab", { name: /^closed|^stängd/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /^history|^historik/i })).toBeVisible();
    });

    test("portfolio summary region is visible with PnL + activity sections", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("region", { name: /portfolio summary|portfölj/i })
      ).toBeVisible({ timeout: 15_000 });

      // The summary region contains PnL and Recent-activity sub-sections plus
      // a positions panel (Open/Closed tab target).
      const pnl = page.getByRole("heading", { name: /pn.?l/i }).first();
      const activity = page.getByRole("heading", { name: /recent activity|senaste aktivitet/i }).first();
      const hasAny =
        (await pnl.isVisible({ timeout: 5_000 }).catch(() => false)) ||
        (await activity.isVisible({ timeout: 5_000 }).catch(() => false));
      expect(hasAny).toBeTruthy();
    });

    // ── History tab (replaces legacy /orders page) ─────────────────────

    test("history tab can be activated via ?tab=history", { tag: ["@portfolio"] }, async ({ page }) => {
      await page.goto("/portfolio?tab=history");
      await dismissLimitsDialog(page);

      await expect(
        page.getByRole("heading", { level: 1, name: /^welcome|^välkommen/i })
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

    test("closed tab shows settled positions or empty state", { tag: ["@portfolio"] }, async ({ page }) => {
      // The "Settled" tab was renamed to "Closed" in the redesign. Click the
      // tab explicitly — the default-selected tab varies by empty/populated
      // state, so we don't rely on it.
      await page.goto("/portfolio");
      await dismissLimitsDialog(page);

      const closedTab = page.getByRole("tab", { name: /^closed|^stängd/i });
      await expect(closedTab).toBeVisible({ timeout: 15_000 });
      await closedTab.click();
      await expect(closedTab).toHaveAttribute("aria-selected", "true", {
        timeout: 5_000,
      });

      const empty = page
        .getByText(/no settled|no closed|inga avgjorda|inga stängda/i)
        .first();
      const table = page.getByRole("table");
      const hasAny =
        (await empty.isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await table.isVisible({ timeout: 3_000 }).catch(() => false));
      expect(hasAny).toBeTruthy();
    });
  });
});
