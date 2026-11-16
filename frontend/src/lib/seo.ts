import type { Metadata } from "next";

import { site } from "@/content/site";
import { routing, type Locale } from "@/i18n/routing";

import { SITE_URL } from "./site-url";

/** "/apartments" → "/apartments" (ru, unprefixed) or "/tg/apartments"; "" → "/" or "/tg". */
export function localePath(locale: Locale, path = ""): string {
  if (locale === routing.defaultLocale) return path || "/";
  return `/${locale}${path}`;
}

/** Absolute URL, written exactly like the canonical tag Next renders (no trailing slash on home). */
export function absoluteUrl(locale: Locale, path = ""): string {
  const p = localePath(locale, path);
  return p === "/" ? SITE_URL : `${SITE_URL}${p}`;
}

export function asLocale(locale: string): Locale {
  return (routing.locales as readonly string[]).includes(locale) ? (locale as Locale) : "ru";
}

/**
 * Per-page metadata: unique title + description, canonical, hreflang and Open Graph.
 * A page's `openGraph` replaces the layout's one entirely, so the shared fields are repeated here.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  absoluteTitle = false,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  /** true: use the title as is, without the " · Zarafshon" suffix. */
  absoluteTitle?: boolean;
}): Metadata {
  const canonical = localePath(locale, path);
  const languages = Object.fromEntries([
    ...routing.locales.map((l) => [l, localePath(l, path)]),
    ["x-default", localePath(routing.defaultLocale, path)],
  ]);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName: site.seo.siteName,
      url: canonical,
      title,
      description,
      locale: locale === "ru" ? "ru_RU" : "tg_TJ",
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => (l === "ru" ? "ru_RU" : "tg_TJ")),
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
  };
}
