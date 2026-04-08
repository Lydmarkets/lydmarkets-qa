import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { hasAuthSession } from "../helpers/has-auth";

test.describe("Compliance — auth redirects", () => {
  // ── Authenticated user redirect from /login ────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(({}, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
    });

    test(
      "authenticated user hitting /login is redirected away",
      { tag: ["@compliance", "@regression"] },
      async ({ page }) => {
        await page.goto("/login");
        await dismissLimitsDialog(page);

        // Should redirect to homepage or dashboard — NOT stay on /login
        await page.waitForURL(/^(?!.*\/login)/, { timeout: 10_000 });
        expect(page.url()).not.toMatch(/\/login/);
      },
    );
  });
});
