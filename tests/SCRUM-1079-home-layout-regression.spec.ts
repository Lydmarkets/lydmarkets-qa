import { test, expect } from "../fixtures/base";

// SCRUM-1079 — Home layout regression suite.
//
// This file backs the acceptance criteria of SCRUM-1079: a smoke + functional
// suite that fails when any of the homepage's critical sections silently
// disappears in a layout change. Each related-bug ticket below is referenced
// next to the assertion that would have caught it:
//
//   SCRUM-1073  "INVALID DATE" on Featured market cards
//   SCRUM-1075  PromoBanner / "Folkets visdom" missing on home
//   SCRUM-1076  Trending sidebar gone from home
//   SCRUM-1077  Activity-related rail gone from home
//
// The tests target the structure that the production page actually renders:
// section landmarks via `aria-labelledby` (home-hero-heading,
// featured-markets-heading, home-trending-heading, home-signup-cta-heading,
// site-footer-promo) and SVG aria-labels on the chart + Yes/No bars.

test.describe("SCRUM-1079 — Home layout regression", () => {
  test.describe.configure({ mode: "default" });

  test("hero renders the H1 tagline and three stat tiles", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /the market predicts\.\s*you trade\.?/i })
    ).toBeVisible({ timeout: 10_000 });

    // Stat labels are CSS-uppercased; the DOM text is lower case.
    for (const label of [/active markets/i, /volume \(7d\)/i, /vs last week/i]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("featured hero card renders chart, title, and Yes/No probability", async ({ page }) => {
    await page.goto("/");
    const heroSection = page.locator('section[aria-labelledby="home-hero-heading"]');
    await expect(heroSection).toBeVisible({ timeout: 10_000 });

    // The 7-day price-history chart is an inline <svg role="img">.
    await expect(
      heroSection.getByRole("img", { name: /yes-price history.*7 days/i })
    ).toBeVisible({ timeout: 10_000 });

    // Yes/No split bar — aria-label like "YES 60% / NO 40%".
    await expect(
      heroSection.getByRole("img", { name: /^yes\s+\d+%\s*\/\s*no\s+\d+%/i })
    ).toBeVisible();

    // Market title is a link to /markets/<id>.
    await expect(
      heroSection.locator('a[href*="/markets/"]').first()
    ).toBeVisible();

    // Featured stat triplet on the hero card.
    for (const label of [/volume traded/i, /traders/i, /settlement/i]) {
      await expect(heroSection.getByText(label).first()).toBeVisible();
    }
  });

  test("Featured markets grid renders at least one full card", async ({ page }) => {
    await page.goto("/");
    const grid = page.locator('section[aria-labelledby="featured-markets-heading"]');

    await expect(
      grid.getByRole("heading", { level: 2, name: /featured markets/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(grid.getByText(/sorted by volume\s*·\s*7 days/i)).toBeVisible();

    const cards = grid.locator('a[href*="/markets/"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    expect(await cards.count()).toBeGreaterThan(0);

    // Each card has a Yes/No probability bar — assert at least one renders.
    await expect(
      grid.getByRole("img", { name: /^yes\s+\d+%\s*\/\s*no\s+\d+%/i }).first()
    ).toBeVisible();
  });

  // SCRUM-1073 regression guard.
  test("no card on the home page renders 'Invalid Date'", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('section[aria-labelledby="featured-markets-heading"]')
    ).toBeVisible({ timeout: 10_000 });

    const invalid = await page.getByText(/invalid date/i).count();
    expect(invalid).toBe(0);
  });

  // SCRUM-1076 regression guard.
  test("Trending now sidebar renders with five ranked markets", async ({ page }) => {
    await page.goto("/");
    const trending = page.locator('section[aria-labelledby="home-trending-heading"]');
    await expect(trending).toBeVisible({ timeout: 10_000 });

    await expect(
      trending.getByRole("heading", { level: 3, name: /trending now/i })
    ).toBeVisible();
    await expect(trending.getByText(/last 2 hours/i)).toBeVisible();

    const items = trending.locator('a[href*="/markets/"]');
    await expect(items.first()).toBeVisible({ timeout: 10_000 });
    expect(await items.count()).toBe(5);
  });

  test("sidebar exposes a 'Join Lydmarkets' sign-up CTA", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator('section[aria-labelledby="home-signup-cta-heading"]');
    await expect(cta).toBeVisible({ timeout: 10_000 });
    await expect(
      cta.getByRole("heading", { level: 3, name: /join lydmarkets/i })
    ).toBeVisible();
    await expect(cta.getByRole("link", { name: /create account/i })).toBeVisible();
  });

  // SCRUM-1075 regression guard — the three educational cards.
  test("footer 'Learn more' block renders the three educational cards", async ({ page }) => {
    await page.goto("/");
    const learn = page.locator('section[aria-labelledby="site-footer-promo"]');
    await expect(learn).toBeVisible({ timeout: 10_000 });

    await expect(
      learn.getByRole("heading", { level: 2, name: /learn more/i })
    ).toBeVisible();

    for (const name of [
      /how prediction markets work/i,
      /wisdom of crowds/i,
      /market integrity/i,
    ]) {
      await expect(learn.getByRole("link", { name }).first()).toBeVisible();
    }
  });

  test("category filter bar renders the canonical categories with counts", async ({ page }) => {
    await page.goto("/");
    const filters = page.getByRole("navigation", { name: /filter by category/i });
    await expect(filters).toBeVisible({ timeout: 10_000 });

    // "All" plus a few stable, top-level categories the platform always carries.
    for (const name of [/^all\s+\d+/i, /^sports\s+\d+/i, /^politics\s+\d+/i, /^finance\s+\d+/i]) {
      await expect(filters.getByRole("link", { name }).first()).toBeVisible();
    }
  });

  test("responsible-gambling tools strip exposes Spelpaus + 24h pause", async ({ page }) => {
    await page.goto("/");
    const rg = page.getByRole("complementary", { name: /responsible gambling tools/i });
    await expect(rg).toBeVisible({ timeout: 10_000 });

    // Each chip wraps a Swedish brand label as visible text; the anchor's
    // accessible name is a longer English description, so target the chip text
    // directly instead of going through `getByRole(link, name)`.
    await expect(rg.getByText("Spelpaus", { exact: true })).toBeVisible();
    await expect(rg.getByText("Spelgränser", { exact: true })).toBeVisible();
    await expect(rg.getByText("Självtest", { exact: true })).toBeVisible();
    await expect(rg.getByText("24h", { exact: true })).toBeVisible();

    // Spelpaus is mandated by Swedish gambling law — must always link out.
    const spelpaus = rg.getByRole("link", { name: /spelpaus.*national self-exclusion/i });
    await expect(spelpaus).toHaveAttribute("href", /spelpaus\.se/);
  });

  test("footer renders copyright and the canonical nav links", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible({ timeout: 10_000 });

    await expect(footer.getByText(/lydmarkets ab.*stockholm/i)).toBeVisible();

    for (const name of [
      /how it works/i,
      /^fees$/i,
      /^rules$/i,
      /18\+\s+responsible gambling/i,
      /^contact$/i,
    ]) {
      await expect(footer.getByRole("link", { name }).first()).toBeVisible();
    }
  });
});
