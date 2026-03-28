import * as fs from "fs";

const AUTH_FILE = "playwright/.auth/user.json";

/**
 * Returns true if the auth file has a valid session cookie.
 * Use in test.beforeEach() to skip auth-dependent tests when no session exists.
 */
export function hasAuthSession(): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
    return data.cookies?.some(
      (c: { name: string; value: string }) =>
        (c.name.includes("session-token") || c.name.includes("authjs")) &&
        c.value.length > 0,
    ) ?? false;
  } catch {
    return false;
  }
}
