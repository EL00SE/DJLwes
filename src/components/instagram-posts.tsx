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
  // Each card gets a fixed max-height with its own scrollbar rather than
  // however tall Instagram's real embed (profile header, photo/video,
  // caption, like/comment row...) happens to be — that varies wildly post
  // to post (measured 420-690px across a handful of real posts), and
  // letting every card be its own height made the row/grid look broken.
  // Capped-and-scrollable keeps every card the same size and keeps 100%
  // of the post reachable — nothing is ever cropped off, just scrolled to.
  const html = useMemo(
    () =>
      posts
        .map(
          (url) =>
            `<div class="w-[85vw] max-w-[380px] max-h-[70vh] shrink-0 snap-center overflow-y-auto rounded-2xl border border-line-strong bg-bg-raised shadow-[0_0_40px_-16px_rgba(177,59,255,0.5)] sm:w-full sm:max-w-none sm:shrink"><blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="max-width:540px;min-width:280px;width:100%;margin:0"><a href="${url}" target="_blank" rel="noreferrer">View this post on Instagram</a></blockquote></div>`
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
          grid, wrapping to a new row past 3. */}
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: html }}
        className="mt-6 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 sm:items-stretch sm:overflow-visible sm:pb-0"
      />
    </InstagramFrame>
  );
}
