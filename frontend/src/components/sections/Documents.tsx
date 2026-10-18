import { Info } from "lucide-react";
import { getLocale } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

import { DocumentsGrid } from "./DocumentsGrid";

export async function Documents() {
  const locale = (await getLocale()) as Locale;
  return (
    <section id="documents" aria-labelledby="documents-title" className="bg-cream section-y">
      <div className="container-page">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="documents-title"
            eyebrow={tr(site.documents.eyebrow, locale)}
            title={tr(site.documents.title, locale)}
          />
          <p className="flex max-w-sm items-start gap-3 rounded-2xl bg-white p-4 text-[15px] text-muted shadow-soft">
            <Info className="mt-0.5 size-5 shrink-0 text-gold-deep" aria-hidden />
            {tr(site.documents.hint, locale)}
          </p>
        </Reveal>
        <DocumentsGrid />
      </div>
    </section>
  );
}
