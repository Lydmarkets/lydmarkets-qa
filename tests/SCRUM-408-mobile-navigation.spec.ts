import { test, expect } from "../fixtures/base";
import { IS_BOT_BUILD } from "../helpers/is-bot-build";
import { openUserMenu, getMenuTrigger, SESSION_TIMER_REGEX } from "../helpers/user-menu";

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
    await expect(getMenuTrigger(page)).toBeVisible({ timeout: 10_000 });
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
    await openUserMenu(page);

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
    await expect(page).not.toHaveURL(/\/login/);

    await openUserMenu(page);

    await expect(
      page.getByRole("link", { name: /^my profile$|^min profil$/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("UserMenu drawer shows the theme toggle", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    await openUserMenu(page);

    // Theme toggle composes as "Tema Mörkt|Ljust" / "Theme Dark|Light"
    // (nav.themeLabel + nav.themeDark|nav.themeLight).
    await expect(
      page.getByRole("button", {
        name: /(tema|theme)\s+(mörkt|ljust|dark|light)/i,
      })
    ).toBeVisible({ timeout: 5_000 });
  });

  // A single-language build must not advertise a language switch it cannot
  // honour. The bilingual build ships one; the English-only bot build must not.
  test("UserMenu drawer's language toggle matches the build's locale support", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    await openUserMenu(page);

    // Language toggle button is composed as "<icon> <label> <state>",
    // e.g. "Språk SV" / "Language EN" (nav.languageLabel + locale code).
    const languageToggle = page.getByRole("button", {
      name: /(språk|language)\s+(en|sv)/i,
    });
    await expect(languageToggle).toHaveCount(IS_BOT_BUILD ? 0 : 1);
  });

  test("UserMenu drawer surfaces the session timer and balance for authenticated users", async ({
    page,
  }) => {
    // SCRUM-1090 relocated the session timer and wallet balance into the
    // drawer header. A Logout button is planned in SCRUM-1092 — add a test
    // for it once that ticket ships.
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    await openUserMenu(page);

    // Session timer format: "0 min" / "5 min" / "43 mins" / "1 tim 23 min" /
    // "22 hrs 4 mins". The anchored `^\d+\s*(min|tim)` used here before could
    // not match the hours form ("22 hrs …" starts with a number followed by
    // "hrs"), so which node it matched depended on render timing — that was the
    // flake. Use the shared, unanchored regex.
    await expect(
      page.getByText(SESSION_TIMER_REGEX).first()
    ).toBeVisible({ timeout: 10_000 });
    // The balance (in €) is privacy-masked behind a "Show balance" toggle in
    // the rail; its presence proves the balance is reachable on this screen.
    await expect(
      page
        .getByRole("button", {
          name: /show balance|hide balance|visa saldo|dölj saldo/i,
        })
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("My Profile link in drawer navigates to /profile", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    await openUserMenu(page);

    const profileLink = page.getByRole("link", {
      name: /^my profile$|^min profil$/i,
    });
    await expect(profileLink).toBeVisible({ timeout: 5_000 });
    await profileLink.click();
    await page.waitForURL(/\/profile/, { timeout: 10_000 });
  });
});
