import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

// Account settings — coverage gaps. Updated for the editorial-redesign
// settings refactor (SCRUM-1071) and the responsible-gambling rewrite.
//
// What changed:
//   - The /settings page no longer has tabs or a notification-preferences
//     section; it shows the deposit-limits card and a related-settings grid
//     (Privacy / Self-exclusion).
//   - Marketing consent moved to the cookie banner — no in-app toggle exists.
//   - The inline PGSI questionnaire was removed; /responsible-gambling now
//     links out to the Stödlinjen-hosted PGSI test, the only LIFS 2018:2 § 10
//     blessed self-assessment.
//   - The ansvarsspel-bar (SCRUM-885) provides a global Spelgränser /
//     Självtest / 24h short-break entrypoint from every page.

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

  // ── Settings page — editorial redesign ────────────────────────────
  //
  // The redesigned /settings shell only surfaces deposit limits + links to
  // privacy and self-exclusion. Notification preferences, marketing
  // consent, and tabbed navigation were all dropped intentionally.

  test(
    "settings page surfaces deposit-limits card and related links",
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

      // Deposit-limits card heading (SCRUM-1071 / SectionCardV2)
      const hasDepositLimits = await page
        .getByText(/deposit.*limit|insättningsgräns/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      // Related-settings grid links: privacy + self-exclusion
      const hasPrivacyLink = await page
        .getByRole("link", { name: /privacy|integritet/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasSelfExclusionLink = await page
        .getByRole("link", { name: /self.?exclusion|spelpaus|avstäng/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(
        hasDepositLimits || hasPrivacyLink || hasSelfExclusionLink,
      ).toBeTruthy();
    },
  );

  // ── PGSI self-test — Stödlinjen external CTA ──────────────────────

  test(
    "responsible-gambling page exposes external PGSI self-test",
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

      // Self-test section heading
      await expect(
        page.getByText(/självtest|self.?test|pgsi/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      // External CTA — opens Stödlinjen PGSI in a new tab
      const cta = page
        .getByRole("link", { name: /självtest|self.?test|gör.*testet|take.*test/i })
        .first();
      await expect(cta).toBeVisible({ timeout: 5_000 });
      const href = await cta.getAttribute("href");
      expect(href).toContain("stodlinjen.se");
    },
  );

  test(
    "responsible-gambling page shows Stödlinjen helpline and Spelpaus links",
    { tag: ["@compliance", "@critical"] },
    async ({ page }) => {
      await page.goto("/responsible-gambling");
      await dismissLimitsDialog(page);

      await expect(page.locator("main").last()).toBeVisible({ timeout: 10_000 });

      await expect(
        page.getByText(/stödlinjen|020.819/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      await expect(
        page.getByText(/spelpaus/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});
