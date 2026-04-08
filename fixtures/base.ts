import { test as base, expect } from "@playwright/test";

/**
 * Mocked wallet balance returned for every test run.
 *
 * The shared E2E user (`00000000-0000-4000-a000-000000000e2e`) has a 0 kr
 * balance on staging, which causes the QuickBet `Köp` button to render as
 * `disabled` with `Otillräckligt saldo`. The bet-placement suite already
 * intercepts `/api/v2/orders/place`, so a fake balance is enough to unblock
 * the entire authenticated flow without touching the staging database.
 */
const MOCK_WALLET_BALANCE = {
  data: {
    balance: "1000000.00",
    lockedBalance: "0",
    currency: "SEK",
  },
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/api/v2/wallet", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_WALLET_BALANCE),
      }),
    );
    await use(page);
  },
});

export { expect };
