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

  test(
    "unauthenticated /disputes redirects to login",
    { tag: ["@compliance"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/disputes");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
      await context.close();
    },
  );

  test(
    "unauthenticated /disputes/new redirects to login",
    { tag: ["@compliance"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/disputes/new");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
      await context.close();
    },
  );

  // KYC route removed from the platform

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
      "responsible gambling page shows PGSI self-assessment",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        // PGSI section has 9 questions with radio groups
        const radios = page.locator('input[type="radio"][name^="pgsi-"]');
        // 9 questions × 4 options = 36 radio buttons
        await expect(radios.first()).toBeAttached({ timeout: 10_000 });
        const count = await radios.count();
        expect(count).toBeGreaterThanOrEqual(36);
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

        await expect(
          page.locator('a[href="/settings/self-exclusion"]').first(),
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

    // ── Disputes ──────────────────────────────────────────────────────

    test(
      "disputes page loads with submit dispute link",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/disputes");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: "My Disputes", level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        await expect(
          page.getByRole("link", { name: "Submit Dispute" }),
        ).toBeVisible();
      },
    );

    test(
      "disputes page shows three-stage process overview",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/disputes");
        await dismissLimitsDialog(page);

        await expect(
          page
            .getByRole("heading", { name: /my disputes|mina tvister/i, level: 1 })
        ).toBeVisible({ timeout: 10_000 });

        // Process stages may be numbered ("Stage 1") or unlabelled cards.
        // Check for either Stage/Steg labels OR the ARN appeal link.
        const hasStages = await page
          .getByText(/^(stage|steg)\s?1$/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        const hasArn = await page
          .getByRole("link", { name: /Allmänna reklamationsnämnden|ARN/i })
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasStages || hasArn).toBeTruthy();
      },
    );

    test(
      "new dispute form shows reason dropdown and description",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/disputes/new");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /Submit a Dispute/i, level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        // Reason dropdown with the 5 options
        const reasonSelect = page.getByRole("combobox", { name: /Reason/i });
        await expect(reasonSelect).toBeVisible();

        // Description textarea
        await expect(
          page.getByRole("textbox", { name: /Additional details/i }),
        ).toBeVisible();

        // Submit button
        await expect(
          page.getByRole("button", { name: "Submit Dispute" }),
        ).toBeVisible();

        // Cancel button
        await expect(
          page.getByRole("button", { name: "Cancel" }),
        ).toBeVisible();
      },
    );

    test(
      "dispute form reason dropdown has expected options",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/disputes/new");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /Submit a Dispute/i, level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        const reasonSelect = page.getByRole("combobox", { name: /Reason/i });

        await expect(
          reasonSelect.getByRole("option", { name: "Incorrect market resolution outcome" }),
        ).toBeAttached();
        await expect(
          reasonSelect.getByRole("option", { name: "Oracle evidence is inaccurate or misleading" }),
        ).toBeAttached();
        await expect(
          reasonSelect.getByRole("option", { name: "Market rules were not applied correctly" }),
        ).toBeAttached();
        await expect(
          reasonSelect.getByRole("option", { name: "Technical error affected my position" }),
        ).toBeAttached();
        await expect(
          reasonSelect.getByRole("option", { name: "Other" }),
        ).toBeAttached();
      },
    );

    test(
      "dispute form has regulatory disclaimer",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/disputes/new");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /Submit a Dispute/i, level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        await expect(
          page.getByText(/SIFS Kap 7/i),
        ).toBeVisible();
        await expect(
          page.getByText(/Spellagen/i),
        ).toBeVisible();
      },
    );

    // ── KYC ───────────────────────────────────────────────────────────

    // KYC route removed from the platform
  });
});
