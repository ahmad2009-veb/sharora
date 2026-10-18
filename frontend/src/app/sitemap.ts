import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1 },
    { path: "/apartments", priority: 0.9 },
  ];
  return pages.map(({ path, priority }) => ({
    url: `${SITE_URL}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path ? "daily" : "weekly",
    priority,
    alternates: { languages: { ru: `${SITE_URL}${path || "/"}`, tg: `${SITE_URL}/tg${path}` } },
  }));
}
