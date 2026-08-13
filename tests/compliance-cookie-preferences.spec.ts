import { test as base, expect } from "@playwright/test";

// This spec deliberately does NOT use ../fixtures/base: that fixture seeds
// `cookieConsent` into localStorage so the banner never blocks other tests.
// Here the banner IS the subject, so we need a context that has not consented.
const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    await context.addCookies([
      { name: "locale", value: "en", domain: new URL(baseURL!).hostname, path: "/" },
    ]);
    await use(context);
  },
});

test.describe("Compliance — cookie preferences", () => {
  test(
    "cookie banner has analytics/marketing/functional preference categories",
    { tag: ["@compliance", "@regression"] },
    async ({ page }) => {
      await page.goto("/");

      const banner = page.getByRole("dialog").filter({ hasText: /cookie/i }).first();
      await expect(banner).toBeVisible({ timeout: 15_000 });

      // Blanket accept/reject must both be offered alongside granular control
      // (GDPR: refusing must be as easy as accepting).
      await expect(banner.getByRole("button", { name: /^accept all$|^acceptera alla$/i })).toBeVisible();
      await expect(banner.getByRole("button", { name: /^only necessary$|^endast nödvändiga$/i })).toBeVisible();

      await banner.getByRole("button", { name: /^customize$|^anpassa$/i }).click();

      for (const category of [
        /strictly necessary|nödvändiga/i,
        /functional|funktionell/i,
        /analytics|analys/i,
        /marketing|marknadsföring/i,
      ]) {
        // The category switcher renders as tabs, not plain buttons, so match on
        // the visible label rather than a role.
        await expect(banner.getByText(category).first()).toBeVisible();
      }

      await expect(
        banner.getByRole("button", { name: /save and close|spara/i })
      ).toBeVisible();
      await expect(
        banner.getByRole("link", { name: /cookie policy/i })
      ).toHaveAttribute("href", /cookie-policy$/);
    },
  );
});
