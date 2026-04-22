import { test, expect } from "../fixtures/base";

// SCRUM-398 — login happy path. Updated for editorial-redesign copy
// (SCRUM-1043) and the SCRUM-1090 unified UserMenu drawer.

test.describe("SCRUM-398: Login happy path — successful login redirects to dashboard", () => {
  test("login page renders with BankID sign-in options", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /welcome back|välkommen tillbaka/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page
        .getByRole("button", {
          name: /bankid on this computer|bankid på den här datorn|mobile bankid|mobilt bankid/i,
        })
        .first(),
    ).toBeVisible();
  });

  test("login page shows body copy explaining BankID flow", async ({ page }) => {
    await page.goto("/login");
    // Editorial body: "Sign in with Swedish BankID to continue trading on Lydmarkets." /
    // "Logga in med svenskt BankID för att fortsätta handla på Lydmarkets."
    await expect(
      page.getByText(/svenskt bankid|swedish bankid/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("login page has link to create an account", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("link", { name: /öppna konto|open account/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("unauthenticated user visiting protected route is redirected to login", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user visiting /wallet is redirected to login", async ({ page }) => {
    // /watchlist was removed in the markets redesign; /wallet is now the
    // canonical protected balance surface (redirects internally to
    // /wallet/deposit, both protected by middleware).
    await page.goto("/wallet");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated home page exposes Sign in via the user menu drawer", async ({ page }) => {
    // SCRUM-1090: NavAuthControls + BottomNav hamburger were unified into a
    // single UserMenu drawer. The banner now shows only an icon button —
    // open it to reveal the Sign in / Sign up rows.
    await page.goto("/");
    const banner = page.getByRole("banner");
    const userBtn = banner
      .getByRole("button", { name: /open.*menu|öppna.*meny|user menu|användarmeny/i })
      .first();
    await expect(userBtn).toBeVisible({ timeout: 10000 });
    await userBtn.click();

    // Drawer is rendered as <aside aria-label="…user menu…"> — Playwright
    // exposes <aside> via role="complementary".
    const drawer = page.getByRole("complementary").last();
    await expect(
      drawer.getByRole("link", { name: /logga in|sign in/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      drawer.getByRole("link", { name: /registrera|sign up|skapa konto/i }),
    ).toBeVisible();
  });

  test("clicking Sign in from the user menu navigates to /login", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("banner")
      .getByRole("button", { name: /open.*menu|öppna.*meny|user menu|användarmeny/i })
      .first()
      .click();

    const drawer = page.getByRole("complementary").last();
    await drawer.getByRole("link", { name: /logga in|sign in/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
