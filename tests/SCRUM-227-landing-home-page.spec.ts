import { test, expect } from "../fixtures/base";
import { hasAuthSession } from "../helpers/has-auth";

// SCRUM-227 / SCRUM-797 Kalshi redesign — updated for the editorial masthead
// layout that ships today. The home page (/) renders:
//   - A responsive masthead (`data-testid="home-masthead-desktop"` +
//     `home-masthead-mobile`) with an h1 "Marknaden förutser. Du handlar.".
//   - A single featured hero section (`home-hero-desktop` +
//     `home-hero-mobile`) — not a carousel.
//   - A Featured Markets grid (`featured-markets-grid`) with `featured-market-card`
//     entries. Cards use a role=link wrapper with aria-label = question text;
//     the "question as h3 heading" pattern was dropped.
//   - Sign in / Register live inside the UserMenu drawer, opened via the
//     header's "Öppna meny" / "Open menu" hamburger (SCRUM-1090).
// The old "What do you think?" quick-opinion row, hero carousel, and Market
// filters bar were removed from the home page. The filter + pagination UI
// now lives on /markets (SCRUM-1040) instead.

test.describe("SCRUM-227 — Landing / home page (Kalshi redesign, SCRUM-797)", () => {
  test("root `/` is accessible to unauthenticated users without redirect to login", async ({
    page,
  }) => {
    await page.goto("/");
    expect(page.url()).not.toMatch(/\/login/);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  test("root `/` renders the editorial masthead headline", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1 }).first()
    ).toBeVisible({ timeout: 10000 });
    // The desktop masthead carries a stable test id.
    await expect(
      page.locator('[data-testid="home-masthead-desktop"]')
    ).toBeAttached({ timeout: 10000 });
  });

  test("root `/` renders a featured hero section", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[data-testid="home-hero-desktop"], [data-testid="home-hero-mobile"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("root `/` renders the Featured Markets grid", async ({ page }) => {
    await page.goto("/");
    const grid = page.locator('[data-testid="featured-markets-grid"]');
    await expect(grid).toBeVisible({ timeout: 10000 });
    // Section carries an h2 "Utvalda marknader" / "Featured markets".
    await expect(
      page.getByRole("heading", { name: /utvalda marknader|featured markets/i })
    ).toBeVisible();
    // At least one card rendered under the grid.
    await expect(
      page.locator('[data-testid="featured-market-card"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("root `/` renders at least one Yes/No probability pill on a market card", async ({
    page,
  }) => {
    await page.goto("/");
    const hasPill = await page
      .getByRole("button", { name: /^(ja|yes|nej|no)\s+\d+%/i })
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(hasPill).toBeTruthy();
  });

  test("root `/` renders a search combobox for markets", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("combobox", { name: /sök marknader|search markets/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("/markets renders the full market listing page with pagination", async ({ page }) => {
    // /markets is its own listing page (SCRUM-1040) with pagination.
    await page.goto("/markets");
    expect(new URL(page.url()).pathname).toBe("/markets");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="markets-index-showing"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated home page exposes Sign In / Sign Up via the UserMenu drawer", async ({
    page,
  }) => {
    // SCRUM-1090 removed the inline NavAuthControls — auth CTAs live in the
    // drawer now.
    await page.goto("/");
    await page.getByRole("button", { name: /öppna meny|open menu/i }).click();
    await expect(
      page.getByRole("link", { name: /^logga in$|^sign in$/i })
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole("link", { name: /^registrera$|^sign up$/i })
    ).toBeVisible({ timeout: 8000 });
  });

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({}, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test("authenticated user visiting `/` stays on `/` and sees the markets page", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
      expect(page.url()).not.toMatch(/\/login/);
      expect(page.url()).not.toMatch(/\/onboarding/);
    });

    test("authenticated /settings route is accessible without regression", async ({ page }) => {
      await page.goto("/settings");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
      expect(page.url()).not.toMatch(/\/login/);
    });

    test("authenticated /portfolio route is accessible without regression", async ({ page }) => {
      await page.goto("/portfolio");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
      expect(page.url()).not.toMatch(/\/login/);
    });
  });
});
