import { aboutContent } from "@/lib/site-content";

/** The heading + "Follow" link shared by both ways the Instagram section
 * can be fed: the live API grid and the pasted-links embeds. */
export function InstagramFrame({ children }: { children: React.ReactNode }) {
  const instagram = aboutContent.socials.find((s) => s.label === "Instagram");

  return (
    <section aria-label="Latest from Instagram" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
              On Instagram
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-wide text-ink sm:text-4xl">
              Latest from the feed
            </h2>
          </div>
          {instagram && (
            <a
              href={instagram.href}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs uppercase tracking-[0.15em] text-accent-bright hover:underline"
            >
              Follow on Instagram →<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
