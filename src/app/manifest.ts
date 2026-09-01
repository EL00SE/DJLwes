import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

// Lets a visitor add the site to their phone's home screen with a proper
// name/icon/theme instead of a generic browser bookmark — reuses the same
// icon.png Next.js already serves for the browser tab favicon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.djName} — ${siteConfig.eventSeriesName}`,
    short_name: siteConfig.djName,
    description: siteConfig.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#08060d",
    theme_color: "#08060d",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
