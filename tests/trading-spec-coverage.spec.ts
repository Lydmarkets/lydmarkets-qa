import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

/**
 * Trading spec — E2E coverage
 *
 * Covers: payout calculator (2% fee, share presets, side toggle),
 * order book display, SEK currency formatting, min/max order validation,
 * and cancel-order buttons for authenticated users.
 */

/** Navigate to the first open market's detail page. */
async function goToFirstMarketDetail(page: import("@playwright/test").Page) {
  await page.goto("/");
  await dismissAgeGate(page);

  // Wait for at least one market card link to appear
  const marketLink = page.locator('a[href*="/markets/"]').first();
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
    "payout calculator shows 2% platform fee",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // Payout Calculator section must be visible
      await expect(
        page.getByRole("heading", { name: /payout calculator/i }),
      ).toBeVisible({ timeout: 10_000 });

      // "Platform fee (2%)" text is rendered inside the calculator
      await expect(
        page.getByText(/platform fee\s*\(\s*2\s*%\s*\)/i),
      ).toBeVisible({ timeout: 5_000 });

      // The fee amount is shown in kr (e.g. "-0,20 kr")
      // Look for any text with "kr" near the fee line
      const feeRow = page.getByText(/platform fee/i).locator("..").first();
      const feeText = await feeRow.innerText();
      expect(feeText).toMatch(/kr/);
    },
  );

  test(
    "payout calculator renders with share presets and side toggle",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      await expect(
        page.getByRole("heading", { name: /payout calculator/i }),
      ).toBeVisible({ timeout: 10_000 });

      // Side toggle: YES and NO buttons exist
      const yesToggle = page.getByRole("button", { name: /^yes\s+\d+%$/i }).first();
      const noToggle = page.getByRole("button", { name: /^no\s+\d+%$/i }).first();
      await expect(yesToggle).toBeVisible({ timeout: 5_000 });
      await expect(noToggle).toBeVisible();

      // Share presets: buttons labelled 10, 25, 50, 100
      for (const preset of ["10", "25", "50", "100"]) {
        await expect(
          page.getByRole("button", { name: preset, exact: true }),
        ).toBeVisible();
      }

      // "Number of shares" label is visible
      await expect(page.getByText("Number of shares")).toBeVisible();
    },
  );

  test(
    "order book section is visible on market detail",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // "Order Book" heading should be present
      await expect(
        page.getByRole("heading", { name: /order book/i }),
      ).toBeVisible({ timeout: 10_000 });

      // Either we see order rows or the "No open orders" empty state
      const hasOrders = await page
        .getByText(/no open orders/i)
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      const hasOrderRows = await page
        .locator("table tbody tr, [role='row']")
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      expect(hasOrders || hasOrderRows).toBeTruthy();
    },
  );

  test(
    "market detail amounts are displayed in SEK (kr)",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      // The Volume stat should show "kr"
      await expect(page.getByText(/volume/i).first()).toBeVisible({
        timeout: 10_000,
      });
      const volumeSection = page.getByText(/volume/i).locator("..").first();
      const volumeText = await volumeSection.innerText();
      expect(volumeText).toMatch(/kr/i);

      // Payout Calculator total cost should show "kr"
      await expect(
        page.getByText("Total cost", { exact: true }),
      ).toBeVisible({ timeout: 5_000 });
      const costSection = page
        .getByText("Total cost", { exact: true })
        .locator("..")
        .first();
      const costText = await costSection.innerText();
      expect(costText).toMatch(/kr/i);
    },
  );

  test(
    "payout calculator discloses fee deduction explanation",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      await expect(
        page.getByRole("heading", { name: /payout calculator/i }),
      ).toBeVisible({ timeout: 10_000 });

      // Disclosure text about the 2% fee
      await expect(
        page.getByText(
          /2\s*%\s*platform fee is deducted from winning payouts/i,
        ),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "payout calculator shows max profit and max loss",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarketDetail(page);

      await expect(
        page.getByRole("heading", { name: /payout calculator/i }),
      ).toBeVisible({ timeout: 10_000 });

      // Max profit and max loss labels
      await expect(page.getByText("Max profit")).toBeVisible({
        timeout: 5_000,
      });
      await expect(page.getByText("Max loss")).toBeVisible();

      // Both should show amounts in kr
      const profitParent = page.getByText("Max profit").locator("..").first();
      const profitText = await profitParent.innerText();
      expect(profitText).toMatch(/kr/);

      const lossParent = page.getByText("Max loss").locator("..").first();
      const lossText = await lossParent.innerText();
      expect(lossText).toMatch(/kr/);
    },
  );

  // ─── Authenticated tests ────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test(
      "place order panel shows min/max quantity validation",
      { tag: ["@trading"] },
      async ({ page }) => {
        await goToFirstMarketDetail(page);

        // Place Order section visible
        await expect(
          page.getByRole("heading", { name: /place order/i }),
        ).toBeVisible({ timeout: 10_000 });

        // The share quantity spinbutton should have min and max attributes
        const spinbutton = page.getByRole("spinbutton", {
          name: /number of shares/i,
        });
        await expect(spinbutton).toBeVisible({ timeout: 5_000 });

        // Validate min=1 constraint
        const min = await spinbutton.getAttribute("min");
        expect(min).toBe("1");

        // Validate max constraint exists and is a reasonable number
        const max = await spinbutton.getAttribute("max");
        expect(max).toBeTruthy();
        expect(Number(max)).toBeGreaterThanOrEqual(1_000);
      },
    );

    test(
      "open orders section shows cancel button for pending orders",
      { tag: ["@trading"] },
      async ({ page }) => {
        await goToFirstMarketDetail(page);

        // The Order Book section is present
        await expect(
          page.getByRole("heading", { name: /order book/i }),
        ).toBeVisible({ timeout: 10_000 });

        // Check for either "No open orders" empty state or cancel buttons
        const noOrders = await page
          .getByText(/no open orders/i)
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        if (noOrders) {
          // Empty state is valid — no pending orders to cancel
          expect(noOrders).toBeTruthy();
        } else {
          // If there are orders, cancel buttons should exist
          const cancelBtn = page
            .getByRole("button", { name: /cancel order/i })
            .first();
          await expect(cancelBtn).toBeVisible({ timeout: 5_000 });
        }
      },
    );
  });
});
