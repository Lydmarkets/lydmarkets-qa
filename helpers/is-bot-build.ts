/**
 * True when the suite is pointed at the web-bot legislation build, which is a
 * play-money demo with every real-world Swedish compliance entity scrubbed
 * (Stödlinjen → "Chatterly", Spelpaus → "Bot Spelpaus", org number → "—") and
 * prices in € rather than kr.
 *
 * Gate build-specific assertions with `test.skip(IS_BOT_BUILD, "...")` so they
 * still run against staging via `BASE_URL=...staging...`.
 */
export const IS_BOT_BUILD =
  !!process.env.BOT_BUILD ||
  !process.env.BASE_URL ||
  /web-bot/.test(process.env.BASE_URL ?? "");
