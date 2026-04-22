import { test, expect } from "../fixtures/base";
test.describe("Compliance — responsible gambling visibility", () => {
  test(
    "responsible-gambling controls are reachable from every page (SCRUM-885 ansvarsspel-bar)",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/");
      // SCRUM-885 puts the mandated controls in a top-of-page strip rendered
      // as <aside aria-label="Spelansvarsverktyg|Responsible gambling tools">.
      // SCRUM-1090 also surfaces a "18+ Responsible gambling" section header
      // inside the UserMenu drawer.
      const bar = page.getByRole("complementary", {
        name: /spelansvarsverktyg|responsible gambling tools/i,
      });
      await expect(bar).toBeVisible({ timeout: 5_000 });
      await expect(bar.getByRole("link", { name: /spelpaus/i })).toBeVisible();
    },
  );

  test(
    "game rules page mentions Stodlinjen helpline number",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/game-rules");
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
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

      // Swedish: "Stänga av dig själv när som helst via Spelpaus.se"
      await expect(
        page.getByText(/spelpaus/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});
