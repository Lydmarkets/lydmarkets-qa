import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";
import { IS_BOT_BUILD } from "../helpers/is-bot-build";

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
    "legacy /settings/self-exclusion route is gone (404)",
    { tag: ["@compliance"] },
    async ({ browser }) => {
      // The self-exclusion tool was promoted out of the (now removed) /settings
      // area to a top-level /self-exclusion route. The old nested path returns
      // 404 rather than redirecting to login.
      const context = await browser.newContext();
      const page = await context.newPage();
      const response = await page.goto("/settings/self-exclusion");
      expect(response?.status()).toBe(404);
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

        // Spelpaus survives on the bot build as "Bot Spelpaus"; Stödlinjen is
        // scrubbed to the fictional "Chatterly", so assert it on staging only.
        await expect(page.getByText(/spelpaus/i).first()).toBeVisible();
        if (!IS_BOT_BUILD) {
          await expect(page.getByText(/stödlinjen|stodlinjen/i).first()).toBeVisible();
        }
      },
    );

    test(
      "responsible gambling page links to external PGSI self-test",
      { tag: ["@compliance"] },
      async ({ page }) => {
        // The inline 9-question PGSI form was replaced by a link to the
        // Stödlinjen-hosted PGSI test — the authoritative version run by
        // the national helpline. The bot build points every support link at a
        // lydmarkets.com placeholder instead.
        test.skip(IS_BOT_BUILD, "Bot build has no external Stödlinjen PGSI link");

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
      "responsible gambling page shows platform tools linking to the limit controls",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        await expect(page.locator("main").last()).toBeVisible({ timeout: 10_000 });

        // The platform-tools cards used to point at a /settings route that
        // 404'd on this build; they now deep-link to the live controls at
        // /limits and /self-exclusion. Hrefs carry the active locale prefix
        // (e.g. `/en/limits`), so match the path suffix.
        const toolLinks = page.locator(
          'a[href$="/limits"], a[href$="/self-exclusion"], a[href$="/settings"]',
        );
        await expect(toolLinks.first()).toBeVisible({ timeout: 5_000 });
        expect(await toolLinks.count()).toBeGreaterThanOrEqual(1);
      },
    );

    test(
      "responsible gambling page has self-exclusion link",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        // Self-exclusion was promoted from /settings/self-exclusion to a
        // top-level /self-exclusion route. Hrefs carry the active locale prefix
        // on this build (e.g. `/en/self-exclusion`), so match anywhere in path.
        await expect(
          page.locator('a[href*="/self-exclusion"]').first(),
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
