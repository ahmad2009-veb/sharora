"use client";

import { Calculator, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

import { BlockSelector } from "./BlockSelector";
import { StatsBar } from "./StatsBar";

/**
 * Dark top of /apartments: title, live stats, calculator / call and the block step.
 * Also the server-rendered placeholder (ApartmentsShell) shown until the picker hydrates,
 * so the title paints with the HTML instead of after JavaScript.
 */
export function ApartmentsHeader({
  selection,
  onCalculator,
  blockSelector,
}: {
  /** "Блок 1 · Этаж 2" once a floor is chosen. */
  selection?: string;
  onCalculator?: () => void;
  blockSelector?: ReactNode;
}) {
  const t = useTranslations("apartments");
  const locale = useLocale() as Locale;
  return (
    <section aria-labelledby="apartments-title" className="relative bg-ink pt-20 text-white">
      <div aria-hidden className="atmosphere" />
      <div className="relative container-page pt-10 pb-8 md:pt-14">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-gold/15 px-3 py-1 eyebrow text-gold">
                {t("eyebrow")}
              </span>
              <span className="size-1 rounded-full bg-mist/60" />
              <span className="text-sm text-mist">{tr(site.contact.address, locale)}</span>
            </p>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <h1
                id="apartments-title"
                className="font-display text-h2 font-extrabold tracking-tight md:text-[3.25rem] md:leading-[1.05]"
              >
                {t("title")}
              </h1>
              {selection && (
                <span className="font-display text-xl font-bold text-gold md:text-2xl">
                  {selection}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 xl:items-end">
            <StatsBar />
            <div className="flex flex-wrap gap-3">
              <Button onClick={onCalculator}>
                <Calculator className="size-4" aria-hidden />
                {t("calculator")}
              </Button>
              <a href={site.contact.phoneHref} className={buttonClasses("inverse", "md")}>
                <Phone className="size-4 text-gold" aria-hidden />
                {site.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>

        {blockSelector && <div className="mt-8">{blockSelector}</div>}
      </div>
    </section>
  );
}

/** Suspense fallback of /apartments: the header with loading placeholders. */
export function ApartmentsShell() {
  return (
    <>
      <ApartmentsHeader
        blockSelector={
          <BlockSelector blocks={undefined} loading value={null} onChange={() => {}} />
        }
      />
      <div className="min-h-[100svh] bg-sand" />
    </>
  );
}
