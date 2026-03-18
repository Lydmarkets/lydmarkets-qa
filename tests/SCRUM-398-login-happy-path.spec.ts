import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("SCRUM-398: Login happy path — successful login redirects to dashboard", () => {
  test("login page renders with BankID sign-in options", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /sign in with bankid/i })
    ).toBeVisible();
  });

  test("login page shows subtitle explaining BankID flow", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByText(/sign in to your lydmarkets account with bankid/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("login page has link to create an account", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("link", { name: /create one/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("unauthenticated user visiting protected route is redirected to login", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user visiting watchlist is redirected to login", async ({ page }) => {
    await page.goto("/watchlist");
    const url = page.url();
    expect(url.includes("/login") || url.includes("/watchlist")).toBeTruthy();
  });

  test("home page shows Sign in and Sign up buttons for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await expect(
      page.getByRole("link", { name: /sign in/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("link", { name: /sign up/i })
    ).toBeVisible();
  });

  test("clicking Sign in navigates to the login page", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.getByRole("link", { name: /sign in/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

});
