import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { Providers } from "@/components/Providers";
import { SiteStructuredData } from "@/components/seo/StructuredData";
import { site, tr } from "@/content/site";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

// `subsets` only picks which files are <link rel=preload>ed: the generated CSS still declares
// every subset (unicode-range), so Tajik letters (ҳ ӣ ҷ ӯ қ ғ, cyrillic-ext) render the same and
// their file loads on demand on /tg. The Russian first screen needs only latin + cyrillic, so
// this saves two ~28 KB preloads competing with the hero before LCP.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#131B2E",
  width: "device-width",
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = (hasLocale(routing.locales, locale) ? locale : "ru") as Locale;
  const title = tr(site.seo.title, l);
  const description = tr(site.seo.description, l);
  const canonical = l === "ru" ? "/" : `/${l}`;
  return {
    metadataBase: new URL(SITE_URL),
    // Home uses the full title; subpages get "<page title> · Zarafshon".
    title: { default: title, template: `%s · ${site.seo.siteName}` },
    description,
    keywords: tr(site.seo.keywords, l),
    applicationName: site.seo.siteName,
    authors: [{ name: site.brand.name, url: SITE_URL }],
    creator: site.brand.name,
    publisher: site.brand.name,
    category: "real estate",
    alternates: {
      canonical,
      languages: { ru: "/", tg: "/tg", "x-default": "/" },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    // Search Console / Yandex Webmaster ownership tags: set the codes at build time if needed.
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
    },
    openGraph: {
      type: "website",
      siteName: site.seo.siteName,
      url: canonical,
      title,
      description,
      locale: l === "ru" ? "ru_RU" : "tg_TJ",
      alternateLocale: l === "ru" ? ["tg_TJ"] : ["ru_RU"],
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
    // /favicon.ico (16/32/48) and /apple-icon.png come from app/ file conventions; Google
    // Search wants a square icon whose size is a multiple of 48 px.
    icons: {
      icon: [
        { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body>
        <SiteStructuredData locale={locale} />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
