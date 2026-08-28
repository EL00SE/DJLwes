import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

// Just the two real public pages — /admin is deliberately excluded (see
// robots.ts), and there's no per-event URL to list since the homepage
// always shows whichever one is active.
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteConfig.siteUrl.replace(/\/$/, "");
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/past-events`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
