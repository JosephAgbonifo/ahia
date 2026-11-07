import type { User } from "./api";

/** Where a user lands after logging in. */
export const homeFor = (user: Pick<User, "role">) =>
  user.role === "admin" ? "/admin" : "/dashboard";

/** Only allow same-site relative paths in ?next= (blocks open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return null;
  }
  if (/^\/(login|register|forgot-password)(\/|\?|$)/.test(next)) return null;
  return next;
}
