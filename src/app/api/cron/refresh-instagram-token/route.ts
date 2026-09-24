import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { refreshInstagramToken } from "@/lib/instagram-feed";

/** Weekly cron (see vercel.json) that keeps the Instagram token from
 * expiring. Vercel calls this with `Authorization: Bearer <CRON_SECRET>`
 * whenever a CRON_SECRET env var exists — without that secret set, this
 * refuses everyone rather than being open to the internet. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET isn't configured" }, { status: 500 });
  }

  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshInstagramToken();
  if (!result.ok) console.error(`Instagram token refresh failed: ${result.detail}`);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
