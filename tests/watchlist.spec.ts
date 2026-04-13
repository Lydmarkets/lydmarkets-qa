import { test, expect } from "../fixtures/base";

// SCRUM-797 Kalshi redesign notes:
// - Watchlist star buttons were removed from both home and market detail cards.
// - The /watchlist route is now a publicly-rendered page showing a
//   "Bevakningslista" heading (empty state for anonymous users — they still see
//   the page). It is no longer a protected route that redirects to /login.
// If the star-button feature is restored, add tests for it back against the
// new component.

test.describe("Watchlist — page load", () => {
  test("/watchlist renders a Bevakningslista / Watchlist heading", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /bevakningslista|watchlist/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
