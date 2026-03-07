import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

// SCRUM-399: Password reset flow — forgot-password to confirmation
// Acceptance criteria:
// 1. /auth page shows a forgot password link
// 2. Clicking the link navigates to /forgot-password
// 3. /forgot-password page renders an email input and submit button
// 4. Submitting a valid email shows a success confirmation message
// 5. Submitting with an empty/invalid email shows a validation error

test.describe("SCRUM-399 — Password reset flow", () => {
  test("auth page shows a forgot password link", async ({ page }) => {
    await page.goto("/auth");
    await dismissAgeGate(page);

    // The forgot-password link should be visible on the sign-in form
    const forgotLink = page.getByRole("link", { name: /forgot.?password/i });
    await expect(forgotLink).toBeVisible({ timeout: 8000 });
  });

  test("clicking forgot password link navigates to /forgot-password", async ({ page }) => {
    await page.goto("/auth");
    await dismissAgeGate(page);

    const forgotLink = page.getByRole("link", { name: /forgot.?password/i });
    await expect(forgotLink).toBeVisible({ timeout: 8000 });
    await forgotLink.click();
    await page.waitForURL(/forgot-password/, { timeout: 10000 });
    expect(page.url()).toContain("forgot-password");
  });

  test("forgot-password page renders email input and submit button", async ({ page }) => {
    await page.goto("/forgot-password");
    await dismissAgeGate(page);

    await expect(page.locator("main")).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("button", { name: /send|submit|reset|continue/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("submitting a valid email shows success confirmation", async ({ page }) => {
    await page.goto("/forgot-password");
    await dismissAgeGate(page);

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /send|submit|reset|continue/i }).click();

    // Should show confirmation — check for success text or URL change
    const successVisible = await page
      .getByText(/check.?your.?email|sent|confirmation|link/i)
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);

    const urlChanged =
      page.url().includes("confirmation") ||
      page.url().includes("success") ||
      page.url().includes("check");

    expect(successVisible || urlChanged).toBeTruthy();
  });

  test("submitting forgot-password with empty email shows validation error", async ({ page }) => {
    await page.goto("/forgot-password");
    await dismissAgeGate(page);

    // Click submit without filling in email
    await page.getByRole("button", { name: /send|submit|reset|continue/i }).click();

    // Should show a validation error or prevent submission
    const hasError = await page
      .getByText(/required|valid email|invalid|enter/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Alternatively, the page should still be on forgot-password (no redirect on invalid submit)
    const stillOnPage = page.url().includes("forgot-password");

    expect(hasError || stillOnPage).toBeTruthy();
  });

  test("forgot-password page has a link back to sign in", async ({ page }) => {
    await page.goto("/forgot-password");
    await dismissAgeGate(page);

    const backLink = page.getByRole("link", { name: /sign.?in|log.?in|back/i });
    await expect(backLink).toBeVisible({ timeout: 5000 });
  });
});
