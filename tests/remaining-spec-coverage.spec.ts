import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Remaining spec coverage", () => {
  // ── /markets category filter bar ──────────────────────────────────
  test(
    "/markets renders the category navigation with per-category links",
    { tag: ["@regression"] },
    async ({ page }) => {
      // The bot build renders category navigation as a
      // <nav aria-label="Market sections"> of per-category anchors that point
      // at locale-prefixed paths like `/en/Sports` (not `/markets?cat=`).
      await page.goto("/markets");
      const filters = page
        .getByRole("navigation", { name: /market sections|marknadssektioner|filtrera efter kategori|filter by category/i })
        .first();
      await expect(filters).toBeVisible({ timeout: 10_000 });
      await expect(
        filters.getByRole("link", { name: /sports|politics|finance|crypto/i }).first()
      ).toBeVisible({ timeout: 15_000 });
    }
  );

  // ── Featured hero + grid on home ───────────────────────────────────
  test(
    "home page renders the featured hero and the market grid",
    { tag: ["@regression"] },
    async ({ page }) => {
      // The home page leads with a featured-market hero followed by a grid of
      // market cards. The "FEATURED" tag text is present but visually hidden
      // (decorative), so assert the rendered grid instead: a market card
      // (<article>) plus a YES price button.
      await page.goto("/");
      await expect(
        page.getByRole("article").first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole("button", { name: /YES|JA/ }).first()
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

  // ── Anti-FOUC theme script applies a theme class on first paint ───
  test(
    "anti-FOUC script applies a theme class to <html>",
    { tag: ["@regression"] },
    async ({ page }) => {
      // With no theme cookie the anti-FOUC script falls back to
      // `prefers-color-scheme`, so either `light` or `dark` may be applied
      // depending on the runner. The contract is that *some* theme class
      // lands on <html> before paint — otherwise the brand/paper palette
      // CSS variables never resolve.
      await page.context().clearCookies();
      await page.goto("/");
      const htmlClass = await page
        .locator("html")
        .getAttribute("class");
      expect(htmlClass).toMatch(/\b(light|dark)\b/);
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
        // The light/dark theme toggle lives inside the "Open menu" drawer on
        // this build. Its accessible name shows the current theme, e.g.
        // "Theme Light" / "Theme Dark" (Swedish: "Tema Ljust" / "Tema Mörkt").
        await page.goto("/");
        await page.getByRole("button", { name: /öppna meny|open menu/i }).click();
        const toggle = page.getByRole("button", {
          name: /theme (light|dark)|tema (ljust|mörkt)|switch to (light|dark) mode|växla till (ljust|mörkt) läge/i,
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
