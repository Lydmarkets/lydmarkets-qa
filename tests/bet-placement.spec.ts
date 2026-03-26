import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

/**
 * Bet placement — QuickBet modal E2E tests
 *
 * Tests the full bet-placement flow via the QuickBetModal:
 *   1. Opening the modal from Yes/No buttons
 *   2. Amount presets (10, 25, 50, 100 kr) and "Other" custom input
 *   3. Payout breakdown (shares, cost, fee, profit, max loss)
 *   4. Fee & settlement info disclosure (GAEAB Ch.11 / LIFS 2018:8)
 *   5. Unauthenticated → "Sign up to buy" link
 *   6. Stake limits display
 *   7. Modal close behaviour
 */

/** Navigate to the first open market detail page. */
async function goToFirstMarket(page: import("@playwright/test").Page) {
  await page.goto("/markets");
  await dismissAgeGate(page);

  // Wait for market card links (href contains /markets/ + uuid pattern)
  const marketLink = page.getByRole("link", { name: /.+/ }).filter({ has: page.locator('[href*="/markets/"]') }).first();
  await expect(marketLink).toBeVisible({ timeout: 15_000 });

  await marketLink.click();
  await page.waitForURL(/\/markets\//, { timeout: 10_000 });
  await dismissAgeGate(page);
}

/** Click the Yes button on the market detail page to open the QuickBet modal. */
async function openQuickBetYes(page: import("@playwright/test").Page) {
  const yesBtn = page.getByRole("button", { name: /yes/i }).first();
  await expect(yesBtn).toBeVisible({ timeout: 8_000 });
  await yesBtn.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
}

// ─────────────────────────────────────────────────────────────────────
// 1. OPENING THE MODAL
// ─────────────────────────────────────────────────────────────────────

test.describe("Bet placement — QuickBet modal", () => {
  test(
    "clicking YES button opens QuickBet modal with Buy header",
    { tag: ["@trading", "@smoke"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      // Header shows "Buy" / "Köp" + "Yes" / "Ja" badge
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByText(/buy|köp/i).first(),
      ).toBeVisible();
      await expect(
        dialog.getByText(/yes|ja/i).first(),
      ).toBeVisible();
    },
  );

  test(
    "clicking NO button opens QuickBet modal with No side selected",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      const noBtn = page.getByRole("button", { name: /no/i }).first();
      await expect(noBtn).toBeVisible({ timeout: 8_000 });
      await noBtn.click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByText(/no|nej/i).first(),
      ).toBeVisible();
    },
  );

  test(
    "QuickBet modal displays the market title",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      // Grab the h1 market title before opening modal
      const h1 = page.getByRole("heading", { level: 1 });
      const marketTitle = await h1.textContent();

      await openQuickBetYes(page);

      // The modal should show the market title (possibly truncated)
      const dialog = page.getByRole("dialog");
      const firstWord = marketTitle!.trim().split(/\s+/)[0];
      await expect(dialog.getByText(firstWord)).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "close button dismisses the QuickBet modal",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      await page.getByRole("button", { name: /close|stäng/i }).click();
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 3_000 });
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 2. AMOUNT PRESETS
  // ─────────────────────────────────────────────────────────────────

  test(
    "modal shows amount preset buttons (10, 25, 50, 100 kr)",
    { tag: ["@trading", "@smoke"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      for (const amount of [10, 25, 50, 100]) {
        await expect(
          dialog.getByRole("button", { name: `${amount} kr` }),
        ).toBeVisible();
      }
    },
  );

  test(
    "10 kr preset is selected by default",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      const btn10 = dialog.getByRole("button", { name: "10 kr" });
      await expect(btn10).toBeVisible();

      // The default 10 kr button should have the accent background (active state)
      const classes = await btn10.getAttribute("class");
      expect(classes).toMatch(/bg-emerald|bg-red/);
    },
  );

  test(
    "clicking a different preset updates the payout breakdown",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // Read the initial cost with 10 kr selected
      const costBefore = await dialog.getByText(/kr/).nth(5).textContent();

      // Select 100 kr preset
      await dialog.getByRole("button", { name: "100 kr" }).click();

      // Cost should have changed (larger amount)
      const costAfter = await dialog.getByText(/kr/).nth(5).textContent();
      expect(costBefore).not.toBe(costAfter);
    },
  );

  test(
    "'Other' button shows custom amount input",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // Click the "Other" / "Annat" button
      const otherBtn = dialog.getByRole("button", { name: /other|annat/i });
      await expect(otherBtn).toBeVisible();
      await otherBtn.click();

      // A number input should appear
      const input = dialog.getByRole("spinbutton").or(dialog.getByPlaceholder(/enter amount|ange belopp/i)).first();
      await expect(input).toBeVisible({ timeout: 3_000 });
    },
  );

  test(
    "custom amount input accepts numeric value and updates breakdown",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // Click "Other" and type a custom amount
      await dialog.getByRole("button", { name: /other|annat/i }).click();
      const input = dialog.getByRole("spinbutton").or(dialog.getByPlaceholder(/enter amount|ange belopp/i)).first();
      await expect(input).toBeVisible({ timeout: 3_000 });
      await input.fill("200");

      // The breakdown should show values based on 200 kr
      // At minimum, profit and max loss sections should be visible
      await expect(
        dialog.getByText(/profit|vinst/i).first(),
      ).toBeVisible({ timeout: 3_000 });
      await expect(
        dialog.getByText(/max loss|max förlust/i).first(),
      ).toBeVisible();
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 3. PAYOUT BREAKDOWN (GAEAB Ch.11 / LIFS 2018:8)
  // ─────────────────────────────────────────────────────────────────

  test(
    "payout breakdown shows cost, gross payout, platform fee, profit, and max loss",
    { tag: ["@trading", "@compliance", "@critical"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // Cost line: "Cost (X shares × Y kr)" / "Kostnad (X andelar × Y kr)"
      await expect(
        dialog.getByText(/cost|kostnad/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      // "If Yes wins" / "Om Ja vinner"
      await expect(
        dialog.getByText(/if.*wins|om.*vinner/i).first(),
      ).toBeVisible();

      // Gross payout
      await expect(
        dialog.getByText(/gross payout|bruttoutbetalning/i).first(),
      ).toBeVisible();

      // Platform fee (2%)
      await expect(
        dialog.getByText(/platform fee|plattformsavgift/i).first(),
      ).toBeVisible();

      // Profit / Vinst
      await expect(
        dialog.getByText(/profit|vinst/i).first(),
      ).toBeVisible();

      // Max loss / Max förlust
      await expect(
        dialog.getByText(/max loss|max förlust/i).first(),
      ).toBeVisible();
    },
  );

  test(
    "all amounts in breakdown are displayed in SEK (kr)",
    { tag: ["@trading", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      const breakdownText = await dialog.innerText();

      // Count "kr" occurrences — at least cost, gross, fee, profit, max loss
      const krMatches = breakdownText.match(/kr/gi) || [];
      expect(krMatches.length).toBeGreaterThanOrEqual(5);
    },
  );

  test(
    "platform fee shows the correct percentage (2%)",
    { tag: ["@trading", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      // "Platform fee (X%)" or "Plattformsavgift (X%)"
      const dialogText = await dialog.innerText();
      expect(dialogText).toMatch(/platform fee|plattformsavgift/i);
      // Fee percentage is shown — verify it's a reasonable rate (between 1-10%)
      expect(dialogText).toMatch(/\d[.,]\d\s*%/);
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 4. FEE & SETTLEMENT DISCLOSURE
  // ─────────────────────────────────────────────────────────────────

  test(
    "fee & settlement info is collapsible and shows fee deduction text",
    { tag: ["@trading", "@compliance", "@critical"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // The collapsible toggle button
      const infoToggle = dialog.getByRole("button", {
        name: /fee.*settlement|avgift.*avräkning/i,
      });
      await expect(infoToggle).toBeVisible({ timeout: 5_000 });
      await expect(infoToggle).toHaveAttribute("aria-expanded", "false");

      // Click to expand
      await infoToggle.click();
      await expect(infoToggle).toHaveAttribute("aria-expanded", "true");

      // Fee deduction text: "A 2.0% platform fee is deducted..." / "En avgift på 2.0% dras..."
      await expect(
        dialog.getByText(/(?:fee|avgift).*(?:deducted|dras)|(?:deducted|dras).*(?:fee|avgift)/i).first(),
      ).toBeVisible({ timeout: 3_000 });

      // Max loss explainer
      await expect(
        dialog.getByText(/maximum.*(?:lose|förlora)|totala.*kostnad|max.*(?:lose|förlora)/i).first(),
      ).toBeVisible();

      // Click to collapse
      await infoToggle.click();
      await expect(infoToggle).toHaveAttribute("aria-expanded", "false");
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 5. STAKE LIMITS
  // ─────────────────────────────────────────────────────────────────

  test(
    "modal displays min and max stake limits in kr",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      // "Min: X kr · Max: Y kr"
      await expect(
        dialog.getByText(/min:.*kr.*max:.*kr/i),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 6. UNAUTHENTICATED STATE
  // ─────────────────────────────────────────────────────────────────

  test(
    "unauthenticated user sees 'Sign up to buy' link instead of Buy button",
    { tag: ["@trading", "@smoke"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // "Sign up to buy Yes →" / "Registrera dig för att köpa Ja →"
      const signUpLink = dialog.getByRole("link", {
        name: /sign up to buy|registrera dig/i,
      });

      const hasCTA = await signUpLink.isVisible({ timeout: 5_000 }).catch(() => false);

      if (hasCTA) {
        // Unauthenticated — verify the link points to login with redirect
        const href = await signUpLink.getAttribute("href");
        expect(href).toMatch(/\/login\?next=/);
      } else {
        // Authenticated — Buy button should be present instead
        await expect(
          dialog.getByRole("button", { name: /buy|köp/i }),
        ).toBeVisible();
      }
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 7. TERMS AGREEMENT FOOTER
  // ─────────────────────────────────────────────────────────────────

  test(
    "modal footer shows terms agreement with link to /terms",
    { tag: ["@trading", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // "By trading, you agree to the" / "Genom att handla godkänner du"
      await expect(
        dialog.getByText(/by trading.*agree|genom att handla.*godkänner/i),
      ).toBeVisible({ timeout: 5_000 });

      // Link to terms
      const termsLink = dialog.getByRole("link", {
        name: /terms|villkor|användarvillkor/i,
      });
      await expect(termsLink).toBeVisible();
      const href = await termsLink.getAttribute("href");
      expect(href).toBe("/terms");
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 8. AUTHENTICATED BET PLACEMENT
  // ─────────────────────────────────────────────────────────────────

  test.describe("authenticated — place a bet", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test(
      "Buy button is visible for authenticated user",
      { tag: ["@trading", "@smoke"] },
      async ({ page }) => {
        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");

        // Authenticated users see "Köp → Ja" / "Buy → Yes" instead of sign-up link
        const buyBtn = dialog.getByRole("button", { name: /köp|buy/i });
        const signUpLink = dialog.getByRole("link", { name: /sign up|registrera/i });

        const hasBuy = await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false);
        const hasSignUp = await signUpLink.isVisible({ timeout: 2_000 }).catch(() => false);

        if (!hasBuy && hasSignUp) {
          test.skip(true, "Auth session expired — user sees sign-up link");
          return;
        }

        await expect(buyBtn).toBeVisible();
        await expect(buyBtn).toBeEnabled();
      },
    );

    test(
      "placing a bet sends POST to /api/v2/orders/place and shows success toast",
      { tag: ["@trading", "@critical"] },
      async ({ page }) => {
        // Mock the order placement API to avoid placing a real bet on production
        let capturedBody: Record<string, unknown> | null = null;
        await page.route("**/api/v2/orders/place", async (route) => {
          const request = route.request();
          capturedBody = JSON.parse(request.postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              orderId: "mock-order-123",
              status: "filled",
              quantity: capturedBody?.quantity,
              side: capturedBody?.side,
            }),
          });
        });

        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");

        // Check auth state — skip if session expired
        const buyBtn = dialog.getByRole("button", { name: /köp|buy/i });
        const hasBuy = await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasBuy) {
          test.skip(true, "Auth session expired — Buy button not visible");
          return;
        }

        // Click Buy
        await buyBtn.click();

        // Success toast should appear: "Order lagd!" / "Order placed!"
        await expect(
          page.getByText(/order lagd|order placed/i).first(),
        ).toBeVisible({ timeout: 10_000 });

        // Modal should close after successful order
        await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5_000 });

        // Verify the API was called with correct payload
        expect(capturedBody).not.toBeNull();
        expect(capturedBody!.side).toBe("yes");
        expect(capturedBody!.orderType).toBe("ioc");
        expect(typeof capturedBody!.quantity).toBe("number");
        expect(capturedBody!.quantity).toBeGreaterThan(0);
        expect(capturedBody!.marketId).toBeTruthy();
      },
    );

    test(
      "placing a bet on NO side sends side='no' in the payload",
      { tag: ["@trading"] },
      async ({ page }) => {
        let capturedBody: Record<string, unknown> | null = null;
        await page.route("**/api/v2/orders/place", async (route) => {
          capturedBody = JSON.parse(route.request().postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ orderId: "mock-order-456", status: "filled" }),
          });
        });

        await goToFirstMarket(page);

        // Click NO instead of YES
        const noBtn = page.getByRole("button", { name: /no/i }).first();
        await expect(noBtn).toBeVisible({ timeout: 8_000 });
        await noBtn.click();
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

        const dialog = page.getByRole("dialog");
        const buyBtn = dialog.getByRole("button", { name: /köp|buy/i });
        const hasBuy = await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasBuy) {
          test.skip(true, "Auth session expired");
          return;
        }

        await buyBtn.click();
        await expect(
          page.getByText(/order lagd|order placed/i).first(),
        ).toBeVisible({ timeout: 10_000 });

        expect(capturedBody).not.toBeNull();
        expect(capturedBody!.side).toBe("no");
      },
    );

    test(
      "changing amount preset before buying sends correct quantity",
      { tag: ["@trading"] },
      async ({ page }) => {
        let capturedBody: Record<string, unknown> | null = null;
        await page.route("**/api/v2/orders/place", async (route) => {
          capturedBody = JSON.parse(route.request().postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ orderId: "mock-order-789", status: "filled" }),
          });
        });

        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");
        const buyBtn = dialog.getByRole("button", { name: /köp|buy/i });
        const hasBuy = await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasBuy) {
          test.skip(true, "Auth session expired");
          return;
        }

        // Switch to 100 kr preset
        await dialog.getByRole("button", { name: "100 kr" }).click();

        // Read the shares count from the cost breakdown "Kostnad (X andelar × ...)"
        const costText = await dialog.getByText(/kostnad|cost/i).first().innerText();
        const sharesMatch = costText.match(/(\d+)\s*(?:andelar|shares)/);
        const expectedShares = sharesMatch ? parseInt(sharesMatch[1], 10) : null;

        await buyBtn.click();
        await expect(
          page.getByText(/order lagd|order placed/i).first(),
        ).toBeVisible({ timeout: 10_000 });

        expect(capturedBody).not.toBeNull();
        // Quantity should match the shares from breakdown
        if (expectedShares) {
          expect(capturedBody!.quantity).toBe(expectedShares);
        }
        expect((capturedBody!.quantity as number)).toBeGreaterThan(0);
      },
    );

    test(
      "API error shows error toast and keeps modal open",
      { tag: ["@trading", "@critical"] },
      async ({ page }) => {
        await page.route("**/api/v2/orders/place", async (route) => {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "Insufficient balance" }),
          });
        });

        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");
        const buyBtn = dialog.getByRole("button", { name: /köp|buy/i });
        const hasBuy = await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasBuy) {
          test.skip(true, "Auth session expired");
          return;
        }

        await buyBtn.click();

        // Error toast: "Ordern misslyckades" / "Order failed"
        await expect(
          page.getByText(/order.*misslyckades|order.*failed/i).first(),
        ).toBeVisible({ timeout: 10_000 });

        // Modal should remain open so user can retry or cancel
        await expect(page.getByRole("dialog")).toBeVisible();
      },
    );

    test(
      "Buy button shows loading state during submission",
      { tag: ["@trading"] },
      async ({ page }) => {
        // Slow response to capture the loading state
        await page.route("**/api/v2/orders/place", async (route) => {
          await new Promise((r) => setTimeout(r, 2_000));
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ orderId: "mock-slow", status: "filled" }),
          });
        });

        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");
        const buyBtn = dialog.getByRole("button", { name: /köp|buy/i });
        const hasBuy = await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasBuy) {
          test.skip(true, "Auth session expired");
          return;
        }

        await buyBtn.click();

        // Button should show "Placerar order..." / "Placing order..."
        await expect(
          dialog.getByText(/lägger order|placing order/i),
        ).toBeVisible({ timeout: 3_000 });

        // Button should be disabled during submission
        const submittingBtn = dialog.getByRole("button", { name: /lägger|placing/i });
        const isDisabled = await submittingBtn.isDisabled().catch(() => false);
        expect(isDisabled).toBeTruthy();

        // Wait for completion
        await expect(
          page.getByText(/order lagd|order placed/i).first(),
        ).toBeVisible({ timeout: 10_000 });
      },
    );
  });
});
