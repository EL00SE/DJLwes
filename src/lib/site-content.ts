// Brand/bio content that changes rarely — unlike events, this isn't worth
// an admin CRUD UI, so it's just edited here directly. Swap the photo,
// bio, socials, and embed URL for the real thing whenever it's ready;
// nothing else in the app needs to change.
export const aboutContent = {
  photo: "/images/about-portrait.svg",
  bio: "DJ Lwes has spent the last few years building Etfe El Boiler from a one-room warehouse night into Haifa's home for deep, hypnotic house — low lights, loud subs, no phones on the floor. Every set is a slow build: no big drops, no filler, just a room that locks in together for six hours straight.",
  socials: [
    { label: "Instagram", href: "https://instagram.com/djlwes" },
    { label: "SoundCloud", href: "https://soundcloud.com/djlwes" },
  ],
  // A SoundCloud "widget" embed URL (Share -> Embed on any SoundCloud
  // track/set gives you this exact `w.soundcloud.com/player/?url=...`
  // form) — swap in a real track/set URL-encoded into the `url` param.
  // Null hides the embed entirely rather than showing a broken iframe.
  soundcloudEmbedUrl: null as string | null,
};

/** Private-booking contact details — shown as plain WhatsApp/email/
 * Instagram links on the homepage's "Book DJ Lwes" section (no form, no
 * database — just links out to however the business actually wants to
 * be reached). Any of the three can be null to hide that link entirely.
 * Swap in the real business number/address/handle whenever they're
 * ready — same "edit here directly" reasoning as aboutContent above. */
export const bookingContact = {
  // E.164 format (country code, no spaces/dashes/leading +) — what
  // wa.me links require, e.g. "972501234567" for an Israeli number.
  whatsappNumber: null as string | null,
  email: null as string | null,
  // Handle only, no "@" and no URL — e.g. "djlwes" for a business
  // Instagram account (can be the same as, or different from,
  // aboutContent.socials' Instagram, since that one's about following
  // the music rather than booking the DJ).
  instagramHandle: null as string | null,
};
