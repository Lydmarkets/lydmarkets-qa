import { test, expect } from "../fixtures/base";
import { hasAuthSession } from "../helpers/has-auth";

// SCRUM-227 updated for SCRUM-797 Kalshi-style redesign:
// `/` now renders the Kalshi layout via HomeHeader — hero carousel, quick-opinion
// row, promo banner, category sections, and sidebar (desktop). `/markets` is a
// server-side 307 redirect to `/`. The legacy activity feed, OnboardingBanner,
// and inline market filter tabs no longer exist; browsing happens via category
// tabs in the header and the hero/quick-opinion/category sections.

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

  test("root `/` renders at least one category section", async ({ page }) => {
    await page.goto("/");
    const hasCategoryHeading = await page
      .getByRole("heading", {
        name: /sport|politik|politics|musik|music|finans|finance|krypto|crypto/i,
      })
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(hasCategoryHeading).toBeTruthy();
  });

  test("root `/` renders the category tab navigation", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: /kategorier|categories/i })
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

  test("root `/` renders a search input for markets", async ({ page }) => {
    await page.goto("/");
    const searchVisible = await page
      .getByRole("searchbox", { name: /sök marknader|search markets/i })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const placeholderVisible = await page
      .getByPlaceholder(/sök marknader|search markets/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(searchVisible || placeholderVisible).toBeTruthy();
  });

  test("/markets redirects to root `/`", async ({ page }) => {
    await page.goto("/markets");
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });
    expect(new URL(page.url()).pathname).toBe("/");
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
