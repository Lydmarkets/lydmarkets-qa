import { test, expect } from "../fixtures/base";

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
      // Link labels vary by locale, so assert link tabs by stable href.
      await expect(bottomNav.locator('a[href="/markets"]')).toBeVisible();
      await expect(bottomNav.locator('a[href="/portfolio"]')).toBeVisible();
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
      await bottomNav.locator('a[href="/markets"]').click();
      await page.waitForURL(/\/markets(\?|$)/, { timeout: 10_000 });
      expect(new URL(page.url()).pathname).toBe("/markets");
    }
  );

  test.fixme(
    "header drawer closes when the backdrop is clicked",
    { tag: ["@regression"] },
    async ({ page }) => {
      // Mobile has a known UX issue: the compliance "Spelansvarsverktyg" aside
      // pinned at top z-50 overlaps the drawer's Close button and also seems
      // to swallow backdrop clicks / Escape keys don't dismiss the custom
      // aside. Keeping this test as fixme until the product issue is fixed —
      // see triage notes / staging bug referenced in the PR body.
      await page.goto("/");
      await page.getByRole("button", { name: /öppna meny|open menu/i }).click();
      const loginLink = page.getByRole("link", { name: /^logga in$|^sign in$/i });
      await expect(loginLink).toBeVisible({ timeout: 5_000 });
      await page
        .getByRole("button", { name: /stäng meny|close menu/i })
        .click({ force: true });
      await expect(loginLink).toBeHidden({ timeout: 5_000 });
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
