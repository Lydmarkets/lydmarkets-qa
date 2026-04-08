import { test, expect } from "../fixtures/base";
// Auth uses BankID exclusively — no email/password form exists.

test.describe("Authentication flows", () => {
  test("login page renders BankID sign-in options", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/välkommen tillbaka|welcome back/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /logga in med bankid|sign in with bankid/i })).toBeVisible();
  });

  test("login page has link to create account", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/har du inget konto|don't have an account/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /skapa ett|create one/i })).toBeVisible();
  });

  test("create one link navigates to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /skapa ett|create one/i }).click();
    await page.waitForURL(/\/register/);
  });

  test("register page renders BankID account creation", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /skapa konto|create an account/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /starta bankid|start bankid/i })).toBeVisible();
  });

  test("register page has link back to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText(/har du redan|already have/i)).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /logga in|sign in/i })).toBeVisible();
  });

  test("sign in link on register navigates to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("main").getByRole("link", { name: /logga in|sign in/i }).click();
    await page.waitForURL(/\/login/);
  });

  test("protected routes redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/wallet");
    await page.waitForURL(/\/login/);
    await expect(page.getByText(/välkommen tillbaka|welcome back/i)).toBeVisible();
  });
});
