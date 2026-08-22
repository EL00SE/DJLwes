import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { dollarsToCents, ticketTypeFormSchema } from "@/lib/ticket-types";

/** Adds a new ticket tier to an event. Starts fully in stock —
 * quantityRemaining === quantityTotal, since nothing's sold yet. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId } = await params;

  // Independent lookups — run together rather than one after another.
  const [event, body] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }),
    request.json().catch(() => undefined),
  ]);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (body === undefined) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = ticketTypeFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid ticket tier" },
      { status: 400 }
    );
  }
  const { name, description, price, quantityTotal } = parsed.data;

  const ticketType = await prisma.ticketType.create({
    data: {
      eventId,
      name,
      description: description || null,
      priceCents: dollarsToCents(price),
      quantityTotal,
      quantityRemaining: quantityTotal,
    },
  });

  return NextResponse.json({ id: ticketType.id });
}
