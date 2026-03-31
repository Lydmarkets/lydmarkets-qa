import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Compliance — responsible gambling visibility", () => {
  test(
    "nav bar has 18+ responsible gambling link",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/");
      await dismissAgeGate(page);

      // Nav contains "18+ Ansvarsfullt spelande" link to /responsible-gambling
      await expect(
        page.getByRole("link", { name: /ansvarsfullt spelande/i }).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "game rules page mentions Stodlinjen helpline number",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/game-rules");
      await dismissAgeGate(page);

      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      // Swedish: "ring Stödlinjen 020-819 100"
      await expect(
        page.getByText(/stödlinjen|020-819/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "game rules page mentions Spelpaus",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/game-rules");
      await dismissAgeGate(page);

      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      // Swedish: "Stänga av dig själv när som helst via Spelpaus.se"
      await expect(
        page.getByText(/spelpaus/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});
