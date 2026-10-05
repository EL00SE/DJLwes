import { test, expect } from "@playwright/test";
import { googleMapsUrl, wazeUrl } from "../src/lib/maps";

// Pure-function checks (no browser) — the place is whatever an admin typed,
// so what matters is that nothing in it can break out of the query string.
test.describe("map links", () => {
  test("search for the place by name", () => {
    expect(googleMapsUrl("OLD SCHOOL CLUB, HAIFA")).toBe(
      "https://www.google.com/maps/search/?api=1&query=OLD%20SCHOOL%20CLUB%2C%20HAIFA"
    );
    expect(wazeUrl("OLD SCHOOL CLUB, HAIFA")).toBe(
      "https://waze.com/ul?q=OLD%20SCHOOL%20CLUB%2C%20HAIFA&navigate=yes"
    );
  });

  test("characters that mean something in a URL stay inside the query", () => {
    const place = "Club #1 & Bar?x=1/../ 50% off";
    for (const url of [googleMapsUrl(place), wazeUrl(place)]) {
      const parsed = new URL(url);
      // Nothing smuggled in as an extra parameter or fragment.
      expect(parsed.hash).toBe("");
      expect([...parsed.searchParams.keys()].sort()).toEqual(
        url.includes("waze") ? ["navigate", "q"] : ["api", "query"]
      );
      expect(parsed.searchParams.get(url.includes("waze") ? "q" : "query")).toBe(place);
    }
  });

  test("non-Latin text (Hebrew, Arabic) round-trips", () => {
    const place = "מועדון אולד סקול, חיפה";
    expect(new URL(googleMapsUrl(place)).searchParams.get("query")).toBe(place);
    expect(new URL(wazeUrl(place)).searchParams.get("q")).toBe(place);
  });
});
