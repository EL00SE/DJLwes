import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().email("A valid email is required"),
  // Honeypot — a field real visitors never see or fill in (see
  // notify-signup-form.tsx), so anything that arrives non-empty came from
  // a bot filling out every field it found. Optional so requests that
  // omit it entirely (e.g. an old cached page) aren't rejected outright.
  company: z.string().optional(),
});

// Generous on purpose: this only needs to catch a scripted flood, never a
// real burst of interest. Mobile carriers and shared/venue WiFi routinely
// put many unrelated real visitors behind one IP, so a strict cap would
// end up blocking genuine signups instead of bots.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(request: Request): string | null {
  // Vercel sets this to "client, proxy1, proxy2..." — the first entry is
  // the original requester.
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email" },
      { status: 400 }
    );
  }

  // A filled-in honeypot means this wasn't a real visitor — report success
  // without writing anything, so the bot has no signal to adjust against.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const ipAddress = getClientIp(request);

  if (ipAddress) {
    const recentCount = await prisma.notifySignup.count({
      where: { ipAddress, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
    });
    // Fails open and silent: a real visitor who somehow shares an IP with
    // whatever tripped this never sees an error, their signup just isn't
    // recorded. Only a sustained flood from one source would ever reach
    // this threshold.
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json({ ok: true });
    }
  }

  try {
    await prisma.notifySignup.create({ data: { email: parsed.data.email, ipAddress } });
  } catch (err) {
    // Already signed up — treat as success rather than surfacing a
    // confusing "duplicate" error to someone who just wants to be notified.
    const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isDuplicate) throw err;
  }

  return NextResponse.json({ ok: true });
}
