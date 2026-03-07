import { test, expect } from "../fixtures/base";

test.describe("Age verification gate flow", () => {
  test("modal appears for unauthenticated users", async ({ page, context }) => {
    // Clear cookies to ensure no age verification exists
    await context.clearCookies();

    // Navigate to homepage
    await page.goto("/");

    // Age verification modal should be visible
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Modal should have required elements
    await expect(page.getByRole("heading", { name: /age verification/i })).toBeVisible();
    await expect(page.getByLabel(/date of birth/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /confirm age/i })).toBeVisible();
  });

  test("modal rejects users under 18", async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    await page.goto("/");

    // Wait for modal
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible({ timeout: 5000 });

    // Enter a date of birth for someone under 18
    const today = new Date();
    const underageDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
    const dateString = underageDate.toISOString().split("T")[0];

    await page.getByLabel(/date of birth/i).fill(dateString);
    await page.getByRole("button", { name: /confirm age/i }).click();

    // Error message should appear
    await expect(page.getByText(/must be at least 18 years old/i)).toBeVisible();

    // Modal should still be visible
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();
  });

  test("verification succeeds for users over 18", async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    await page.goto("/");

    // Wait for modal
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible({ timeout: 5000 });

    // Enter a date of birth for someone over 18
    const today = new Date();
    const validDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
    const dateString = validDate.toISOString().split("T")[0];

    await page.getByLabel(/date of birth/i).fill(dateString);
    await page.getByRole("button", { name: /confirm age/i }).click();

    // Modal should disappear after successful verification
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).not.toBeVisible({ timeout: 5000 });

    // Success toast should appear
    await expect(page.getByText(/age verified/i)).toBeVisible();
  });

  test("verification persists via cookie across page reloads", async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    await page.goto("/");

    // Wait for modal and verify age
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible({ timeout: 5000 });

    const today = new Date();
    const validDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
    const dateString = validDate.toISOString().split("T")[0];

    await page.getByLabel(/date of birth/i).fill(dateString);
    await page.getByRole("button", { name: /confirm age/i }).click();

    // Wait for modal to disappear
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).not.toBeVisible({ timeout: 5000 });

    // Check that cookie was set
    const cookies = await context.cookies();
    const ageVerifiedCookie = cookies.find((c) => c.name === "age_verified");
    expect(ageVerifiedCookie).toBeDefined();
    expect(ageVerifiedCookie?.value).toBe("1");

    // Reload page
    await page.reload();

    // Modal should NOT appear because cookie is set
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    const isVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });

  test("blocked users cannot proceed to main content", async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    await page.goto("/");

    // Wait for modal
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible({ timeout: 5000 });

    // Modal should have backdrop with pointer-events that block interaction
    const modalContent = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(modalContent).toHaveAttribute("aria-modal", "true");

    // Try clicking outside modal (on backdrop)
    await page.locator("body").click({ position: { x: 10, y: 10 } });

    // Modal should still be visible - cannot escape
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();
  });

  test("modal closes only after valid age submission", async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    await page.goto("/");

    // Wait for modal
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Try invalid age first
    const today = new Date();
    const underageDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    const underageDateString = underageDate.toISOString().split("T")[0];

    await page.getByLabel(/date of birth/i).fill(underageDateString);
    await page.getByRole("button", { name: /confirm age/i }).click();

    // Modal should still be visible with error
    await expect(modal).toBeVisible();
    await expect(page.getByText(/must be at least 18 years old/i)).toBeVisible();

    // Clear and enter valid age
    const validDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
    const validDateString = validDate.toISOString().split("T")[0];

    await page.getByLabel(/date of birth/i).fill(validDateString);
    await page.getByRole("button", { name: /confirm age/i }).click();

    // Modal should now close
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test("age verification works correctly on boundary dates", async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    await page.goto("/");

    // Wait for modal
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible({ timeout: 5000 });

    // Test with exactly 18 years old (born today 18 years ago)
    const today = new Date();
    const exactlyEighteen = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const dateString = exactlyEighteen.toISOString().split("T")[0];

    await page.getByLabel(/date of birth/i).fill(dateString);
    await page.getByRole("button", { name: /confirm age/i }).click();

    // Should succeed
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).not.toBeVisible({ timeout: 5000 });
  });

  test("cookie persists across different routes", async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    await page.goto("/");

    // Verify age
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible({ timeout: 5000 });

    const today = new Date();
    const validDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
    const dateString = validDate.toISOString().split("T")[0];

    await page.getByLabel(/date of birth/i).fill(dateString);
    await page.getByRole("button", { name: /confirm age/i }).click();

    // Wait for modal to close
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).not.toBeVisible({ timeout: 5000 });

    // Navigate to different route
    await page.goto("/markets");

    // Modal should not appear
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    const isVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBe(false);

    // Navigate to another route
    await page.goto("/leaderboard");

    // Modal should still not appear
    const isVisibleOnLeaderboard = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisibleOnLeaderboard).toBe(false);
  });
});
