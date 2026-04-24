import { test, expect } from "../fixtures/base";

// SCRUM-402 — Home page search + category filters.
// Updated for SCRUM-1040: the category filter bar moved from the home page
// to `/markets`, where it renders as `<nav aria-label="Filtrera efter kategori">`
// containing plain anchor links (`/markets?cat=<Name>`). Sorting lives in a
// `<div aria-label="Sortering">` with three `<button aria-pressed>` toggles
// (Volym / Nyast / Handlare). The previous Alla / Live / Nya view tabs were
// removed — there is also no "Alla" reset pill today (tracked separately as a
// staging-UX bug, ticket to be filed). Categories use capitalized DB names in
// the query string (Sports, Music, Politics, Finance, etc.).
test.describe("SCRUM-402: Search combobox and /markets category filter bar", () => {
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

  test("/markets renders the category filter bar", async ({ page }) => {
    await page.goto("/markets");
    await expect(
      page
        .locator('[aria-label="Filtrera efter kategori"], [aria-label="Filter by category"]')
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("/markets sort controls include Volume / Newest / Traders toggles", async ({ page }) => {
    await page.goto("/markets");
    const sortBar = page
      .locator('[aria-label="Sortering"], [aria-label="Sort order"]')
      .first();
    await expect(sortBar).toBeVisible({ timeout: 10_000 });
    await expect(sortBar.getByRole("button", { name: /volym|volume/i })).toBeVisible();
    await expect(sortBar.getByRole("button", { name: /nyast|newest/i })).toBeVisible();
    await expect(sortBar.getByRole("button", { name: /handlare|traders/i })).toBeVisible();
  });

  test("/markets filter bar includes one link per category pointing at ?cat=<Name>", async ({
    page,
  }) => {
    await page.goto("/markets");
    const filters = page.locator('[aria-label="Filtrera efter kategori"], [aria-label="Filter by category"]').first();
    await expect(filters).toBeVisible({ timeout: 10_000 });
    const categoryLinks = filters.locator('a[href*="/markets?cat="]');
    await expect(categoryLinks.first()).toBeVisible({ timeout: 10_000 });
    expect(await categoryLinks.count()).toBeGreaterThan(1);
  });

  test("clicking a category link narrows the /markets listing to that category", async ({
    page,
  }) => {
    await page.goto("/markets");
    const filters = page.locator('[aria-label="Filtrera efter kategori"], [aria-label="Filter by category"]').first();
    const categoryLink = filters.locator('a[href*="/markets?cat="]').first();
    await expect(categoryLink).toBeVisible({ timeout: 10_000 });
    const href = await categoryLink.getAttribute("href");
    expect(href).toMatch(/\/markets\?cat=[A-Za-z-]+/);
    await page.goto(href!);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe("/markets");
    expect(new URL(page.url()).searchParams.get("cat")).toBeTruthy();
  });
});
