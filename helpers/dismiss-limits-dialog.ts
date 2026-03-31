import type { Page } from "@playwright/test";

/**
 * Dismisses the mandatory compliance limits dialog if it appears.
 * The dialog "Ange insättnings- och sessionsgränser" requires deposit and session
 * limits before the user can interact with the app.
 *
 * Tries to submit the form first. If the API save fails (common on staging),
 * force-removes the dialog from the DOM so tests can proceed.
 */
export async function dismissLimitsDialog(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /gränser|limits/i });

  try {
    await dialog.waitFor({ state: "visible", timeout: 2_000 });
  } catch {
    return;
  }

  // Try submitting the form
  const daily = dialog.getByRole("spinbutton", { name: /daglig|daily/i });
  const weekly = dialog.getByRole("spinbutton", { name: /veckovis|weekly/i });
  const monthly = dialog.getByRole("spinbutton", { name: /månadsvis|monthly/i });

  await daily.fill("10000");
  await weekly.fill("50000");
  await monthly.fill("100000");

  await dialog.getByRole("button", { name: /fortsätt|continue|ange gränser/i }).click();

  try {
    await dialog.waitFor({ state: "hidden", timeout: 5_000 });
    return;
  } catch {
    // API save failed — force-remove the dialog and its backdrop from the DOM
    await page.evaluate(() => {
      document.querySelectorAll("[role='dialog']").forEach((el) => el.remove());
      // Remove Radix overlay/backdrop
      document.querySelectorAll("[data-radix-portal]").forEach((el) => el.remove());
    });
  }
}
