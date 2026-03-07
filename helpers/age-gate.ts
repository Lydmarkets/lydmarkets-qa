import type { Page } from "@playwright/test";

/**
 * Dismisses the Age Verification modal if it appears.
 * The modal shows "Åldersbekräftelse" with a confirm button "Jag är 18 år eller äldre".
 * Waits briefly for the modal to mount before deciding it's absent.
 */
export async function dismissAgeGate(page: Page): Promise<void> {
  const confirmButton = page.getByRole("button", { name: /jag är 18/i });

  try {
    await confirmButton.waitFor({ state: "visible", timeout: 3_000 });
  } catch {
    // Modal didn't appear — nothing to do
    return;
  }

  await confirmButton.click();
  await confirmButton.waitFor({ state: "hidden", timeout: 5_000 });
}
