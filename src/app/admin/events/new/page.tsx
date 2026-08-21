import { requireAdmin } from "@/app/admin/actions";
import { EventForm } from "@/components/admin/event-form";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">Admin</p>
      <h1 className="mt-1 mb-8 font-display text-4xl tracking-wide text-ink">New Event</h1>
      <EventForm />
    </div>
  );
}
