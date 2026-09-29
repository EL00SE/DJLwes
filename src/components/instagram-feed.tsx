import Image from "next/image";
import type { InstagramFeedItem } from "@/lib/instagram-feed";
import { InstagramFrame } from "@/components/instagram-frame";
import { InstagramVideoTile } from "@/components/instagram-video-tile";

/** A grid of the account's recent posts. Photos link out to the post on
 * Instagram; videos play right on the page via InstagramVideoTile
 * instead, since the API hands over the real video file — no reason to
 * only offer a link-out when we can actually play it here.
 * `unoptimized` because Instagram's picture hosts change and expire —
 * there's nothing stable to whitelist for next/image's optimizer. */
export function InstagramFeed({ items }: { items: InstagramFeedItem[] }) {
  return (
    <InstagramFrame>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="relative aspect-square overflow-hidden rounded-2xl border border-line-strong shadow-[0_0_40px_-16px_rgba(177,59,255,0.5)]"
          >
            {item.isVideo && item.videoUrl ? (
              <InstagramVideoTile videoUrl={item.videoUrl} posterUrl={item.imageUrl} alt={item.alt} />
            ) : (
              <a
                href={item.permalink}
                target="_blank"
                rel="noreferrer"
                className="group block h-full w-full focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.alt}
                  fill
                  unoptimized
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Only reachable if the API reports a video but somehow
                    didn't hand back a playable file — falls back to the
                    old link-out-with-a-badge behavior rather than
                    breaking. */}
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
            )}
          </li>
        ))}
      </ul>
    </InstagramFrame>
  );
}
