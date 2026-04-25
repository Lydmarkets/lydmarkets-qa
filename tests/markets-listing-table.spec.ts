import { test, expect } from "../fixtures/base";

// /markets — sortable table layout.
//
// Post-redesign /markets renders rows under fixed column headers
// (CATEGORY · MARKET · PRICE (YES) · PROBABILITY · VOLUME · CLOSES) with
// 12 markets per page and three sort affordances exposed as <button> with
// aria-pressed (Volume ↓ default, Newest, Traders).

test.describe("Markets listing — table layout", () => {
  test(
    "table column headers are present",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      for (const label of [
        /^category$/i,
        /^market$/i,
        /^price\s*\(yes\)$/i,
        /^probability$/i,
        /^volume$/i,
        /^closes$/i,
      ]) {
        await expect(page.getByText(label).first()).toBeVisible({
          timeout: 10_000,
        });
      }
    }
  );

  test(
    "table renders at least one full page of market rows",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      // Each row links to /markets/<id>; cells may double-link (title + Trade
      // arrow), so we collect distinct hrefs rather than asserting on the raw
      // anchor count.
      const rows = page.locator('main a[href*="/markets/"]');
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });
      const hrefs = await rows.evaluateAll((els) =>
        Array.from(new Set(els.map((e) => e.getAttribute("href"))))
      );
      // 12 markets per page; allow a small floor for sparse-staging fallback.
      expect(hrefs.length).toBeGreaterThanOrEqual(8);
      expect(hrefs.length).toBeLessThanOrEqual(12);
    }
  );

  test(
    "Volume sort is the default and reflects aria-pressed",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      const volumeBtn = page.getByRole("button", { name: /^volume/i }).first();
      await expect(volumeBtn).toBeVisible({ timeout: 10_000 });
      await expect(volumeBtn).toHaveAttribute("aria-pressed", "true");
      // Other sort buttons must not also be pressed.
      const newestBtn = page.getByRole("button", { name: /^newest/i }).first();
      await expect(newestBtn).toHaveAttribute("aria-pressed", "false");
    }
  );

  test(
    "showing-N-of-M summary is rendered",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      // Single <p> at the top of /markets; locating via the <main> tree keeps
      // strict mode happy and the dash class accepts en/em/hyphen variants.
      await expect(
        page
          .locator("main p")
          .filter({ hasText: /showing\s+\d+[–—\-]\d+\s+of\s+\d+/i })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    "Markets pagination nav exposes a Previous + Next pair",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/markets");
      const pager = page.getByRole("navigation", {
        name: /markets pagination/i,
      });
      await expect(pager).toBeVisible({ timeout: 10_000 });
      await expect(pager.getByText(/previous/i)).toBeVisible();
      await expect(pager.getByRole("link", { name: /^next$/i })).toBeVisible();
    }
  );
});
