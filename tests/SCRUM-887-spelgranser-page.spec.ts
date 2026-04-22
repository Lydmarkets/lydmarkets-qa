import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

// SCRUM-887 — user-configurable Spelgränser page at /profil/spelgranser.
//
// Renders deposit-limit + session-time controls per day / week / month.
// Decreases apply immediately; increases enter a 72h cooling-off window
// before activating. Auth-required: unauthenticated users are routed
// through /login with callbackUrl=/profil/spelgranser.

test.describe("SCRUM-887: Spelgränser self-service limits page", () => {
  test(
    "page is auth-gated — unauthenticated users land on /login",
    { tag: ["@compliance", "@critical"] },
    async ({ page }) => {
      await page.goto("/profil/spelgranser");
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      const url = new URL(page.url());
      // The redirect target is `/login`, but the locale-prefixed render path
      // can be `/login` or `/{en|sv}/login` depending on whether the redirect
      // happens before or after middleware locale rewrite. Allow both.
      expect(url.pathname).toMatch(/^\/(en\/|sv\/)?login$/);
      // The login page preserves the destination via a callbackUrl param so
      // the user lands back on Spelgränser after BankID succeeds.
      const cb =
        url.searchParams.get("callbackUrl") ||
        url.searchParams.get("redirect");
      expect(cb).toContain("spelgranser");
    },
  );

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({}, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test(
      "page renders the kicker, title, and deposit + session sections",
      { tag: ["@compliance", "@smoke"] },
      async ({ page }) => {
        await page.goto("/profil/spelgranser");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        // PageHeaderV2: "Play limits" / "Spelinställningar" kicker + title
        // "Spelgränser"
        await expect(
          page.getByRole("heading", { name: /spelgränser/i }),
        ).toBeVisible({ timeout: 10_000 });

        // Deposit limits card
        await expect(
          page.getByText(/deposit limits|insättningsgränser/i).first(),
        ).toBeVisible();

        // Session-time card
        await expect(
          page.getByText(/session time|spelad tid|tid på sajten/i).first(),
        ).toBeVisible();

        // Each section has per-day / per-week / per-month inputs
        for (const period of [/per day|per dag/i, /per week|per vecka/i, /per month|per månad/i]) {
          await expect(page.getByText(period).first()).toBeVisible();
        }
      },
    );

    test(
      "form surfaces the 72h cooling-off notice for limit increases",
      { tag: ["@compliance", "@critical"] },
      async ({ page }) => {
        await page.goto("/profil/spelgranser");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        // SCRUM-887 requirement: the page must inform the user that
        // increases require 72h before taking effect (Spelinspektionen rule
        // SIFS 2018:2 § 17).
        await expect(
          page.getByText(/72.h|72.timmar|72.hour/i).first(),
        ).toBeVisible({ timeout: 10_000 });
      },
    );

    test(
      "page exposes a Save button for the limits form",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/profil/spelgranser");
        await dismissLimitsDialog(page);

        if (page.url().includes("/login")) {
          test.skip(true, "Session expired");
          return;
        }

        await expect(
          page.getByRole("button", { name: /spara|save/i }).first(),
        ).toBeVisible({ timeout: 10_000 });
      },
    );
  });
});
