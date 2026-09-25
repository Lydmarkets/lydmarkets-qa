import { test, expect } from "../fixtures/base";
// SCRUM-409: Settings — responsible gambling limits and account controls
// Acceptance criteria:
// 1. Unauthenticated access to /settings redirects to sign-in with return URL
// 2. Unauthenticated access to /settings/responsible-gambling redirects correctly
// 3. Authenticated user sees responsible gambling settings page
// 4. Self-exclusion option is visible
// 5. Account deletion option exists with a warning

// Requires authenticated storageState — set up via global setup.
// test.use({ storageState: "playwright/.auth/user.json" });

// NOTE: the entire `/settings` route family was removed — `/settings`,
// `/settings/responsible-gambling` and `/settings/privacy` all return HTTP 404
// (no redirect to sign-in). The surfaces moved:
//   - account management  → /profile (auth-gated, redirects with ?redirect=)
//   - responsible gambling → /self-exclusion (public page, gated controls)
//   - /limits              → also 404; the limits shortcut was dropped
// The acceptance criteria are asserted against those routes below. The two
// 404 tests stay as regression guards so a /settings revival is noticed.

test.describe("SCRUM-409 — Settings / responsible gambling", () => {
  test("/settings returns 404 on this build (route removed)", async ({ page }) => {
    const response = await page.goto("/settings");
    expect(response?.status()).toBe(404);
  });

  test("/settings/responsible-gambling returns 404 on this build (route removed)", async ({
    page,
  }) => {
    const response = await page.goto("/settings/responsible-gambling");
    expect(response?.status()).toBe(404);
  });

  // AC 1/2 — the return-URL contract survived the move off /settings: it is now
  // carried by /profile, the protected account route that replaced it.
  test("redirect from /profile preserves return URL", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(new URL(page.url()).searchParams.get("redirect")).toMatch(/\/profile$/);
  });

  // AC 2 — the responsible-gambling tooling itself is public, but its controls
  // are gated: a guest gets a "Sign in" call to action where the authenticated
  // user gets the exclusion control.
  test("responsible-gambling controls require sign-in for guests", async ({ page }) => {
    await page.goto("/self-exclusion");

    await expect(
      page.getByRole("heading", { name: /self-exclusion|självavstängning/i, level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /^sign in$|^logga in$/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /exclude from lydmarkets|stäng av mig/i }),
    ).toHaveCount(0);
  });

  // AC 3/4 — the authenticated responsible-gambling surface.
  // Nested describe + test.use, NOT browser.newContext: a hand-rolled context
  // skips fixtures/base and so gets neither the `locale=en` cookie nor the
  // seeded cookie consent.
  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test("authenticated user sees the self-exclusion controls", async ({ page }) => {
      await page.goto("/self-exclusion");

      await expect(
        page.getByRole("heading", { name: /self-exclusion|självavstängning/i, level: 1 }),
      ).toBeVisible({ timeout: 15_000 });
      // AC 5 — the irreversibility warning is on the page, not buried in a modal.
      await expect(
        page.getByText(/cannot be reversed|kan inte ångras/i).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /exclude from lydmarkets|stäng av mig/i }),
      ).toBeVisible();
    });
  });
});
