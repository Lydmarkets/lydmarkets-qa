import { test, expect } from "../fixtures/base";

// The /watchlist route has been removed from the user-facing app. Requests to
// /watchlist now return 404. If the feature is restored, add coverage for the
// star-toggle and list-management flows here.
test.describe("Watchlist — route removed", () => {
  test("/watchlist returns HTTP 404", async ({ page }) => {
    const response = await page.goto("/watchlist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible({
      timeout: 10_000,
    });
  });
});
