import { test as baseTest, expect } from "../fixtures/base";
import { test as rawTest } from "@playwright/test";
// Note: the app has no <footer> element. Responsible gambling is linked from the nav.

// Cookie banner tests need a fresh context WITHOUT pre-accepted consent.
// The base fixture pre-accepts cookies to prevent blocking; here we override that.
const test = baseTest;
const freshTest = rawTest.extend({
  context: async ({ context, baseURL }, use) => {
    const url = new URL(baseURL ?? "https://web-staging-71a7.up.railway.app");
    await context.addCookies([
      { name: "locale", value: "en", domain: url.hostname, path: "/" },
    ]);
    await use(context);
  },
});

freshTest.describe("Compliance — cookie consent", () => {
  freshTest("cookie banner appears for new visitors", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/cookie|kakor/i).first()).toBeVisible({ timeout: 5000 });
  });

  freshTest("accepting cookies dismisses banner", async ({ page }) => {
    await page.goto("/");
    const acceptButton = page.getByRole("button", { name: /accept|acceptera|godkänn/i }).first();
    if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptButton.click();
      await expect(acceptButton).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Compliance — responsible gambling nav link", () => {
  test("nav contains responsible gambling link", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /responsible gambling|ansvarsfullt/i }).first()
    ).toBeVisible();
  });
});

test.describe("Compliance — legal pages accessible", () => {
  test("responsible gambling page loads", async ({ page }) => {
    await page.goto("/responsible-gambling");
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("terms of service page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /terms|användarvillkor/i }).first()).toBeVisible();
  });

  test("game rules page loads", async ({ page }) => {
    await page.goto("/game-rules");
    await expect(page.locator("main").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /game rules|spelregler|gemenskapsriktlinjer/i })).toBeVisible();
  });
});
