import { test, expect } from "../fixtures/base";

// SCRUM-228 — re-pointed at the bot legislation build (English locale, EUR).
// Market cards render as <article> elements (the old `featured-market-card`
// data-testid was dropped) wrapping a link to /en/markets/<id>, the market
// question as a link, two YES/NO pill buttons whose accessible names read
// "YES — 51% — 1.97×" / "NO — 49% — 2.03×", and a "€59.9K volume · 317 traders"
// stat row. There is no combined role=img probability bar on this build.

test.describe("SCRUM-228 — Market card visual design (Kalshi redesign, SCRUM-797)", () => {
  test("home page loads without error", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 8000 });
  });

  test("home page renders at least one featured-market-card", async ({ page }) => {
    await page.goto("/");
    // Bot build dropped the data-testid; grid cards render as <article>.
    const cards = page.getByRole("article");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("market card shows a Yes probability pill button", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /^(yes|ja)\b.*\d+%/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("market card shows a No probability pill button", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /^(no|nej)\b.*\d+%/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("market card is wrapped in a clickable link to the market detail page", async ({
    page,
  }) => {
    await page.goto("/");
    const marketLink = page
      .getByRole("article")
      .first()
      .getByRole("link")
      .first();
    await expect(marketLink).toBeAttached({ timeout: 10000 });
    const href = await marketLink.getAttribute("href");
    expect(href).toMatch(/\/markets\/[a-zA-Z0-9-]+/);
  });

  test("clicking a market card navigates to the market detail page", async ({ page }) => {
    await page.goto("/");
    const marketLink = page
      .getByRole("article")
      .first()
      .getByRole("link")
      .first();
    const href = await marketLink.getAttribute("href");
    await page.goto(href!);
    await expect(page).toHaveURL(/\/markets\//);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  test("Yes pill probability percentage is a number between 0-100", async ({ page }) => {
    await page.goto("/");
    const yesPill = page.getByRole("button", { name: /^(yes|ja)\b.*\d+%/i }).first();
    await expect(yesPill).toBeVisible({ timeout: 10000 });
    const label = await yesPill.getAttribute("aria-label");
    // Bot build label format: "YES — 51% — 1.97×".
    const match = label?.match(/(yes|ja)\D*(\d+)%/i);
    expect(match).not.toBeNull();
    const pct = Number(match![2]);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  test("Yes + No probabilities on a card sum to approximately 100", async ({ page }) => {
    await page.goto("/");
    // The combined probability bar was replaced by two pill buttons per card:
    // "YES — 51% — 1.97×" and "NO — 49% — 2.03×". Read both from one card.
    const card = page.getByRole("article").first();
    await expect(card).toBeVisible({ timeout: 10000 });
    const yesLabel =
      (await card.getByRole("button", { name: /^(yes|ja)\b/i }).getAttribute("aria-label")) ?? "";
    const noLabel =
      (await card.getByRole("button", { name: /^(no|nej)\b/i }).getAttribute("aria-label")) ?? "";
    const yesPct = Number(yesLabel.match(/(\d+)%/)?.[1]);
    const noPct = Number(noLabel.match(/(\d+)%/)?.[1]);
    expect(yesPct + noPct).toBeGreaterThanOrEqual(99);
    expect(yesPct + noPct).toBeLessThanOrEqual(101);
  });

  test("market list layout renders cards on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("article").first()
    ).toBeVisible({ timeout: 10000 });
  });
});
