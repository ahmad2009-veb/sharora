import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

// Every public page in every language gets its own <url>, each listing all language versions
// (Google wants the hreflang set repeated on each entry). Russian is the unprefixed default.
const pages = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/apartments", priority: 0.9, changeFrequency: "daily" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/contacts", priority: 0.7, changeFrequency: "monthly" },
] as const;

const url = (locale: string, path: string) =>
  locale === routing.defaultLocale ? `${SITE_URL}${path || "/"}` : `${SITE_URL}/${locale}${path}`;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return pages.flatMap(({ path, priority, changeFrequency }) => {
    const languages = {
      ...Object.fromEntries(routing.locales.map((l) => [l, url(l, path)])),
      "x-default": url(routing.defaultLocale, path),
    };
    return routing.locales.map((locale) => ({
      url: url(locale, path),
      lastModified,
      changeFrequency,
      priority: locale === routing.defaultLocale ? priority : priority - 0.1,
      alternates: { languages },
    }));
  });
}
