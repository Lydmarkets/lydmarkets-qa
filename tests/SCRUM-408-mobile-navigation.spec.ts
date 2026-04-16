import { test, expect } from "../fixtures/base";
import { isAuthenticated } from "../helpers/is-authenticated";

const MOBILE_VIEWPORT = { width: 393, height: 851 };

// Mobile navigation uses a BottomNav (below lg breakpoint) that renders for
// both anonymous and authenticated visitors. It has 4 entries:
//   - Marknader / Markets -> /markets
//   - Sök / Search -> opens search overlay
//   - Mina positioner / My Positions -> /portfolio
//   - Mer / More -> opens the right-side sheet drawer
//
// Drawer content (anonymous): Settings link, theme toggle, language toggle,
// Responsible Gambling link. Close button dismisses it.
// Drawer content (authenticated): all of the above plus a Logout button.
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

  test("unauthenticated mobile home renders the BottomNav with Marknader/Mer", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
    const bottomNav = page.locator("nav.fixed.inset-x-0.bottom-0").first();
    await expect(bottomNav).toBeVisible({ timeout: 10_000 });
    await expect(
      bottomNav.getByRole("link", { name: /marknader|markets/i })
    ).toBeVisible();
    await expect(
      bottomNav.getByRole("button", { name: /^mer$|^more$/i })
    ).toBeVisible();
  });

  test("Mer / More button opens a drawer with Settings and Responsible Gambling", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^mer$|^more$/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(
      dialog.getByRole("link", { name: /inställningar|settings/i })
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: /ansvarsfullt spelande|responsible gambling/i })
    ).toBeVisible();
  });
});

test.describe("SCRUM-408: Mobile navigation — authenticated drawer", () => {
  test.use({
    viewport: MOBILE_VIEWPORT,
    storageState: "playwright/.auth/user.json",
  });

  test("Mer / More button opens a drawer with Settings", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    const moreBtn = page.getByRole("button", { name: /^mer$|^more$/i });
    await expect(moreBtn).toBeVisible({ timeout: 5_000 });
    await moreBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(
      dialog.getByRole("link", { name: /settings|inställningar/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("More drawer shows theme and language toggles", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page.getByRole("button", { name: /^mer$|^more$/i }).click();
    const dialog = page.getByRole("dialog");

    // Theme toggle — aria-label is "Switch to light/dark mode" (or Swedish).
    await expect(
      dialog.getByRole("button", {
        name: /switch to (light|dark) mode|byt till (ljust|mörkt) läge/i,
      })
    ).toBeVisible({ timeout: 5_000 });
    // Language toggle — English label "Switch to Swedish" or Swedish label
    // "Byt till engelska".
    await expect(
      dialog.getByRole("button", {
        name: /switch to (swedish|english)|byt till (svenska|engelska)/i,
      })
    ).toBeVisible();
  });

  test("More drawer has a Logout button", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    await page.getByRole("button", { name: /^mer$|^more$/i }).click();
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("button", { name: /log ?out|logga ut/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Settings link in drawer navigates to /settings", async ({ page }) => {
    await page.goto("/");
    if (!(await isAuthenticated(page))) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    const moreBtn = page.getByRole("button", { name: /^mer$|^more$/i });
    await expect(moreBtn).toBeVisible({ timeout: 5_000 });
    await moreBtn.click();

    const dialog = page.getByRole("dialog");
    const settingsLink = dialog.getByRole("link", { name: /settings|inställningar/i });
    await expect(settingsLink).toBeVisible({ timeout: 5_000 });
    await settingsLink.click();
    await page.waitForURL(/\/settings/, { timeout: 10_000 });
  });
});
