import { test, expect } from "../fixtures/base";

// SCRUM-228 updated for the SCRUM-797 Kalshi redesign as it ships today.
// The new `featured-market-card` uses a role=link wrapper (aria-label = market
// question) and renders the question as a styled div (no h3 heading), with a
// combined YES / NO probability bar (role=img, aria-label="JA 21% / NEJ 79%")
// plus individual YES + NO pill buttons (aria-label="JA 21%" / "NEJ 79%").
// Thumbnails, volume badges, and bookmark counts were intentionally removed.

test.describe("SCRUM-228 — Market card visual design (Kalshi redesign, SCRUM-797)", () => {
  test("home page loads without error", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 8000 });
  });

  test("home page renders at least one featured-market-card", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator('[data-testid="featured-market-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("market card shows a Yes probability pill button", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /^(yes|ja)\s+\d+%/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("market card shows a No probability pill button", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /^(no|nej)\s+\d+%/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("market card is wrapped in a clickable link to the market detail page", async ({
    page,
  }) => {
    await page.goto("/");
    const marketLink = page
      .locator('[data-testid="featured-market-card"]')
      .first()
      .locator('a[href*="/markets/"]')
      .first();
    await expect(marketLink).toBeAttached({ timeout: 10000 });
    const href = await marketLink.getAttribute("href");
    expect(href).toMatch(/\/markets\/[a-zA-Z0-9-]+/);
  });

  test("clicking a market card navigates to the market detail page", async ({ page }) => {
    await page.goto("/");
    const marketLink = page
      .locator('[data-testid="featured-market-card"]')
      .first()
      .locator('a[href*="/markets/"]')
      .first();
    const href = await marketLink.getAttribute("href");
    await page.goto(href!);
    await expect(page).toHaveURL(/\/markets\//);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  test("Yes pill probability percentage is a number between 0-100", async ({ page }) => {
    await page.goto("/");
    const yesPill = page.getByRole("button", { name: /^(yes|ja)\s+\d+%/i }).first();
    await expect(yesPill).toBeVisible({ timeout: 10000 });
    const label = await yesPill.getAttribute("aria-label");
    const match = label?.match(/(yes|ja)\s+(\d+)%/i);
    expect(match).not.toBeNull();
    const pct = Number(match![2]);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  test("Yes + No probabilities on a card sum to approximately 100", async ({ page }) => {
    await page.goto("/");
    // The combined probability bar is a role=img with aria-label formatted as
    // "JA 21% / NEJ 79%" (or "YES 21% / NO 79%"). Parse both percentages from
    // that single label to avoid cross-card mismatches.
    const bar = page
      .getByRole("img", { name: /^(ja|yes)\s+\d+%\s*\/\s*(nej|no)\s+\d+%/i })
      .first();
    await expect(bar).toBeVisible({ timeout: 10000 });
    const label = (await bar.getAttribute("aria-label")) ?? "";
    const m = label.match(/(?:ja|yes)\s+(\d+)%\s*\/\s*(?:nej|no)\s+(\d+)%/i);
    expect(m).not.toBeNull();
    const yesPct = Number(m![1]);
    const noPct = Number(m![2]);
    expect(yesPct + noPct).toBeGreaterThanOrEqual(99);
    expect(yesPct + noPct).toBeLessThanOrEqual(101);
  });

  test("market list layout renders cards on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('[data-testid="featured-market-card"]').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
