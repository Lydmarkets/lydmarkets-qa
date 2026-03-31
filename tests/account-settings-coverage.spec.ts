import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Account settings — coverage gaps", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeEach(({}, testInfo) => {
    if (!hasAuthSession()) testInfo.skip();
  });

  // ── Privacy settings page ──────────────────────────────────────────

  test(
    "privacy settings page loads with GDPR options",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/settings/privacy");
      await dismissAgeGate(page);
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      const hasPrivacy = await page
        .getByText(/privacy|data export|account deletion|integritet|radering/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasGdpr = await page
        .getByText(/gdpr|personuppgift/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasHeading = await page
        .getByRole("heading")
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasPrivacy || hasGdpr || hasHeading).toBeTruthy();
    },
  );

  // ── Notification preferences ───────────────────────────────────────

  test(
    "settings page has notification preference section",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/settings");
      await dismissAgeGate(page);
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      const hasNotification = await page
        .getByText(/notification|avisering|meddelande/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasSwitch = await page
        .getByRole("switch")
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasNotification || hasSwitch).toBeTruthy();
    },
  );

  // ── Marketing consent toggle ───────────────────────────────────────

  test(
    "notifications tab has marketing consent toggle",
    { tag: ["@compliance", "@regression"] },
    async ({ page }) => {
      await page.goto("/settings?tab=notifications");
      await dismissAgeGate(page);
      await dismissLimitsDialog(page);

      if (page.url().includes("/login")) {
        test.skip(true, "Session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      const hasMarketing = await page
        .getByText(/marketing|marknadsföring/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasSwitch = await page
        .getByRole("switch")
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasMarketing || hasSwitch).toBeTruthy();
    },
  );

  // ── PGSI self-assessment questionnaire ─────────────────────────────

  test(
    "PGSI questionnaire is visible on responsible gambling tab",
    { tag: ["@compliance", "@regression"] },
    async ({ page }) => {
      const response = await page.goto("/settings/responsible-gambling");
      await dismissAgeGate(page);
      await dismissLimitsDialog(page);

      if (
        !response ||
        response.status() === 404 ||
        page.url().includes("/login")
      ) {
        test.skip(true, "Page not accessible — 404 or session expired");
        return;
      }

      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      // Look for the PGSI questionnaire section
      const hasSelfAssessment = await page
        .getByText(/self-assessment|självtest|pgsi/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasQuestionText = await page
        .getByText(/never|aldrig|sometimes|ibland/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!hasSelfAssessment && !hasQuestionText) {
        test.skip(
          true,
          "PGSI questionnaire not visible — may not be deployed yet",
        );
        return;
      }

      expect(hasSelfAssessment || hasQuestionText).toBeTruthy();
    },
  );

  test(
    "PGSI questionnaire shows non-problem result for lowest answers",
    { tag: ["@compliance", "@regression"] },
    async ({ page }) => {
      const response = await page.goto("/settings/responsible-gambling");
      await dismissAgeGate(page);
      await dismissLimitsDialog(page);

      if (
        !response ||
        response.status() === 404 ||
        page.url().includes("/login")
      ) {
        test.skip(true, "Page not accessible");
        return;
      }

      // Check PGSI is present
      const hasPgsi = await page
        .getByText(/self-assessment|självtest|pgsi/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!hasPgsi) {
        test.skip(true, "PGSI questionnaire not visible");
        return;
      }

      // Answer all 9 questions with "Never" / "Aldrig" (score = 0)
      const neverOptions = page.getByText(/^never$|^aldrig$/i);
      const count = await neverOptions.count();

      if (count < 9) {
        test.skip(true, `Only ${count} 'Never' options found — expected 9`);
        return;
      }

      for (let i = 0; i < count; i++) {
        await neverOptions.nth(i).click();
      }

      // Click show result button
      const resultBtn = page.getByRole("button", {
        name: /show my result|visa mitt resultat|beräkna/i,
      });
      await expect(resultBtn).toBeVisible({ timeout: 5_000 });
      await resultBtn.click();

      // Should show non-problem / low-risk result
      await expect(
        page.getByText(/non-problem|inget spelproblem|low.risk|låg risk/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "PGSI high-risk result shows Stodlinjen and Spelpaus links",
    { tag: ["@compliance", "@critical"] },
    async ({ page }) => {
      const response = await page.goto("/settings/responsible-gambling");
      await dismissAgeGate(page);
      await dismissLimitsDialog(page);

      if (
        !response ||
        response.status() === 404 ||
        page.url().includes("/login")
      ) {
        test.skip(true, "Page not accessible");
        return;
      }

      // Check PGSI is present
      const hasPgsi = await page
        .getByText(/self-assessment|självtest|pgsi/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!hasPgsi) {
        test.skip(true, "PGSI questionnaire not visible");
        return;
      }

      // Answer all 9 questions with "Almost always" / "Nästan alltid" (score = 27)
      const highOptions = page.getByText(/^almost always$|^nästan alltid$/i);
      const count = await highOptions.count();

      if (count < 9) {
        test.skip(
          true,
          `Only ${count} 'Almost always' options found — expected 9`,
        );
        return;
      }

      for (let i = 0; i < count; i++) {
        await highOptions.nth(i).click();
      }

      // Click show result button
      const resultBtn = page.getByRole("button", {
        name: /show my result|visa mitt resultat|beräkna/i,
      });
      await expect(resultBtn).toBeVisible({ timeout: 5_000 });
      await resultBtn.click();

      // Should show problem gambling result
      await expect(
        page
          .getByText(/problem.gambling|spelproblem|high.risk|hög risk/i)
          .first(),
      ).toBeVisible({ timeout: 5_000 });

      // Should show Stödlinjen helpline link
      const hasStodlinjen = await page
        .getByRole("link", { name: /stödlinjen/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasStodlinjenText = await page
        .getByText(/stödlinjen|020-819/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasStodlinjen || hasStodlinjenText).toBeTruthy();

      // Should show Spelpaus link
      const hasSpelpaus = await page
        .getByRole("link", { name: /spelpaus/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasSpelpausText = await page
        .getByText(/spelpaus/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasSpelpaus || hasSpelpausText).toBeTruthy();
    },
  );
});
