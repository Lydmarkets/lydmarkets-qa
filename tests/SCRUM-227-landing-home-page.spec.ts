import { test, expect } from "../fixtures/base";
import { hasAuthSession } from "../helpers/has-auth";

// SCRUM-227 — Editorial-redesign (SCRUM-1039) home page:
// `/` renders an editorial Masthead, the HomeHero featured market panel,
// a flat FeaturedMarketsGrid, the MoversTable, and a TopTradersRail.
// (The legacy hero carousel + "Vad tycker du?" / "What do you think?"
// quick-opinion row + Trendande right-rail were removed.)
// The shared header still includes a search combobox, MarketFilterTabs
// (aria-label "Market filters") with Alla / Live / Nya pills, and one
// category link per active DB category pointing at /markets?cat=<slug>.
// /markets is its own listing page; Sign in / Sign up moved into the
// SCRUM-1090 UserMenu drawer (icon-only trigger in the top NavBar).

test.describe("SCRUM-227 — Landing / home page (Kalshi redesign, SCRUM-797)", () => {
  test("root `/` is accessible to unauthenticated users without redirect to login", async ({
    page,
  }) => {
    await page.goto("/");
    expect(page.url()).not.toMatch(/\/login/);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  test("root `/` renders the featured-markets grid", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /utvalda marknader|featured markets/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByTestId("featured-markets-grid"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("root `/` renders the editorial home hero panel", async ({ page }) => {
    // SCRUM-1039 replaced the carousel + "What do you think?" row with a
    // single editorial hero block that pairs the lead market with a
    // 640×120 sparkline and Yes/No buy CTAs. The hero ships in two
    // variants — `home-hero-desktop` (>=md) and `home-hero-mobile` (<md).
    await page.goto("/");
    const desktopHero = page.getByTestId("home-hero-desktop");
    const mobileHero = page.getByTestId("home-hero-mobile");
    const desktopVisible = await desktopHero
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    const mobileVisible = await mobileHero
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    expect(desktopVisible || mobileVisible).toBeTruthy();
  });

  test("root `/` renders the Market filters bar with category links", async ({ page }) => {
    // Post-redesign the header exposes a category filter bar. The Alla /
    // Live / Nya view pills were removed — MarketFilterTabs is a flat list
    // of category links only.
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
    // /markets is no longer a redirect to `/`. It is its own page rendering the
    // full market grid with pagination (24 per page).
    await page.goto("/markets");
    expect(new URL(page.url()).pathname).toBe("/markets");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Visar\s+\d+.*marknader|Showing\s+\d+/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("unauthenticated home page exposes Sign In / Sign Up via the user menu drawer", async ({ page }) => {
    // SCRUM-1090: auth links moved out of the banner into the unified
    // UserMenu drawer (torso-icon trigger).
    await page.goto("/");
    await page
      .getByRole("banner")
      .getByRole("button", {
        name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
      })
      .first()
      .click();
    const drawer = page.getByRole("complementary").last();
    await expect(
      drawer.getByRole("link", { name: /logga in|sign in/i }),
    ).toBeVisible({ timeout: 8000 });
    await expect(
      drawer.getByRole("link", { name: /registrera|sign up|skapa konto/i }),
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
