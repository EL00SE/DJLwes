import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAdminOfBookingRequest } from "@/lib/booking-notification";
import { getClientIp } from "@/lib/request-ip";

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.string().trim().max(320).optional(),
    phone: z.string().trim().max(40).optional(),
    // From a plain <input type="date"> — "YYYY-MM-DD" or omitted.
    eventDate: z.string().trim().optional(),
    message: z.string().trim().min(1, "Tell us a bit about the event").max(2000),
    // Honeypot — a field real visitors never see or fill in (see
    // booking-request-form.tsx), same pattern as /api/notify-signup.
    company: z.string().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Add an email or phone number so we can reach you",
    path: ["email"],
  });

// Generous on purpose, same reasoning as /api/notify-signup: this only
// needs to catch a scripted flood, never a real burst of interest, and
// shared/venue WiFi can put many unrelated real visitors behind one IP.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

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
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 }
    );
  }

  // A filled-in honeypot means this wasn't a real visitor — report success
  // without writing anything, so the bot has no signal to adjust against.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const ipAddress = getClientIp(request.headers);

  if (ipAddress) {
    const recentCount = await prisma.bookingRequest.count({
      where: { ipAddress, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
    });
    // Fails open and silent — see /api/notify-signup for why.
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json({ ok: true });
    }
  }

  const eventDate = parsed.data.eventDate ? new Date(parsed.data.eventDate) : null;

  const bookingRequest = await prisma.bookingRequest.create({
    data: {
      customerName: parsed.data.name,
      customerEmail: parsed.data.email || null,
      customerPhone: parsed.data.phone || null,
      eventDate: eventDate && !Number.isNaN(eventDate.getTime()) ? eventDate : null,
      message: parsed.data.message,
      ipAddress,
    },
  });

  // Best-effort and never awaited — the inquiry is already saved either
  // way, and it's always visible in /admin, so there's no reason to hold
  // the visitor's response open for a round-trip to Resend just to
  // swallow its result. after() (unlike a bare fire-and-forget) keeps
  // this running on Vercel even after the response above is flushed,
  // instead of risking the function freezing mid-request.
  after(async () => {
    try {
      await notifyAdminOfBookingRequest(bookingRequest);
    } catch (err) {
      console.error(`Failed to send booking-request notification for ${bookingRequest.id}:`, err);
    }
  });

  return NextResponse.json({ ok: true });
}
