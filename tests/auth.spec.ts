import { test, expect } from "../fixtures/base";

test.describe("Authentication flows", () => {
  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel("Email").fill("nonexistent@test.com");
    await page.getByLabel("Password").fill("wrongpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show an error toast or message
    await expect(
      page.getByText(/invalid|failed|incorrect/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("signup with weak password shows strength indicator", async ({ page }) => {
    await page.goto("/auth?mode=signup");
    await page.getByLabel("Password").fill("123");
    // Password strength meter should appear
    await expect(page.getByText(/weak/i)).toBeVisible();
  });

  test("signup with strong password shows strong indicator", async ({ page }) => {
    await page.goto("/auth?mode=signup");
    await page.getByLabel("Password").fill("Str0ng!P@ssword");
    await expect(page.getByText(/strong/i)).toBeVisible();
  });

  test("email validation shows error for invalid format", async ({ page }) => {
    await page.goto("/auth");
    const emailInput = page.getByLabel("Email");
    await emailInput.fill("not-an-email");
    await emailInput.blur();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("forgot password link navigates correctly", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/forgot-password/);
  });
});
