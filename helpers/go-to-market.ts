import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { dismissLimitsDialog } from "./dismiss-limits-dialog";

interface ApiMarket {
  id: string;
  status?: string;
  isMultiOutcome?: boolean;
}

/**
 * Navigate to the first available market detail page.
 *
 * Resolves a live market ID via the public `/api/v2/markets` endpoint, then
 * navigates directly to `/markets/:id`. The API is the source of truth — the
 * SSR home page is ISR-cached and regularly serves stale IDs for markets that
 * have been deleted/archived, which used to cause cascading 404s in the
 * bet-placement suite.
 *
 * Prefers binary (non-multi-outcome) markets since the QuickBet tests assume
 * a single Yes/No side-selector layout.
 */
export async function goToFirstMarket(page: Page): Promise<string> {
  const res = await page.request.get("/api/v2/markets?status=active&limit=20");
  expect(
    res.ok(),
    `Failed to fetch /api/v2/markets (HTTP ${res.status()})`,
  ).toBeTruthy();

  const body = (await res.json()) as { data?: ApiMarket[] };
  const markets = Array.isArray(body?.data) ? body.data : [];
  expect(
    markets.length,
    "No active markets returned from /api/v2/markets",
  ).toBeGreaterThan(0);

  const binary = markets.find((m) => m.isMultiOutcome === false);
  const picked = binary ?? markets[0];
  const href = `/markets/${picked.id}`;

  await page.goto(href);
  await dismissLimitsDialog(page);

  return href;
}
