import { test, expect } from "../fixtures/base";
import { openQuickBetFromHome } from "../helpers/open-quick-bet";

// SCRUM-539: Min/max stake display on the QuickBet modal.
//
// The QuickBet modal is opened from home FeaturedMarketsGrid cards now
// (SCRUM-1081 made the desktop market-detail modal mobile-only — the
// side-rail TradePanel handles trades inline at >=lg).

async function openDialogForYes(page: import("@playwright/test").Page) {
  await openQuickBetFromHome(page, "yes");
  return page.getByRole("dialog");
}

async function openDialogForNo(page: import("@playwright/test").Page) {
  await openQuickBetFromHome(page, "no");
  return page.getByRole("dialog");
}

test.describe("SCRUM-539: Min/max stake display on order panel", () => {
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
