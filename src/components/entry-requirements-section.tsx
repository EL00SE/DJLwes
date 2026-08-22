import { ScrollReveal } from "@/components/scroll-reveal";

/** Door policy/requirements (e.g. "Mixed groups only", ID rules, age
 * limits) — shown before the Buy Tickets button so a buyer sees it
 * before clicking through to Grow's checkout, which carries none of
 * this context on its own. Hidden entirely when unset. */
export function EntryRequirementsSection({ entryRequirements }: { entryRequirements: string | null }) {
  const rules = (entryRequirements ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (rules.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="mx-auto max-w-2xl px-5 pt-6 sm:px-8">
        <div className="card-edge rounded-2xl border border-line-strong px-6 py-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-bright">
            Entry requirements
          </p>
          <ul className="flex flex-col gap-1.5">
            {rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-sm text-ink-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-bright" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollReveal>
  );
}
