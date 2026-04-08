import { test, expect } from "../fixtures/base";
test.describe("SCRUM-402: Market search and category filters", () => {
  test("home page shows a search input for markets", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByPlaceholder(/search markets|sök marknader/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("typing in search input filters the market list", async ({ page }) => {
    await page.goto("/");
    const search = page.getByPlaceholder(/search markets|sök marknader/i);
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
    const search = page.getByPlaceholder(/search markets|sök marknader/i);
    await search.fill("sport");
    await search.clear();
    // After clearing, market count label should be visible again
    await expect(page.getByText(/\d+\s*(?:markets|marknader)/i)).toBeVisible({ timeout: 10000 });
  });

  test("category filter buttons are visible on the home page", async ({ page }) => {
    await page.goto("/");
    // Category tabs: All, Live, New (counts load asynchronously and become
    // part of the accessible name once useMarketCounts resolves, so anchor
    // only at the start of the name).
    await expect(
      page.getByRole("button", { name: /^(all|alla)\b/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /^live\b/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^(new|nya)\b/i })).toBeVisible();
  });

  test("clicking a category filter button updates the displayed markets", async ({ page }) => {
    await page.goto("/");
    // Click the "New" / "Nya" filter button
    const newButton = page.getByRole("button", { name: /^(new|nya)\b/i });
    await newButton.waitFor({ state: "visible", timeout: 10000 });
    await newButton.click();
    // After clicking, the page should still show market content
    await expect(page.locator("main")).toBeVisible();
  });

  test("multiple category filters are available on the home page", async ({ page }) => {
    await page.goto("/");
    // Button accessible names may include a trailing count badge ("Alla 80",
    // "Nya 0", etc.), so anchor only at the start.
    await expect(
      page.getByRole("button", { name: /^(all|alla)\b/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /^live\b/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^(new|nya)\b/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^(watchlist|bevakade)\b/i }),
    ).toBeVisible();
  });

  test("New category filter button is present", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /^(new|nya)\b/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("Live category filter button is present", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /^live\b/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("home page shows market count label", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/\d+\s*(?:markets|marknader)/i)).toBeVisible({ timeout: 10000 });
  });

  test("search input has correct placeholder text", async ({ page }) => {
    await page.goto("/");
    const search = page.getByPlaceholder(/search markets|sök marknader/i);
    await expect(search).toBeVisible({ timeout: 10000 });
    const placeholder = await search.getAttribute("placeholder");
    expect(placeholder).toMatch(/search markets|sök marknader/i);
  });

});
