import { test as base, expect } from "@playwright/test";

/**
 * Shared test fixture that forces the English locale and pre-accepts the cookie
 * consent dialog on every browser context.
 *
 * - locale=en cookie: middleware reads this to decide which language to serve.
 *   Tests hardcode English text selectors, so without this they'd break.
 * - cookieConsent localStorage: the CookieBanner component checks this key and
 *   shows a modal overlay when absent. That overlay blocks clicks on links and
 *   buttons, causing test timeouts.
 */
export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    const url = new URL(baseURL ?? "https://web-staging-71a7.up.railway.app");
    await context.addCookies([
      {
        name: "locale",
        value: "en",
        domain: url.hostname,
        path: "/",
      },
    ]);
    // Pre-accept cookie consent so the banner doesn't block page interactions
    await context.addInitScript(() => {
      localStorage.setItem("cookieConsent", "recorded");
      localStorage.setItem("cookieConsentVersion", "1");
      localStorage.setItem("cookieConsentDate", new Date().toISOString());
    });
    await use(context);
  },
});

export { expect };
