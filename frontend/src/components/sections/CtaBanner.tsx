import { ArrowRight, CheckCheck, KeyRound } from "lucide-react";
import { getLocale } from "next-intl/server";

import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { site, tr } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import { QuickLeadForm } from "./QuickLeadForm";

export async function CtaBanner() {
  const locale = (await getLocale()) as Locale;
  const { cta } = site;
  return (
    <section id="cta" aria-labelledby="cta-title" className="bg-sand py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-panel bg-ink px-6 py-10 text-white shadow-deep md:p-14 lg:p-16">
            <div aria-hidden className="atmosphere" />
            <div
              aria-hidden
              className="absolute -right-24 -bottom-24 size-[500px] rounded-full bg-gold/10 blur-[140px]"
            />
            <div className="relative grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-night px-4 py-2 eyebrow text-gold">
                  <KeyRound className="size-4" aria-hidden />
                  {tr(cta.badge, locale)}
                </p>
                <h2
                  id="cta-title"
                  className="mt-6 font-display text-h2 font-extrabold tracking-tight"
                >
                  {tr(cta.title, locale)}
                </h2>
                <p className="mt-5 max-w-xl text-mist md:text-lg">{tr(cta.text, locale)}</p>
                <ul className="mt-8 space-y-3.5">
                  {cta.points.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/90">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                        <CheckCheck className="size-4" aria-hidden />
                      </span>
                      {tr(p, locale)}
                    </li>
                  ))}
                </ul>
                <Link href="/apartments" className={buttonClasses("inverse", "lg", "mt-10")}>
                  {tr(cta.browse, locale)}
                  <ArrowRight className="size-[18px] text-gold" aria-hidden />
                </Link>
              </div>
              <QuickLeadForm />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
