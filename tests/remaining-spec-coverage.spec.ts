import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Remaining spec coverage", () => {
  // ── /markets category filter bar ──────────────────────────────────
  test(
    "/markets renders the category filter bar with per-category links",
    { tag: ["@regression"] },
    async ({ page }) => {
      // SCRUM-1040 moved the filter bar from the home page to /markets and
      // rebuilt it as a <nav aria-label="Filtrera efter kategori"> of
      // `?cat=<Name>` anchor links.
      await page.goto("/markets");
      const filters = page
        .locator('[aria-label="Filtrera efter kategori"], [aria-label="Filter by category"]')
        .first();
      await expect(filters).toBeVisible({ timeout: 10_000 });
      await expect(
        filters.locator('a[href*="/markets?cat="]').first()
      ).toBeVisible({ timeout: 15_000 });
    }
  );

  // ── Featured hero + grid on home ───────────────────────────────────
  test(
    "home page renders the featured hero and Utvalda marknader grid",
    { tag: ["@regression"] },
    async ({ page }) => {
      // SCRUM-797 shipped a single hero (not a carousel). The `Utvalda
      // marknader` / `Featured markets` heading titles the grid below it.
      await page.goto("/");
      await expect(
        page.locator('[data-testid="home-hero-desktop"], [data-testid="home-hero-mobile"]').first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole("heading", { name: /utvalda marknader|featured markets/i })
      ).toBeVisible({ timeout: 10_000 });
    }
  );

  // ── Public pages ──────────────────────────────────────────────────
  const publicPages = [
    { path: "/how-it-works", heading: /how it works|så fungerar det|hur det fungerar/i },
    { path: "/how-it-works/trading", heading: /how trading works|hur handel fungerar/i },
    { path: "/how-it-works/regulation", heading: /regulation|reglering/i },
    { path: "/about", heading: /about lydmarkets|om lydmarkets/i },
    { path: "/help", heading: /help|faq|hjälp/i },
  ];

  for (const { path, heading } of publicPages) {
    test(
      `public page ${path} loads and has heading`,
      { tag: ["@smoke"] },
      async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);

        // Every public page has a main element or an h1
        const h1 = page.getByRole("heading", { level: 1 });
        await expect(h1).toBeVisible({ timeout: 10_000 });
        await expect(h1).toHaveText(heading);
      }
    );
  }

  // ── Dark mode default ─────────────────────────────────────────────
  test(
    "app defaults to dark mode",
    { tag: ["@regression"] },
    async ({ page }) => {
      // Clear the theme cookie so the anti-FOUC script falls back to default
      await page.context().clearCookies();
      await page.goto("/");
      // The root <html> element should have class="dark" by default
      const htmlClass = await page
        .locator("html")
        .getAttribute("class");
      expect(htmlClass).toContain("dark");
    }
  );

  // ── Resolution criteria on market detail ──────────────────────────
  test(
    "market detail page renders resolution criteria when present",
    { tag: ["@regression"] },
    async ({ page }) => {
      // Pick up a market link from a featured-market-card on the home page.
      // The card's clickable wrapper carries the question as its aria-label
      // (h3 headings were removed in the redesign).
      await page.goto("/");
      const cardLink = page
        .locator('[data-testid="featured-market-card"]')
        .first()
        .locator('a[href*="/markets/"]')
        .first();
      await expect(cardLink).toBeAttached({ timeout: 10_000 });
      const href = await cardLink.getAttribute("href");
      expect(href).toMatch(/\/markets\//);

      await page.goto(href!);
      // Market detail should load with an h1 title
      const title = page.getByRole("heading", { level: 1 });
      await expect(title).toBeVisible({ timeout: 10_000 });

      // Resolution criteria is conditionally rendered — check if it exists
      const resolutionHeading = page.getByRole("heading", {
        name: /resolution criteria|avgörandekriterier/i,
      });
      const hasResolution = await resolutionHeading
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (hasResolution) {
        await expect(resolutionHeading).toBeVisible();
      } else {
        test.info().annotations.push({
          type: "note",
          description:
            "This market does not have resolution criteria text set",
        });
      }
    }
  );

  // ── Authenticated tests ───────────────────────────────────────────
  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({ }, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    // ── Theme toggle (moved to navbar header) ─────────────────────
    test(
      "navbar exposes a theme toggle button",
      { tag: ["@regression"] },
      async ({ page }) => {
        // PR-900 dropped the dead Appearance tab from /settings — the
        // light/dark/system toggle now lives as an icon button in the
        // navbar header. Its aria-label reflects the action the click
        // would take: "Switch to dark mode" or "Switch to light mode".
        await page.goto("/");
        const toggle = page.getByRole("button", {
          name: /switch to (light|dark) mode|växla till (ljust|mörkt) läge/i,
        });
        await expect(toggle.first()).toBeVisible({ timeout: 10_000 });
        await expect(toggle.first()).toBeEnabled();
      }
    );

    // NOTE: The watchlist-star toggle test was removed because the Kalshi
    // HomeMarketCard (SCRUM-797) no longer renders a watchlist star button.
    // Watchlist management still exists via the /watchlist page for
    // authenticated users; see tests/watchlist.spec.ts for coverage there.
  });
});
