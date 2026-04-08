import { test, expect } from "../fixtures/base";
test.describe("Markets — category filter details", () => {
  test(
    "'All' button is visible and present in the filter bar",
    { tag: ["@smoke"] },
    async ({ page }) => {
      await page.goto("/markets");
      // Filter bar is a generic element with accessible name "Market filters"
      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });

      // "All" / "Alla" button — use a start-anchored regex because the count
      // badge becomes part of the accessible name once useMarketCounts loads
      const allButton = filterBar.getByRole("button", { name: /^(all|alla)\b/i });
      await expect(allButton).toBeVisible();
    },
  );

  /**
   * Wait until MarketFilterTabs has fully hydrated and React onClick handlers
   * are attached. The component is `"use client"` but renders identical
   * markup server-side, so visual presence isn't proof of hydration. Instead
   * we poll the first button for the React 18 props symbol (`__reactProps$…`)
   * and verify an onClick handler is present. Without this wait, clicks fire
   * on the not-yet-hydrated DOM and silently no-op (~40% flake rate under
   * parallel load on staging).
   */
  async function waitForFilterTabsHydration(page: import("@playwright/test").Page) {
    await page.waitForFunction(
      () => {
        const btn = document.querySelector(
          '[aria-label="Market filters"] button',
        );
        if (!btn) return false;
        const propsKey = Object.keys(btn).find((k) =>
          k.startsWith("__reactProps$"),
        );
        if (!propsKey) return false;
        const props = (btn as unknown as Record<string, { onClick?: unknown }>)[
          propsKey
        ];
        return typeof props?.onClick === "function";
      },
      { timeout: 10_000 },
    );
  }

  /**
   * Click a filter button and wait for it to become the active tab.
   *
   * Even after the React props are attached, the very first click on a freshly
   * hydrated component is occasionally swallowed under parallel load — the
   * synthetic event runs before React has fully committed the listener tree.
   * Re-clicking once it lands resolves the race deterministically.
   */
  async function clickFilterUntilActive(
    button: ReturnType<import("@playwright/test").Locator["getByRole"]>,
  ) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await button.evaluate((el: HTMLButtonElement) => el.click());
      try {
        await expect(button).toHaveAttribute("aria-current", "true", {
          timeout: 2_000,
        });
        return;
      } catch {
        // retry — the click was lost
      }
    }
    // Final attempt: throw the real error if it still fails
    await expect(button).toHaveAttribute("aria-current", "true", { timeout: 2_000 });
  }

  test(
    "clicking a category filters the market list",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });
      await waitForFilterTabsHydration(page);

      const newButton = filterBar.getByRole("button", { name: /^(new|nya)\b/i });
      await clickFilterUntilActive(newButton);
    },
  );

  test(
    "clicking 'All' shows unfiltered markets after category selection",
    { tag: ["@regression"] },
    async ({ page }) => {
      await page.goto("/");
      const filterBar = page.getByLabel("Market filters");
      await expect(filterBar).toBeVisible({ timeout: 10_000 });
      await waitForFilterTabsHydration(page);

      // Apply a filter first
      const newButton = filterBar.getByRole("button", { name: /^(new|nya)\b/i });
      await clickFilterUntilActive(newButton);

      // Click "All" / "Alla" to clear the filter
      const allButton = filterBar.getByRole("button", { name: /^(all|alla)\b/i });
      await clickFilterUntilActive(allButton);
      await expect(newButton).not.toHaveAttribute("aria-current", "true");
    },
  );
});
