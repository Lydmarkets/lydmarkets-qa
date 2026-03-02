/**
 * Polls the app URL until it returns a 200 response.
 * Used by QA workers to wait for the full stack to be ready.
 */
export async function waitForApp(
  url: string = process.env.BASE_URL || "http://localhost:3000",
  timeoutMs: number = 120_000,
  intervalMs: number = 2_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`App at ${url} not healthy after ${timeoutMs / 1000}s`);
}
