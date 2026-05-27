import { test, expect } from "../fixtures/base";

// See auth.spec.ts BANKID_BUTTON_RE — same set of variants.
const BANKID_BUTTON_RE =
  /öppna bankid|visa qr-?kod|open bankid|show qr|bankid på den här enheten|bankid on this device/i;

test.describe("Smoke tests — critical user flows", () => {
  test("homepage loads with key elements", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("login page renders BankID sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /logga in|sign in/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: BANKID_BUTTON_RE }).first(),
    ).toBeVisible();
  });

  test("register page renders BankID account creation", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", {
        name: /bankid-?verifiering|bankid verification/i,
        level: 1,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: BANKID_BUTTON_RE }).first(),
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
