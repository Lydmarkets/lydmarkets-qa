import { test, expect } from "../fixtures/base";

// The bot legislation build serves an email/password auth form (no BankID,
// English /en/ locale). Login + register pages render a "Sign in" /
// "Create account" heading with email + password fields and a submit button.

test.describe("Authentication flows", () => {
  test("login page renders email/password sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /sign in/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with email/i }),
    ).toBeVisible();
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

  test("register page renders email/password account creation", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /create account/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /email/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    // GDPR consent checkbox must be present and acknowledged before creating.
    await expect(page.getByRole("checkbox").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i }),
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
    await expect(
      page.getByRole("heading", { name: /sign in/i, level: 1 }),
    ).toBeVisible();
  });
});
