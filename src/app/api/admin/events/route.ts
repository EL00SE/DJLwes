import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { parseEventLocalDateTime } from "@/lib/format";
import { eventFormSchema, setActiveEvent, uniqueEventSlug } from "@/lib/events";

/** Creates a new event. */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const { title, description, date, location, coverImage, buyLink, lineup, entryRequirements, isActive } =
    parsed.data;

  let parsedDate: Date;
  try {
    parsedDate = parseEventLocalDateTime(date);
    if (Number.isNaN(parsedDate.getTime())) throw new Error();
  } catch {
    return NextResponse.json({ error: "That date & time isn't valid" }, { status: 400 });
  }

  const slug = await uniqueEventSlug(title);
  const event = await prisma.event.create({
    data: {
      slug,
      title,
      description,
      date: parsedDate,
      location,
      coverImage,
      buyLink: buyLink || null,
      lineup: lineup || null,
      entryRequirements: entryRequirements || null,
    },
  });

  if (isActive) {
    await setActiveEvent(event.id);
  }

  return NextResponse.json({ id: event.id });
}
