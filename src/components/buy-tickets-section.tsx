// Ticket pricing, quantity, payment, and invoicing all live on Grow's
// side now — this is deliberately just a link out to the checkout page
// the admin sets per-event (see admin/events), not a form of our own.
export function BuyTicketsSection({ buyLink }: { buyLink: string | null }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-16 text-center sm:px-8">
      {buyLink ? (
        <a
          href={buyLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-accent px-10 py-4 font-mono text-sm uppercase tracking-[0.25em] text-white shadow-[0_0_40px_-8px_var(--color-accent)] transition-opacity hover:opacity-90"
        >
          Buy Tickets
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-full border border-line-strong px-10 py-4 font-mono text-sm uppercase tracking-[0.25em] text-ink-faint opacity-60"
        >
          Tickets coming soon
        </button>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
        Secure checkout via Grow — opens in a new tab
      </p>
    </div>
  );
}
