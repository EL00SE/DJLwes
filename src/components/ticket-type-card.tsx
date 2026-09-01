"use client";

import { formatPrice } from "@/lib/format";

// Note: TicketTypeSummary below is still live (shared with the homepage's
// TicketTiersInfo), but the TicketTypeCard component itself is UNUSED —
// only event-experience.tsx renders it, and nothing imports that. Dormant,
// not a bug.
export type TicketTypeSummary = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  quantityRemaining: number;
  quantityTotal: number;
};

export function TicketTypeCard({
  ticketType,
  isSelected,
  onSelect,
}: {
  ticketType: TicketTypeSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const soldOut = ticketType.quantityRemaining <= 0;
  const lowStock = !soldOut && ticketType.quantityRemaining <= Math.max(5, ticketType.quantityTotal * 0.1);

  return (
    <div
      className={`ticket-notch card-edge flex items-center justify-between gap-4 rounded-2xl border px-6 py-5 transition-colors ${
        isSelected ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]" : ""
      }`}
    >
      <div>
        <p className="font-display text-2xl tracking-wide text-ink">{ticketType.name}</p>
        {ticketType.description && (
          <p className="mt-1 text-sm text-ink-muted">{ticketType.description}</p>
        )}
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
          {soldOut
            ? "Sold out"
            : lowStock
              ? `Only ${ticketType.quantityRemaining} left`
              : `${ticketType.quantityRemaining} remaining`}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-display text-3xl text-ink">{formatPrice(ticketType.priceCents)}</span>
        <button
          type="button"
          disabled={soldOut}
          onClick={() => onSelect(ticketType.id)}
          className={`min-h-11 rounded-full px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] transition-all ${
            soldOut
              ? "cursor-not-allowed border border-line text-ink-faint"
              : isSelected
                ? "bg-accent text-white shadow-[0_0_24px_-4px_var(--color-accent)]"
                : "border border-accent-dim text-accent-bright hover:bg-accent hover:text-white active:bg-accent active:text-white hover:shadow-[0_0_24px_-4px_var(--color-accent)]"
          }`}
        >
          {soldOut ? "Sold Out" : isSelected ? "Selected" : "Buy"}
        </button>
      </div>
    </div>
  );
}
