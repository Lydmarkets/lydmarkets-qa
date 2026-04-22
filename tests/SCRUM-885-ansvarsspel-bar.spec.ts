import { test, expect } from "../fixtures/base";

// SCRUM-885 — mandated ansvarsspel-bar (responsible-gambling top strip).
//
// Four pill controls covering the LIFS 2018:2 § 17 quadrant:
//   1. Spelpaus    → external link to https://www.spelpaus.se
//   2. Spelgränser → /profil/spelgranser (deposit + session-time limits)
//   3. Självtest   → external link to https://stodlinjen.se/spelberoende-test-pgsi
//   4. 24h         → /self-exclusion?step=form&period=24_hours
//
// Renders fixed at top-0 (h-10) on every route — public, auth, app — so the
// strip is reachable from any page without scrolling.

test.describe("Ansvarsspel-bar — top responsible-gambling strip (SCRUM-885)", () => {
  for (const path of ["/", "/markets", "/login", "/register"]) {
    test(
      `bar is rendered on ${path}`,
      { tag: ["@compliance", "@critical"] },
      async ({ page }) => {
        await page.goto(path);
        const bar = page.getByRole("complementary", {
          name: /spelansvarsverktyg|responsible gambling tools/i,
        });
        await expect(bar).toBeVisible({ timeout: 10_000 });
      },
    );
  }

  test(
    "bar exposes the four mandated tools (Spelpaus, Spelgränser, Självtest, 24h)",
    { tag: ["@compliance", "@critical"] },
    async ({ page }) => {
      await page.goto("/");
      const bar = page.getByRole("complementary", {
        name: /spelansvarsverktyg|responsible gambling tools/i,
      });
      await expect(bar).toBeVisible({ timeout: 10_000 });

      // Each pill renders an aria-label that differs from its visible text
      // (the visible label is "Spelpaus" / "Spelgränser" / "Självtest" /
      // "24h" — the aria-label spells out what the control does). Match
      // links by href since href is stable across locales.

      const spelpaus = bar.locator('a[href*="spelpaus.se"]').first();
      await expect(spelpaus).toBeVisible();
      await expect(spelpaus).toHaveAttribute("target", "_blank");

      const spelgranser = bar.locator('a[href$="/profil/spelgranser"]').first();
      await expect(spelgranser).toBeVisible();

      const sjalvtest = bar.locator('a[href*="stodlinjen.se"]').first();
      await expect(sjalvtest).toBeVisible();
      await expect(sjalvtest).toHaveAttribute("target", "_blank");

      const breakLink = bar
        .locator('a[href*="/self-exclusion"][href*="period=24_hours"]')
        .first();
      await expect(breakLink).toBeVisible();
    },
  );

  test(
    "Spelpaus / Självtest external links carry rel=noopener",
    { tag: ["@security", "@compliance"] },
    async ({ page }) => {
      await page.goto("/");
      const bar = page.getByRole("complementary", {
        name: /spelansvarsverktyg|responsible gambling tools/i,
      });
      const spelpaus = bar.locator('a[href*="spelpaus.se"]').first();
      await expect(spelpaus).toHaveAttribute("rel", /noopener/);
      const sjalvtest = bar.locator('a[href*="stodlinjen.se"]').first();
      await expect(sjalvtest).toHaveAttribute("rel", /noopener/);
    },
  );

  test(
    "Spelgränser pill navigates to /profil/spelgranser (auth-required)",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/");
      const bar = page.getByRole("complementary", {
        name: /spelansvarsverktyg|responsible gambling tools/i,
      });
      await bar.locator('a[href$="/profil/spelgranser"]').first().click();

      // Unauthenticated users are bounced through /login by middleware; the
      // callback URL is /profil/spelgranser. Either landing is acceptable.
      await page.waitForURL(/\/profil\/spelgranser|\/login/, {
        timeout: 10_000,
      });
    },
  );

  test(
    "24h short-break pill deep-links into /self-exclusion form",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/");
      const bar = page.getByRole("complementary", {
        name: /spelansvarsverktyg|responsible gambling tools/i,
      });
      await bar
        .locator('a[href*="/self-exclusion"][href*="period=24_hours"]')
        .first()
        .click();
      await page.waitForURL(/\/self-exclusion/, { timeout: 10_000 });
      const url = new URL(page.url());
      expect(url.pathname).toBe("/self-exclusion");
      expect(url.searchParams.get("step")).toBe("form");
      expect(url.searchParams.get("period")).toBe("24_hours");
    },
  );
});
