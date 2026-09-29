import { test, expect } from "@playwright/test";
import { parseInstagramMedia, pickRandom, withTimeout } from "../src/lib/instagram-feed";

// Pure-function checks (no browser, no network) on the two pieces that
// sit between Instagram's raw API response and what the page renders.
test.describe("parseInstagramMedia", () => {
  test("uses the picture for images and the thumbnail for videos", () => {
    const items = parseInstagramMedia({
      data: [
        { id: "1", media_type: "IMAGE", media_url: "https://cdn/a.jpg", permalink: "https://instagram.com/p/a/" },
        {
          id: "2",
          media_type: "VIDEO",
          media_url: "https://cdn/b.mp4",
          thumbnail_url: "https://cdn/b.jpg",
          permalink: "https://instagram.com/reel/b/",
        },
      ],
    });
    expect(items.map((i) => [i.imageUrl, i.isVideo])).toEqual([
      ["https://cdn/a.jpg", false],
      ["https://cdn/b.jpg", true],
    ]);
    // The actual video file — lets a video item play right on the page
    // (instagram-video-tile.tsx) instead of only linking out. Never set
    // for a plain image.
    expect(items[0].videoUrl).toBeNull();
    expect(items[1].videoUrl).toBe("https://cdn/b.mp4");
  });

  test("drops entries that can't be shown, and tolerates garbage", () => {
    const items = parseInstagramMedia({
      data: [
        { id: "1", media_type: "IMAGE", permalink: "https://instagram.com/p/a/" }, // no picture
        { id: "2", media_type: "VIDEO", media_url: "https://cdn/b.mp4", permalink: "https://instagram.com/p/b/" }, // video, no thumbnail
        { media_type: "IMAGE", media_url: "https://cdn/c.jpg", permalink: "https://instagram.com/p/c/" }, // no id
        { id: "4", media_type: "IMAGE", media_url: "https://cdn/d.jpg" }, // no permalink
      ],
    });
    expect(items).toEqual([]);
    expect(parseInstagramMedia(null)).toEqual([]);
    expect(parseInstagramMedia({ error: { message: "bad token" } })).toEqual([]);
    expect(parseInstagramMedia("nope")).toEqual([]);
  });

  test("turns a caption into short single-line alt text, with a fallback", () => {
    const [withCaption, without] = parseInstagramMedia({
      data: [
        { id: "1", media_type: "IMAGE", media_url: "https://cdn/a.jpg", permalink: "p1", caption: "Line one\n\nline   two " + "x".repeat(300) },
        { id: "2", media_type: "IMAGE", media_url: "https://cdn/b.jpg", permalink: "p2" },
      ],
    });
    expect(withCaption.alt.startsWith("Line one line two x")).toBe(true);
    expect(withCaption.alt.length).toBe(120);
    expect(without.alt).toBe("Instagram post");
  });
});

test.describe("withTimeout", () => {
  // This is the mechanism that stops a slow/hanging Instagram API call
  // from freezing the homepage's Suspense boundary forever — see the
  // real production bug this guards against in instagram-feed.ts's
  // FEED_TIMEOUT_MS comment.
  test("resolves with the real value when it settles in time", async () => {
    const result = await withTimeout(Promise.resolve("real"), 200, "fallback");
    expect(result).toBe("real");
  });

  test("falls back once the timeout elapses, for a promise that never settles", async () => {
    const neverSettles = new Promise<string>(() => {});
    const result = await withTimeout(neverSettles, 50, "fallback");
    expect(result).toBe("fallback");
  });

  test("falls back rather than rejecting, for a promise that fails", async () => {
    const rejects = Promise.reject(new Error("network error"));
    const result = await withTimeout(rejects, 200, "fallback");
    expect(result).toBe("fallback");
  });
});

test.describe("pickRandom", () => {
  test("returns the requested count of distinct items without touching the input", () => {
    const input = Array.from({ length: 24 }, (_, i) => i);
    const picked = pickRandom(input, 6);
    expect(picked).toHaveLength(6);
    expect(new Set(picked).size).toBe(6);
    expect(input).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });

  test("returns everything when asked for more than exist", () => {
    expect(pickRandom([1, 2, 3], 6).sort()).toEqual([1, 2, 3]);
    expect(pickRandom([], 6)).toEqual([]);
  });

  test("actually varies (every item gets picked eventually)", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) pickRandom([1, 2, 3, 4, 5, 6, 7, 8], 2).forEach((n) => seen.add(n));
    expect(seen.size).toBe(8);
  });
});
