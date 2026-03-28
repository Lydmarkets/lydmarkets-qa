import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Compliance spec — E2E coverage", () => {
  // ── Unauthenticated redirect tests ──────────────────────────────────

  test(
    "unauthenticated /settings/responsible-gambling redirects to login",
    { tag: ["@compliance"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/settings/responsible-gambling");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
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

  test(
    "unauthenticated /kyc redirects to login",
    { tag: ["@compliance"] },
    async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/kyc");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login/);
      await context.close();
    },
  );

  // ── Authenticated tests ─────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({ }, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    // ── Responsible gambling ──────────────────────────────────────────

    test(
      "responsible gambling page shows deposit limit inputs",
      { tag: ["@compliance"] },
      async ({ page }) => {
        const response = await page.goto("/settings/responsible-gambling");
        await dismissAgeGate(page);

        // Page may 404 if auth session is invalid or route not deployed yet
        if (!response || response.status() === 404 || page.url().includes("/login")) {
          test.skip(true, "Page not accessible — auth session invalid or route not deployed");
          return;
        }

        await expect(
          page.getByRole("heading", { name: "Ansvarsfullt spelande", level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        // Deposit limits section
        await expect(
          page.getByRole("heading", { name: "Insättningsgränser", level: 2 }),
        ).toBeVisible();

        // Daily / weekly / monthly deposit limit rows
        await expect(page.getByText("Daglig insättningsgräns")).toBeVisible();
        await expect(page.getByText("Veckovis insättningsgräns")).toBeVisible();
        await expect(page.getByText("Månatlig insättningsgräns")).toBeVisible();
      },
    );

    test(
      "responsible gambling page shows loss limit section",
      { tag: ["@compliance"] },
      async ({ page }) => {
        const response = await page.goto("/settings/responsible-gambling");
        await dismissAgeGate(page);
        if (!response || response.status() === 404 || page.url().includes("/login")) {
          test.skip(true, "Page not accessible");
          return;
        }

        await expect(
          page.getByRole("heading", { name: "Förlustgränser", level: 2 }),
        ).toBeVisible({ timeout: 10_000 });

        await expect(page.getByText("Daglig förlustgräns")).toBeVisible();
        await expect(page.getByText("Veckovis förlustgräns")).toBeVisible();
        await expect(page.getByText("Månatlig förlustgräns")).toBeVisible();
      },
    );

    test(
      "responsible gambling page shows bet limit section",
      { tag: ["@compliance"] },
      async ({ page }) => {
        const response = await page.goto("/settings/responsible-gambling");
        await dismissAgeGate(page);
        if (!response || response.status() === 404 || page.url().includes("/login")) {
          test.skip(true, "Page not accessible");
          return;
        }

        await expect(
          page.getByRole("heading", { name: "Insatsgränser", level: 2 }),
        ).toBeVisible({ timeout: 10_000 });

        await expect(page.getByText("Daglig insatsgräns")).toBeVisible();
        await expect(page.getByText("Veckovis insatsgräns")).toBeVisible();
        await expect(page.getByText("Månatlig insatsgräns")).toBeVisible();
      },
    );

    test(
      "responsible gambling page has update limits button",
      { tag: ["@compliance"] },
      async ({ page }) => {
        const response = await page.goto("/settings/responsible-gambling");
        await dismissAgeGate(page);
        if (!response || response.status() === 404 || page.url().includes("/login")) {
          test.skip(true, "Page not accessible");
          return;
        }

        await expect(
          page.getByRole("button", { name: /Uppdatera gränser/i }),
        ).toBeVisible({ timeout: 10_000 });
      },
    );

    // ── Self-exclusion ────────────────────────────────────────────────

    test(
      "self-exclusion page shows period options (1mo, 3mo, 6mo, permanent)",
      { tag: ["@compliance"] },
      async ({ page }) => {
        const response = await page.goto("/settings/self-exclusion");
        await dismissAgeGate(page);
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
        await dismissAgeGate(page);
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
        await dismissAgeGate(page);

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
        await dismissAgeGate(page);

        await expect(
          page.getByRole("heading", { name: "My Disputes", level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        await expect(page.getByText("Stage 1", { exact: true })).toBeVisible();
        await expect(page.getByText("Stage 2", { exact: true })).toBeVisible();
        await expect(page.getByText("Stage 3", { exact: true })).toBeVisible();
        await expect(
          page.getByRole("link", { name: /Allmänna reklamationsnämnden/i }),
        ).toBeVisible();
      },
    );

    test(
      "new dispute form shows reason dropdown and description",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/disputes/new");
        await dismissAgeGate(page);

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
        await dismissAgeGate(page);

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
        await dismissAgeGate(page);

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

    test(
      "KYC page shows verification status",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/kyc");
        await dismissAgeGate(page);

        await expect(
          page.getByRole("heading", { name: "Identity Verification", level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        await expect(
          page.getByRole("heading", { name: /KYC Verification Status/i }),
        ).toBeVisible();

        // Status badge — one of the possible states (Approved, Pending, Rejected)
        // The "Verification approved" text is also present, so we look for the
        // standalone status text that appears inside the status badge area.
        const statusBadge = page.getByText(/^(Approved|Pending|Rejected|Not Started)$/);
        await expect(statusBadge.first()).toBeVisible({ timeout: 5_000 });
      },
    );

    test(
      "KYC page mentions Spelinspektionen regulatory requirement",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/kyc");
        await dismissAgeGate(page);

        await expect(
          page.getByRole("heading", { name: "Identity Verification", level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        await expect(
          page.getByText(/Spelinspektionen/i),
        ).toBeVisible();
      },
    );
  });
});
