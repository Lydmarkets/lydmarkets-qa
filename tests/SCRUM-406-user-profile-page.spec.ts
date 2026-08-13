import { test, expect } from "../fixtures/base";

// The account area lives at /profile — the old /settings route family was
// removed and now 404s, so it has no auth guard to assert. /profile is the
// route that actually carries the protected account surface (Personal
// Information / Contact Details / Data Export), so the redirect contract is
// asserted against it.

test.describe("SCRUM-406: User profile page — view stats and edit display name", () => {
  test("unauthenticated visit to /profile redirects to /login", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirect to /login from /profile includes redirect query param", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    // The guard round-trips the requested path so the user lands back on
    // /profile after signing in.
    expect(new URL(page.url()).searchParams.get("redirect")).toMatch(/\/profile$/);
  });

  // Nested describe + test.use, NOT browser.newContext: a hand-rolled context
  // skips fixtures/base, so it gets neither the `locale=en` cookie nor the
  // seeded cookie consent — the page then renders in the wrong language behind
  // a modal overlay.
  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test("authenticated /profile renders the account sections", async ({ page }) => {
      await page.goto("/profile");
      await expect(page).not.toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: /my profile|min profil/i, level: 1 }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByRole("heading", { name: /personal information|personuppgifter/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /contact details|kontaktuppgifter/i }),
      ).toBeVisible();
    });
  });

  test("login page is reachable and shows the email sign-in flow", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /sign in/i, level: 1 })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /sign in with email/i }),
    ).toBeVisible();
  });
});
