import { test, expect } from "../fixtures/base";
import { devices } from "@playwright/test";

test.describe("Responsive design tests", () => {
  const viewports = [
    { name: "Mobile", ...devices["Pixel 5"] },
    { name: "Tablet", ...devices["iPad Air"] },
    { name: "Desktop", width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`homepage is responsive on ${viewport.name}`, async ({
      browser,
    }) => {
      const context = await browser.newContext(viewport);
      const page = await context.newPage();

      await page.goto("/");
      await expect(page.locator("nav")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();

      // Check for responsive menu on mobile
      if (viewport.name === "Mobile") {
        const button = page.getByRole("button").filter({ has: page.locator("svg") });
        if (await button.count() > 0) {
          await expect(button.first()).toBeVisible();
        }
      }

      await context.close();
    });

    test(`markets page loads on ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext(viewport);
      const page = await context.newPage();

      await page.goto("/markets");
      await expect(page.locator("main")).toBeVisible();

      await context.close();
    });
  }
});
