import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { galleryItemFormSchema } from "@/lib/gallery-items";

/** Adds a photo/video to an event's gallery — shown on /past-events once
 * the event isn't the active one, and in the homepage's "last time"
 * teaser for whichever past event has the most recent date. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: eventId } = await params;

  // Independent lookups — run together rather than one after another.
  const [event, body, lastItem] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }),
    request.json().catch(() => undefined),
    prisma.galleryItem.findFirst({ where: { eventId }, orderBy: { sortOrder: "desc" } }),
  ]);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (body === undefined) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = galleryItemFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid gallery item" },
      { status: 400 }
    );
  }
  const { type, url, caption } = parsed.data;

  const item = await prisma.galleryItem.create({
    data: {
      eventId,
      type,
      url,
      caption: caption || null,
      sortOrder: (lastItem?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ id: item.id });
}
