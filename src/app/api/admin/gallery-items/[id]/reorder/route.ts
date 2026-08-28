import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { reorderSchema } from "@/lib/gallery-items";

/** Swaps a gallery item's sortOrder with its neighbor in the requested
 * direction — a simple move-up/move-down control rather than full
 * drag-and-drop, which isn't worth the complexity for a handful of
 * photos per event. A no-op (200, nothing changed) if already at that
 * edge of the list. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const [item, body] = await Promise.all([
    prisma.galleryItem.findUnique({ where: { id } }),
    request.json().catch(() => undefined),
  ]);
  if (!item) {
    return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
  }
  if (body === undefined) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }
  const { direction } = parsed.data;

  const sibling = await prisma.galleryItem.findFirst({
    where: {
      eventId: item.eventId,
      sortOrder: direction === "up" ? { lt: item.sortOrder } : { gt: item.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!sibling) {
    return NextResponse.json({ ok: true }); // already at that edge
  }

  await prisma.$transaction([
    prisma.galleryItem.update({ where: { id: item.id }, data: { sortOrder: sibling.sortOrder } }),
    prisma.galleryItem.update({ where: { id: sibling.id }, data: { sortOrder: item.sortOrder } }),
  ]);

  return NextResponse.json({ ok: true });
}
