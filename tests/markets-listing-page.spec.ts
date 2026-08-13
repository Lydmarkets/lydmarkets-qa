import { test, expect } from "../fixtures/base";

// /markets is no longer a server-side redirect to `/`. It is now a dedicated
// market-listing page with pagination (24 markets per page). The Kalshi-style
// header (logo, Marknader link, search combobox, theme & language toggles,
// Sign in / Sign up) is shared with the home page, and the MarketFilterTabs
// bar sits directly under it.
test.describe("Markets listing page (/markets)", () => {
  test(
    "/markets loads as its own page (no redirect)",
    { tag: ["@smoke"] },
    async ({ page }) => {
      const response = await page.goto("/markets");
      expect(response?.status()).toBe(200);
      // Locale routing resolves /markets to /en/markets on the bot build.
      expect(new URL(page.url()).pathname).toMatch(/\/markets$/);
    }
  );

  test(
    "/markets renders the category navigation",
    { tag: ["@regression"] },
    async ({ page }) => {
      // The bot build has no on-page [aria-label="Filtrera efter kategori"] bar.
      // Category navigation is the header <nav aria-label="Market sections">
      // with path-based links (Popular/Sports/Politics/...).
      await page.goto("/markets");
      const sections = page.getByRole("navigation", { name: /market sections/i });
      await expect(sections).toBeVisible({ timeout: 10_000 });
      await expect(sections.getByRole("link", { name: /^sports$/i })).toBeVisible();
    }
  );

  test(
    "/markets renders at least one market card with Yes/No pills",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/markets");
      await expect(
        page.getByRole("button", { name: /^(ja|yes)\b.*\d+%/i }).first()
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByRole("button", { name: /^(nej|no)\b.*\d+%/i }).first()
      ).toBeVisible();
    }
  );

  test(
    "/markets renders a market count above the listing",
    { tag: ["@regression"] },
    async ({ page }) => {
      // The bot build /markets has no pagination — all markets render on a
      // single page under a "N markets" count (no "Showing N–M", no Next link).
      await page.goto("/markets");
      await expect(
        page.getByText(/\d+\s+markets/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    "/markets ignores a stale ?page= query instead of rendering an empty listing",
    { tag: ["@regression"] },
    async ({ page }) => {
      // There is no pagination any more — every market is on one page. A
      // bookmarked or crawler-supplied `?page=2` must therefore still serve the
      // full listing rather than 404ing or rendering nothing.
      const response = await page.goto("/markets?page=2");
      expect(response?.status()).toBe(200);
      await expect(
        page.getByText(/\d+\s+markets/i).first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.locator('main a[href*="/markets/"]').first()
      ).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    "header navigation exposes a Marknader / Markets link that points at /markets",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/");
      const marketsLink = page
        .getByRole("banner")
        .getByRole("link", { name: /^marknader$|^markets$/i });
      // Locale prefix: href is /en/markets on the bot build.
      await expect(marketsLink).toHaveAttribute("href", /\/markets$/);
    }
  );
});
