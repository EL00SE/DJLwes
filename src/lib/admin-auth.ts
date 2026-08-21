import { createHmac, timingSafeEqual } from "crypto";

// A single shared password for the business owner — no per-person
// accounts. Fine for one admin; revisit (real auth) if that changes.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

if (!ADMIN_PASSWORD) {
  console.warn("ADMIN_PASSWORD is not set. /admin will refuse all logins until it's added to .env");
}

// Cookies are signed with a key derived from the admin password (not the
// password itself), so a leaked cookie can't be used to recover it.
function signingKey(): string {
  return createHmac("sha256", "djlwes-admin-session-v1").update(ADMIN_PASSWORD ?? "").digest("hex");
}

export function verifyAdminPassword(candidate: string): boolean {
  if (!ADMIN_PASSWORD) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(ADMIN_PASSWORD);
  // timingSafeEqual throws on length mismatch rather than just returning
  // false, so pad to a common length first — still safe since a length
  // mismatch alone already means "wrong password".
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Builds a signed, stateless session token: "<expiry>.<hmac>". */
export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = createHmac("sha256", signingKey()).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${signature}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token || !ADMIN_PASSWORD) return false;
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAtRaw || !signature || Number.isNaN(expiresAt)) return false;
  if (Date.now() > expiresAt) return false;

  const expected = createHmac("sha256", signingKey()).update(expiresAtRaw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
