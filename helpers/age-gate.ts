import type { Page } from "@playwright/test";

/**
 * Dismisses the Age Verification modal if it appears.
 * Waits briefly for the modal to mount before deciding it's absent.
 */
export async function dismissAgeGate(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "Age Verification" });

  try {
    await heading.waitFor({ state: "visible", timeout: 3_000 });
  } catch {
    // Modal didn't appear — nothing to do
    return;
  }

  // Use the label text (case-insensitive) to locate the date input
  await page.getByLabel(/date of birth/i).fill("1990-01-01");
  await page.getByRole("button", { name: "Confirm Age" }).click();
  await heading.waitFor({ state: "hidden", timeout: 5_000 });
}
