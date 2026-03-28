import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";

test.describe("SCRUM-539: Min/max stake display on order panel", () => {
  test(
    "order dialog shows min/max stake text when Buy Yes is clicked",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      // Click the first "Buy Yes" button to open the order dialog
      const buyYesBtn = page.getByRole("button", { name: /buy yes/i }).first();
      await expect(buyYesBtn).toBeVisible({ timeout: 10_000 });
      await buyYesBtn.click();

      // Verify the order dialog opens
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Verify min/max stake text is displayed
      await expect(dialog.getByText(/min:\s*\d/i)).toBeVisible({ timeout: 5_000 });
      await expect(dialog.getByText(/max:\s*[\d.,]/i)).toBeVisible();
    },
  );

  test(
    "order dialog shows min/max stake text when Buy No is clicked",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      const buyNoBtn = page.getByRole("button", { name: /buy no/i }).first();
      await expect(buyNoBtn).toBeVisible({ timeout: 10_000 });
      await buyNoBtn.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      await expect(dialog.getByText(/min:\s*\d/i)).toBeVisible({ timeout: 5_000 });
      await expect(dialog.getByText(/max:\s*[\d.,]/i)).toBeVisible();
    },
  );

  test(
    "order dialog shows preset amount buttons",
    { tag: ["@regression"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      const buyYesBtn = page.getByRole("button", { name: /buy yes/i }).first();
      await expect(buyYesBtn).toBeVisible({ timeout: 10_000 });
      await buyYesBtn.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Preset amount buttons should be visible
      await expect(dialog.getByRole("button", { name: /10 kr/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /25 kr/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /50 kr/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /100 kr/i })).toBeVisible();
    },
  );

  test(
    "order dialog shows cost breakdown and profit estimate",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      const buyYesBtn = page.getByRole("button", { name: /buy yes/i }).first();
      await expect(buyYesBtn).toBeVisible({ timeout: 10_000 });
      await buyYesBtn.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Cost and profit details should be displayed
      await expect(dialog.getByText(/kostnad|cost/i)).toBeVisible({ timeout: 5_000 });
      await expect(dialog.getByText(/vinst|profit/i)).toBeVisible();
      await expect(dialog.getByText(/max förlust|max loss/i)).toBeVisible();
    },
  );
});
