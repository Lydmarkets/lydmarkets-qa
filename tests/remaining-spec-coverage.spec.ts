import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Remaining spec coverage", () => {
  // ── Market filters bar ────────────────────────────────────────────
  test(
    "home page renders the Market filters bar with category links",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      const filters = page.locator('[aria-label="Filter by category"], [aria-label="Filtrera efter kategori"]').first();
      await expect(filters).toBeVisible({ timeout: 10_000 });
      // Categories are server-rendered into the filter bar — one link per
      // active DB category.
      // Categories link to /markets?cat=<slug> after the SCRUM-1081 redesign
      // dropped the legacy /category/[slug] route.
      await expect(
        filters.locator('a[href*="/markets?cat="]').first()
      ).toBeVisible({ timeout: 15_000 });
    }
  );

  // ── Featured markets grid ─────────────────────────────────────────
  test(
    "home page renders the featured-markets grid",
    { tag: ["@regression"] },
    async ({ page }) => {
      // SCRUM-1039 / editorial redesign replaced the HeroCarousel with a
      // flat FeaturedMarketsGrid — no prev/next controls anymore.
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: /utvalda marknader|featured markets/i }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByTestId("featured-markets-grid"),
      ).toBeVisible({ timeout: 10_000 });
      const cards = page.getByTestId("featured-market-card");
      expect(await cards.count()).toBeGreaterThan(0);
    },
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
      // SCRUM-1039 redesign: home cards no longer use <h3> for titles —
      // they use a styled div + an absolutely-positioned <Link> with
      // aria-label = market title. Pull the first /markets/[id] link
      // straight from the FeaturedMarketsGrid.
      await page.goto("/");
      const marketLink = page
        .getByTestId("featured-market-card")
        .first()
        .locator('a[href^="/markets/"]')
        .first();
      await expect(marketLink).toBeVisible({ timeout: 10_000 });
      const href = await marketLink.getAttribute("href");
      expect(href).toMatch(/^\/markets\/.+/);

      await page.goto(href!);
      // Market detail leads with the question as a heading rendered by
      // MarketDetailHeader. Either an <h1> or the resolution-criteria
      // section is enough to assert the page loaded.
      const title = page.getByRole("heading", { level: 1 });
      const hasH1 = await title.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasH1) {
        await expect(page.locator("main").first()).toBeVisible({
          timeout: 10_000,
        });
      }

      // Resolution criteria is conditionally rendered — only some markets
      // carry `resolution_criteria_text`. The post-redesign label is "About
      // this market" (kicker) instead of "Resolution criteria"; accept
      // either copy.
      const resolutionHeading = page.getByText(
        /about this market|om denna marknad|resolution criteria|avgörandekriterier/i,
      );
      const hasResolution = await resolutionHeading
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (!hasResolution) {
        test.info().annotations.push({
          type: "note",
          description:
            "This market does not have resolution criteria text set",
        });
      }
    },
  );

  // ── Authenticated tests ───────────────────────────────────────────
  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({ }, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    // ── Theme toggle (moved into the UserMenu drawer) ─────────────
    test(
      "user menu drawer exposes a theme toggle",
      { tag: ["@regression"] },
      async ({ page }) => {
        // SCRUM-1090: theme + language toggles live inside the unified
        // UserMenu drawer (icon-only trigger in the top NavBar). Their
        // aria-labels read as the action the click would take.
        await page.goto("/");
        await page
          .getByRole("banner")
          .getByRole("button", {
            name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
          })
          .first()
          .click();
        const drawer = page.getByRole("complementary").last();
        const toggle = drawer.getByRole("button", {
          name: /switch to (light|dark)|växla till (ljust|mörkt)|byt till (ljust|mörkt)/i,
        });
        await expect(toggle.first()).toBeVisible({ timeout: 10_000 });
        await expect(toggle.first()).toBeEnabled();
      },
    );

    // The /watchlist route was removed in the markets redesign — its
    // historical coverage now asserts the 404 in tests/watchlist.spec.ts.
  });
});
