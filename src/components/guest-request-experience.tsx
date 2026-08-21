"use client";

import { useRef } from "react";
import { formatPrice } from "@/lib/format";
import { GuestRequestPanel } from "@/components/guest-request-panel";
import type { TicketTypeSummary } from "@/components/ticket-type-card";

// Matches the `lg:` breakpoint the grid below switches on — see
// event-experience.tsx for the full rationale (also matches the header's
// own sticky/scrolls-away breakpoint).
const STACKED_LAYOUT_QUERY = "(max-width: 1023px)";

function TicketTierInfo({ ticketType }: { ticketType: TicketTypeSummary }) {
  const soldOut = ticketType.quantityRemaining <= 0;
  return (
    <div className="card-edge flex items-center justify-between gap-4 rounded-2xl border border-line px-6 py-5">
      <div>
        <p className="font-display text-2xl tracking-wide text-ink">{ticketType.name}</p>
        {ticketType.description && (
          <p className="mt-1 text-sm text-ink-muted">{ticketType.description}</p>
        )}
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
          {soldOut ? "Sold out" : `${ticketType.quantityRemaining} remaining`}
        </p>
      </div>
      <span className="font-display text-3xl text-ink">{formatPrice(ticketType.priceCents)}</span>
    </div>
  );
}

export function GuestRequestExperience({
  eventId,
  eventTitle,
  ticketTypes,
}: {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketTypeSummary[];
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  function scrollToPanel() {
    const isStackedLayout =
      typeof window !== "undefined" && window.matchMedia(STACKED_LAYOUT_QUERY).matches;
    if (isStackedLayout) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">
            Ticket tiers
          </h2>
          <button
            type="button"
            onClick={scrollToPanel}
            className="rounded-full bg-accent px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 lg:hidden"
          >
            Request to Join
          </button>
        </div>
        {ticketTypes.length === 0 ? (
          <p className="text-ink-muted">Ticket details haven&apos;t been posted for this event yet.</p>
        ) : (
          ticketTypes.map((ticketType) => (
            <TicketTierInfo key={ticketType.id} ticketType={ticketType} />
          ))
        )}
      </div>

      <GuestRequestPanel eventId={eventId} eventTitle={eventTitle} panelRef={panelRef} />
    </div>
  );
}
