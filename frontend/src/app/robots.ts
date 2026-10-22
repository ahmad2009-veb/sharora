import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin-dashboard", "/tg/admin-dashboard", "/api"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
