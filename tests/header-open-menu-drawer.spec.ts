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
// A play-money build (bot) has no cash rail and no self-exclusion surface:
// Transfers keeps only Transaction History, and the RG group links to the
// static /responsible-gambling page instead (SCRUM-2271 / SCRUM-2293).
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

  // A single-language build must not advertise a language switch it cannot
  // honour. The bilingual build ships one; the English-only bot build must not.
  test("drawer's language toggle matches the build's locale support", async ({ page }) => {
    const drawer = getUserMenuDrawer(page);
    const languageToggle = drawer.getByRole("button", { name: /^language|^språk/i });
    await expect(languageToggle).toHaveCount(IS_BOT_BUILD ? 0 : 1);
  });

  test("Transfers group lists Deposit / Withdrawal / Transaction History (history only on play money)", async ({
    page,
  }) => {
    const drawer = getUserMenuDrawer(page);
    // Hrefs carry the active locale prefix on this build (e.g.
    // `/en/wallet/deposit`), so match the path suffix rather than an exact
    // string.
    await expect(drawer.getByText(/^transfers$/i)).toBeVisible();
    if (IS_BOT_BUILD) {
      await expect(drawer.getByRole("link", { name: /^deposit$|^withdrawal$/i })).toHaveCount(0);
      await expect(
        drawer.getByRole("link", { name: /^transaction history$/i })
      ).toHaveAttribute("href", /\/wallet\/transactions$/);
      return;
    }
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

  test("Responsible-gambling group covers Self-exclusion (RG page on play money)", async ({ page }) => {
    const drawer = getUserMenuDrawer(page);
    await expect(drawer.getByText(/^responsible gambling$/i).first()).toBeVisible();

    if (IS_BOT_BUILD) {
      await expect(drawer.getByRole("link", { name: /^self.?exclusion$/i })).toHaveCount(0);
      await expect(
        drawer.getByRole("link", { name: /^responsible gambling$/i })
      ).toHaveAttribute("href", /\/responsible-gambling$/);
      return;
    }

    // Internal links carry the active locale prefix (e.g. `/en/self-exclusion`)
    // on this build, so match the path suffix rather than an exact string.
    await expect(
      drawer.getByRole("link", { name: /^self.?exclusion$/i })
    ).toHaveAttribute("href", /\/self-exclusion$/);
  });

  // The bot build's RG drawer group was reduced to Self-exclusion only; the
  // Stödlinjen PGSI self-test deep-link and the Limits shortcut were dropped
  // along with the rest of its real-world compliance references. /limits itself
  // 404s on this build, so the drawer must NOT offer it — a dead RG link is
  // worse than a missing one.
  test("Responsible-gambling group offers no dead links", async ({ page }) => {
    const drawer = getUserMenuDrawer(page);

    const selfTest = drawer.getByRole("link", { name: /^self.?test$/i });
    const limits = drawer.getByRole("link", { name: /^limits$/i });

    if (IS_BOT_BUILD) {
      await expect(selfTest).toHaveCount(0);
      await expect(limits).toHaveCount(0);
    } else {
      // Self-test deep-links to Stödlinjen's PGSI test.
      await expect(selfTest).toHaveAttribute("href", /stodlinjen\.se/);
      await expect(limits.first()).toHaveAttribute("href", /\/limits$/);
    }
  });

  // Every internal drawer link must resolve — the drawer is the only path to
  // the auth pages and the RG tooling, so a 404 in here strands the user.
  test("every internal drawer link resolves", async ({ page, baseURL }) => {
    const drawer = getUserMenuDrawer(page);
    const hrefs = await drawer
      .getByRole("link")
      .evaluateAll((els) =>
        els
          .map((e) => e.getAttribute("href"))
          .filter((h): h is string => !!h && h.startsWith("/")),
      );
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of [...new Set(hrefs)]) {
      // Plain fetch, NOT Playwright's `request` fixture — APIRequestContext is
      // broken under Bun (see auth.setup.ts). Guest links are expected to bounce
      // to /login, which is a 3xx/200, not a dead link.
      const res = await fetch(new URL(href, baseURL!), {
        signal: AbortSignal.timeout(30_000),
      });
      expect(res.status, `${href} should not be a dead link`).toBeLessThan(400);
    }
  });
});
