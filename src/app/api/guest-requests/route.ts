// UNUSED — the POST target of guest-request-panel.tsx, which nothing
// renders anymore (ticket sales moved to a Grow-hosted link). Still
// deployed and technically callable directly, but no live page ever
// submits to it, so no new GuestRequest rows are being created right
// now. Dormant, not a bug.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

const guestRequestSchema = z
  .object({
    eventId: z.string().min(1),
    name: z.string().trim().min(1, "Name is required").max(200),
    instagram: z
      .string()
      .trim()
      .min(1, "Instagram handle is required")
      .max(60)
      .regex(/^@?[A-Za-z0-9._]+$/, "That doesn't look like a valid Instagram handle"),
    phone: z.string().trim().regex(PHONE_PATTERN, "A valid phone number is required"),
    email: z.string().trim().email("A valid email is required").optional().or(z.literal("")),
    maleCount: z.number().int().min(0).max(50),
    femaleCount: z.number().int().min(0).max(50),
    otherCount: z.number().int().min(0).max(50),
  })
  .refine((data) => data.maleCount + data.femaleCount + data.otherCount >= 1, {
    message: "Add at least one guest",
    path: ["maleCount"],
  });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = guestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { eventId, name, instagram, phone, email, maleCount, femaleCount, otherCount } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (!event.isActive) {
    return NextResponse.json({ error: "This event is no longer accepting requests" }, { status: 410 });
  }

  const guestRequest = await prisma.guestRequest.create({
    data: {
      eventId,
      customerName: name,
      customerInstagram: instagram.replace(/^@/, ""),
      customerPhone: phone,
      customerEmail: email || null,
      maleCount,
      femaleCount,
      otherCount,
    },
  });

  return NextResponse.json({ id: guestRequest.id });
}
