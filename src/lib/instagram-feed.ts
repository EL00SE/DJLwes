import { prisma } from "@/lib/prisma";

// Pulls recent posts straight from the connected Instagram account via
// Instagram's official API (Instagram Login, Business/Creator accounts).
// Overridable only so tests can point this at a local fake server.
const GRAPH_BASE = process.env.INSTAGRAM_GRAPH_BASE_URL ?? "https://graph.instagram.com";
const TOKEN_ROW_ID = "instagram";

// How many recent posts to draw from, and how many to actually show —
// the random pick is what keeps the section from looking the same on
// every visit.
const POOL_SIZE = 24;
export const FEED_DISPLAY_COUNT = 6;

// getInstagramFeed() sits inside a <Suspense> boundary on the homepage
// (see instagram-section.tsx) — everything below it in the page only
// gets revealed once this resolves. A plain `fetch` with no timeout can
// hang far longer than any visitor would wait (a slow/unreachable
// Instagram API, a network blip on the way there) with nothing to force
// it to give up, silently freezing the rest of the page in an
// unrevealed streaming state. Bounding it here — both this outer guard
// and the fetch's own AbortSignal below — guarantees the boundary always
// resolves, one way or another, within this window.
const FEED_TIMEOUT_MS = 5000;

/** Resolves within `ms` no matter what `promise` does — falling back to
 * `fallback` if it hasn't settled by then. `promise` itself keeps
 * running in the background (this only stops *waiting* on it); pair with
 * an AbortSignal on the actual I/O where possible so it's properly
 * cancelled too, not just ignored. */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

export type InstagramFeedItem = {
  id: string;
  permalink: string;
  imageUrl: string;
  isVideo: boolean;
  alt: string;
};

type RawMedia = {
  id?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  caption?: string;
};

/** Turns the API's response into what the page needs, dropping anything
 * unusable (no permalink, no picture to show) rather than trusting the
 * shape blindly — a video's own media_url is the video file, so its
 * thumbnail is what gets displayed. */
export function parseInstagramMedia(json: unknown): InstagramFeedItem[] {
  const data = (json as { data?: RawMedia[] } | null)?.data;
  if (!Array.isArray(data)) return [];

  const items: InstagramFeedItem[] = [];
  for (const media of data) {
    const isVideo = media.media_type === "VIDEO";
    const imageUrl = isVideo ? media.thumbnail_url : media.media_url;
    if (!media.id || !media.permalink || !imageUrl) continue;
    items.push({
      id: media.id,
      permalink: media.permalink,
      imageUrl,
      isVideo,
      alt: media.caption?.replace(/\s+/g, " ").trim().slice(0, 120) || "Instagram post",
    });
  }
  return items;
}

/** Fisher–Yates on a copy — Array.sort(() => Math.random() - 0.5) looks
 * equivalent but is measurably biased. */
export function pickRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/** The token to call the API with: the refreshed one stored in the DB if
 * it still descends from the current INSTAGRAM_ACCESS_TOKEN, otherwise
 * (first run, or a newer token was pasted into the env var) the env var
 * itself, which then replaces what's stored. Null when Instagram simply
 * isn't set up. */
async function getAccessToken(): Promise<string | null> {
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!envToken) return null;

  try {
    const row = await prisma.instagramToken.findUnique({ where: { id: TOKEN_ROW_ID } });
    if (row && row.bootstrapToken === envToken) return row.token;

    await prisma.instagramToken.upsert({
      where: { id: TOKEN_ROW_ID },
      create: { id: TOKEN_ROW_ID, token: envToken, bootstrapToken: envToken, refreshedAt: new Date() },
      update: { token: envToken, bootstrapToken: envToken, refreshedAt: new Date() },
    });
  } catch (err) {
    // The feed shouldn't disappear over a database hiccup — the env
    // token is still valid until its own expiry.
    console.error("Couldn't read/write the stored Instagram token:", err);
  }
  return envToken;
}

/** A random selection from the account's latest posts. Returns null when
 * Instagram isn't configured at all (so the caller can fall back to the
 * manually pasted links), and an empty array when it is configured but
 * the request failed (expired token, API outage, no posts). Cached for
 * an hour, so the API is hit about once an hour regardless of traffic;
 * the shuffle still happens fresh on every page view. */
export async function getInstagramFeed(
  count: number = FEED_DISPLAY_COUNT
): Promise<InstagramFeedItem[] | null> {
  // Falling back to [] rather than null on a timeout is deliberate: the
  // caller treats both "configured but empty/failed" and "genuinely
  // timed out" the same way, by showing the pasted-links fallback — the
  // one thing that actually matters here is that this always resolves.
  return withTimeout(getInstagramFeedUnbounded(count), FEED_TIMEOUT_MS, []);
}

async function getInstagramFeedUnbounded(count: number): Promise<InstagramFeedItem[] | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const url = new URL(`${GRAPH_BASE}/me/media`);
    url.searchParams.set("fields", "id,media_type,media_url,thumbnail_url,permalink,caption");
    url.searchParams.set("limit", String(POOL_SIZE));
    url.searchParams.set("access_token", token);

    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
    if (!res.ok) {
      console.error(`Instagram feed request failed: ${res.status} ${await res.text()}`);
      return [];
    }
    return pickRandom(parseInstagramMedia(await res.json()), count);
  } catch (err) {
    console.error("Instagram feed request threw:", err);
    return [];
  }
}

/** Extends the stored token's life by another 60 days. Instagram only
 * allows this for tokens at least 24 hours old and not yet expired — so
 * it runs weekly (see api/cron/refresh-instagram-token), well inside
 * that window. */
export async function refreshInstagramToken(): Promise<{ ok: boolean; detail: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, detail: "INSTAGRAM_ACCESS_TOKEN isn't set." };

  const url = new URL(`${GRAPH_BASE}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(FEED_TIMEOUT_MS) });
  if (!res.ok) {
    return { ok: false, detail: `Instagram refused the refresh: ${res.status} ${await res.text()}` };
  }
  const { access_token: refreshed } = (await res.json()) as { access_token?: string };
  if (!refreshed) return { ok: false, detail: "Instagram's refresh response had no access_token." };

  await prisma.instagramToken.update({
    where: { id: TOKEN_ROW_ID },
    data: { token: refreshed, refreshedAt: new Date() },
  });
  return { ok: true, detail: "Token refreshed." };
}
