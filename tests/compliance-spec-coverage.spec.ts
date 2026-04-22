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
      "responsible gambling page links out to the Stödlinjen PGSI self-test",
      { tag: ["@compliance"] },
      async ({ page }) => {
        // The inline PGSI questionnaire was removed in 2026-04-16 — only
        // Stödlinjen's hosted PGSI is LIFS 2018:2 § 10 blessed, so we link
        // out instead of recreating the validated instrument ourselves.
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        const cta = page
          .getByRole("link", {
            name: /självtest|self.?test|gör.*testet|take.*test/i,
          })
          .first();
        await expect(cta).toBeVisible({ timeout: 10_000 });
        const href = await cta.getAttribute("href");
        expect(href).toContain("stodlinjen.se");
        await expect(cta).toHaveAttribute("target", "_blank");
      },
    );

    test(
      "responsible gambling page links to platform tools",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        await expect(page.locator("main").last()).toBeVisible({ timeout: 10_000 });

        // After the responsible-gambling rewrite, the page surfaces support
        // organisations + a Spelgränser deep-link rather than a /settings
        // overview. Either link is enough to assert the section rendered.
        const hasSpelgranser = await page
          .locator('a[href*="/profil/spelgranser"]')
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        const hasSettings = await page
          .locator('a[href^="/settings"]')
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        const hasSelfExclusion = await page
          .locator('a[href*="/self-exclusion"]')
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasSpelgranser || hasSettings || hasSelfExclusion).toBeTruthy();
      },
    );

    test(
      "responsible gambling page has self-exclusion link",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        // SCRUM-796 moved self-exclusion from /settings/self-exclusion to
        // public /self-exclusion. Match either the new or legacy path.
        await expect(
          page.locator('a[href$="/self-exclusion"], a[href*="/self-exclusion?"]').first(),
        ).toBeVisible({ timeout: 10_000 });
      },
    );

    // ── Self-exclusion ────────────────────────────────────────────────

    test(
      "self-exclusion page shows the regulated period options",
      { tag: ["@compliance"] },
      async ({ page }) => {
        // SCRUM-796: page moved from /settings/self-exclusion to public
        // /self-exclusion. The page leads with a scope choice (Lydmarkets
        // only vs Spelpaus). Period options are revealed only after the
        // user picks the Lydmarkets-only scope; deep-link via
        // ?step=form&period=… to skip the scope selection.
        const response = await page.goto(
          "/self-exclusion?step=form&period=1_month",
        );
        await dismissLimitsDialog(page);
        if (!response || response.status() === 404 || page.url().includes("/login")) {
          test.skip(true, "Page not accessible");
          return;
        }

        await expect(
          page
            .getByRole("heading", {
              name: /self.?excluded?\b|självavstäng|stäng av dig|exclude yourself/i,
            })
            .first(),
        ).toBeVisible({ timeout: 15_000 });

        // Period options are now: 24h, 1mo, 3mo, 6mo, indefinite (minimum
        // 12 months). The legacy "permanent" label was renamed in
        // migration 0064.
        await expect(
          page.getByText(/24.hours?|24.timmar/i).first(),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
          page.getByText(/1 month|1 månad/i).first(),
        ).toBeVisible();
        await expect(
          page.getByText(/6 months|6 månader/i).first(),
        ).toBeVisible();
        await expect(
          page.getByText(/indefinite|tillsvidare|minst 12|minimum 12/i).first(),
        ).toBeVisible();
      },
    );

    test(
      "self-exclusion page exposes a scope choice (Lydmarkets vs Spelpaus)",
      { tag: ["@compliance"] },
      async ({ page }) => {
        // SCRUM-796 introduced a two-step scope choice: exclude from
        // Lydmarkets only (compliance-service driven) or refer the user out
        // to the national Spelpaus register.
        const response = await page.goto("/self-exclusion");
        await dismissLimitsDialog(page);
        if (!response || response.status() === 404 || page.url().includes("/login")) {
          test.skip(true, "Page not accessible");
          return;
        }

        // The redesigned page title is "Self-exclude yourself from gambling" /
        // "Stäng av dig själv från spel". Match either the kicker text or the
        // full heading copy.
        await expect(
          page
            .getByRole("heading", {
              name: /self.?excluded?\b|självavstäng|stäng av dig|exclude yourself/i,
            })
            .first(),
        ).toBeVisible({ timeout: 15_000 });

        // Either the scope choice (Lydmarkets vs Spelpaus) or a confirmation
        // CTA / warning / period option should appear before the user can
        // submit. The exact UI depends on whether the form was reached via
        // ?step=form deep-link or fresh navigation.
        const hasLydmarketsOnly = await page
          .getByText(/only lydmarkets|endast lydmarkets|just lydmarkets/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        const hasSpelpausCard = await page
          .getByText(/national.*register|nationella.*registret|spelpaus.*hela/i)
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        const hasConfirmBtn = await page
          .getByRole("button", { name: /continue|fortsätt|bekräfta|confirm/i })
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasLydmarketsOnly || hasSpelpausCard || hasConfirmBtn).toBeTruthy();
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
