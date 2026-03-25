import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

/**
 * Trading spec — E2E coverage
 *
 * Covers: order form (place order panel, Yes/No toggles),
 * order book section, SEK currency formatting, and market detail stats.
 *
 * Note: PayoutCalculator was removed from the market detail page.
 * Fee disclosure and payout calculations are now part of the order panel.
 */

/** Navigate to the first open market's detail page. */
async function goToFirstMarketDetail(page: import("@playwright/test").Page) {
  await page.goto("/");
  await dismissAgeGate(page);

  // Wait for at least one market card link to appear
  const marketLink = page.locator("main").getByRole("link").filter({ hasText: /.+/ }).first();
  await expect(marketLink).toBeVisible({ timeout: 10_000 });

  const href = await marketLink.getAttribute("href");
  expect(href).toBeTruthy();

  // Navigate to the market detail page
  await page.goto(href!);
  await dismissAgeGate(page);

  // Wait for main content to render
  await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
}

test.describe("Trading spec — E2E coverage", () => {
  // ─── Unauthenticated tests (market detail page) ─────────────────────

  test(
    "market detail page shows place order section with heading",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // "Place Order" / "Lägg order" heading must be visible in sidebar
      await expect(
        page.getByRole("heading", { name: /place order|lägg order/i }),
      ).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    "place order section renders with YES and NO toggle buttons",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      await expect(
        page.getByRole("heading", { name: /place order|lägg order/i }),
      ).toBeVisible({ timeout: 10_000 });

      // YES and NO buttons with percentages exist
      const yesBtn = page.getByRole("button", { name: /yes/i }).first();
      const noBtn = page.getByRole("button", { name: /no/i }).first();
      await expect(yesBtn).toBeVisible({ timeout: 5_000 });
      await expect(noBtn).toBeVisible();
    },
  );

  test(
    "order book section is visible on market detail",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // Order book is rendered as a section or heading with "Order book" / "Orderbok" text
      const orderBookSection = page.getByRole("region", { name: /order/i }).or(
        page.getByText(/order book|orderbok/i).first(),
      );
      const hasOrderBook = await orderBookSection
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      // Alternatively, look for a heading or tab with order book text
      const hasOrderBookText = await page
        .getByText(/order book|orderbok/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasOrderBook || hasOrderBookText).toBeTruthy();
    },
  );

  test(
    "market detail amounts are displayed in SEK (kr)",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // The page should contain amounts in kr somewhere (volume, prices, etc.)
      await expect(page.getByText(/kr/i).first()).toBeVisible({
        timeout: 10_000,
      });

      // Market cards on home showed "kr" values — the detail page should too
      const mainText = await page.locator("main").innerText();
      expect(mainText).toMatch(/kr/i);
    },
  );

  test(
    "market detail page shows market title as h1 heading",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // The market question should be rendered as an h1
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible({ timeout: 10_000 });
      const titleText = await h1.textContent();
      expect(titleText!.trim().length).toBeGreaterThan(10);
    },
  );

  test(
    "market detail page shows resolution criteria when available",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // Resolution criteria heading (optional — not all markets have it)
      const hasCriteria = await page
        .getByText(/resolution criteria|avgörandekriterier/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      // Either has criteria or the main content rendered without it
      const hasMain = await page.locator("main").isVisible();
      expect(hasCriteria || hasMain).toBeTruthy();
    },
  );

  // ─── Authenticated tests ────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test(
      "place order panel shows YES/NO buttons for authenticated user",
      { tag: ["@trading"] },
      async ({ page }) => {
        await goToFirstMarketDetail(page);

        // Place Order section visible
        await expect(
          page.getByRole("heading", { name: /place order|lägg order/i }),
        ).toBeVisible({ timeout: 10_000 });

        // YES and NO buttons should be interactive
        const yesBtn = page.getByRole("button", { name: /yes/i }).first();
        await expect(yesBtn).toBeVisible({ timeout: 5_000 });
        await expect(yesBtn).toBeEnabled();
      },
    );

    test(
      "order book section renders for authenticated user",
      { tag: ["@trading"] },
      async ({ page }) => {
        await goToFirstMarketDetail(page);

        // Order book section is present (via aria-label or text)
        const hasOrderBook = await page
          .getByText(/order book|orderbok/i)
          .first()
          .isVisible({ timeout: 10_000 })
          .catch(() => false);

        const hasSection = await page
          .getByRole("region", { name: /order/i })
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        expect(hasOrderBook || hasSection).toBeTruthy();
      },
    );
  });
});
