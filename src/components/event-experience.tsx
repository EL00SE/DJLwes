"use client";

import { useRef, useState } from "react";
import { TicketTypeCard, type TicketTypeSummary } from "@/components/ticket-type-card";
import { BuyPanel } from "@/components/buy-panel";

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
  const panelRef = useRef<HTMLDivElement>(null);

  function handleSelect(id: string) {
    setSelectedTicketTypeId(id);
    // On mobile the buy panel sits stacked below the ticket list — bring it
    // into view. On desktop it's already visible side-by-side, so this is
    // a no-op scroll at worst.
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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
        ref={panelRef}
        eventId={eventId}
        eventTitle={eventTitle}
        ticketTypes={ticketTypes}
        selectedTicketTypeId={selectedTicketTypeId}
        onSelectTicketType={handleSelect}
      />
    </div>
  );
}
