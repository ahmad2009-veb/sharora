import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { Providers } from "@/components/Providers";
import { site, tr } from "@/content/site";
import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
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
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${site.brand.name}` },
    description,
    applicationName: site.brand.name,
    alternates: {
      canonical: l === "ru" ? "/" : `/${l}`,
      languages: { ru: "/", tg: "/tg" },
    },
    openGraph: {
      type: "website",
      siteName: site.brand.name,
      title,
      description,
      locale: l === "ru" ? "ru_RU" : "tg_TJ",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
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
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
