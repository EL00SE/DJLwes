import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { dollarsToCents, ticketTypeFormSchema } from "@/lib/ticket-types";

/** Updates a ticket tier's name/description/price/quantity. Editing the
 * total preserves however many are already sold — e.g. raising a 20/20
 * tier that's sold 5 to a total of 30 leaves 25 remaining, not 30. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.ticketType.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
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

  const sold = existing.quantityTotal - existing.quantityRemaining;
  if (quantityTotal < sold) {
    return NextResponse.json(
      { error: `Can't set the total below ${sold} — that many are already sold.` },
      { status: 400 }
    );
  }

  await prisma.ticketType.update({
    where: { id },
    data: {
      name,
      description: description || null,
      priceCents: dollarsToCents(price),
      quantityTotal,
      quantityRemaining: quantityTotal - sold,
    },
  });

  return NextResponse.json({ id });
}

/** Deletes a ticket tier — only allowed if nothing has ever ordered it,
 * since OrderItem.ticketType has no cascade and existing orders need to
 * keep referring to real tier data. Edit a tier instead of deleting it
 * once it's been sold. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const orderCount = await prisma.orderItem.count({ where: { ticketTypeId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "Can't delete a tier that already has orders — edit it instead." },
      { status: 400 }
    );
  }

  await prisma.ticketType.delete({ where: { id } }).catch(() => {
    // Already gone, or a race with another delete — either way the end
    // state (no such tier) is what the caller wanted.
  });

  return NextResponse.json({ ok: true });
}
