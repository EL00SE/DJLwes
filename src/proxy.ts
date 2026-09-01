import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/admin-auth";

// proxy.ts (unlike the old middleware.ts convention it replaces) always
// runs on the Node.js runtime — no separate opt-in needed — which is
// exactly what lets this call the same isValidSessionToken() every admin
// page and API route already uses. That function signs/verifies with
// Node's crypto (HMAC + timingSafeEqual), unavailable on Edge; reusing it
// here rather than reimplementing the same check against Web Crypto is
// what keeps every admin auth check from drifting out of sync.

/** Every /admin page and /api/admin route already checks the session
 * cookie itself (requireAdmin() / isAdminRequest()) — this exists as a
 * second, independent layer in front of all of them: if a future route
 * is ever added and its author forgets that check, this still blocks
 * unauthenticated access instead of silently depending on nobody making
 * that mistake. /admin/login is deliberately excluded — it's the one
 * admin-namespaced page that must stay reachable while signed out. */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (isValidSessionToken(token)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // "/admin" alone (the dashboard root — no trailing segment) needs its
    // own entry: the negative-lookahead pattern below only ever matches
    // "/admin/<something>", never the bare path.
    "/admin",
    "/admin/((?!login).*)",
    "/api/admin/:path*",
    // Issues admin-only upload tokens (event covers, gallery items, About
    // photos) — not nested under /api/admin, but just as sensitive.
    "/api/upload",
  ],
};
