"use client";

import { useRef, useState } from "react";
import { TicketTypeCard, type TicketTypeSummary } from "@/components/ticket-type-card";
import { BuyPanel } from "@/components/buy-panel";

// Matches the `lg:` breakpoint the grid below switches on — below this
// width the buy panel is stacked under the ticket list instead of sitting
// side-by-side, so it needs to be scrolled into view instead of already
// being visible.
const STACKED_LAYOUT_QUERY = "(max-width: 1023px)";

export function EventExperience({
  eventId,
  eventTitle,
  ticketTypes,
}: {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketTypeSummary[];
}) {
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null);
  const contactFieldsRef = useRef<HTMLDivElement>(null);

  function handleSelect(id: string) {
    setSelectedTicketTypeId(id);
    // On a stacked (mobile/tablet-portrait) layout the buy form sits below
    // the ticket list and can run off the bottom of the screen — jump
    // straight to the name/email fields so the buyer isn't left hunting
    // for them. On a side-by-side desktop layout the form is already
    // fully visible, so this is skipped entirely.
    const isStackedLayout =
      typeof window !== "undefined" && window.matchMedia(STACKED_LAYOUT_QUERY).matches;
    if (isStackedLayout) {
      // Wait a tick for the form to actually mount/re-render with the
      // newly selected ticket type before measuring where to scroll.
      // A plain setTimeout is used instead of requestAnimationFrame since
      // rAF never fires in some contexts (e.g. a backgrounded/non-visible
      // tab), which would silently skip the scroll entirely.
      setTimeout(() => {
        contactFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-10">
      <div className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">
          Tickets
        </h2>
        {ticketTypes.length === 0 ? (
          <p className="text-ink-muted">Ticket sales haven&apos;t opened for this event yet.</p>
        ) : (
          ticketTypes.map((ticketType) => (
            <TicketTypeCard
              key={ticketType.id}
              ticketType={ticketType}
              isSelected={ticketType.id === selectedTicketTypeId}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      <BuyPanel
        eventId={eventId}
        eventTitle={eventTitle}
        ticketTypes={ticketTypes}
        selectedTicketTypeId={selectedTicketTypeId}
        onSelectTicketType={handleSelect}
        contactFieldsRef={contactFieldsRef}
      />
    </div>
  );
}
