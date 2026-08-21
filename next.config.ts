import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Seed/placeholder art in /public/images is served as SVG. These are
    // all first-party, hand-authored files (no user/remote SVG upload
    // exists in this app), so it's safe to let next/image optimize them.
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Event cover images the admin uploads via the event editor live in
    // Vercel Blob storage, at a per-store subdomain of this host.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
