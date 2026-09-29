"use client";

import { useState } from "react";
import Image from "next/image";

/** A video post's grid tile: starts as a plain poster image with a play
 * button (cheap — no video byte downloaded until asked for), and on
 * click swaps in a real, playing `<video controls>` right on the page.
 *
 * This exists because Instagram's own embed widget (instagram-posts.tsx,
 * used for admin-pasted links) can't do this — its Reels specifically
 * open "Watch on Instagram" in a new tab instead of playing inline,
 * which is a restriction of Instagram's widget, not something
 * fixable from here. The live API feed this powers doesn't have that
 * problem: the API hands over the actual video file (media_url), so
 * there's nothing stopping it from just playing normally. */
export function InstagramVideoTile({
  videoUrl,
  posterUrl,
  alt,
}: {
  videoUrl: string;
  posterUrl: string;
  alt: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      // Instagram's API doesn't provide captions/subtitles for a post's video.
      <video
        src={videoUrl}
        poster={posterUrl}
        controls
        autoPlay
        playsInline
        aria-label={alt}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block h-full w-full focus:outline-none focus:ring-2 focus:ring-accent/60"
    >
      <Image
        src={posterUrl}
        alt={alt}
        fill
        unoptimized
        sizes="(min-width: 640px) 33vw, 50vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-bg/20 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg/80 text-lg text-ink">
          ▶
        </span>
      </span>
      <span className="sr-only">Play video: {alt}</span>
    </button>
  );
}
