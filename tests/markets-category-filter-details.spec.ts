import { test, expect } from "../fixtures/base";
test.describe("Markets — category filter details", () => {
  test(
    "'All' button is visible and present in the filter bar",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/markets");
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
      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });

      // Click "New" filter button (filter items are buttons, not links)
      const newButton = filterBar.getByRole("button", { name: "New" });
      await newButton.click();

      // URL should update with the filter parameter
      await expect(page).toHaveURL(/[?&]filter=new/);
    },
  );

  test(
    "clicking 'All' shows unfiltered markets after category selection",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });

      // Click "New" to apply a filter first (filter items are buttons, not links)
      const newButton = filterBar.getByRole("button", { name: "New" });
      await newButton.click();
      await expect(page).toHaveURL(/[?&]filter=new/);

      // Click "All" to clear the filter
      const allButton = filterBar.getByRole("button", { name: "All" });
      await allButton.click();

      // Market list should show unfiltered results again
      await expect(allButton).toBeVisible();
      await expect(page.getByText(/\d+\s*marknader/i)).toBeVisible({
        timeout: 5_000,
      });
    },
  );
});
