import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const eventFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(4000),
  date: z.string().trim().min(1, "Date & time are required"),
  location: z.string().trim().min(1, "Location is required").max(200),
  coverImage: z.string().trim().min(1, "A cover image is required"),
  isActive: z.boolean().optional(),
});

function slugify(title: string): string {
  // Non-ASCII (accents, Arabic/Hebrew script, emoji, etc.) just gets
  // dropped along with everything else that isn't a-z0-9 — slugs here
  // are an internal unique key, never shown or linked to, so there's no
  // need to transliterate anything, just avoid collisions.
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "event";
}

/** Slugifies `title` and appends "-2", "-3", etc. until it doesn't
 * collide with another event's slug (excluding `excludeEventId` itself,
 * for edits that don't change the title enough to need a new slug). */
export async function uniqueEventSlug(title: string, excludeEventId?: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  // Slugs aren't a high-cardinality field — a loop is simpler and safer
  // than a clever query, and this only runs on admin create/edit.
  while (
    await prisma.event.findFirst({
      where: { slug: candidate, ...(excludeEventId ? { id: { not: excludeEventId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** Marks `eventId` as the one live/active event on the homepage,
 * atomically clearing the flag on every other event first — the schema
 * doesn't enforce "at most one active event" itself, so every write path
 * that can set isActive=true needs to go through this. */
export async function setActiveEvent(eventId: string): Promise<void> {
  await prisma.$transaction([
    prisma.event.updateMany({ where: { id: { not: eventId } }, data: { isActive: false } }),
    prisma.event.update({ where: { id: eventId }, data: { isActive: true } }),
  ]);
}
