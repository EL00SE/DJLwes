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
  const html = useMemo(
    () =>
      posts
        .map(
          (url) =>
            `<div class="w-[min(88vw,380px)] shrink-0 snap-center"><blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="max-width:540px;min-width:280px;width:100%;margin:0"><a href="${url}" target="_blank" rel="noreferrer">View this post on Instagram</a></blockquote></div>`
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
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: html }}
        className="mt-6 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto pb-4"
      />
    </InstagramFrame>
  );
}
