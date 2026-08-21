import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/admin/actions";
import { formatEventDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  await requireAdmin();

  const events = await prisma.event.findMany({ orderBy: { date: "desc" } });

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">Admin</p>
          <h1 className="mt-1 font-display text-4xl tracking-wide text-ink">Events</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-full bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90"
        >
          + New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-ink-muted">No events yet — create the first one.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/admin/events/${event.id}/edit`}
              className="card-edge flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-5 py-4 transition-colors hover:border-accent"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-xl tracking-wide text-ink">{event.title}</p>
                  {event.isActive && (
                    <span className="rounded-full bg-mint/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mint">
                      Live
                    </span>
                  )}
                  {!event.buyLink && (
                    <span className="rounded-full bg-magenta/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-magenta">
                      No buy link
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {formatEventDate(event.date)} · {event.location}
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Edit →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
