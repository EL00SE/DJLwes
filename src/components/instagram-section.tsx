/* eslint-disable react-hooks/purity, react-hooks/error-boundaries -- temporary diagnostic file, reverted shortly */
import { getAboutContent } from "@/lib/about-content";
import { getInstagramFeed, withTimeout } from "@/lib/instagram-feed";
import { InstagramFeed } from "@/components/instagram-feed";
import { InstagramPosts } from "@/components/instagram-posts";

// TEMPORARY DIAGNOSTIC BUILD — server-side console output doesn't reach
// this conversation, so this renders what actually happened (and how
// long each step took) directly into the page as a hidden, always-
// present element instead. Revert once diagnosed.
export async function InstagramSection() {
  const t0 = Date.now();
  let debug: Record<string, unknown>;
  let items: React.ReactNode = null;

  try {
    const feed = await getInstagramFeed();
    const feedMs = Date.now() - t0;
    const feedResult = feed === null ? "null (not configured)" : `array(${feed.length})`;

    if (feed && feed.length > 0) {
      debug = { t0, feedMs, feedResult };
      items = <InstagramFeed items={feed} />;
    } else {
      const t1 = Date.now();
      const aboutContent = await withTimeout(getAboutContent(), 5000, null);
      const aboutContentMs = Date.now() - t1;
      const instagramPosts = aboutContent?.instagramPosts ?? [];
      debug = {
        t0,
        feedMs,
        feedResult,
        aboutContentMs,
        aboutContentTimedOut: aboutContent === null,
        postsCount: instagramPosts.length,
        totalMs: Date.now() - t0,
      };
      items = <InstagramPosts posts={instagramPosts} />;
    }
  } catch (err) {
    debug = {
      t0,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      totalMs: Date.now() - t0,
    };
  }

  return (
    <>
      <DebugMarker debug={debug} />
      {items}
    </>
  );
}

function DebugMarker({ debug }: { debug: Record<string, unknown> }) {
  return (
    <div
      id="hsf-instagram-debug"
      aria-hidden
      style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
    >
      {JSON.stringify(debug)}
    </div>
  );
}
