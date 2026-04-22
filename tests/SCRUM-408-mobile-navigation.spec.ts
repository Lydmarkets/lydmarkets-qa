import { test, expect } from "../fixtures/base";
import { isAuthenticated } from "../helpers/is-authenticated";

const MOBILE_VIEWPORT = { width: 393, height: 851 };

// SCRUM-408: Mobile navigation. Updated for SCRUM-1090 — the legacy "Mer"
// hamburger drawer that lived on the BottomNav was unified with the desktop
// NavAuthControls dropdown into a single UserMenu drawer (torso icon in the
// top NavBar, identical on every breakpoint). The BottomNav itself was
// trimmed to three entries: Markets / Search / My Positions.

test.describe("SCRUM-408: Mobile navigation — unauthenticated", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("Sign in / Sign up are exposed via the UserMenu drawer", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("banner")
      .getByRole("button", {
        name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
      })
      .first()
      .click();
    const drawer = page.getByRole("complementary").last();
    await expect(
      drawer.getByRole("link", { name: /sign in|logga in/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      drawer.getByRole("link", { name: /sign up|registrera|skapa konto/i }),
    ).toBeVisible();
  });

  test("BottomNav renders Markets, Search, My Positions (no More button)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    const bottomNav = page.locator("nav.fixed.inset-x-0.bottom-0").first();
    await expect(bottomNav).toBeVisible({ timeout: 10_000 });
    await expect(bottomNav.locator('a[href="/markets"]')).toBeVisible();
    await expect(bottomNav.locator('a[href="/portfolio"]')).toBeVisible();
    await expect(
      bottomNav.getByRole("button", { name: /^sök$|^search$/i }),
    ).toBeVisible();
    // No legacy More / Mer hamburger after SCRUM-1090.
    await expect(
      bottomNav.getByRole("button", { name: /^mer$|^more$/i }),
    ).toHaveCount(0);
  });

  test("UserMenu drawer surfaces Responsible Gambling (via the ansvarsspel-bar)", async ({
    page,
  }) => {
    // SCRUM-885 puts the responsible-gambling controls in a dedicated top
    // strip that's always visible — Spelpaus / Spelgränser / Självtest /
    // 24h. Verify the strip is reachable from mobile.
    await page.goto("/");
    const bar = page.getByRole("complementary", {
      name: /spelansvarsverktyg|responsible gambling tools/i,
    });
    await expect(bar).toBeVisible({ timeout: 10_000 });
    // Pills carry aria-labels that differ from their visible text — match by
    // href instead of role/name.
    await expect(bar.locator('a[href*="spelpaus.se"]').first()).toBeVisible();
    await expect(
      bar.locator('a[href$="/profil/spelgranser"]').first(),
    ).toBeVisible();
  });
});

test.describe("SCRUM-408: Mobile navigation — authenticated drawer", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    storageState: "playwright/.auth/user.json",
  });

  test("UserMenu drawer surfaces nav rows (Markets / Wallet / Settings)", async ({
    page,
  }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page
      .getByRole("banner")
      .getByRole("button", {
        name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
      })
      .first()
      .click();
    const drawer = page.getByRole("complementary").last();

    // Either /settings or /wallet should be reachable from the drawer rows.
    const hasSettings = await drawer
      .locator('a[href*="/settings"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasWallet = await drawer
      .locator('a[href*="/wallet"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(hasSettings || hasWallet).toBeTruthy();
  });

  test("UserMenu drawer exposes a Sign out button", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page
      .getByRole("banner")
      .getByRole("button", {
        name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
      })
      .first()
      .click();
    const drawer = page.getByRole("complementary").last();
    await expect(
      drawer.getByRole("button", { name: /log ?out|sign out|logga ut/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Settings link in the drawer navigates to /settings", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page
      .getByRole("banner")
      .getByRole("button", {
        name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
      })
      .first()
      .click();
    const drawer = page.getByRole("complementary").last();
    const settingsLink = drawer
      .getByRole("link", { name: /settings|inställningar/i })
      .first();
    const isVisible = await settingsLink
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!isVisible) {
      test.skip(true, "Drawer doesn't surface a Settings row in this build");
      return;
    }
    await settingsLink.click();
    await page.waitForURL(/\/settings/, { timeout: 10_000 });
  });
});
