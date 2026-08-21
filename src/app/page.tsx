import Link from "next/link";
import { getActiveEvent } from "@/lib/data";
import { EventHero } from "@/components/event-hero";
// Both the instant-PayPal-purchase flow (EventExperience) and the
// free-request-then-approve flow (GuestRequestExperience) are kept in the
// repo, unused — ticket buying is now a single link out to a Grow-hosted
// checkout page (Grow owns pricing/quantity/invoicing from here), set per
// event in /admin/events. See buy-tickets-section.tsx.
import { BuyTicketsSection } from "@/components/buy-tickets-section";
import { siteConfig } from "@/lib/site-config";

// Ticket availability must always be fresh — never statically cached.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const event = await getActiveEvent();

  if (!event) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-32 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
          {siteConfig.djName}
        </p>
        <h1 className="font-display text-5xl tracking-wide text-ink">
          No event on sale right now
        </h1>
        <p className="text-ink-muted">
          Check back soon, or take a look at previous {siteConfig.eventSeriesName} nights.
        </p>
        <Link
          href="/past-events"
          className="mt-4 rounded-full border border-accent-dim px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-bright transition-colors hover:bg-accent hover:text-white"
        >
          See Past Events
        </Link>
      </div>
    );
  }

  return (
    <div>
      <EventHero
        title={event.title}
        description={event.description}
        date={event.date}
        location={event.location}
        coverImage={event.coverImage}
      />
      <BuyTicketsSection buyLink={event.buyLink} />
    </div>
  );
}
