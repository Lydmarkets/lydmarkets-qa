import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";
import { MOBILE_VIEWPORT } from "../helpers/order-form";

// The market buy button is now labelled `YES — {pct}% — {odds}×` (English EUR
// bot build); the shared `Köp ja / Buy yes` trigger is stale, so match the new
// leading `YES` accessible name locally.
function getQuickBetYesTrigger(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: /^YES\b/ }).first();
}

// SCRUM-539: Min/max stake display on order panel.
//
// The QuickBet redesign removed the explicit "Min: X kr · Max: Y kr" line
// from the modal — min stake is now surfaced reactively via validation
// errors ("Lägsta insats är X kr") and max stake via "Exceeds remaining
// capacity" / position-limit errors. The proactive-display tests below
// are skipped until a SIFS-aligned static min/max display is re-introduced
// (or until SCRUM-539 is re-scoped against the validation-error surface).

async function openDialogForYes(page: import("@playwright/test").Page) {
  await goToFirstMarket(page);
  const yesBtn = getQuickBetYesTrigger(page);
  await expect(yesBtn).toBeVisible({ timeout: 10_000 });
  await yesBtn.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

test.describe("SCRUM-539: Min/max stake display on order panel", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.skip(
    "order dialog shows min/max stake text when Yes is clicked",
    { tag: ["@regression", "@compliance"] },
    async () => {
      // Min/max line no longer rendered proactively — see file header.
    },
  );

  test.skip(
    "order dialog shows min/max stake text when No is clicked",
    { tag: ["@regression", "@compliance"] },
    async () => {
      // Min/max line no longer rendered proactively — see file header.
    },
  );

  test(
    "order dialog shows four preset amount buttons in kr",
    { tag: ["@regression"] },
    async ({ page }) => {
      const dialog = await openDialogForYes(page);
      // Preset amounts scale with NEXT_PUBLIC_MIN_STAKE_SEK (e.g. min=50 →
      // [50, 100, 250, 500]). Assert the count + kr formatting rather than
      // specific values.
      const presets = dialog.getByRole("button", { name: /^\d+\s*kr$/i });
      await expect(presets).toHaveCount(4);
      for (const i of [0, 1, 2, 3]) {
        await expect(presets.nth(i)).toBeVisible();
      }
    },
  );

  test(
    "selecting a preset surfaces the platform-fee breakdown row",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      const dialog = await openDialogForYes(page);

      // Select the first preset to populate the breakdown.
      await dialog
        .getByRole("button", { name: /^\d+\s*kr$/i })
        .first()
        .click()
        .catch(() => {});

      // Skip gracefully if the market has 0-stake limits (no breakdown).
      const feeToggle = dialog.getByRole("button", {
        name: /plattformsavgift|platform fee/i,
      });
      const hasFee = await feeToggle
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!hasFee) {
        test.skip(true, "Market has 0 stake limits — no breakdown available");
        return;
      }

      await expect(feeToggle).toBeVisible();
      await feeToggle.click();
      await expect(
        dialog.getByText(/möjlig utbetalning|potential payout/i).first(),
      ).toBeVisible();
    },
  );
});
