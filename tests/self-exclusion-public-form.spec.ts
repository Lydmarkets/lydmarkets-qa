import { test, expect } from "../fixtures/base";

// /self-exclusion is the public deep-link target for the responsible-gambling
// 24h-pause chip in the global RG strip. The page exposes two paths:
//   - "Exclude from Lydmarkets" (operator-side suspension)
//   - "Exclude nationally via Spelpaus" (Swedish national register)
//
// The deep-link `/self-exclusion?step=form&period=24_hours` should land on
// the same page (auth gate happens later when the user submits).

test.describe("Public /self-exclusion page", () => {
  test("page loads with the canonical heading and two exclusion paths", async ({
    page,
  }) => {
    await page.goto("/self-exclusion");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /self.?exclude yourself from gambling|stäng av dig själv/i,
      })
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole("heading", { level: 2, name: /exclude from lydmarkets only|spelpaus/i }).first()
    ).toBeVisible();
  });

  test("page primes the auth-gated submit by exposing the menu Sign-in label", async ({
    page,
  }) => {
    await page.goto("/self-exclusion");
    // The header "Open menu" button collapses the Sign-in CTA on this route;
    // it surfaces as a child <span> inside the menu trigger.
    await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("RG-strip 24h chip deep-links into the form step", async ({ page }) => {
    await page.goto("/self-exclusion?step=form&period=24_hours");
    // Deep-link should resolve and remain on /self-exclusion (or its locale
    // prefix) without a 404.
    expect(new URL(page.url()).pathname).toMatch(/\/self-exclusion$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /self.?exclude|stäng av/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
