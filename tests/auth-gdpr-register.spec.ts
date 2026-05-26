import { test, expect } from "../fixtures/base";

// Register page H1 is "BankID-verifiering" / "BankID Verification"
// (`auth.register.step1Title`). BankID action buttons share copy with the
// login page — see auth.spec.ts BANKID_BUTTON_RE.
const BANKID_BUTTON_RE =
  /öppna bankid|visa qr-?kod|open bankid|show qr|bankid på den här enheten|bankid on this device/i;

test.describe("Authentication — register page compliance", () => {
  test(
    "register page loads with BankID verification step",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/register");
      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

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
    "register page shows two-step BankID verification flow",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/register");
      // Should show step indicator: "Steg 1 av 2" / "Step 1 of 2"
      const hasStep = await page
        .getByText(/steg 1|step 1|bankid.?verif/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasBankIdOptions = await page
        .getByRole("button", { name: BANKID_BUTTON_RE })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasStep || hasBankIdOptions).toBeTruthy();
    },
  );
});
