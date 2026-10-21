"use client";

import { Eye, FileText, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Lightbox } from "@/components/ui/Lightbox";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

type Doc = (typeof site.documents.items)[number];

export function DocumentsGrid() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const ta = useTranslations("apartments");
  const [active, setActive] = useState<Doc | null>(null);
  const [page, setPage] = useState<number | null>(null);
  const pagesWord = tr(site.documents.pagesLabel, locale);
  const verified = tr(site.documents.verified, locale);
  const openWord = tr(site.documents.open, locale);

  const images = active
    ? Array.from({ length: active.pages }, (_, i) => ({
        src: `/docs/${active.slug}-${i + 1}.jpg`,
        alt: `${tr(active.title, locale)} — ${i + 1}`,
      }))
    : [];

  return (
    <>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {site.documents.items.map((doc, i) => (
          <li key={doc.slug}>
            <button
              type="button"
              onClick={() => {
                setActive(doc);
                setPage(0);
              }}
              className="group relative flex h-full w-full flex-col overflow-hidden rounded-card bg-white p-6 text-left shadow-soft ring-1 ring-ink/[0.04] transition-[box-shadow,transform] duration-500 ease-out-soft hover:-translate-y-1 hover:shadow-lift md:p-7"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-gold-soft to-gold transition-transform duration-500 group-hover:scale-x-100"
              />
              <span className="flex items-start justify-between gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-sand text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-gold">
                  <FileText className="size-7" aria-hidden strokeWidth={1.5} />
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-status-free-fill px-3 py-1 text-[11px] font-bold tracking-wider text-status-free-text uppercase">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  {verified}
                </span>
              </span>
              <span className="mt-6 block font-display text-xl leading-snug font-extrabold">
                {tr(doc.title, locale)}
              </span>
              <span aria-hidden className="block min-h-6 flex-1" />
              <span className="flex items-center justify-between border-t border-line pt-4 text-sm font-semibold text-gold-deep">
                <span className="tabular-nums">
                  №{String(i + 1).padStart(2, "0")} · {doc.pages} {pagesWord}
                </span>
                <span className="flex items-center gap-1.5 transition-transform group-hover:translate-x-0.5">
                  {openWord}
                  <Eye className="size-4" aria-hidden />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Lightbox
        images={images}
        index={active ? page : null}
        onIndexChange={setPage}
        onClose={() => {
          setActive(null);
          setPage(null);
        }}
        title={active ? tr(active.title, locale) : undefined}
        zoomable
        labels={{
          close: t("close"),
          previous: t("previous"),
          next: t("next"),
          zoomIn: ta("zoomIn"),
          zoomOut: ta("zoomOut"),
          reset: ta("zoomReset"),
        }}
      />
    </>
  );
}
