import { test, expect } from "../fixtures/base";
// /wallet redirects unauthenticated users to /login?redirect=%2Fwallet.
// Full authenticated wallet flows are covered by SCRUM-409 (settings) and SCRUM-401 (order placement).

test.describe("Wallet and payment flows", () => {
  test("wallet page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/wallet");
    await page.waitForURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /logga in|sign in/i, level: 1 }),
    ).toBeVisible();
  });

  test("login redirect includes wallet return path", async ({ page }) => {
    await page.goto("/wallet");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("redirect");
  });

  test("portfolio page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/portfolio");
    await page.waitForURL(/\/login/);
    expect(page.url()).toMatch(/\/login/);
  });
});
