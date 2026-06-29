import { test, expect } from "../fixtures/base";

// The bot legislation build uses email/password auth (no BankID): the login
// page is an email + password form with a "Sign in with email" button and the
// register page is a "Create account" email/password form. The Swedish text
// alternatives are kept so the same spec still passes on a Swedish build.

test.describe("Smoke tests — critical user flows", () => {
  test("homepage loads with key elements", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("login page renders the email sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /logga in|sign in/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /email|e-?post/i }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("button", { name: /sign in with email|sign in|logga in/i })
        .first(),
    ).toBeVisible();
  });

  test("register page renders the email account-creation form", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", {
        name: /create account|skapa konto|registrera/i,
        level: 1,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /email|e-?post/i }).first(),
    ).toBeVisible();
  });

  test("markets page loads", async ({ page }) => {
    await page.goto("/markets");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("how it works page loads", async ({ page }) => {
    await page.goto("/how-it-works");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
