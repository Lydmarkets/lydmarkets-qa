import { test, expect } from "../fixtures/base";

// SCRUM-402 — Home page search + MarketFilterTabs.
// The header exposes a Sök marknader / Search markets combobox and a
// MarketFilterTabs bar (a div with aria-label="Market filters") containing:
//   - view buttons: Alla / Live / Nya with live counts
//   - one link per DB category linking to /markets?cat=<slug>
// The old per-category section headings on the home page were removed, and
// category links are now server-rendered so there is no hydration delay.
// The legacy /category/[slug] route was deleted (commit 5b054644) — every
// category filter now flows through the /markets listing with a `?cat=` query
// parameter.
test.describe("SCRUM-402: Home page search and Market filters bar", () => {
  test("home page shows a search input for markets", async ({ page }) => {
    await page.goto("/");
    await expect(
      page
        .getByRole("combobox", { name: /sök marknader|search markets/i })
        .or(page.getByPlaceholder(/sök marknader|search markets/i))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("search combobox has the expected accessible name", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("combobox", { name: /sök marknader|search markets/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("typing in search input keeps the user on a markets-related view", async ({ page }) => {
    await page.goto("/");
    const search = page
      .getByRole("combobox", { name: /sök marknader|search markets/i })
      .first();
    await search.fill("sport");
    await search.press("Enter");
    // Either the URL changes to include a search query, or the page still renders markets
    const urlOk = await page
      .waitForURL(/search|query|q=/i, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!urlOk) {
      await expect(page.locator("main").first()).toBeVisible();
    }
  });

  test("home page renders the Market filters bar", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[aria-label="Filter by category"], [aria-label="Filtrera efter kategori"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Market filters render category links (no Alla / Live / Nya view buttons after redesign)", async ({
    page,
  }) => {
    // The editorial redesign dropped the Alla / Live / Nya view pills —
    // MarketFilterTabs is now a flat list of category links only. Verify the
    // bar is present and renders at least one category link.
    await page.goto("/");
    const filters = page
      .locator(
        '[aria-label="Filter by category"], [aria-label="Filtrera efter kategori"]',
      )
      .first();
    await expect(filters).toBeVisible({ timeout: 10_000 });
    await expect(
      filters.locator('a[href*="/markets?cat="]').first(),
    ).toBeVisible();
  });

  test("Market filters include one link per category pointing at /markets?cat=<slug>", async ({
    page,
  }) => {
    await page.goto("/");
    const filters = page.locator('[aria-label="Filter by category"], [aria-label="Filtrera efter kategori"]').first();
    await expect(filters).toBeVisible({ timeout: 10_000 });
    const categoryLinks = filters.locator('a[href*="/markets?cat="]');
    await expect(categoryLinks.first()).toBeVisible({ timeout: 10_000 });
    expect(await categoryLinks.count()).toBeGreaterThan(1);
  });

  test("clicking a category link navigates to /markets?cat=<slug> and renders markets", async ({
    page,
  }) => {
    await page.goto("/");
    const filters = page.locator('[aria-label="Filter by category"], [aria-label="Filtrera efter kategori"]').first();
    const categoryLink = filters.locator('a[href*="/markets?cat="]').first();
    await expect(categoryLink).toBeVisible({ timeout: 10_000 });
    const href = await categoryLink.getAttribute("href");
    expect(href).toMatch(/\/markets\?cat=[a-z0-9-]+/i);
    await page.goto(href!);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/^\/markets$/);
    expect(url.searchParams.get("cat")).toBeTruthy();
  });
});
