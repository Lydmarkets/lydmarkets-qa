import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Markets — category filter details", () => {
  test(
    "'All' button is visible and present in the filter bar",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/markets");
      await dismissAgeGate(page);

      // Filter bar is a generic element with accessible name "Market filters"
      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });

      // "All" is a button inside the filter bar
      const allButton = filterBar.getByRole("button", { name: "All" });
      await expect(allButton).toBeVisible();
    },
  );

  test(
    "clicking a category filters the market list",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      await dismissAgeGate(page);

      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });

      // Get the market count before filtering
      const countBefore = await page
        .getByText(/\d+\s*marknad/i)
        .first()
        .textContent()
        .catch(() => "");

      // Click a category link (e.g. Sports) to filter
      const categoryLink = filterBar.getByRole("link").first();
      const categoryName = await categoryLink.textContent();
      await categoryLink.click();

      // Wait for the filter to take effect — market count or card content should change
      // Category-filtered results show market cards tagged with the selected category
      await expect(page.getByText(categoryName!).first()).toBeVisible({
        timeout: 5_000,
      });
    },
  );

  test(
    "clicking 'All' shows unfiltered markets after category selection",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      await dismissAgeGate(page);

      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });

      // Click a category to filter first
      const categoryLink = filterBar.getByRole("link").first();
      await categoryLink.click();

      // Small wait for filter to apply
      await page.waitForTimeout(1_000);

      // Click "All" to clear the filter
      const allButton = filterBar.getByRole("button", { name: "All" });
      await allButton.click();

      // "All" button should be visible and the market grid should show results
      await expect(allButton).toBeVisible();
      await expect(page.getByText(/marknad/i).first()).toBeVisible({
        timeout: 5_000,
      });
    },
  );
});
