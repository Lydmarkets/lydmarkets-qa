import { test, expect } from "../fixtures/base";

// Auth uses BankID exclusively — no email/password form exists.

test.describe("Authentication flows", () => {
  test("login page renders BankID sign-in options", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByRole("button", { name: /BankID on another device/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /BankID on this device/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in with BankID/i })).toBeVisible();
  });

  test("login page has link to create account", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/Don't have an account/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /create one/i })).toBeVisible();
  });

  test("create one link navigates to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /create one/i }).click();
    await page.waitForURL(/\/register/);
  });

  test("register page renders BankID account creation", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();
    await expect(page.getByText(/Swedish BankID/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /BankID on another device/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start BankID/i })).toBeVisible();
  });

  test("register page has link back to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText(/Already have an account/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("sign in link on register navigates to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: /sign in/i }).click();
    await page.waitForURL(/\/login/);
  });

  test("protected routes redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/wallet");
    await page.waitForURL(/\/login/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});
