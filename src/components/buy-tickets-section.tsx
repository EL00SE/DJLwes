/** The Buy Tickets button itself (or its disabled "coming soon" stand-in)
 * — the one buy button on the page, in the hero via StickyBuyButton. */
export function BuyTicketsButton({
  buyLink,
  className = "",
}: {
  buyLink: string | null;
  className?: string;
}) {
  return buyLink ? (
    <a
      href={buyLink}
      target="_blank"
      rel="noreferrer"
      className={`rounded-full bg-accent px-10 py-4 text-center font-mono text-sm uppercase tracking-[0.25em] text-white shadow-[0_0_40px_-8px_var(--color-accent)] transition-opacity hover:opacity-90 active:opacity-80 ${className}`}
    >
      Buy Tickets
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <button
      type="button"
      disabled
      className={`cursor-not-allowed rounded-full border border-line-strong px-10 py-4 font-mono text-sm uppercase tracking-[0.25em] text-ink-faint opacity-60 ${className}`}
    >
      Tickets coming soon
    </button>
  );
}
