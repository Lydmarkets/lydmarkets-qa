import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";
import { MOBILE_VIEWPORT } from "../helpers/order-form";

// The market buy button is now labelled `YES — {pct}% — {odds}×` (English EUR
// bot build); the shared `Köp ja / Buy yes` trigger is stale, so match the new
// leading `YES` accessible name locally.
function getQuickBetYesTrigger(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: /^YES\b/ }).first();
}

// SCRUM-539: Min/max stake limits on the order panel.
//
// The QuickBet redesign removed the explicit "Min: X kr · Max: Y kr" line from
// the modal. The limits did not go away — they moved onto the stake input
// itself (`min` / `max` on the number field, which is what assistive tech and
// the browser both enforce) and into reactive validation. The tests below
// assert the limits where they now live rather than the copy that was dropped.

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

  for (const side of ["Yes", "No"] as const) {
    test(
      `order dialog constrains the stake input when ${side} is clicked`,
      { tag: ["@regression", "@compliance"] },
      async ({ page }) => {
        await goToFirstMarket(page);
        const trigger = page
          .getByRole("button", { name: side === "Yes" ? /^YES\b/ : /^NO\b/ })
          .first();
        await expect(trigger).toBeVisible({ timeout: 10_000 });
        await trigger.click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible({ timeout: 5_000 });

        // The minimum stake is carried by the input itself, so the browser and
        // assistive tech both enforce it — a stake floor the user can't see or
        // that isn't machine-readable is not a limit (SIFS 2018:8).
        const stake = dialog.getByRole("spinbutton").first();
        await expect(stake).toBeVisible({ timeout: 5_000 });
        const min = await stake.getAttribute("min");
        expect(Number(min)).toBeGreaterThan(0);

        // Below the floor the field must report itself invalid (this spec runs
        // logged out, where the CTA is "Log in to place bet" rather than a
        // Place button, so the input's own validity is the assertable signal).
        await stake.fill(String(Number(min) / 2));
        expect(
          await stake.evaluate((el) => (el as HTMLInputElement).validity.rangeUnderflow),
        ).toBe(true);
      },
    );
  }

  test(
    "order dialog shows four preset amount buttons",
    { tag: ["@regression"] },
    async ({ page }) => {
      const dialog = await openDialogForYes(page);
      // Preset amounts scale with NEXT_PUBLIC_MIN_STAKE_SEK (e.g. min=50 →
      // [50, 100, 250, 500]) and the currency differs per build ("€10" on the
      // English bot build, "10 kr" on the Swedish one). Assert the count +
      // either currency shape rather than specific values.
      const presets = dialog.getByRole("button", { name: /^(€\s*\d+|\d+\s*kr)$/i });
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

      // Select the first preset to populate the breakdown. goToFirstMarket
      // deliberately skips 0%-side markets, so the breakdown always renders.
      await dialog
        .getByRole("button", { name: /^(€\s*\d+|\d+\s*kr)$/i })
        .first()
        .click();

      const feeToggle = dialog.getByRole("button", {
        name: /plattformsavgift|platform fee/i,
      });
      await expect(feeToggle).toBeVisible({ timeout: 10_000 });
      await feeToggle.click();
      await expect(
        dialog.getByText(/möjlig utbetalning|potential payout/i).first(),
      ).toBeVisible();
    },
  );
});
