import { test, expect } from "../fixtures/base";
import { hasAuthSession } from "../helpers/has-auth";

// SCRUM-227 — Kalshi-style redesign (SCRUM-797) home page:
// `/` renders a hero carousel of featured markets, a "Vad tycker du?" /
// "What do you think?" quick-opinion row, and a right-rail Trendande sidebar
// on desktop. The shared header includes a search combobox, theme/language
// toggles, Sign in / Sign up, and a MarketFilterTabs bar (aria-label
// "Market filters") with Alla / Live / Nya pills and one link per category.
// Per-category section headings on the home page have been removed.
// `/markets` is now its own listing page, not a redirect to `/`.

test.describe("SCRUM-227 — Landing / home page (Kalshi redesign, SCRUM-797)", () => {
  test("root `/` is accessible to unauthenticated users without redirect to login", async ({
    page,
  }) => {
    await page.goto("/");
    expect(page.url()).not.toMatch(/\/login/);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  test("root `/` renders a hero carousel of featured markets", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /utvalda|featured/i })
    ).toBeAttached({ timeout: 10000 });
  });

  test("root `/` renders a 'What do you think?' quick-opinion row", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /vad tycker du|what do you think/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("root `/` renders the Market filters bar with view tabs", async ({ page }) => {
    // Post-redesign the header exposes a Market filters bar containing
    // Alla / Live / Nya view pills and one link per category. The old
    // per-category section headings on the home page were removed.
    await page.goto("/");
    const filters = page.locator('[aria-label="Market filters"]').first();
    await expect(filters).toBeVisible({ timeout: 10_000 });
    await expect(
      filters.getByRole("button", { name: /^alla\b|^all\b/i })
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

  test("unauthenticated home page shows Sign In and Sign Up links", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /logga in|sign in/i }).first()
    ).toBeVisible({ timeout: 8000 });

    await expect(
      page.getByRole("link", { name: /registrera|sign up/i }).first()
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
