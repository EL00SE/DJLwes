"use client";

import { useEffect } from "react";

// A generous window — this is specifically for the case where the target
// page hasn't finished streaming in yet, not a normal instant scroll.
const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 100;

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

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: "start" });
        clearInterval(interval);
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
      }
    }, RETRY_DELAY_MS);

    return () => clearInterval(interval);
  }, []);

  return null;
}
