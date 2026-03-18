import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Remaining spec coverage", () => {
  // ── SSR category filtering ────────────────────────────────────────
  test(
    "home page with ?category param renders filter tabs",
    { tag: ["@regression"] },
    async ({ page }) => {
      // The MarketFilterTabs component reads ?category from the URL and highlights
      // the matching category tab. We navigate with a category param and verify
      // the filter tab bar is present and functional.
      await page.goto("/?category=Sports");
      await dismissAgeGate(page);

      // The filter tabs container has aria-label="Market filters"
      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });

      // The tab bar should contain at least the built-in view tabs (Trending, All, etc.)
      await expect(
        filterBar.getByRole("button", { name: "Trending" })
      ).toBeVisible();
      await expect(
        filterBar.getByRole("button", { name: "All" })
      ).toBeVisible();
    }
  );

  // ── Featured market hero section ──────────────────────────────────
  test(
    "home page displays featured market section when available",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      await dismissAgeGate(page);

      // The FeaturedMarket component renders a "Featured" badge with a star.
      // If no market is featured the section is absent — we check if it exists
      // but don't fail the test when the backend has no featured market.
      const featuredBadge = page.getByText("Featured", { exact: false });
      const hasFeatured = await featuredBadge
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (hasFeatured) {
        // Verify the featured section contains Yes/No betting buttons
        const yesButton = page.getByRole("button", { name: /Bet Yes/i });
        const noButton = page.getByRole("button", { name: /Bet No/i });
        await expect(yesButton.first()).toBeVisible();
        await expect(noButton.first()).toBeVisible();
      } else {
        // No featured market from backend — that is acceptable
        test.info().annotations.push({
          type: "note",
          description: "No featured market available from backend",
        });
      }
    }
  );

  // ── Public pages ──────────────────────────────────────────────────
  const publicPages = [
    { path: "/how-it-works", heading: /how it works/i },
    { path: "/how-it-works/trading", heading: /how trading works/i },
    { path: "/how-it-works/regulation", heading: /regulation/i },
    { path: "/about", heading: /about lydmarkets/i },
    { path: "/help", heading: /help|faq/i },
  ];

  for (const { path, heading } of publicPages) {
    test(
      `public page ${path} loads and has heading`,
      { tag: ["@smoke"] },
      async ({ page }) => {
        const response = await page.goto(path);
        await dismissAgeGate(page);

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
      await dismissAgeGate(page);

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
      await dismissAgeGate(page);

      // Market card titles are h3 headings. Their sibling link contains the href.
      const marketHeading = page.getByRole("heading", { level: 3 }).first();
      await expect(marketHeading).toBeVisible({ timeout: 10_000 });
      const marketTitle = await marketHeading.textContent();

      // Find the link with matching aria-label (same text as h3)
      const marketLink = page.getByRole("link", { name: marketTitle! });
      const href = await marketLink.first().getAttribute("href");
      expect(href).toMatch(/^\/markets\//);

      await page.goto(href!);
      await dismissAgeGate(page);

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

    // ── Appearance toggle ─────────────────────────────────────────
    test(
      "settings page has theme selector with light/dark/system options",
      { tag: ["@regression"] },
      async ({ page }) => {
        await page.goto("/settings");
        await dismissAgeGate(page);

        // The AppearanceSettings component has a theme select with id="theme"
        const themeSelect = page.getByLabel(/theme/i);
        await expect(themeSelect).toBeVisible({ timeout: 10_000 });

        // Click the select to open the dropdown
        await themeSelect.click();

        // Verify all three theme options exist
        await expect(
          page.getByRole("option", { name: /light/i })
        ).toBeVisible();
        await expect(
          page.getByRole("option", { name: /dark/i })
        ).toBeVisible();
        await expect(
          page.getByRole("option", { name: /system/i })
        ).toBeVisible();
      }
    );

    // ── Watchlist toggle (authenticated) ──────────────────────────
    test(
      "clicking watchlist star toggles aria-pressed state",
      { tag: ["@regression"] },
      async ({ page }) => {
        await page.goto("/");
        await dismissAgeGate(page);

        // Wait for market cards with watchlist buttons
        const starButton = page
          .getByRole("button", { name: /add to watchlist|remove from watchlist/i })
          .first();
        await expect(starButton).toBeVisible({ timeout: 10_000 });

        // Read initial aria-pressed state
        const initialPressed = await starButton.getAttribute("aria-pressed");
        expect(initialPressed).toBeDefined();
        expect(["true", "false"]).toContain(initialPressed);

        // Click the star to toggle
        await starButton.click();

        // Wait for the state to change
        const expectedNew = initialPressed === "true" ? "false" : "true";
        await expect(starButton).toHaveAttribute(
          "aria-pressed",
          expectedNew,
          { timeout: 5_000 }
        );
      }
    );
  });
});
