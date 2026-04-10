import { test, expect } from "../fixtures/base";
test.describe("Smoke tests — critical user flows", () => {
  test("homepage loads with key elements", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("login page renders BankID sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/välkommen tillbaka|welcome back/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /bankid on this computer|bankid på den här datorn|sign in with bankid|logga in med bankid/i }).first()).toBeVisible();
  });

  test("register page renders BankID account creation", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /skapa konto|create( an)? account/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /starta bankid|start bankid/i })).toBeVisible();
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
