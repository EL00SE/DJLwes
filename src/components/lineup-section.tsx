import { ScrollReveal } from "@/components/scroll-reveal";

/** Renders `lineup` (newline-separated support acts) as a simple list —
 * hidden entirely when there's nothing to show, since not every event
 * has support acts worth calling out. */
export function LineupSection({ lineup }: { lineup: string | null }) {
  const acts = (lineup ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (acts.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
          Lineup
        </p>
        <div className="flex flex-wrap gap-3">
          {acts.map((act) => (
            <span
              key={act}
              className="card-edge rounded-full border border-line px-5 py-2 font-display text-lg tracking-wide text-ink"
            >
              {act}
            </span>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
