import { test, expect } from "../fixtures/base";

// /markets — listing layout.
//
// NOTE: these tests originally described a sortable TABLE layout (CATEGORY ·
// MARKET · PRICE (YES) · PROBABILITY · VOLUME · CLOSES column headers, 12/page,
// Volume/Newest/Traders aria-pressed sort toggles, Previous/Next pagination).
// That layout no longer exists on any deployed build: /markets renders a grid
// of <article> cards under a "N markets" count, with a single sort control and
// a Filter dialog, and every market on one page. The tests below assert that
// listing contract instead — same surface, current shape.

test.describe("Markets listing — card grid", () => {
  test(
    "market cards carry category, both sides and volume/trader metadata",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");

      const card = page.locator("main article").first();
      await expect(card).toBeVisible({ timeout: 10_000 });

      // Both sides are tradable from the card: "YES — 2.01× — 50%" / "NO — …".
      await expect(card.getByRole("button", { name: /^YES\b/ })).toBeVisible();
      await expect(card.getByRole("button", { name: /^NO\b/ })).toBeVisible();
      // Volume + trader count replace the old VOLUME / TRADERS columns.
      await expect(card.getByText(/volume|volym/i)).toBeVisible();
      await expect(card.getByText(/traders|handlare/i)).toBeVisible();
    }
  );

  test(
    "listing renders at least one full page of market cards",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      // Each card links to /markets/<id>; cards double-link (wrapper + title),
      // so we collect distinct hrefs rather than the raw anchor count. The bot
      // build shows every market on one page (no pagination).
      const rows = page.locator('main a[href*="/markets/"]');
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });
      const hrefs = await rows.evaluateAll((els) =>
        Array.from(new Set(els.map((e) => e.getAttribute("href"))))
      );
      expect(hrefs.length).toBeGreaterThanOrEqual(8);
      expect(hrefs.length).toBeLessThanOrEqual(40);
    }
  );

  test(
    "listing exposes a sort control naming the active order",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      // Replaces the old Volume/Newest/Traders aria-pressed toggle group: one
      // control that reads out whichever order is currently applied.
      await expect(
        page.getByRole("button", { name: /newest first|oldest first|volume|senaste först/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    "the market count matches the number of cards, so the listing is complete on one page",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      // Replaces the "Showing N–M of T" + Previous/Next pagination contract.
      // Pagination is now infinite scroll (`?limit=24&offset=24`), so the
      // reachability guarantee is: scrolling to the end must surface every
      // market the header advertises, or the tail is silently unreachable.
      const summary = page.getByText(/^\d+\s+markets$/i).first();
      await expect(summary).toBeVisible({ timeout: 10_000 });
      const advertised = Number(/(\d+)/.exec((await summary.textContent()) ?? "")![1]);
      expect(advertised).toBeGreaterThan(0);

      const distinctMarkets = async () =>
        (
          await page
            .locator('main a[href*="/markets/"]')
            .evaluateAll((els) =>
              Array.from(new Set(els.map((e) => e.getAttribute("href")))),
            )
        ).length;

      // Scroll until the grid stops growing (bounded so a broken loader fails
      // the test rather than spinning).
      let seen = await distinctMarkets();
      for (let i = 0; i < 10 && seen < advertised; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect
          .poll(distinctMarkets, { timeout: 10_000 })
          .toBeGreaterThan(seen);
        seen = await distinctMarkets();
      }

      expect(seen).toBe(advertised);
      await expect(
        page.getByRole("navigation", { name: /pagination|paginering/i })
      ).toHaveCount(0);
    }
  );

  test(
    "Filter dialog offers category, time-horizon and liquidity narrowing",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      // Wait for the grid to hydrate before clicking: a click that lands during
      // hydration is swallowed and the dialog never opens.
      await expect(page.locator("main article").first()).toBeVisible({ timeout: 15_000 });

      const filter = page.getByRole("button", { name: /^filter$/i });
      await expect(filter).toBeEnabled({ timeout: 10_000 });
      await filter.click();

      const panel = page.getByRole("dialog");
      await expect(panel).toBeVisible({ timeout: 10_000 });
      await expect(panel.getByText(/^categories$|^kategorier$/i)).toBeVisible();
      await expect(panel.getByText(/^time horizon$|^tidshorisont$/i)).toBeVisible();
      await expect(panel.getByText(/^minimum liquidity$|^minsta likviditet$/i)).toBeVisible();
      // The apply action names the result set it would produce.
      await expect(
        panel.getByRole("button", { name: /show \d+ markets|visa \d+ marknader/i })
      ).toBeVisible();
    }
  );
});
