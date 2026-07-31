import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    // The game itself is behind an access check, so keep crawlers on the
    // public marketing and legal surface.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/sudoku"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
