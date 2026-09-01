import { createHmac } from "crypto";
import { readFileSync } from "fs";

// Mints a valid admin_session cookie value without going through the
// login form — mirrors src/lib/admin-auth.ts's exact signing scheme
// (must be kept in sync with it; there's no shared import since that
// file lives in the Next.js app, not this standalone test runner).
// Read-only tests only — this never submits the login form or touches
// the database, just lets tests reach pages that require a session.
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readAdminPassword(): string | undefined {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const env = readFileSync(".env", "utf-8");
    const raw = env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
    if (!raw) return undefined;
    // .env values are often quoted (e.g. ADMIN_PASSWORD="wearelive") —
    // Next.js's own .env loader strips a matching pair of quotes before
    // it ever reaches process.env, so this has to as well or it signs
    // with a password that doesn't match what the server actually has.
    const quoted = raw.match(/^(['"])(.*)\1$/);
    return quoted ? quoted[2] : raw;
  } catch {
    return undefined;
  }
}

export function mintAdminSessionCookie(): string | null {
  const password = readAdminPassword();
  if (!password) return null;
  const signingKey = createHmac("sha256", "djlwes-admin-session-v1").update(password).digest("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = createHmac("sha256", signingKey).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${signature}`;
}
