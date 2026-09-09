/** Extracts the original requester's IP from `x-forwarded-for`, which
 * Vercel sets to "client, proxy1, proxy2..." — the first entry is the
 * real requester. Only ever set by a real proxy/edge network in front of
 * the app (Vercel in production); absent for local `next dev`/`next
 * start` traffic with no proxy, in which case IP-based rate limiting
 * simply doesn't apply locally. Shared by every public route/action that
 * throttles by IP (booking requests, notify-signup, admin login). */
export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || null;
}
