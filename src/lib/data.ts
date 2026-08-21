import { prisma } from "@/lib/prisma";

/** The event shown on the homepage — the one marked `isActive`. */
export function getActiveEvent() {
  return prisma.event.findFirst({
    where: { isActive: true },
    include: {
      ticketTypes: { orderBy: { priceCents: "asc" } },
    },
  });
}

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

export function getEventById(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: true },
  });
}
