import type { Metadata } from "next";
import { getPastEvents } from "@/lib/data";
import { PastEventSection } from "@/components/past-event-section";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Past Events — ${siteConfig.eventSeriesName}`,
};

export const dynamic = "force-dynamic";

export default async function PastEventsPage() {
  const events = await getPastEvents();

  return (
    <div>
      <div className="mx-auto max-w-6xl px-5 pt-14 pb-6 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">Archive</p>
        <h1 className="mt-2 font-display text-6xl tracking-wide text-ink sm:text-7xl">
          Past Events
        </h1>
        <p className="mt-3 max-w-prose text-ink-muted">
          A look back at previous {siteConfig.eventSeriesName} nights.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="mx-auto max-w-6xl px-5 pb-24 text-ink-muted sm:px-8">
          Nothing in the archive yet — the first {siteConfig.eventSeriesName} is still to come.
        </p>
      ) : (
        events.map((event) => (
          <PastEventSection
            key={event.id}
            title={event.title}
            date={event.date}
            location={event.location}
            coverImage={event.coverImage}
            galleryItems={event.galleryItems}
          />
        ))
      )}
    </div>
  );
}
