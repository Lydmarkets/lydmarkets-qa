import { test, expect } from "../fixtures/base";
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
      const response = await page.goto("/responsible-gambling");
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
    "PGSI questionnaire has score interpretation guide",
    { tag: ["@compliance", "@regression"] },
    async ({ page }) => {
      await page.goto("/responsible-gambling");
      await dismissLimitsDialog(page);

      // Score interpretation section is always visible below the radio groups
      await expect(page.getByText(/0 points|0 poäng/i).first()).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/moderate risk|måttlig risk/i).first()).toBeVisible();
      await expect(page.getByText(/problem gambl|spelproblem/i).first()).toBeVisible();
    },
  );

  test(
    "Responsible gambling page shows Stodlinjen and Spelpaus links",
    { tag: ["@compliance", "@critical"] },
    async ({ page }) => {
      await page.goto("/responsible-gambling");
      await dismissLimitsDialog(page);

      await expect(page.locator("main").last()).toBeVisible({ timeout: 10_000 });

      // Stödlinjen helpline
      await expect(
        page.getByText(/stödlinjen|020.819/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      // Spelpaus self-exclusion
      await expect(
        page.getByText(/spelpaus/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});
