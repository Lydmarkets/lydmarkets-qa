import { test, expect } from "../fixtures/base";
import { IS_BOT_BUILD } from "../helpers/is-bot-build";

// Register-page compliance.
//
// The licensed Swedish build opens registration with a BankID verification
// step ("BankID-verifiering", `auth.register.step1Title`). The bot legislation
// build has no BankID — registration is email + password with two required
// consent checkboxes. The GDPR contract asserted here (informed, explicit,
// unbundled, opt-in consent that gates submission) applies to both.
const BANKID_BUTTON_RE =
  /öppna bankid|visa qr-?kod|open bankid|show qr|bankid på den här enheten|bankid on this device/i;

test.describe("Authentication — register page compliance", () => {
  test(
    "register page loads with the build's identity-verification step",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/register");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      if (IS_BOT_BUILD) {
        await expect(
          page.getByRole("heading", { name: /create account|skapa konto/i, level: 1 }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(page.getByLabel(/email address|e-postadress/i)).toBeVisible();
        await expect(page.getByLabel(/^password$|^lösenord$/i)).toBeVisible();
        return;
      }

      const hasHeading = await page
        .getByRole("heading", { name: /bankid-?verifiering|bankid verification/i })
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasBankId = await page
        .getByRole("button", { name: BANKID_BUTTON_RE })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasHeading || hasBankId).toBeTruthy();
    },
  );

  test(
    "registration requires explicit, unbundled terms and GDPR consent",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/register");

      if (!IS_BOT_BUILD) {
        // On the BankID build consent is collected in step 2, behind an
        // identity handshake Playwright cannot drive. Assert step 1 is intact
        // and leave the consent gate to the bot build below.
        await expect(
          page.getByRole("button", { name: BANKID_BUTTON_RE }).first(),
        ).toBeVisible({ timeout: 10_000 });
        return;
      }

      const submit = page.getByRole("button", { name: /create account|skapa konto/i });
      const terms = page.getByRole("checkbox").first();
      const gdpr = page.getByRole("checkbox").nth(1);

      // Two separate consents — bundling them into one tick is not valid
      // consent under GDPR Art. 7(2).
      await expect(page.getByRole("checkbox")).toHaveCount(2);
      // Opt-in, not opt-out: both start unticked.
      await expect(terms).not.toBeChecked();
      await expect(gdpr).not.toBeChecked();
      // Informed: the policies being consented to are linked from the form.
      await expect(page.getByRole("link", { name: /terms of service|användarvillkor/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /privacy policy|integritetspolicy/i }).first()).toBeVisible();

      // Consent gates submission, and neither consent alone is enough.
      await expect(submit).toBeDisabled();
      await terms.check();
      await expect(submit).toBeDisabled();
      await gdpr.check();
      await terms.uncheck();
      await expect(submit).toBeDisabled();
      await terms.check();

      // Both given — the form is now submittable (not submitted here: that
      // would burn a registration against the per-IP rate limit).
      await expect(submit).toBeEnabled();
    },
  );
});
