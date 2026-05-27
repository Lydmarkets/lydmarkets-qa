import { test, expect } from "../fixtures/base";
// Auth uses BankID exclusively — no email/password form exists.

// Login + register pages share the BankID action buttons after the auth-page
// redesign. Match all rendered variants across locales:
//   - "Öppna BankID" / "Open BankID"            (mobile, auto-start)
//   - "Visa QR-kod" / "Show QR code"            (desktop, QR mode)
//   - "Öppna BankID på den här enheten" / "Open BankID on this device"
const BANKID_BUTTON_RE =
  /öppna bankid|visa qr-?kod|open bankid|show qr|bankid på den här enheten|bankid on this device/i;

test.describe("Authentication flows", () => {
  test("login page renders BankID sign-in options", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /logga in|sign in/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: BANKID_BUTTON_RE }).first(),
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

  test("register page renders BankID account creation", async ({ page }) => {
    await page.goto("/register");
    // Register page H1 is `auth.register.step1Title` = "BankID-verifiering" /
    // "BankID Verification". The 2-step flow indicator "Steg 1 av 2" /
    // "Step 1 of 2" appears above the heading.
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
      page.getByRole("heading", { name: /logga in|sign in/i, level: 1 }),
    ).toBeVisible();
  });
});
