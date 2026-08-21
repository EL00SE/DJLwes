// Resolves the site's own base URL, in priority order:
//   1. NEXT_PUBLIC_SITE_URL, if you've set it explicitly
//   2. Vercel's stable production domain (set automatically on Vercel —
//      no manual env var needed once deployed)
//   3. Vercel's current-deployment URL (covers preview deployments)
//   4. localhost, for local dev
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const siteConfig = {
  djName: "DJ Lwes",
  eventSeriesName: "Etfe El Boiler",
  tagline: "Underground deep house, played loud.",
  siteUrl: resolveSiteUrl(),
};
