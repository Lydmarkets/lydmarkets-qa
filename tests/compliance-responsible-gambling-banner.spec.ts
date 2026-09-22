import { test, expect } from "../fixtures/base";
import { HELPLINE_NAME, SELF_EXCLUSION_NAME } from "../helpers/compliance-names";
test.describe("Compliance — responsible gambling visibility", () => {
  test(
    "nav bar has 18+ responsible gambling link",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/");
      // Nav contains "18+ Responsible gambling" (en) or "Ansvarsfullt spelande" (sv)
      await expect(
        page
          .getByRole("link", { name: /ansvarsfullt spelande|responsible gambling/i })
          .first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "game rules page points players at the gambling helpline",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/game-rules");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      // The responsible-gambling section must name the helpline to call.
      await expect(
        page.getByText(HELPLINE_NAME).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "game rules page mentions Spelpaus",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/game-rules");
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      // Swedish: "Stänga av dig själv när som helst via Spelpaus.se"
      await expect(
        page.getByText(SELF_EXCLUSION_NAME).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});
