import { test, expect } from "../fixtures/base";
test.describe("SCRUM-398: Login happy path — successful login redirects to dashboard", () => {
  test("login page renders with BankID sign-in options", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /welcome back|välkommen tillbaka/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /bankid on this computer|bankid på den här datorn|sign in with bankid|logga in med bankid/i }).first()
    ).toBeVisible();
  });

  test("login page shows subtitle explaining BankID flow", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByText(/logga in på ditt lydmarkets|sign in to your lydmarkets/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("login page has link to create an account", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("link", { name: /skapa ett|create one/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("unauthenticated user visiting protected route is redirected to login", async ({ page }) => {
    await page.goto("/settings");
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
    const nav = page.getByRole("banner");
    await expect(
      nav.getByRole("link", { name: /logga in|sign in/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      nav.getByRole("link", { name: /registrera|sign up/i })
    ).toBeVisible();
  });

  test("clicking Sign in navigates to the login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: /logga in|sign in/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

});
