import { test, expect } from "../fixtures/base";
import { IS_BOT_BUILD } from "../helpers/is-bot-build";
import { openUserMenu, getUserMenuDrawer } from "../helpers/user-menu";

// The header drops the inline auth links + theme toggle into a single
// "Open menu" drawer (`<aside aria-label="Open menu">`). The unauthenticated
// build always exposes:
//
//   - Sign in / Sign up links pointing at /login and /register
//   - Theme toggle button
//   - "TRANSFERS" group with Deposit / Withdrawal / Transaction History
//   - "RESPONSIBLE GAMBLING" group with Self-exclusion
//
// If any of these disappear unintentionally a user has no path to BankID
// sign-in or to the RG tooling, so the drawer's contract is load-bearing.

test.describe("Header — Open-menu drawer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await openUserMenu(page);
  });

  test("drawer surfaces Sign in + Sign up links to the auth pages", async ({ page }) => {
    const drawer = getUserMenuDrawer(page);
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    await expect(drawer.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      /\/login$/
    );
    await expect(drawer.getByRole("link", { name: /^sign up$/i })).toHaveAttribute(
      "href",
      /\/register$/
    );
  });

  test("drawer exposes the Theme toggle", async ({ page }) => {
    const drawer = getUserMenuDrawer(page);
    await expect(drawer.getByRole("button", { name: /^theme|^tema/i })).toBeVisible();
  });

  // The Language toggle was dropped from the drawer on the English-only bot
  // build. Still asserted on the bilingual staging build.
  test("drawer exposes the Language toggle", async ({ page }) => {
    test.skip(IS_BOT_BUILD, "English-only bot build ships no language toggle");
    const drawer = getUserMenuDrawer(page);
    await expect(drawer.getByRole("button", { name: /^language|^språk/i })).toBeVisible();
  });

  test("Transfers group lists Deposit / Withdrawal / Transaction History", async ({
    page,
  }) => {
    const drawer = getUserMenuDrawer(page);
    // Hrefs carry the active locale prefix on this build (e.g.
    // `/en/wallet/deposit`), so match the path suffix rather than an exact
    // string.
    await expect(drawer.getByText(/^transfers$/i)).toBeVisible();
    await expect(drawer.getByRole("link", { name: /^deposit$/i })).toHaveAttribute(
      "href",
      /\/wallet\/deposit$/
    );
    await expect(drawer.getByRole("link", { name: /^withdrawal$/i })).toHaveAttribute(
      "href",
      /\/wallet\/withdraw$/
    );
    await expect(
      drawer.getByRole("link", { name: /^transaction history$/i })
    ).toHaveAttribute("href", /\/wallet\/transactions$/);
  });

  test("Responsible-gambling group covers Self-exclusion", async ({ page }) => {
    const drawer = getUserMenuDrawer(page);
    await expect(drawer.getByText(/^responsible gambling$/i)).toBeVisible();

    // Internal links carry the active locale prefix (e.g. `/en/self-exclusion`)
    // on this build, so match the path suffix rather than an exact string.
    await expect(
      drawer.getByRole("link", { name: /^self.?exclusion$/i })
    ).toHaveAttribute("href", /\/self-exclusion$/);
  });

  // The bot build's RG drawer group was reduced to Self-exclusion only; the
  // Stödlinjen PGSI self-test deep-link and the Limits shortcut were dropped
  // along with the rest of its real-world compliance references.
  test("Responsible-gambling group also covers Self-test / Limits", async ({ page }) => {
    test.skip(IS_BOT_BUILD, "Bot build's RG drawer group is Self-exclusion only");
    const drawer = getUserMenuDrawer(page);

    // Self-test deep-links to Stödlinjen's PGSI test.
    await expect(
      drawer.getByRole("link", { name: /^self.?test$/i })
    ).toHaveAttribute("href", /stodlinjen\.se/);
    await expect(drawer.getByRole("link", { name: /^limits$/i }).first()).toHaveAttribute(
      "href",
      /\/limits$/
    );
  });
});
