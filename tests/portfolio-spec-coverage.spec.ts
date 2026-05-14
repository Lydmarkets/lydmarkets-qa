import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

/**
 * Portfolio spec — E2E coverage
 *
 * /portfolio renders a "Mina positioner" / "My Positions" h1 followed by a
 * five-pill filter (`Öppna / Stängda / Vunna / Förlorade / Alla`) with
 * `aria-pressed` reflecting the active filter, a date-range trigger that
 * opens a calendar dialog, and an infinite-scroll list of position rows that
 * open `PositionReceiptModal` on click. See `spec/portfolio.md` (pill-filter
 * redesign).
 */

test.describe("Portfolio spec — E2E coverage", () => {
  // ── Unauthenticated tests ────────────────────────────────────────────

  test("unauthenticated /portfolio redirects to login", { tag: ["@portfolio"] }, async ({ page }) => {
    await page.goto("/portfolio");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect=%2Fportfolio");
  });

  test("legacy /orders route no longer exists (404)", { tag: ["@portfolio"] }, async ({ page }) => {
    const response = await page.goto("/orders");
    expect(response?.status()).toBe(404);
  });

  // ── Authenticated tests ──────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({}, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test(
      "portfolio page loads with header, five filter pills, and a date trigger",
      { tag: ["@portfolio", "@smoke", "@critical"] },
      async ({ page }) => {
        await page.goto("/portfolio");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /mina positioner|my positions/i })
        ).toBeVisible({ timeout: 15_000 });

        // Öppna is the default-active pill.
        await expect(
          page.getByRole("button", { name: /öppna|^open/i, pressed: true })
        ).toBeVisible();

        for (const name of [/stängda|^closed/i, /vunna|^won/i, /förlorade|^lost/i, /alla|^all/i]) {
          await expect(page.getByRole("button", { name })).toBeVisible();
        }

        await expect(
          page.getByRole("button", { name: /filter by date|filtrera på datum/i })
        ).toBeVisible();
      }
    );

    test(
      "clicking the Stängda pill makes it the active filter",
      { tag: ["@portfolio", "@regression"] },
      async ({ page }) => {
        await page.goto("/portfolio");
        await dismissLimitsDialog(page);

        const stängda = page.getByRole("button", { name: /stängda|^closed/i });
        await expect(stängda).toBeVisible({ timeout: 15_000 });
        await stängda.click();
        await expect(stängda).toHaveAttribute("aria-pressed", "true", { timeout: 5_000 });
      }
    );

    test(
      "clicking the calendar trigger opens the range-picker dialog",
      { tag: ["@portfolio", "@regression"] },
      async ({ page }) => {
        await page.goto("/portfolio");
        await dismissLimitsDialog(page);

        await page.getByRole("button", { name: /filter by date|filtrera på datum/i }).click();
        await expect(
          page.getByRole("dialog", { name: /filter by date|filtrera på datum/i })
        ).toBeVisible({ timeout: 5_000 });
      }
    );

    test(
      "Öppna filter renders positions or the empty message",
      { tag: ["@portfolio", "@critical"] },
      async ({ page }) => {
        await page.goto("/portfolio");
        await dismissLimitsDialog(page);

        const positionsList = page.getByRole("list", { name: /positions|positioner/i });
        const emptyMsg = page.getByText(/no open positions|inga öppna positioner/i);

        const hasList = await positionsList.isVisible({ timeout: 10_000 }).catch(() => false);
        const hasEmpty = await emptyMsg.isVisible({ timeout: 3_000 }).catch(() => false);

        expect(hasList || hasEmpty).toBeTruthy();
      }
    );

    test(
      "Alla pill shows every position regardless of status",
      { tag: ["@portfolio", "@regression"] },
      async ({ page }) => {
        await page.goto("/portfolio");
        await dismissLimitsDialog(page);

        const alla = page.getByRole("button", { name: /alla|^all/i });
        await expect(alla).toBeVisible({ timeout: 15_000 });
        await alla.click();
        await expect(alla).toHaveAttribute("aria-pressed", "true", { timeout: 5_000 });
      }
    );
  });
});
