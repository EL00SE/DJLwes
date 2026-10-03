"use client";

import { useEffect, useMemo, useRef } from "react";
import { InstagramFrame } from "@/components/instagram-frame";

const EMBED_SCRIPT_SRC = "https://www.instagram.com/embed.js";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/** Instagram's own embed script turns each <blockquote> into the real
 * post (photo/video, caption, likes) — no API keys or account access
 * needed, just the post links the admin pastes in /admin/about. Until
 * (or unless) the script loads — slow connection, ad blocker — each one
 * simply stays a plain "View this post on Instagram" link. */
export function InstagramPosts({ posts }: { posts: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Rendered as raw HTML (rather than JSX) on purpose: embed.js swaps each
  // blockquote for an iframe behind React's back, and React would fight
  // that on any re-render. Every URL was already normalized and validated
  // server-side (see lib/instagram.ts), so nothing here is user-typed HTML.
  //
  // No per-card max-height/scroll here — a capped-and-scrollable card was
  // tried first, but a scrollbar nested inside the page's own horizontal
  // swipe read as broken, not helpful. Each card is simply however tall
  // its real Instagram embed is (varies post to post — profile header,
  // photo/video, caption, like/comment row); the only scroll left on this
  // whole section is the row's own horizontal one, between posts.
  //
  // Every card carries its own mx-2 (rather than the row using `gap`, which
  // was tried first — it can't add space before the first or after the last
  // item, so those two ends had no room to peek symmetrically). With that
  // margin on every card, the first/last card's peek is identical to every
  // other gap in the row by construction — nothing to compute or keep in
  // sync with the page's own padding, it's just the same margin as
  // everywhere else, front and back.
  const html = useMemo(
    () =>
      posts
        .map(
          (url) =>
            `<div class="mx-2 w-[85vw] max-w-[380px] shrink-0 snap-center overflow-hidden rounded-2xl border border-line-strong bg-bg-raised shadow-[0_0_40px_-16px_rgba(177,59,255,0.5)] sm:mx-0 sm:w-full sm:max-w-none sm:shrink"><blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="max-width:540px;min-width:280px;width:100%;margin:0"><a href="${url}" target="_blank" rel="noreferrer">View this post on Instagram</a></blockquote></div>`
        )
        .join(""),
    [posts]
  );

  // Instagram's script (and its trackers) only loads once the section is
  // about to scroll into view, instead of taxing every first paint.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || posts.length === 0) return;

    function processEmbeds() {
      if (window.instgrm) {
        window.instgrm.Embeds.process();
        return;
      }
      if (document.querySelector(`script[src="${EMBED_SCRIPT_SRC}"]`)) return;
      const script = document.createElement("script");
      script.src = EMBED_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          processEmbeds();
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [posts]);

  if (posts.length === 0) return null;

  return (
    <InstagramFrame>
      {/* Below sm:, one card at a time — a horizontal swipe rather than a
          cramped grid on a narrow screen. sm: and up switches to a plain
          grid, wrapping to a new row past 3.

          max-sm:contain-paint — on a phone, Instagram's embeds make the
          whole page balloon sideways (measured 320px -> 1507px) while you
          scroll past them: the browser grows its layout viewport to fit,
          which resizes everything pinned to it (the sticky Buy button
          went from 280px to 891px wide) and zooms the page out. Ordinary
          overflow clipping (overflow-x: clip on the section, or on
          <main>) does NOT stop it — only containing the paint of this
          box does. Below sm: only: at sm: and up this is a grid whose
          card glow must be allowed to spill out. */}
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: html }}
        className="no-scrollbar mt-6 flex snap-x snap-mandatory items-start overflow-x-auto max-sm:contain-paint sm:grid sm:grid-cols-3 sm:items-stretch sm:gap-4 sm:overflow-visible"
      />
    </InstagramFrame>
  );
}
