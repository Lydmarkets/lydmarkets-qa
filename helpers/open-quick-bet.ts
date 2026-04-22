import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { dismissLimitsDialog } from "./dismiss-limits-dialog";

/**
 * Open the QuickBet modal from the home page (works on every viewport).
 *
 * Why not use the market-detail page? After SCRUM-1081 / the markets-mobile
 * commit, the desktop market-detail layout (>=1024px) hides the QuickBet
 * modal entirely — the inline `TradePanel` side-rail is the desktop trade
 * surface, and the StatBand JA/NEJ price cells are explicitly
 * `lg:pointer-events-none`. Playwright's default 1280×720 viewport hits
 * that breakpoint, so QuickBet tests using the detail page never see a
 * dialog.
 *
 * The home FeaturedMarketsGrid card always opens the QuickBetModal
 * regardless of viewport when the YesNoBar JA / NEJ segment is clicked.
 *
 * Scans featured cards, skips any with a 0% side (no breakdown possible),
 * and clicks the requested side. The market id of the chosen card is
 * returned so callers can assert on the modal title.
 */
export async function openQuickBetFromHome(
  page: Page,
  side: "yes" | "no" = "yes",
): Promise<{ marketId: string | null; marketTitle: string }> {
  await page.goto("/");
  await dismissLimitsDialog(page);

  const cards = page.getByTestId("featured-market-card");
  await cards.first().waitFor({ state: "visible", timeout: 15_000 });
  const count = await cards.count();

  // The YesNoBar buttons render with aria-label "Ja {n}%" / "Yes {n}%".
  const yesPattern = /^(yes|ja)\s*\d+%$/i;
  const noPattern = /^(no|nej)\s*\d+%$/i;

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const yesBtn = card.getByRole("button", { name: yesPattern }).first();
    const noBtn = card.getByRole("button", { name: noPattern }).first();

    // Skip 0% sides — they can't render a breakdown.
    const yesText = (await yesBtn.getAttribute("aria-label")) ?? "";
    const noText = (await noBtn.getAttribute("aria-label")) ?? "";
    const yesPct = parseInt(yesText.match(/(\d+)/)?.[1] ?? "0", 10);
    const noPct = parseInt(noText.match(/(\d+)/)?.[1] ?? "0", 10);
    if (yesPct === 0 || noPct === 0) continue;

    const target = side === "yes" ? yesBtn : noBtn;
    const marketId = await card.getAttribute("data-market-id");
    const marketTitle =
      (await card.locator("a[aria-label]").first().getAttribute("aria-label")) ??
      "";

    await target.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    return { marketId, marketTitle };
  }

  throw new Error(
    "openQuickBetFromHome: no featured card has a non-zero {yes,no} pair",
  );
}
