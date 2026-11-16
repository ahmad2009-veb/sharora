import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { PageIntro } from "@/components/pages/PageIntro";
import { About } from "@/components/sections/About";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { Documents } from "@/components/sections/Documents";
import { Features } from "@/components/sections/Features";
import { Interior } from "@/components/sections/Interior";
import { BreadcrumbStructuredData, ComplexStructuredData } from "@/components/seo/StructuredData";
import { site, tr } from "@/content/site";
import { asLocale, pageMetadata } from "@/lib/seo";

// Fully static, like the home page: content comes from src/content/site.ts.
export const dynamic = "force-static";

const page = site.pages.about;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return pageMetadata({
    locale,
    path: page.path,
    title: tr(page.title, locale),
    description: tr(page.description, locale),
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  return (
    <SiteChrome>
      <BreadcrumbStructuredData locale={locale} path={page.path} name={tr(page.eyebrow, locale)} />
      <ComplexStructuredData locale={locale} />
      <PageIntro
        locale={locale}
        eyebrow={tr(page.eyebrow, locale)}
        title={tr(page.h1, locale)}
        lead={tr(page.lead, locale)}
      />
      <About />
      <Features />
      <Interior />
      <Documents />
      <CtaBanner />
    </SiteChrome>
  );
}
