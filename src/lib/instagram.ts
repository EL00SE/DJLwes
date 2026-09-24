const POST_URL_PATTERN = /^https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i;

/** Normalizes anything an admin might paste for an Instagram post (with
 * tracking query strings, an account prefix, no trailing slash…) into the
 * one canonical permalink form Instagram's embed script expects, or null
 * if it isn't a post/reel link at all — a profile URL, for instance,
 * can't be embedded. */
export function normalizeInstagramPostUrl(raw: string): string | null {
  const match = raw.trim().match(POST_URL_PATTERN);
  if (!match) return null;
  return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
}
