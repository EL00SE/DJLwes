import { getAboutContent } from "@/lib/about-content";
import { getInstagramFeed } from "@/lib/instagram-feed";
import { InstagramFeed } from "@/components/instagram-feed";
import { InstagramPosts } from "@/components/instagram-posts";

/** The homepage's Instagram section. Prefers the live feed from the
 * Instagram API (random recent posts, no upkeep); if that isn't set up —
 * or comes back empty, say an expired token — falls back to whatever
 * post links the admin pasted in /admin/about, and shows nothing if
 * there are none of those either. */
export async function InstagramSection() {
  const feed = await getInstagramFeed();
  if (feed && feed.length > 0) return <InstagramFeed items={feed} />;

  const { instagramPosts } = await getAboutContent();
  return <InstagramPosts posts={instagramPosts} />;
}
