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
