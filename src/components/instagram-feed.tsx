import Image from "next/image";
import type { InstagramFeedItem } from "@/lib/instagram-feed";
import { InstagramFrame } from "@/components/instagram-frame";

/** A grid of the account's recent posts, each linking out to the post on
 * Instagram. Plain pictures rather than Instagram's embed widget, so it
 * loads instantly, matches the site, and needs no third-party script.
 * `unoptimized` because Instagram's picture hosts change and expire —
 * there's nothing stable to whitelist for next/image's optimizer. */
export function InstagramFeed({ items }: { items: InstagramFeedItem[] }) {
  return (
    <InstagramFrame>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.permalink}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-2xl border border-line-strong shadow-[0_0_40px_-16px_rgba(177,59,255,0.5)] focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              <Image
                src={item.imageUrl}
                alt={item.alt}
                fill
                unoptimized
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {item.isVideo && (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/70 text-xs text-ink"
                >
                  ▶
                </span>
              )}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </InstagramFrame>
  );
}
