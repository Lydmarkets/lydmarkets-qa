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
    //
    // `toBeVisible()` followed by a separate `count()` is NOT atomic: the grid
    // re-renders as its data settles, and a count taken after the visibility
    // check has already returned 0 on the nightly while the assertion above
    // passed. `toHaveCount` retries, so it can't tear like that.
    const cards = page.getByRole("article");
    await expect(cards).not.toHaveCount(0, { timeout: 30_000 });
    await expect(cards.first()).toBeVisible();
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

  // The pills carry no `aria-label` — their accessible name comes from the child
  // text nodes ("YES 49% 2.02×"). `getAttribute("aria-label")` therefore returns
  // null, and `null?.match(...)` yields undefined, which slips past
  // `expect(match).not.toBeNull()` and only blows up on the array index. Read
  // the rendered text instead. Percentage position varies by card variant
  // ("YES 49% 2.02×" vs "YES 1.81× 55%"), so match the `%` token, not an offset.
  test("Yes pill probability percentage is a number between 0-100", async ({ page }) => {
    await page.goto("/");
    const yesPill = page.getByRole("button", { name: /^(yes|ja)\b.*\d+%/i }).first();
    await expect(yesPill).toBeVisible({ timeout: 10000 });

    const pct = Number((await yesPill.innerText()).match(/(\d+)\s*%/)?.[1]);
    expect(Number.isFinite(pct)).toBeTruthy();
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  test("Yes + No probabilities on a card sum to approximately 100", async ({ page }) => {
    await page.goto("/");
    // The combined probability bar was replaced by two pill buttons per card:
    // "YES 49% 2.02×" and "NO 51% 1.98×". Read both from one card.
    const card = page.getByRole("article").first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Read both pills from ONE DOM snapshot. Reading them with two sequential
    // awaits let a live price tick land in between, so YES could be pre-tick and
    // NO post-tick and the pair no longer summed to 100 — the source of a
    // run-to-run flake, not a real pricing bug.
    const [yesText, noText] = await card.evaluate((el) => {
      const label = (re: RegExp) =>
        [...el.querySelectorAll("button")]
          .map((b) => (b.textContent ?? "").replace(/\s+/g, " ").trim())
          .find((t) => re.test(t)) ?? "";
      // No `\b` after the side: the rendered label runs the parts together
      // ("YES2.01×50%"), so there is no word boundary to match.
      return [label(/^(yes|ja)/i), label(/^(no|nej)/i)];
    });
    const yesPct = Number(yesText.match(/(\d+)\s*%/)?.[1]);
    const noPct = Number(noText.match(/(\d+)\s*%/)?.[1]);

    expect(Number.isFinite(yesPct) && Number.isFinite(noPct)).toBeTruthy();
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
