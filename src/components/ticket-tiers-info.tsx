import { formatPrice } from "@/lib/format";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { TicketTypeSummary } from "@/components/ticket-type-card";

/** One ticket tier's read-only price/availability card — shared between
 * this (Grow-link flow) and the dormant guest-request-experience.tsx,
 * which shows the same info before its "Request to Join" panel. */
export function TicketTierInfoCard({ ticketType }: { ticketType: TicketTypeSummary }) {
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

/** Read-only pricing info shown alongside the Buy Tickets button — Grow
 * owns the actual checkout/quantity, so this is purely informational
 * (and "remaining" here is whatever the admin last typed in, not a live
 * count — see the note in the admin event editor). */
export function TicketTiersInfo({ ticketTypes }: { ticketTypes: TicketTypeSummary[] }) {
  if (ticketTypes.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-5 pt-4 sm:px-8">
        {ticketTypes.map((ticketType) => (
          <TicketTierInfoCard key={ticketType.id} ticketType={ticketType} />
        ))}
      </div>
    </ScrollReveal>
  );
}
