import { test, expect } from "../fixtures/base";

// SCRUM-1090: the legacy "Mer" / "More" hamburger that used to live on the
// BottomNav was removed. The mobile BottomNav is now a trimmed three-entry
// nav (Markets, Search, My Positions) and the unified UserMenu drawer in
// the top NavBar handles auth, balance, and secondary nav links.
const MOBILE_VIEWPORT = { width: 393, height: 851 };

test.describe("Mobile BottomNav — unauthenticated", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test(
    "BottomNav exposes the three primary tabs",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/");
      const bottomNav = page.locator("nav.fixed.inset-x-0.bottom-0").first();
      await expect(bottomNav).toBeVisible({ timeout: 10_000 });
      // Link tabs are stable by href; the search button stays a <button>.
      await expect(bottomNav.locator('a[href="/markets"]')).toBeVisible();
      await expect(bottomNav.locator('a[href="/portfolio"]')).toBeVisible();
      await expect(
        bottomNav.getByRole("button", { name: /^sök$|^search$/i }),
      ).toBeVisible();
      // The legacy "Mer" / "More" hamburger no longer renders here.
      await expect(
        bottomNav.getByRole("button", { name: /^mer$|^more$/i }),
      ).toHaveCount(0);
    },
  );

  test(
    "BottomNav Markets tab navigates to /markets",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      const bottomNav = page.locator("nav.fixed.inset-x-0.bottom-0").first();
      await bottomNav.locator('a[href="/markets"]').click();
      await page.waitForURL(/\/markets(\?|$)/, { timeout: 10_000 });
      expect(new URL(page.url()).pathname).toBe("/markets");
    },
  );

  test(
    "Search button opens the mobile search sheet",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      const searchBtn = page
        .locator("nav.fixed.inset-x-0.bottom-0")
        .first()
        .getByRole("button", { name: /^sök$|^search$/i });
      await expect(searchBtn).toBeVisible({ timeout: 10_000 });
      await searchBtn.click();
      // The sheet's <input type="search"> exposes role="searchbox" with
      // aria-label "Search" / "Sök" and placeholder "Search markets…".
      const searchbox = page.getByRole("searchbox", { name: /^sök$|^search$/i });
      await expect(searchbox).toBeVisible({ timeout: 5_000 });
      await expect(searchbox).toHaveAttribute(
        "placeholder",
        /sök marknader|search markets/i,
      );
    },
  );

  test(
    "User menu drawer in top nav exposes Sign in / Sign up rows",
    { tag: ["@regression"] },
    async ({ page }) => {
      // SCRUM-1090: secondary nav links (Sign in / Sign up / responsible
      // gambling / settings) live in the UserMenu drawer launched from the
      // top NavBar — not the BottomNav anymore.
      await page.goto("/");
      const userBtn = page
        .getByRole("banner")
        .getByRole("button", {
          name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
        })
        .first();
      await expect(userBtn).toBeVisible({ timeout: 10_000 });
      await userBtn.click();
      const drawer = page.getByRole("complementary").last();
      await expect(
        drawer.getByRole("link", { name: /logga in|sign in/i }),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "BottomNav is hidden on desktop viewports (lg+)",
    { tag: ["@regression"] },
    async ({ page }) => {
      // Override the per-describe mobile viewport for this one test.
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
      await expect(page.locator("nav.fixed.inset-x-0.bottom-0")).toBeHidden();
    },
  );
});
