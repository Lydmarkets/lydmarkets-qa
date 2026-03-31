import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Authentication — register page compliance", () => {
  test(
    "register page loads with BankID verification step",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/register");
      await dismissAgeGate(page);

      // Swedish: "Skapa konto" heading, "Starta BankID" button
      await expect(page.locator("main").first()).toBeVisible({
        timeout: 10_000,
      });

      const hasHeading = await page
        .getByRole("heading", { name: /skapa konto|create.*account/i })
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasBankId = await page
        .getByRole("button", { name: /starta bankid|start bankid/i })
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
      await dismissAgeGate(page);

      // Should show step indicator: "Steg 1 av 2 — BankID-verifiering"
      const hasStep = await page
        .getByText(/steg 1|step 1|bankid.*verif/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasBankIdOptions = await page
        .getByRole("button", { name: /mobilt bankid/i })
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasStep || hasBankIdOptions).toBeTruthy();
    },
  );
});
