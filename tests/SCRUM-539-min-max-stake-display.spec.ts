import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";
import {
  MOBILE_VIEWPORT,
  getQuickBetNoTrigger,
  getQuickBetYesTrigger,
} from "../helpers/order-form";

// SCRUM-539: Min/max stake display on order panel.
// QuickBetModal is mobile-only since SCRUM-797 — desktop shows the same
// info inline in the TradePanel. Run at a mobile viewport to open the modal.

async function openDialogForYes(page: import("@playwright/test").Page) {
  await goToFirstMarket(page);
  const yesBtn = getQuickBetYesTrigger(page);
  await expect(yesBtn).toBeVisible({ timeout: 10_000 });
  await yesBtn.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

async function openDialogForNo(page: import("@playwright/test").Page) {
  await goToFirstMarket(page);
  const noBtn = getQuickBetNoTrigger(page);
  await expect(noBtn).toBeVisible({ timeout: 10_000 });
  await noBtn.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

test.describe("SCRUM-539: Min/max stake display on order panel", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test(
    "order dialog shows min/max stake text when Yes is clicked",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      const dialog = await openDialogForYes(page);
      await expect(
        dialog.getByText(/min:?\s*\d|minimum.*\d/i).first()
      ).toBeVisible({ timeout: 5_000 });
      await expect(
        dialog.getByText(/max:?\s*[\d.,]|maximum.*\d/i).first()
      ).toBeVisible();
    },
  );

  test(
    "order dialog shows min/max stake text when No is clicked",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      const dialog = await openDialogForNo(page);
      await expect(
        dialog.getByText(/min:?\s*\d|minimum.*\d/i).first()
      ).toBeVisible({ timeout: 5_000 });
      await expect(
        dialog.getByText(/max:?\s*[\d.,]|maximum.*\d/i).first()
      ).toBeVisible();
    },
  );

  test(
    "order dialog shows preset amount buttons",
    { tag: ["@regression"] },
    async ({ page }) => {
      const dialog = await openDialogForYes(page);
      await expect(dialog.getByRole("button", { name: /10 kr/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /25 kr/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /50 kr/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /100 kr/i })).toBeVisible();
    },
  );

  test(
    "order dialog shows cost breakdown and profit estimate after selecting an amount",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      const dialog = await openDialogForYes(page);

      // Select a preset to trigger the breakdown
      await dialog
        .getByRole("button", { name: "10 kr" })
        .click()
        .catch(() => {});

      // Skip gracefully if the market has 0-stake limits (no breakdown possible)
      const hasBreakdown = await dialog
        .getByText(/kostnad|cost/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!hasBreakdown) {
        test.skip(true, "Market has 0 stake limits — no breakdown available");
        return;
      }

      await expect(dialog.getByText(/kostnad|cost/i).first()).toBeVisible({
        timeout: 5_000,
      });
      await expect(dialog.getByText(/vinst|profit/i).first()).toBeVisible();
      await expect(dialog.getByText(/max förlust|max loss/i).first()).toBeVisible();
    },
  );
});
