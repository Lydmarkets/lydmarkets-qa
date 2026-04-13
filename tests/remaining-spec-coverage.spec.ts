import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Remaining spec coverage", () => {
  // ── Category nav ──────────────────────────────────────────────────
  test(
    "home page renders the category tab navigation (SCRUM-797 Kalshi redesign)",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: /kategorier|categories/i });
      await expect(nav).toBeVisible({ timeout: 10_000 });
      // HomeCategoryTabs SSRs only "Trending"; other tabs load client-side from
      // /api/v2/categories. Wait for at least one more tab to appear.
      await expect(
        nav.locator('a[href^="/category/"]').first()
      ).toBeVisible({ timeout: 15_000 });
    }
  );

  // ── Hero carousel of featured markets ─────────────────────────────
  test(
    "home page renders a hero carousel (SCRUM-797)",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      // HeroCarousel has an sr-only h2 "Utvalda marknader" / "Featured prediction markets"
      await expect(
        page.getByRole("heading", { name: /utvalda|featured/i })
      ).toBeAttached({ timeout: 10_000 });
      // Prev/next controls — English or Swedish
      await expect(
        page.getByRole("button", { name: /föregående|previous/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /nästa|next/i })
      ).toBeVisible();
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
      // Navigate to home page and find a market card heading to extract its link
      await page.goto("/");
      // Market card titles are h3 headings. Their sibling link contains the href.
      const marketHeading = page.getByRole("heading", { level: 3 }).first();
      await expect(marketHeading).toBeVisible({ timeout: 10_000 });
      const marketTitle = await marketHeading.textContent();

      // Find the link with matching aria-label (same text as h3)
      const marketLink = page.getByRole("link", { name: marketTitle! });
      const href = await marketLink.first().getAttribute("href");
      expect(href).toMatch(/^\/markets\//);

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
        // The criteria text follows the heading in the same card
        await expect(resolutionHeading).toBeVisible();
      } else {
        // This market may not have resolution_criteria_text set
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
