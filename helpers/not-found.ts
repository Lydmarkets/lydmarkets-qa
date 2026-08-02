import type { Page } from "@playwright/test";

/**
 * True once the app's 404 page is on screen.
 *
 * `NotFoundUI` is a client component, so the heading only exists after
 * hydration — `locator.isVisible()` returns before that and reports false.
 */
export async function isNotFoundPage(page: Page, timeout = 10_000): Promise<boolean> {
  try {
    await page
      .getByRole("heading", { level: 1, name: /^404$/ })
      .waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}
