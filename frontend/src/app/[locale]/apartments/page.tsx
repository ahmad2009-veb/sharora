import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { ApartmentPicker } from "@/components/apartments/ApartmentPicker";
import { ApartmentsShell } from "@/components/apartments/ApartmentsHeader";
import { SiteChrome } from "@/components/layout/SiteChrome";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "apartments" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: locale === "ru" ? "/apartments" : `/${locale}/apartments`,
      languages: { ru: "/apartments", tg: "/tg/apartments" },
    },
  };
}

// The shell is static; availability and prices are fetched client-side from FastAPI (TanStack Query).
export default async function ApartmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SiteChrome>
      <Suspense fallback={<ApartmentsShell />}>
        <ApartmentPicker />
      </Suspense>
    </SiteChrome>
  );
}
