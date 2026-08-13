import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";

test.describe("Account settings — coverage gaps", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  // ── Privacy / GDPR surface ─────────────────────────────────────────
  //
  // The /settings route family (including /settings/privacy) was removed and
  // now 404s. The GDPR surface it carried — subject-access data export — lives
  // on /profile.

  test(
    "profile page exposes the GDPR data export",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/profile");
      await dismissLimitsDialog(page);
      await expect(page).not.toHaveURL(/\/login/);

      await expect(
        page.getByRole("heading", { name: /my profile|min profil/i, level: 1 }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByRole("heading", { name: /data export|dataexport/i }),
      ).toBeVisible();
      // Art. 15 GDPR: the copy has to be obtainable, not just described.
      await expect(
        page.getByRole("button", { name: /download|ladda ner|hämta/i }),
      ).toBeVisible();
    },
  );

  test(
    "profile page exposes the personal data it holds",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto("/profile");
      await dismissLimitsDialog(page);
      await expect(page).not.toHaveURL(/\/login/);

      await expect(
        page.getByRole("heading", { name: /personal information|personuppgifter/i }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByRole("heading", { name: /contact details|kontaktuppgifter/i }),
      ).toBeVisible();
      // Art. 16 GDPR: rectification has to be reachable from the same place.
      await expect(
        page.getByRole("button", { name: /^edit$|^redigera$/i }).first(),
      ).toBeVisible();
    },
  );

  // The "marketing consent toggle" test previously lived here. The toggle
  // was intentionally removed from the notifications tab — Lydmarkets does
  // not run a marketing channel, so the consent surface was dropped rather
  // than shipped as a no-op. Do not re-add without a new feature ticket.
  //
  // The "notification preference section" and inline "PGSI questionnaire"
  // placeholders were deleted rather than left permanently skipped: neither
  // surface exists on any deployed build. Notification preferences were never
  // ported off the old account area, and the 9-question PGSI form was replaced
  // by a link out to the helpline's authoritative version — which is asserted
  // in compliance-spec-coverage.spec.ts. Re-add real tests with the features.

  test(
    "Responsible gambling page shows the helpline and Spelpaus",
    { tag: ["@compliance", "@critical"] },
    async ({ page }) => {
      await page.goto("/responsible-gambling");
      await dismissLimitsDialog(page);

      await expect(page.locator("main").last()).toBeVisible({ timeout: 10_000 });

      // Helpline: "Stödlinjen" on the licensed build, scrubbed to "Chatterly"
      // on the bot legislation build.
      await expect(
        page.getByText(/stödlinjen|020.819|chatterly/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      // Self-exclusion register: "Spelpaus" / "Bot Spelpaus".
      await expect(
        page.getByText(/spelpaus/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});
