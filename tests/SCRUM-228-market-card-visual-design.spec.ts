import { test, expect } from "../fixtures/base";

// SCRUM-228 — Market card visual design. Updated for the editorial-redesign
// FeaturedMarketsGrid (SCRUM-1039 / SCRUM-1081):
//   - Card title is now a styled <div> (not <h3>) inside a clickable card
//     wrapper. The whole card is wrapped in an absolutely-positioned <Link
//     aria-label={market.title} href="/markets/[id]"> overlay.
//   - YES / NO segments live in the inline `YesNoBar` atom; clicking them
//     opens the QuickBetModal (handled by FeaturedMarketsGrid). Aria-labels
//     are "Yes XX%" / "Ja XX%" and "No XX%" / "Nej XX%". The question text
//     no longer appears in the pill aria-label.

test.describe("SCRUM-228 — Market card visual design (editorial redesign)", () => {
  test("home page loads without error", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 8000 });
  });

  test("home page renders at least one featured market card", async ({ page }) => {
    await page.goto("/");
    const cards = page.getByTestId("featured-market-card");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("market card shows a Yes probability pill button", async ({ page }) => {
    await page.goto("/");
    await expect(
      page
        .getByTestId("featured-market-card")
        .first()
        .getByRole("button", { name: /^(yes|ja)\s+\d+%/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("market card shows a No probability pill button", async ({ page }) => {
    await page.goto("/");
    await expect(
      page
        .getByTestId("featured-market-card")
        .first()
        .getByRole("button", { name: /^(no|nej)\s+\d+%/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("market card is wrapped in a clickable link to the market detail page", async ({
    page,
  }) => {
    await page.goto("/");
    const card = page.getByTestId("featured-market-card").first();
    const marketLink = card.locator('a[href^="/markets/"]').first();
    await expect(marketLink).toBeVisible({ timeout: 10000 });
    const href = await marketLink.getAttribute("href");
    expect(href).toMatch(/\/markets\/[a-zA-Z0-9-]+/);
  });

  test("clicking the card link navigates to the market detail page", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("featured-market-card").first();
    const marketLink = card.locator('a[href^="/markets/"]').first();
    const href = await marketLink.getAttribute("href");
    await page.goto(href!);
    await expect(page).toHaveURL(/\/markets\//);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  test("Yes pill probability percentage is a number between 0–100", async ({ page }) => {
    await page.goto("/");
    const yesPill = page
      .getByTestId("featured-market-card")
      .first()
      .getByRole("button", { name: /^(yes|ja)\s+\d+%/i });
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
    const card = page.getByTestId("featured-market-card").first();
    const yesPill = card.getByRole("button", { name: /^(yes|ja)\s+\d+%/i });
    const noPill = card.getByRole("button", { name: /^(no|nej)\s+\d+%/i });
    await expect(yesPill).toBeVisible({ timeout: 10000 });
    await expect(noPill).toBeVisible();

    const yesLabel = await yesPill.getAttribute("aria-label");
    const noLabel = await noPill.getAttribute("aria-label");
    const yesPct = Number(yesLabel!.match(/(yes|ja)\s+(\d+)%/i)![2]);
    const noPct = Number(noLabel!.match(/(no|nej)\s+(\d+)%/i)![2]);
    expect(yesPct + noPct).toBeGreaterThanOrEqual(99);
    expect(yesPct + noPct).toBeLessThanOrEqual(101);
  });

  test("market list layout renders featured cards on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByTestId("featured-market-card").first(),
    ).toBeVisible({ timeout: 10000 });
  });
});
