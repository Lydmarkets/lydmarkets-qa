import { test, expect } from "../fixtures/base";
test.describe("Compliance — game rules page content", () => {
  test(
    "game rules page mentions AMM/LMSR trading mechanism",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto("/game-rules");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      // Swedish heading: "Handelsmekanik — Automatiserad Marknadsgarant (AMM)"
      // Body text mentions LMSR and "logaritmisk marknadsprissättningsregel"
      await expect(
        page.getByText(/Automatiserad Marknadsgarant|LMSR|logaritmisk/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "game rules page mentions platform fee of 3.5%",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/game-rules");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      // English: "platform fee of 3.5%"; Swedish: "plattformsavgift på 3,5 %"
      await expect(
        page.getByText(/plattformsavgift|platform fee|3[,.]5\s*%/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "game rules page mentions 72-hour cooling-off period",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/game-rules");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      // English: "72-hour cooling-off / reflection period";
      // Swedish: "72-timmars betänketid"
      await expect(
        page
          .getByText(/72-timmars|betänketid|72[- ]hour|cooling[- ]off|reflection period/i)
          .first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});
