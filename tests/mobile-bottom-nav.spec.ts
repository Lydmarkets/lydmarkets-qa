import { test, expect } from "../fixtures/base";

// The mobile BottomNav is no longer gated on authentication — it renders for
// everyone below the lg breakpoint with four entries: Markets (link), Search
// (button), My Positions (link), and More (button — opens the sheet drawer).
const MOBILE_VIEWPORT = { width: 393, height: 851 };

test.describe("Mobile BottomNav — unauthenticated", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test(
    "BottomNav exposes the four primary tabs",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/");
      const bottomNav = page.locator("nav.fixed.inset-x-0.bottom-0").first();
      await expect(bottomNav).toBeVisible({ timeout: 10_000 });
      // Link labels vary by locale (Markets/Marknader, My Positions/Mina
      // positioner, etc.), so assert link tabs by href which is stable.
      await expect(bottomNav.locator('a[href="/markets"]')).toBeVisible();
      await expect(bottomNav.locator('a[href="/portfolio"]')).toBeVisible();
      await expect(
        bottomNav.getByRole("button", { name: /^sök$|^search$/i })
      ).toBeVisible();
      await expect(
        bottomNav.getByRole("button", { name: /^mer$|^more$/i })
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

  test(
    "BottomNav drawer closes when Close is pressed",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^mer$|^more$/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await dialog.getByRole("button", { name: /^close$/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5_000 });
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
