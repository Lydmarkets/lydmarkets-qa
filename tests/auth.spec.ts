import { test, expect } from "../fixtures/base";
// Auth uses BankID exclusively — no email/password form exists.

test.describe("Authentication flows", () => {
  test("login page renders BankID sign-in options", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/välkommen tillbaka|welcome back/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /bankid on this computer|bankid på den här datorn|sign in with bankid|logga in med bankid/i }).first()).toBeVisible();
  });

  test("login page has link to create account", async ({ page }) => {
    await page.goto("/login");
    // SCRUM-797 copy: "Har du inget konto?" (SV) / "No account?" (EN).
    await expect(
      page.getByText(/har du inget konto|no account|don't have an account/i).first()
    ).toBeVisible();
    // i18n key `auth.login.createAccountLink` is "Öppna konto" / "Open account".
    await expect(
      page.getByRole("link", { name: /öppna konto|open account|create( an)? account/i })
    ).toBeVisible();
  });

  test("create one link navigates to register", async ({ page }) => {
    await page.goto("/login");
    await page
      .getByRole("link", { name: /öppna konto|open account|create( an)? account/i })
      .click();
    await page.waitForURL(/\/register/);
  });

  test("register page renders BankID account creation", async ({ page }) => {
    await page.goto("/register");
    // SCRUM-797: register heading is now a marketing split title
    // ("Handla på det som är på väg att hända." / "Trade on what's coming next.")
    // — the previous "Skapa konto" / "Create an account" heading was removed.
    await expect(
      page.getByRole("heading", {
        name: /handla på det som|trade on what|skapa konto|create( an)? account/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /starta bankid|start bankid/i })
    ).toBeVisible();
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
