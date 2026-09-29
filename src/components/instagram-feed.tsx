import Image from "next/image";
import type { InstagramFeedItem } from "@/lib/instagram-feed";
import { InstagramFrame } from "@/components/instagram-frame";
import { InstagramVideoTile } from "@/components/instagram-video-tile";

// Shared by every tile below (and by instagram-video-tile.tsx's own poster
// state) so the photo/video and its "not full-bleed" background agree.
const TILE_CLASSNAME =
  "relative aspect-square w-[72vw] max-w-[320px] shrink-0 snap-center overflow-hidden rounded-2xl border border-line-strong bg-bg-raised shadow-[0_0_40px_-16px_rgba(177,59,255,0.5)] sm:w-auto sm:max-w-none sm:shrink";

/** A grid of the account's recent posts. Photos link out to the post on
 * Instagram; videos play right on the page via InstagramVideoTile
 * instead, since the API hands over the real video file — no reason to
 * only offer a link-out when we can actually play it here.
 *
 * Below `sm:`, this is a horizontal swipe — one post at a time, snapping
 * as you go, the same gesture as swiping through cards rather than a
 * cramped multi-column grid on a narrow screen. At `sm:` and up it's a
 * plain grid, wrapping to a new row past 3.
 *
 * `object-contain` (not `-cover`) plus the tile's own background color —
 * Instagram posts come in several aspect ratios (square, 4:5, 9:16 for
 * Reels...), and cropping every one into a forced square lost real
 * content off the edges. This shows the whole photo/video instead,
 * letterboxed against the tile's background where the ratio doesn't
 * match. `unoptimized` because Instagram's picture hosts change and
 * expire — there's nothing stable to whitelist for next/image's
 * optimizer. */
export function InstagramFeed({ items }: { items: InstagramFeedItem[] }) {
  return (
    <InstagramFrame>
      <ul className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0">
        {items.map((item) => (
          <li key={item.id} className={TILE_CLASSNAME}>
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
                  sizes="(min-width: 640px) 33vw, 72vw"
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
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
