import { test, expect } from "../fixtures/base";
import { isAuthenticated } from "../helpers/is-authenticated";

const MOBILE_VIEWPORT = { width: 393, height: 851 };

// SCRUM-1090/1092 consolidated navigation:
//   - BottomNav (below lg): 3 tabs — Marknader/Markets, Sök/Search, Mina
//     positioner/My Positions. The fourth "Mer/More" slot was removed.
//   - Top header: "Öppna meny" / "Open menu" hamburger opens the UserMenu
//     drawer (aside). The drawer replaces the old BottomNav sheet and holds
//     Sign in / Register (guest) or Logout + Settings + Responsible gambling
//     links (authenticated) plus theme + language toggles.
//   - Drawer close button is "Stäng meny" / "Close menu".

test.describe("SCRUM-408: Mobile navigation — unauthenticated", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("unauthenticated mobile header exposes the UserMenu trigger", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /öppna meny|open menu/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated mobile home renders the BottomNav with Markets tab", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    const bottomNav = page.locator("nav.fixed.inset-x-0.bottom-0").first();
    await expect(bottomNav).toBeVisible({ timeout: 10_000 });
    await expect(
      bottomNav.getByRole("link", { name: /marknader|markets/i })
    ).toBeVisible();
  });

  test("UserMenu drawer shows Sign in / Register and the Responsible Gambling section", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /öppna meny|open menu/i }).click();

    await expect(
      page.getByRole("link", { name: /^logga in$|^sign in$/i })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("link", { name: /^registrera$|^sign up$/i })
    ).toBeVisible();
    // Responsible-gambling section heading (non-link label).
    await expect(
      page.getByText(/ansvarsfullt spelande|responsible gambling/i).first()
    ).toBeVisible();
  });
});

test.describe("SCRUM-408: Mobile navigation — authenticated drawer", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    storageState: "playwright/.auth/user.json",
  });

  test("UserMenu drawer shows My Profile link for authenticated users", async ({ page }) => {
    // Note: SCRUM-1092 (in progress) will add a Settings shortcut + Logout
    // button. Until then the drawer exposes account management via My Profile,
    // which is the existing route for account settings.
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    const menuBtn = page.getByRole("button", { name: /öppna meny|open menu/i });
    await expect(menuBtn).toBeVisible({ timeout: 5_000 });
    await menuBtn.click();

    await expect(
      page.getByRole("link", { name: /^my profile$|^min profil$/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("UserMenu drawer shows theme and language toggles", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page.getByRole("button", { name: /öppna meny|open menu/i }).click();

    // Language toggle is present even when unauthenticated ("Byt till
    // engelska" / "Switch to English"); asserting it also implicitly
    // confirms the drawer opened.
    await expect(
      page.getByRole("button", {
        name: /switch to (swedish|english)|byt till (svenska|engelska)/i,
      })
    ).toBeVisible({ timeout: 5_000 });
    // Theme toggle aria-label.
    await expect(
      page.getByRole("button", {
        name: /switch to (light|dark) mode|byt till (ljust|mörkt) läge/i,
      })
    ).toBeVisible();
  });

  test("UserMenu drawer surfaces the session timer and balance for authenticated users", async ({
    page,
  }) => {
    // SCRUM-1090 relocated the session timer and wallet balance into the
    // drawer header. A Logout button is planned in SCRUM-1092 — add a test
    // for it once that ticket ships.
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page.getByRole("button", { name: /öppna meny|open menu/i }).click();

    // Session timer format: "0 min" / "5 min" / "1 tim 23 min" (SCRUM-1090).
    await expect(
      page.getByText(/^\d+\s*(min|tim)/i).first()
    ).toBeVisible({ timeout: 5_000 });
    // Balance formatted as "X,XX kr".
    await expect(
      page.getByText(/\d+[.,]\d{2}\s*kr/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("My Profile link in drawer navigates to /profile", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    const menuBtn = page.getByRole("button", { name: /öppna meny|open menu/i });
    await expect(menuBtn).toBeVisible({ timeout: 5_000 });
    await menuBtn.click();

    const profileLink = page.getByRole("link", {
      name: /^my profile$|^min profil$/i,
    });
    await expect(profileLink).toBeVisible({ timeout: 5_000 });
    await profileLink.click();
    await page.waitForURL(/\/profile/, { timeout: 10_000 });
  });
});
