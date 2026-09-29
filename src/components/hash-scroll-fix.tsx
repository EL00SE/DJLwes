"use client";

import { useEffect } from "react";

// A generous safety net — this is specifically for the case where the
// target page hasn't finished streaming in yet, not a normal instant
// scroll. The page has grown a fair bit (Instagram feed, booking
// section, etc.), and a cold serverless start plus a slow connection can
// push "finished streaming" well past what a couple of seconds of
// polling used to assume — the MutationObserver below reacts the instant
// the element actually shows up instead, so this timeout is only what
// gives up in a genuinely broken case (bad id, element never rendered).
const MAX_WAIT_MS = 8000;

/** Next's own scroll-to-hash-on-navigation loses the race on this app's
 * dynamically-rendered pages: if the target element (e.g. the About
 * section, linked as "/#about" from the header) hasn't actually streamed
 * into the DOM yet by the time the router tries to scroll to it, it
 * silently gives up and never retries. Confirmed to only affect
 * navigating to a hash link *from a different page* — a same-page hash
 * click already works, since the target is already there.
 *
 * Rendered inside template.tsx (which remounts on every navigation,
 * unlike layout.tsx) so this re-runs on every route change, not just the
 * very first page load. */
export function HashScrollFix() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));

    function tryScroll(): boolean {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ block: "start" });
      return true;
    }

    if (tryScroll()) return;

    // Watches for the element actually appearing, rather than guessing
    // how long streaming will take — fires as soon as any DOM subtree
    // change makes tryScroll() succeed, whether that's 100ms or 5s later.
    const observer = new MutationObserver(() => {
      if (tryScroll()) cleanup();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timeout = setTimeout(cleanup, MAX_WAIT_MS);

    function cleanup() {
      observer.disconnect();
      clearTimeout(timeout);
    }

    return cleanup;
  }, []);

  return null;
}
