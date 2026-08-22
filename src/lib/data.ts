import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** The event shown on the homepage — the one marked `isActive`. Wrapped
 * in React's `cache()` because the homepage calls this twice per request
 * (once from `generateMetadata`, once from the page component itself) —
 * without it, that's two separate round trips to the same query on every
 * single page load, since Next only dedupes `fetch()` calls automatically. */
export const getActiveEvent = cache(function getActiveEvent() {
  return prisma.event.findFirst({
    where: { isActive: true },
    include: {
      ticketTypes: { orderBy: { priceCents: "asc" } },
    },
  });
});

/** Every event that isn't the active one, newest first, for the gallery. */
export function getPastEvents() {
  return prisma.event.findMany({
    where: { isActive: false },
    orderBy: { date: "desc" },
    include: {
      galleryItems: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/** The single most recent past event that actually has photos/video —
 * used for the homepage's "last time" teaser, distinct from the full
 * /past-events archive (getPastEvents), which returns every past event. */
export function getMostRecentPastEventWithGallery() {
  return prisma.event.findFirst({
    where: { isActive: false, galleryItems: { some: {} } },
    orderBy: { date: "desc" },
    include: {
      galleryItems: { orderBy: { sortOrder: "asc" }, take: 6 },
    },
  });
}

export function getEventById(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: true },
  });
}
