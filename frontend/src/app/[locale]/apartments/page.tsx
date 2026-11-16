import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { ApartmentPicker } from "@/components/apartments/ApartmentPicker";
import { ApartmentsShell } from "@/components/apartments/ApartmentsHeader";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { BreadcrumbStructuredData } from "@/components/seo/StructuredData";
import { asLocale, pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "apartments" });
  return pageMetadata({
    locale,
    path: "/apartments",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

// The shell is static; availability and prices are fetched client-side from FastAPI (TanStack Query).
export default async function ApartmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "apartments" });
  return (
    <SiteChrome>
      <BreadcrumbStructuredData locale={locale} path="/apartments" name={t("eyebrow")} />
      <Suspense fallback={<ApartmentsShell />}>
        <ApartmentPicker />
      </Suspense>
    </SiteChrome>
  );
}
