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
 */
export async function openUserMenu(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: /öppna meny|open menu/i });
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();
}

export const SESSION_TIMER_REGEX = /\d+\s*(min|tim)/i;
export const BALANCE_REGEX = /\d+[.,]\d{2}\s*kr/i;
