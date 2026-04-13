import { test, expect } from "../fixtures/base";

// SCRUM-228 updated for SCRUM-797 Kalshi-style redesign:
// The new HomeMarketCard is "question first, odds second" — a single card
// renders the market question as an <h3> heading with a Yes probability pill
// (Ja XX%) and a No pill (Nej XX%). Thumbnails, volume badges, and bookmark
// counts were intentionally removed in the redesign. Yes% + No% still sums
// to ~100 via LMSR pricing.

test.describe("SCRUM-228 — Market card visual design (Kalshi redesign, SCRUM-797)", () => {
  test("home page loads without error", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 8000 });
  });

  test("home page renders at least one market card with a question heading", async ({
    page,
  }) => {
    await page.goto("/");
    const headings = page.getByRole("heading", { level: 3 });
    await expect(headings.first()).toBeVisible({ timeout: 10000 });
    const count = await headings.count();
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
    const marketLink = page.locator('a[href*="/markets/"]').first();
    await expect(marketLink).toBeVisible({ timeout: 10000 });
    const href = await marketLink.getAttribute("href");
    expect(href).toMatch(/\/markets\/[a-zA-Z0-9-]+/);
  });

  test("clicking a market card navigates to the market detail page", async ({ page }) => {
    await page.goto("/");
    const marketLink = page.locator('a[href*="/markets/"]').first();
    await expect(marketLink).toBeVisible({ timeout: 10000 });
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
    // Find a card that has both a Ja and Nej button referencing the same question
    const yesPill = page.getByRole("button", { name: /^(yes|ja)\s+\d+%/i }).first();
    await expect(yesPill).toBeVisible({ timeout: 10000 });
    const yesLabel = await yesPill.getAttribute("aria-label");
    const question = yesLabel?.split("—")[1]?.trim();
    expect(question).toBeTruthy();

    const noPill = page
      .getByRole("button", { name: new RegExp(`^(no|nej)\\s+\\d+%.*${escapeRegExp(question!)}`, "i") })
      .first();
    await expect(noPill).toBeVisible({ timeout: 10000 });
    const noLabel = await noPill.getAttribute("aria-label");

    const yesPct = Number(yesLabel!.match(/(yes|ja)\s+(\d+)%/i)![2]);
    const noPct = Number(noLabel!.match(/(no|nej)\s+(\d+)%/i)![2]);
    expect(yesPct + noPct).toBeGreaterThanOrEqual(99);
    expect(yesPct + noPct).toBeLessThanOrEqual(101);
  });

  test("market list layout renders cards on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("heading", { level: 3 }).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
