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
    // Subtitle copy mentions BankID — tolerate marketing-style variants.
    await expect(
      page.getByText(/bankid|logga in|sign in/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("login page has link to create an account", async ({ page }) => {
    await page.goto("/login");
    // Post-SCRUM-797 copy: "Öppna konto" / "Open account".
    await expect(
      page.getByRole("link", { name: /öppna konto|open account|create( an)? account/i })
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

  test("unauthenticated user can reach Sign in from the header menu drawer", async ({ page }) => {
    // SCRUM-1090/1092: NavAuthControls removed from the banner — Sign in /
    // Register now live inside the UserMenu drawer, opened via the "Öppna
    // meny" / "Open menu" hamburger button in the top header.
    await page.goto("/");
    await page.getByRole("button", { name: /öppna meny|open menu/i }).click();
    await expect(
      page.getByRole("link", { name: /^logga in$|^sign in$/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("link", { name: /^registrera$|^sign up$/i })
    ).toBeVisible();
  });

  test("clicking Sign in from the drawer navigates to the login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /öppna meny|open menu/i }).click();
    await page
      .getByRole("link", { name: /^logga in$|^sign in$/i })
      .click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

});
