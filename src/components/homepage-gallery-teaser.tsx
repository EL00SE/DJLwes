import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AutoplayVideo } from "@/components/autoplay-video";

type TeaserItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  caption: string | null;
};

/** A taste of the most recent past event's photos, right on the
 * homepage — proof-of-vibe for a first-time visitor, rather than making
 * them dig for it on /past-events. */
export function HomepageGalleryTeaser({
  eventTitle,
  items,
}: {
  eventTitle: string;
  items: TeaserItem[];
}) {
  if (items.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
              Last time
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-wide text-ink sm:text-4xl">
              {eventTitle}
            </h2>
          </div>
          <Link
            href="/past-events"
            className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint transition-colors hover:text-accent-bright active:text-accent-bright"
          >
            See all past events →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-line"
            >
              {item.type === "VIDEO" ? (
                <AutoplayVideo
                  src={item.url}
                  className="h-full w-full object-cover"
                  ariaLabel={item.caption ?? eventTitle}
                />
              ) : (
                <Image
                  src={item.url}
                  alt={item.caption ?? `${eventTitle} — ${siteConfig.eventSeriesName}`}
                  fill
                  sizes="(min-width: 640px) 320px, 45vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
