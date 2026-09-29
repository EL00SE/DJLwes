import type { InstagramFeedItem } from "@/lib/instagram-feed";
import { InstagramFeed } from "@/components/instagram-feed";
import { InstagramPosts } from "@/components/instagram-posts";

/** The homepage's Instagram section. Prefers the live feed from the
 * Instagram API (random recent posts, no upkeep); if that isn't set up —
 * or comes back empty, say an expired token — falls back to whatever
 * post links the admin pasted in /admin/about, and shows nothing if
 * there are none of those either.
 *
 * Takes both already-resolved rather than fetching them itself: this
 * used to be its own async Server Component in a <Suspense> boundary so
 * a slow Instagram response couldn't hold up the rest of the page — in
 * practice that hit a Next.js/React streaming edge case where the
 * boundary's "reveal" script could silently never run, permanently
 * freezing everything below it (confirmed in production; not simply
 * theorized). getInstagramFeed() is itself time-bounded now (see
 * FEED_TIMEOUT_MS in instagram-feed.ts), so the worst case of fetching
 * it plainly alongside the page's other data — a few extra seconds if
 * Instagram's API is slow — is far preferable to the page silently
 * failing to render at all. */
export function InstagramSection({
  feed,
  fallbackPosts,
}: {
  feed: InstagramFeedItem[] | null;
  fallbackPosts: string[];
}) {
  if (feed && feed.length > 0) return <InstagramFeed items={feed} />;
  return <InstagramPosts posts={fallbackPosts} />;
}
