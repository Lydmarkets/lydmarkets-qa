import { test, expect } from "../fixtures/base";
// Auth uses BankID exclusively — no email/password form exists.
//
// Editorial-redesign copy (SCRUM-1043 / SCRUM-1042):
//   /login   kicker "Sign in", h1 "Welcome back.", body "Sign in with Swedish BankID …"
//            CTA buttons localized: "BankID on this computer" / "Mobile BankID"
//            footer link "Open account →" / "Öppna konto →" → /register
//   /register kicker "Open account", h1 "Trade on what is about to happen."
//            CTA "Start BankID" / "Starta BankID"
//            footer link "Sign in →" / "Logga in →" → /login

test.describe("Authentication flows", () => {
  test("login page renders BankID sign-in options", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /välkommen tillbaka|welcome back/i }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("button", {
          name: /bankid on this computer|bankid på den här datorn|mobile bankid|mobilt bankid/i,
        })
        .first(),
    ).toBeVisible();
  });

  test("login page has link to create account", async ({ page }) => {
    await page.goto("/login");
    // Editorial copy: "No account?" / "Har du inget konto?" + "Open account →" / "Öppna konto →"
    await expect(
      page.getByText(/har du inget konto|no account\?/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /öppna konto|open account/i }),
    ).toBeVisible();
  });

  test("create-account link navigates to register", async ({ page }) => {
    await page.goto("/login");
    await page
      .getByRole("link", { name: /öppna konto|open account/i })
      .click();
    await page.waitForURL(/\/register/);
  });

  test("register page renders BankID account creation", async ({ page }) => {
    await page.goto("/register");
    // The new editorial register page leads with the kicker "Open account" /
    // "Öppna konto" — the H1 is the editorial line "Trade on what is about
    // to happen." Verify both the kicker and the BankID CTA are present.
    await expect(
      page.getByText(/öppna konto|open account/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /starta bankid|start bankid/i }),
    ).toBeVisible();
  });

  test("register page has link back to login", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByText(/har du redan|already have/i),
    ).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: /logga in|sign in/i }),
    ).toBeVisible();
  });

  test("sign-in link on register navigates to login", async ({ page }) => {
    await page.goto("/register");
    await page
      .getByRole("main")
      .getByRole("link", { name: /logga in|sign in/i })
      .click();
    await page.waitForURL(/\/login/);
  });

  test("protected routes redirect unauthenticated users to login", async ({ page }) => {
    // /wallet now redirects to /wallet/deposit which is protected; both are
    // covered by middleware.ts protected list, so unauth users land on /login.
    await page.goto("/wallet");
    await page.waitForURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /välkommen tillbaka|welcome back/i }),
    ).toBeVisible();
  });
});
