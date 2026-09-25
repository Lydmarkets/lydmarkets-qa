import { test, expect } from "../fixtures/base";
import { IS_BOT_BUILD } from "../helpers/is-bot-build";
import { isNotFoundPage } from "../helpers/not-found";

// A play-money build (`mode: "demo"` — bot today) drops the licence and
// real-money RG chrome but keeps the age mark and independent help on every
// page. A licensed build keeps its regulator panel. The footer never names a
// regulator on a play-money build.
test.describe("SCRUM-2271: play-money chrome", () => {
  if (IS_BOT_BUILD) {
    test("footer carries the play-money disclaimer and names no regulator", async ({ page }) => {
      await page.goto("/");
      const footer = page.getByRole("contentinfo");
      await expect(
        footer.getByText(/not supervised by a gambling authority/i).first(),
      ).toBeVisible({ timeout: 15_000 });
      await expect(footer.getByText(/spelinspektionen/i)).toHaveCount(0);
    });

    test("/responsible-gambling stays reachable with an 18+ age limit", async ({ page }) => {
      await page.goto("/responsible-gambling");
      expect(await isNotFoundPage(page, 3_000)).toBe(false);
      await expect(page.locator("main").getByText(/18\+|18 years/i).first()).toBeVisible();
    });
    return;
  }

  test("footer keeps the regulator panel on a licensed build", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("contentinfo").getByText(/spelinspektionen/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
