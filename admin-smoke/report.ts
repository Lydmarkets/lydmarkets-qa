/**
 * Step 3 (optional) — distil crawl-results.json down to real HTTP errors.
 *
 * Strips the benign `net::ERR_ABORTED` RSC-prefetch noise and groups the
 * remaining 4xx/5xx responses by status + path, listing which pages triggered
 * each. This is the signal worth acting on.
 *
 *   bun admin-smoke/report.ts
 */
import { readFileSync } from "node:fs";

interface RouteResult {
  route: string;
  failedRequests: string[];
}

const data = JSON.parse(
  readFileSync(`${import.meta.dir}/crawl-results.json`, "utf8"),
) as RouteResult[];

const real = new Map<string, Set<string>>();
for (const r of data) {
  for (const f of r.failedRequests) {
    if (f.includes("ERR_ABORTED")) continue; // benign Next.js <Link> prefetch cancel
    const m = f.match(/^(\d{3})\s+(\S+)/);
    if (!m) continue;
    const key = `${m[1]} ${m[2].split("?")[0]}`;
    (real.get(key) ?? real.set(key, new Set()).get(key)!).add(r.route);
  }
}

console.log("=== Real HTTP errors (4xx/5xx), with pages that triggered them ===\n");
const rows = [...real.entries()].sort((a, b) => b[1].size - a[1].size);
if (rows.length === 0) {
  console.log("(none — every page's only failures were benign prefetch aborts)");
}
for (const [key, pages] of rows) {
  console.log(`${key}\n   on: ${[...pages].join(", ")}\n`);
}
