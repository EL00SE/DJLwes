import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/admin/actions";
import { toEventLocalDateTimeInputValue } from "@/lib/format";
import { EventForm } from "@/components/admin/event-form";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">Admin</p>
      <h1 className="mt-1 mb-8 font-display text-4xl tracking-wide text-ink">Edit Event</h1>
      <EventForm
        initial={{
          id: event.id,
          title: event.title,
          description: event.description,
          dateLocalValue: toEventLocalDateTimeInputValue(event.date),
          location: event.location,
          coverImage: event.coverImage,
          isActive: event.isActive,
        }}
      />
    </div>
  );
}
