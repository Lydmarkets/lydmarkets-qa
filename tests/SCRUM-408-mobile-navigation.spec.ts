import { test, expect } from "../fixtures/base";
import { isAuthenticated } from "../helpers/is-authenticated";

const MOBILE_VIEWPORT = { width: 393, height: 851 };

/**
 * Mobile navigation uses a BottomNav (below lg breakpoint):
 * - 4 tabs: Markets, My Bets, Wallet, More
 * - "More" opens a sheet drawer with secondary items
 * - Unauthenticated: header shows Sign in / Sign up inline (no hamburger)
 * - Authenticated: header shows Logo + Balance + Session Timer
 */
test.describe("SCRUM-408: Mobile navigation — unauthenticated", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("unauthenticated mobile header shows Sign in and Sign up inline", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /sign in|logga in/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("link", { name: /sign up|registrera/i }).first()
    ).toBeVisible();
  });

  test("bottom nav shows Markets, My Bets, Wallet, More tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("link", { name: /markets|marknader/i }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: /my bets|mina spel/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /wallet|plånbok/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "More", exact: true })).toBeVisible();
  });

  test("My Bets tab navigates to /portfolio", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: /my bets|mina spel/i }).click();
    // Protected route — either navigates to portfolio or redirects to login
    await page.waitForURL(/\/(portfolio|login)/, { timeout: 10_000 });
  });
});

test.describe("SCRUM-408: Mobile navigation — authenticated drawer", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    storageState: "playwright/.auth/user.json",
  });

  test("More button opens a drawer with secondary nav items", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    const moreBtn = page.getByRole("button", { name: "More", exact: true });
    await expect(moreBtn).toBeVisible({ timeout: 5_000 });
    await moreBtn.click();

    // Drawer should show Watchlist, Settings links
    await expect(
      page.getByRole("link", { name: /watchlist|bevakningslista/i })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("link", { name: /settings|inställningar/i })
    ).toBeVisible();
  });

  test("More drawer shows theme and language toggles", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page.getByRole("button", { name: "More", exact: true }).click();

    // Theme toggle — aria-label varies by current theme
    await expect(
      page.getByRole("button", { name: /toggle|dark|light|tema/i }).last()
    ).toBeVisible({ timeout: 5_000 });
    // Language toggle
    await expect(
      page.getByRole("button", { name: /switch to|byt till|english|svenska/i }).last()
    ).toBeVisible();
  });

  test("More drawer has a Logout button", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page.getByRole("button", { name: "More", exact: true }).click();

    await expect(
      page.getByRole("button", { name: /log ?out|logga ut/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Settings link in drawer navigates to /settings", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    const moreBtn = page.getByRole("button", { name: "More", exact: true });
    await expect(moreBtn).toBeVisible({ timeout: 5_000 });
    await moreBtn.click();

    const settingsLink = page.getByRole("link", { name: /settings|inställningar/i });
    await expect(settingsLink).toBeVisible({ timeout: 5_000 });
    await settingsLink.click();
    await page.waitForURL(/\/settings/, { timeout: 10_000 });
  });
});
