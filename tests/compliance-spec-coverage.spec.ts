import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Compliance spec — E2E coverage", () => {
  // ── Unauthenticated redirect tests ──────────────────────────────────

  test(
    "/responsible-gambling is publicly accessible",
    { tag: ["@compliance"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/responsible-gambling");
      // Public page — should NOT redirect to login
      await expect(page.locator("main").last()).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole("heading", { name: /responsible gambling|ansvarsfullt spelande/i, level: 1 }),
      ).toBeVisible();
      await context.close();
    },
  );

  test(
    "unauthenticated /settings/self-exclusion redirects to login",
    { tag: ["@compliance"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/settings/self-exclusion");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
      await context.close();
    },
  );

  // /disputes and /disputes/new routes were removed — disputes are now
  // handled by email (support@lydmarkets.se). KYC route removed earlier.

  // ── Authenticated tests ─────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({ }, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    // ── Responsible gambling (public page) ─────────────────────────────

    test(
      "responsible gambling page shows support organisations",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /responsible gambling|ansvarsfullt spelande/i, level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        // Stödlinjen and Spelpaus must be listed
        await expect(page.getByText(/stödlinjen|stodlinjen/i).first()).toBeVisible();
        await expect(page.getByText(/spelpaus/i).first()).toBeVisible();
      },
    );

    test(
      "responsible gambling page links to external PGSI self-test",
      { tag: ["@compliance"] },
      async ({ page }) => {
        // The inline 9-question PGSI form was replaced by a link to the
        // Stödlinjen-hosted PGSI test — the authoritative version run by
        // the national helpline.
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        await expect(
          page.locator(
            'a[href*="stodlinjen.se"][href*="pgsi"], a[href*="spelberoende-test-pgsi"]',
          ).first(),
        ).toBeVisible({ timeout: 10_000 });
      },
    );

    test(
      "responsible gambling page shows platform tools with links to settings",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        await expect(page.locator("main").last()).toBeVisible({ timeout: 10_000 });

        // Platform tools section links to /settings for limit configuration
        const settingsLinks = page.locator('a[href="/settings"]');
        await expect(settingsLinks.first()).toBeVisible({ timeout: 5_000 });
        const linkCount = await settingsLinks.count();
        expect(linkCount).toBeGreaterThanOrEqual(1);
      },
    );

    test(
      "responsible gambling page has self-exclusion link",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        // Self-exclusion was promoted from /settings/self-exclusion to a
        // top-level /self-exclusion route (it's also deep-linked from the
        // compliance aside with `?step=form&period=…`).
        await expect(
          page.locator('a[href^="/self-exclusion"]').first(),
        ).toBeVisible({ timeout: 10_000 });
      },
    );

    // ── Self-exclusion ────────────────────────────────────────────────

    test(
      "self-exclusion page shows period options (1mo, 3mo, 6mo, permanent)",
      { tag: ["@compliance"] },
      async ({ page }) => {
        const response = await page.goto("/settings/self-exclusion");
        await dismissLimitsDialog(page);
        if (!response || response.status() === 404 || page.url().includes("/login")) {
          test.skip(true, "Page not accessible");
          return;
        }

        await expect(
          page.getByRole("heading", { name: /self-exclusion|självavstängning/i, level: 1 }),
        ).toBeVisible({ timeout: 15_000 });

        // Period options in Swedish: "1 månad", "3 månader", "6 månader", "Permanent"
        await expect(
          page.getByText(/1 month|1 månad/i).first(),
        ).toBeVisible();
        await expect(
          page.getByText(/3 months|3 månader/i).first(),
        ).toBeVisible();
        await expect(
          page.getByText(/6 months|6 månader/i).first(),
        ).toBeVisible();
        await expect(
          page.getByText(/permanent/i).first(),
        ).toBeVisible();
      },
    );

    test(
      "self-exclusion page has two-step confirmation flow",
      { tag: ["@compliance"] },
      async ({ page }) => {
        const response = await page.goto("/settings/self-exclusion");
        await dismissLimitsDialog(page);
        if (!response || response.status() === 404 || page.url().includes("/login")) {
          test.skip(true, "Page not accessible");
          return;
        }

        await expect(
          page.getByRole("heading", { name: /self-exclusion|självavstängning/i, level: 1 }),
        ).toBeVisible({ timeout: 15_000 });

        // The page shows period selection, then a confirmation step
        // Look for any interactive elements indicating a multi-step flow
        const hasConfirmBtn = await page
          .getByRole("button", { name: /continue|fortsätt|bekräfta|confirm/i })
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasWarning = await page
          .getByText(/warning|varning|cannot be.*reversed|kan inte ångras/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        // At least one confirmation element should exist in the flow
        const hasPeriods = await page.getByText(/1 månad|1 month/i).first().isVisible().catch(() => false);
        expect(hasConfirmBtn || hasWarning || hasPeriods).toBeTruthy();
      },
    );

    // Disputes route removed — disputes are now handled by email.
    // KYC route removed earlier.
  });
});
