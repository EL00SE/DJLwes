"use client";

import { useRef, useState } from "react";
import Image from "next/image";

// Native <video controls> volume is either hover-to-reveal (desktop) or
// missing entirely (most mobile browsers hand volume to the phone's own
// hardware buttons, with no on-screen slider at all) — not discoverable
// enough for something that starts playing the moment you tap it. This
// starts quiet (turned down further after 0.5 still read as loud) and
// gives an always-visible slider instead of leaving it to native
// controls' own inconsistent UI.
const DEFAULT_VOLUME = 0.25;

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
  const videoRef = useRef<HTMLVideoElement>(null);

  if (playing) {
    return (
      <div className="relative h-full w-full">
        {/* Instagram's API doesn't provide captions/subtitles for a post's
            video. object-contain (not -cover) — see instagram-feed.tsx's
            comment on why nothing here should crop the original content. */}
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          controls
          autoPlay
          playsInline
          aria-label={alt}
          className="h-full w-full object-contain"
          // Imperative, not a "volume" JSX prop — <video> doesn't have
          // one; the DOM element's own property is the only way to set
          // a starting volume.
          onLoadedMetadata={(e) => {
            e.currentTarget.volume = DEFAULT_VOLUME;
          }}
        />
        {/* Own slider, separate from native controls' — sits at the top
            so it doesn't fight the native control bar for space at the
            bottom. stopPropagation so dragging it doesn't also toggle
            play/pause on the video underneath. */}
        <div
          className="absolute inset-x-2 top-2 flex items-center gap-2 rounded-full bg-bg/80 px-3 py-1.5 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <span aria-hidden className="text-xs text-ink-muted">
            🔊
          </span>
          <label className="sr-only" htmlFor={`volume-${alt}`}>
            Volume
          </label>
          <input
            id={`volume-${alt}`}
            type="range"
            min={0}
            max={1}
            step={0.01}
            defaultValue={DEFAULT_VOLUME}
            onChange={(e) => {
              if (videoRef.current) videoRef.current.volume = Number(e.target.value);
            }}
            className="h-1.5 w-full max-w-24 cursor-pointer accent-accent"
          />
        </div>
      </div>
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
        sizes="(min-width: 640px) 33vw, 72vw"
        className="object-contain transition-transform duration-300 group-hover:scale-105"
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
