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

      // Wait for market cards to render — signals hydration is complete
      await page.locator('main a[href*="/markets/"]').first().waitFor({ state: "visible", timeout: 10_000 });

      // View-tab buttons include a count badge baked into the accessible
      // name ("New0", "All80"), so regexes allow a trailing digit group.
      const newButton = filterBar.getByRole("button", { name: /^(new|nya)\s*\d*$/i });
      await newButton.click();
      await expect(page).toHaveURL(/[?&]filter=new/, { timeout: 8_000 });

      // Click "All" to clear the filter — scroll into view to avoid hitting a market card
      const allButton = filterBar.getByRole("button", { name: /^(all|alla)\s*\d*$/i });
      await allButton.scrollIntoViewIfNeeded();
      await allButton.click();

      // Should stay on the home page with the filter cleared
      await expect(page).not.toHaveURL(/\/markets\//);
      await expect(allButton).toBeVisible();
    },
  );
});
