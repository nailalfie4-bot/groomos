import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin, the API, and the internal town rewrite target are not for
        // crawlers (the pretty /dog-groomers-in-* URL is the canonical one).
        disallow: ["/directory-admin", "/api/", "/town/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
