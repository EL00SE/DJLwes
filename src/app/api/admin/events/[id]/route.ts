import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { parseEventLocalDateTime } from "@/lib/format";
import { eventFormSchema, setActiveEvent, uniqueEventSlug } from "@/lib/events";

/** Updates an existing event's details (and, if isActive is set, makes
 * it the one live event on the homepage). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.event.findUnique({ where: { id }, select: { slug: true, title: true } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = eventFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid event details" },
      { status: 400 }
    );
  }
  const { title, description, date, location, coverImage, lineup, entryRequirements, isActive } =
    parsed.data;

  let parsedDate: Date;
  try {
    parsedDate = parseEventLocalDateTime(date);
    if (Number.isNaN(parsedDate.getTime())) throw new Error();
  } catch {
    return NextResponse.json({ error: "That date & time isn't valid" }, { status: 400 });
  }

  // Only regenerate the slug if the title actually changed, so it stays
  // stable across ordinary edits.
  const slug = existing.title === title ? existing.slug : await uniqueEventSlug(title, id);

  await prisma.event.update({
    where: { id },
    data: {
      slug,
      title,
      description,
      date: parsedDate,
      location,
      coverImage,
      lineup: lineup || null,
      entryRequirements: entryRequirements || null,
      ...(isActive ? {} : { isActive: false }),
    },
  });

  if (isActive) {
    await setActiveEvent(id);
  }

  return NextResponse.json({ id });
}
