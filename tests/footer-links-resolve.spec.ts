import { test, expect } from "../fixtures/base";

// Footer link resolution.
//
// The footer ships five canonical links on every public page:
//   How it works · Fees · Rules · 18+ Responsible gambling · Contact
//
// During a layout pass it's easy to leave a link pointing at a path that's
// since been renamed or removed (regression guard for /fees and /contact,
// both of which have shipped to production with broken hrefs in the past).
// We assert each href returns 200 by following the link with a request-only
// fetch — keeping the assertion fast and independent of locale routing.

const FOOTER_LABELS = [
  /how it works/i,
  /^fees$/i,
  /^rules$/i,
  /18\+\s+responsible gambling/i,
  /^contact$/i,
];

test.describe("Footer — canonical links resolve", () => {
  for (const label of FOOTER_LABELS) {
    test(`footer link ${label} returns HTTP 200`, async ({ page, request }) => {
      await page.goto("/");
      const footer = page.getByRole("contentinfo");
      const link = footer.getByRole("link", { name: label }).first();
      await expect(link).toBeVisible({ timeout: 10_000 });

      // `getAttribute("href")` may return a relative path; the request
      // fixture rejects those, so resolve through the DOM's `href` property
      // to get an absolute URL regardless of how the page authored the link.
      const href = await link.evaluate((el) => (el as HTMLAnchorElement).href);
      expect(href).toMatch(/^https?:\/\//);

      const response = await request.get(href);
      expect(
        response.status(),
        `${label} pointed at ${href}, expected 200, got ${response.status()}`
      ).toBe(200);
    });
  }
});
