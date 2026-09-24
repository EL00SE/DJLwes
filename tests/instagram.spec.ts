import { test, expect } from "@playwright/test";
import { normalizeInstagramPostUrl } from "../src/lib/instagram";

// Pure-function checks (no browser) — this is what stands between an
// admin's pasted text and the HTML handed to Instagram's embed script.
test.describe("normalizeInstagramPostUrl", () => {
  test("accepts a plain post link and canonicalizes it", () => {
    expect(normalizeInstagramPostUrl("https://www.instagram.com/p/AbC_123-x/")).toBe(
      "https://www.instagram.com/p/AbC_123-x/"
    );
  });

  test("strips tracking params, adds the trailing slash, and handles reels", () => {
    expect(normalizeInstagramPostUrl("https://instagram.com/reel/AbC123?igsh=xyz&utm_source=qr")).toBe(
      "https://www.instagram.com/reel/AbC123/"
    );
  });

  test("accepts the account-prefixed form Instagram sometimes copies", () => {
    expect(normalizeInstagramPostUrl("  https://www.instagram.com/djlwes/p/AbC123/  ")).toBe(
      "https://www.instagram.com/p/AbC123/"
    );
  });

  test("rejects profile links, other sites, and anything that could break out of an attribute", () => {
    expect(normalizeInstagramPostUrl("https://www.instagram.com/djlwes/")).toBeNull();
    expect(normalizeInstagramPostUrl("https://evil.com/p/AbC123/")).toBeNull();
    expect(normalizeInstagramPostUrl('https://www.instagram.com/p/AbC"onload="x/')).toBeNull();
    expect(normalizeInstagramPostUrl("not a url")).toBeNull();
  });
});
