import { test, expect } from "../fixtures/base";

// The header drops the inline auth links + theme/lang toggles into a single
// "Open menu" drawer (`<aside aria-label="Open menu">`). The unauthenticated
// build always exposes:
//
//   - Sign in / Sign up links pointing at /login and /register
//   - Theme + Language toggle buttons
//   - "TRANSFERS" group with Deposit / Withdrawal / Transaction History
//   - "RESPONSIBLE GAMBLING" group with Self-test / Limits / Self-exclusion
//
// If any of these disappear unintentionally a user has no path to BankID
// sign-in or to the RG tooling, so the drawer's contract is load-bearing.

test.describe("Header — Open-menu drawer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: /open menu/i }).click();
  });

  test("drawer surfaces Sign in + Sign up links to the auth pages", async ({ page }) => {
    const drawer = page.getByRole("complementary", { name: /open menu/i });
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

  test("drawer exposes Theme and Language toggles", async ({ page }) => {
    const drawer = page.getByRole("complementary", { name: /open menu/i });
    await expect(drawer.getByRole("button", { name: /^theme/i })).toBeVisible();
    await expect(drawer.getByRole("button", { name: /^language/i })).toBeVisible();
  });

  test("Transfers group lists Deposit / Withdrawal / Transaction History", async ({
    page,
  }) => {
    const drawer = page.getByRole("complementary", { name: /open menu/i });
    await expect(drawer.getByText(/^transfers$/i)).toBeVisible();
    await expect(drawer.getByRole("link", { name: /^deposit$/i })).toHaveAttribute(
      "href",
      "/wallet/deposit"
    );
    await expect(drawer.getByRole("link", { name: /^withdrawal$/i })).toHaveAttribute(
      "href",
      "/wallet/withdraw"
    );
    await expect(
      drawer.getByRole("link", { name: /^transaction history$/i })
    ).toHaveAttribute("href", "/wallet/transactions");
  });

  test("Responsible-gambling group covers Self-test / Limits / Self-exclusion", async ({
    page,
  }) => {
    const drawer = page.getByRole("complementary", { name: /open menu/i });
    await expect(drawer.getByText(/^responsible gambling$/i)).toBeVisible();

    // Self-test deep-links to Stödlinjen's PGSI test.
    await expect(
      drawer.getByRole("link", { name: /^self.?test$/i })
    ).toHaveAttribute("href", /stodlinjen\.se/);
    await expect(drawer.getByRole("link", { name: /^limits$/i })).toHaveAttribute(
      "href",
      "/settings/limits"
    );
    await expect(
      drawer.getByRole("link", { name: /^self.?exclusion$/i })
    ).toHaveAttribute("href", "/self-exclusion");
  });
});
