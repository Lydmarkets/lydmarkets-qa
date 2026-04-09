import { test, expect } from "../fixtures/base";
import { devices } from "@playwright/test";
test.describe("Responsive design tests", () => {
  test("homepage is responsive on Mobile (Pixel 5)", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["Pixel 5"] });
    // Middleware defaults to sv; force en so text selectors work.
    await context.addCookies([
      {
        name: "locale",
        value: "en",
        domain: new URL(
          process.env.BASE_URL ?? "https://web-staging-71a7.up.railway.app",
        ).hostname,
        path: "/",
      },
    ]);
    const page = await context.newPage();

    await page.goto("/");
    // PR-903: unauthenticated mobile users no longer see a hamburger; the
    // header shows Sign in and Sign up inline instead.
    await expect(page.getByRole("link", { name: /sign in|logga in/i }).first()).toBeVisible();
    await expect(page.locator("main")).toBeVisible();

    await context.close();
  });

  test("homepage is responsive on Tablet (iPad Air)", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPad Air"] });
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.locator("main")).toBeVisible();

    await context.close();
  });

  test("homepage is responsive on Desktop", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.locator("main")).toBeVisible();

    await context.close();
  });

  test("markets page loads on Mobile", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["Pixel 5"] });
    const page = await context.newPage();

    await page.goto("/markets");
    await expect(page.locator("main")).toBeVisible();

    await context.close();
  });

  test("markets page loads on Desktop", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    await page.goto("/markets");
    await expect(page.locator("main")).toBeVisible();

    await context.close();
  });
});
