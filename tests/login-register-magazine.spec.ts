import { test, expect } from "../fixtures/base";

// /login + /register share a magazine-style "About Lydmarkets" sidebar:
//   - issue/date label "NO. <n> · <MONTH YYYY>"
//   - editorial pull-quote on price/conviction
//   - three live stats: ACTIVE MARKETS, TRADERS, VOLUME (7D)
//
// The sidebar is the visual hook of the auth pages — if it disappears the
// pages collapse to a thin form, which is what the regression guards.

const AUTH_PAGES: Array<{ path: string; eyebrow: RegExp }> = [
  { path: "/login", eyebrow: /^sign in$/i },
  { path: "/register", eyebrow: /^open account$/i },
];

test.describe("Auth pages — magazine sidebar", () => {
  for (const { path, eyebrow } of AUTH_PAGES) {
    test(`${path} renders the About Lydmarkets sidebar with stats`, async ({
      page,
    }) => {
      await page.goto(path);

      const aside = page.getByRole("complementary", { name: /about lydmarkets/i });
      await expect(aside).toBeVisible({ timeout: 10_000 });

      // Issue label "NO. <n> · <MONTH> <YYYY>".
      await expect(aside.getByText(/^no\.\s*\d+\s*·\s*[a-z]+\s+\d{4}$/i)).toBeVisible();

      for (const label of [/active markets/i, /^traders$/i, /volume \(7d\)/i]) {
        await expect(aside.getByText(label).first()).toBeVisible();
      }
    });

    test(`${path} renders the form region with the matching eyebrow`, async ({
      page,
    }) => {
      await page.goto(path);
      // Eyebrow text "SIGN IN" / "OPEN ACCOUNT" sits above the H1.
      await expect(page.getByText(eyebrow).first()).toBeVisible({
        timeout: 10_000,
      });
      // The page H1 is always rendered (marketing copy varies between builds).
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("/login form region has both BankID buttons", async ({ page }) => {
    await page.goto("/login");
    const form = page.getByRole("region", { name: /sign-in form/i });
    await expect(form).toBeVisible({ timeout: 10_000 });

    await expect(
      form.getByRole("button", { name: /bankid on this computer/i })
    ).toBeVisible();
    await expect(form.getByRole("button", { name: /mobile bankid/i })).toBeVisible();
  });

  test("/register form region announces a 2-step flow", async ({ page }) => {
    await page.goto("/register");
    const form = page.getByRole("region", { name: /registration form/i });
    await expect(form).toBeVisible({ timeout: 10_000 });

    await expect(form.getByText(/step 1 of 2|steg 1 av 2/i)).toBeVisible();
    await expect(form.getByRole("button", { name: /start bankid/i })).toBeVisible();
  });
});
