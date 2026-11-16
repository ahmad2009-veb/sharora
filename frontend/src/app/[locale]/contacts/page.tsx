import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { ContactDetails } from "@/components/pages/ContactDetails";
import { PageIntro } from "@/components/pages/PageIntro";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { Location } from "@/components/sections/Location";
import { BreadcrumbStructuredData } from "@/components/seo/StructuredData";
import { site, tr } from "@/content/site";
import { asLocale, pageMetadata } from "@/lib/seo";

export const dynamic = "force-static";

const page = site.pages.contacts;

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

export default async function ContactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  return (
    <SiteChrome>
      <BreadcrumbStructuredData locale={locale} path={page.path} name={tr(page.eyebrow, locale)} />
      <PageIntro
        locale={locale}
        eyebrow={tr(page.eyebrow, locale)}
        title={tr(page.h1, locale)}
        lead={tr(page.lead, locale)}
      >
        <ContactDetails locale={locale} />
      </PageIntro>
      <Location />
      <CtaBanner />
    </SiteChrome>
  );
}
