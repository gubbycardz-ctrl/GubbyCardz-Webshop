import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/shared/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal or internal pages: nothing for search results (they also send noindex).
      disallow: ["/admin", "/warenkorb"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
