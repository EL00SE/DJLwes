/** A small spinning-circle loading indicator — inherits its color from
 * `currentColor`, so it drops into a button's existing text color (white
 * on the accent buttons, muted ink elsewhere) without its own color prop.
 * Pure CSS animation, no library — same "small hand-rolled effect" call
 * as ScrollReveal instead of pulling in something bigger for this alone. */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z"
      />
    </svg>
  );
}
