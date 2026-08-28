"use client";

import { useEffect, useRef } from "react";

/** A muted, looping gallery clip that autoplays — except for anyone who's
 * told their OS/browser they prefer reduced motion, per WCAG 2.2.2 (any
 * auto-playing content running longer than 5s needs a way to pause it).
 * Rather than branching the initial render on a media query we can't know
 * during SSR, this always renders the same autoplaying markup and then,
 * post-mount, pauses it and hands back native controls only for
 * reduced-motion visitors — same DOM either way, so no hydration
 * mismatch. */
export function AutoplayVideo({
  src,
  className,
  ariaLabel,
}: {
  src: string;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.loop = false;
      video.controls = true;
    }
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      className={className}
      muted
      loop
      playsInline
      autoPlay
      aria-label={ariaLabel}
    />
  );
}
