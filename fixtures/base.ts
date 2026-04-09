import { test as base, expect } from "@playwright/test";

/**
 * Shared test fixture that forces the English locale on every browser context.
 *
 * The web app was internationalized (default locale: sv) and reads the `locale`
 * cookie in its middleware to decide which language to serve. Tests hardcode
 * English text in their selectors ("All", "Sign in", "Place Order", etc.), so
 * we set `locale=en` on the context before any navigation happens.
 *
 * Without this, every text-based selector on the user-facing app would break.
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
    await use(context);
  },
});

export { expect };
