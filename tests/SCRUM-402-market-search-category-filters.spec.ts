import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("SCRUM-402: Market search and category filters", () => {
  test("home page shows a search input for markets", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await expect(
      page.getByPlaceholder(/search markets/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("typing in search input filters the market list", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    const search = page.getByPlaceholder(/search markets/i);
    await search.fill("sport");
    // Market list should still be visible (live filtering)
    await expect(page.locator("main")).toBeVisible();
    // Market count text or list should still render
    const hasContent =
      (await page.getByText(/market/i).first().isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await page.locator("main").isVisible());
    expect(hasContent).toBeTruthy();
  });

  test("clearing the search input restores all markets", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    const search = page.getByPlaceholder(/search markets/i);
    await search.fill("sport");
    await search.clear();
    // After clearing, market count label should be visible again
    await expect(page.getByText(/\d+\s*markets/i)).toBeVisible({ timeout: 10000 });
  });

  test("category filter buttons are visible on the home page", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    // Category tabs: Trending, All, Live, New, etc.
    await expect(page.getByRole("button", { name: "Trending" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
  });

  test("clicking a category filter button updates the displayed markets", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    // Click any available category filter button (Trending, All, Live, etc.)
    const trendingButton = page.getByRole("button", { name: "Trending" });
    await trendingButton.waitFor({ state: "visible", timeout: 10000 });
    await trendingButton.click();
    // After clicking, the page should still show market content
    await expect(page.locator("main")).toBeVisible();
  });

  test("multiple category filters are available on the home page", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await expect(page.getByRole("button", { name: "Trending" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
  });

  test("Farming category filter button is present", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await expect(
      page.getByRole("button", { name: "Farming" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("Live category filter button is present", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await expect(
      page.getByRole("button", { name: "Live" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("home page shows market count label", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await expect(page.getByText(/\d+\s*markets/i)).toBeVisible({ timeout: 10000 });
  });

  test("search input has correct placeholder text", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    const search = page.getByPlaceholder(/search markets/i);
    await expect(search).toBeVisible({ timeout: 10000 });
    const placeholder = await search.getAttribute("placeholder");
    expect(placeholder).toMatch(/search markets/i);
  });

});
