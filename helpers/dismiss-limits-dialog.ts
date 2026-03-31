import type { Page } from "@playwright/test";

/**
 * Dismisses the mandatory compliance limits dialog if it appears.
 * The dialog "Ange insättnings- och sessionsgränser" requires deposit and session
 * limits before the user can interact with the app. Fills default values and submits.
 */
export async function dismissLimitsDialog(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /gränser|limits/i });

  try {
    await dialog.waitFor({ state: "visible", timeout: 3_000 });
  } catch {
    // Dialog didn't appear — nothing to do
    return;
  }

  // Fill required deposit limit fields
  const daily = dialog.getByRole("spinbutton", { name: /daglig|daily/i });
  const weekly = dialog.getByRole("spinbutton", { name: /veckovis|weekly/i });
  const monthly = dialog.getByRole("spinbutton", { name: /månadsvis|monthly/i });

  await daily.fill("10000");
  await weekly.fill("50000");
  await monthly.fill("100000");
  // Session time limit is pre-filled with 120 minutes

  await dialog.getByRole("button", { name: /fortsätt|continue|ange gränser/i }).click();

  try {
    await dialog.waitFor({ state: "hidden", timeout: 10_000 });
  } catch {
    // API may fail on staging — press Escape as fallback
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 3_000 }).catch(() => {});
  }
}
