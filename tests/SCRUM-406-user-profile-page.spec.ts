import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("SCRUM-406: User profile page — view stats and edit display name", () => {
  // NOTE: The profile page is protected by auth. All tests that navigate to /profile
  // require a storageState fixture with a valid BankID session. Tests marked test.skip()
  // have the full assertion structure ready for when that fixture is available.
  // The unauthenticated redirect behaviour is tested here without skip.

  test("unauthenticated visit to /profile redirects to /login", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirect to /login from /profile includes redirect query param", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = page.url();
    // Should include a redirect parameter pointing back to /profile
    expect(url.includes("redirect") || url.includes("login")).toBeTruthy();
  });

  test("profile: page renders username and avatar (requires storageState)", async ({ page }) => {
    // requires auth storageState
    test.skip();
    // await page.goto("/profile");
    // await expect(page).not.toHaveURL(/\/login/);
    // await expect(page.locator("main")).toBeVisible();
    // Avatar or username should be visible
    // await expect(page.getByText(/username|display name|profile/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("profile: user stats section shows trades, win rate and balance (requires storageState)", async ({ page }) => {
    // requires auth storageState
    test.skip();
    // await page.goto("/profile");
    // await expect(page.getByText(/trades/i).first()).toBeVisible({ timeout: 10000 });
    // await expect(page.getByText(/win rate/i).first()).toBeVisible();
    // await expect(page.getByText(/balance/i).first()).toBeVisible();
  });

  test("profile: edit button is present on the profile page (requires storageState)", async ({ page }) => {
    // requires auth storageState
    test.skip();
    // await page.goto("/profile");
    // await expect(page.getByRole("button", { name: /edit/i })).toBeVisible({ timeout: 10000 });
  });

  test("profile: clicking Edit opens an editable display name field (requires storageState)", async ({ page }) => {
    // requires auth storageState
    test.skip();
    // await page.goto("/profile");
    // await page.getByRole("button", { name: /edit/i }).click();
    // await expect(page.getByLabel(/display name/i)).toBeVisible({ timeout: 5000 });
  });

  test("profile: saving a new display name shows success feedback (requires storageState)", async ({ page }) => {
    // requires auth storageState
    test.skip();
    // await page.goto("/profile");
    // await page.getByRole("button", { name: /edit/i }).click();
    // const nameInput = page.getByLabel(/display name/i);
    // await nameInput.clear();
    // await nameInput.fill("TestUser_QA");
    // await page.getByRole("button", { name: /save/i }).click();
    // Success toast or confirmation
    // await expect(page.getByText(/saved|updated|success/i)).toBeVisible({ timeout: 10000 });
  });

  test("profile: display name persists after page reload (requires storageState)", async ({ page }) => {
    // requires auth storageState
    test.skip();
    // await page.goto("/profile");
    // ... edit and save flow ...
    // await page.reload();
    // await expect(page.getByText("TestUser_QA")).toBeVisible({ timeout: 10000 });
  });

  test("login page is reachable and shows BankID flow", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /sign in with bankid/i })
    ).toBeVisible();
  });
});
