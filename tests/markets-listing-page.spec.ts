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
      expect(new URL(page.url()).pathname).toBe("/markets");
    }
  );

  test(
    "/markets renders the Market filters bar",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      await expect(
        page.locator('[aria-label="Market filters"]').first()
      ).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    "/markets renders at least one market card with Yes/No pills",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/markets");
      await expect(
        page.getByRole("button", { name: /^(ja|yes)\s+\d+%/i }).first()
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByRole("button", { name: /^(nej|no)\s+\d+%/i }).first()
      ).toBeVisible();
    }
  );

  test(
    "/markets renders a pagination summary and a Next link on page 1",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      await expect(
        page.getByText(/Visar\s+\d+.*marknader|Showing\s+\d+/i)
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole("link", { name: /^nästa$|^next$/i })
      ).toBeVisible();
    }
  );

  test(
    "/markets?page=2 loads page two of the listing",
    { tag: ["@regression"] },
    async ({ page }) => {
      const response = await page.goto("/markets?page=2");
      expect(response?.status()).toBe(200);
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByText(/sida\s+2\s+av|page\s+2\s+of/i)
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
      await expect(marketsLink).toHaveAttribute("href", "/markets");
    }
  );
});
