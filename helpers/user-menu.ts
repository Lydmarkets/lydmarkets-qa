import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Opens the UserMenu drawer (SCRUM-1090). The drawer is an `<aside
 * aria-label="Öppna meny">` triggered by a header button with the same
 * accessible name. Session timer and wallet balance relocated from the top
 * nav into this drawer for authenticated users; auth CTAs live here for
 * guests.
 *
 * After SCRUM-1090 the session timer no longer uses `HH:MM:SS`: the new
 * format is `"X min"` (e.g. `"0 min"`, `"5 min"`) or `"Y tim X min"` (e.g.
 * `"1 tim 23 min"`) — see `SESSION_TIMER_REGEX`. Balance stays on the
 * Swedish currency format `"X,XX kr"` — see `BALANCE_REGEX`.
 *
 * The trigger's accessible name is NOT stable across hydration for guests: the
 * SSR markup renders `aria-label="Open menu"` and the hydrated client swaps in
 * a labelled "Sign in" button. Matching only /open menu/ races the swap — the
 * click lands mid-render ("element is not stable" → "element was detached from
 * the DOM"), or the element is gone once hydration settles. Authenticated users
 * keep "Open menu" throughout, so match either name.
 */
export const MENU_TRIGGER_RE = /öppna meny|open menu|^logga in$|^sign in$/i;

export function getMenuTrigger(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: MENU_TRIGGER_RE });
}

export function getUserMenuDrawer(page: Page) {
  return page.getByRole("complementary", { name: /öppna meny|open menu/i });
}

export async function openUserMenu(page: Page): Promise<void> {
  const trigger = getMenuTrigger(page);
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();
  await expect(getUserMenuDrawer(page)).toBeVisible({ timeout: 5_000 });
}

export const SESSION_TIMER_REGEX = /\d+\s*(min|tim)/i;
export const BALANCE_REGEX = /\d+[.,]\d{2}\s*kr/i;
