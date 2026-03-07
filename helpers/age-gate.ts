import type { Page } from "@playwright/test";

/**
 * Dismisses the Age Verification modal if it appears.
 * The modal is a site-wide gate shown to users without the age cookie.
 * It renders in Swedish with a single "Jag är 18 år eller äldre" confirm button.
 */
export async function dismissAgeGate(page: Page): Promise<void> {
  const confirmButton = page.getByRole("button", { name: /jag är 18 år eller äldre/i });

  try {
    await confirmButton.waitFor({ state: "visible", timeout: 3_000 });
  } catch {
    // Modal didn't appear — nothing to do
    return;
  }

  await confirmButton.click();

  // Wait for the modal backdrop to disappear
  await confirmButton.waitFor({ state: "hidden", timeout: 5_000 });
}
