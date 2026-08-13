import { test, expect } from "../fixtures/base";
import { getUserMenuDrawer, openUserMenu } from "../helpers/user-menu";

// The mobile BottomNav renders below lg for everyone and after SCRUM-1090 has
// three entries: Markets (link), Search (button), My Positions (link). The
// "More" / "Mer" slot was moved into the top header as an "Öppna meny" /
// "Open menu" hamburger that opens the UserMenu drawer.
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
      // Link labels vary by locale, so assert link tabs by stable href. Hrefs
      // carry the active locale prefix on this build (e.g. `/en/markets`), so
      // match the path suffix.
      await expect(bottomNav.locator('a[href$="/markets"]')).toBeVisible();
      await expect(bottomNav.locator('a[href$="/portfolio"]')).toBeVisible();
      await expect(
        bottomNav.getByRole("button", { name: /^sök$|^search$/i })
      ).toBeVisible();
    }
  );

  test(
    "BottomNav Markets tab navigates to /markets",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      const bottomNav = page.locator("nav.fixed.inset-x-0.bottom-0").first();
      await bottomNav.locator('a[href$="/markets"]').click();
      await page.waitForURL(/\/markets(\?|$)/, { timeout: 10_000 });
      // Pathname carries the active locale prefix on this build (e.g.
      // `/en/markets`), so match the suffix rather than an exact path.
      expect(new URL(page.url()).pathname).toMatch(/\/markets$/);
    }
  );

  test(
    "header drawer closes on backdrop click and on Escape",
    { tag: ["@regression"] },
    async ({ page }) => {
      // This was fixme'd as a product bug ("backdrop clicks and Escape don't
      // dismiss the drawer"). They do — the drawer is never unmounted. It slides
      // out via `translate-x-full` and is marked `inert`, and a translated
      // element still has a bounding box, so `toBeHidden()` can never pass. The
      // closed state to assert is `inert`: that is what actually takes the
      // drawer's contents out of the a11y tree and out of tab order.
      // Use openUserMenu, not a hardcoded name: the guest trigger's accessible
      // name flips "Open menu" → "Sign in" across hydration (see helpers/user-menu).
      const drawer = getUserMenuDrawer(page);

      await page.goto("/");
      await openUserMenu(page);
      await expect(drawer).not.toHaveAttribute("inert");

      // Backdrop covers the viewport; the drawer is pinned right (w-80), so the
      // far-left edge is backdrop on this 390px-wide viewport.
      await page.mouse.click(8, 400);
      await expect(drawer).toHaveAttribute("inert", /.*/, { timeout: 5_000 });

      await openUserMenu(page);
      await expect(drawer).not.toHaveAttribute("inert");

      await page.keyboard.press("Escape");
      await expect(drawer).toHaveAttribute("inert", /.*/, { timeout: 5_000 });
    }
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
    }
  );
});
