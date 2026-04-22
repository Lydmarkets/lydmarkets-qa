import { test, expect } from "../fixtures/base";
import { devices } from "@playwright/test";

/** Pre-configure a manually-created context with locale + cookie consent. */
async function prepareContext(context: import("@playwright/test").BrowserContext) {
  const url = new URL(process.env.BASE_URL ?? "https://web-staging-71a7.up.railway.app");
  await context.addCookies([
    { name: "locale", value: "en", domain: url.hostname, path: "/" },
  ]);
  await context.addInitScript(() => {
    localStorage.setItem("cookieConsent", "recorded");
    localStorage.setItem("cookieConsentVersion", "1");
  });
}

test.describe("Responsive design tests", () => {
  test("homepage is responsive on Mobile (Pixel 5)", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["Pixel 5"] });
    await prepareContext(context);
    const page = await context.newPage();

    await page.goto("/");
    // SCRUM-1090: header is icon-only — the Sign in / Sign up rows live
    // inside the UserMenu drawer. Open it before asserting on auth links.
    await page
      .getByRole("banner")
      .getByRole("button", {
        name: /open.*menu|öppna.*meny|user menu|användarmeny/i,
      })
      .first()
      .click();
    await expect(
      page
        .getByRole("complementary")
        .last()
        .getByRole("link", { name: /sign in|logga in/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("main").first()).toBeVisible();

    await context.close();
  });

  test("homepage is responsive on Tablet (iPad Air)", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPad Air"] });
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.locator("main").first()).toBeVisible();

    await context.close();
  });

  test("homepage is responsive on Desktop", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.locator("nav").first()).toBeVisible();
    await expect(page.locator("main").first()).toBeVisible();

    await context.close();
  });

  test("markets page loads on Mobile", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["Pixel 5"] });
    const page = await context.newPage();

    await page.goto("/markets");
    await expect(page.locator("main").first()).toBeVisible();

    await context.close();
  });

  test("markets page loads on Desktop", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    await page.goto("/markets");
    await expect(page.locator("main").first()).toBeVisible();

    await context.close();
  });
});
