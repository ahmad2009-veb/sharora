import { getLocale } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

import { GenplanExplorer } from "./GenplanExplorer";

export async function Genplan() {
  const locale = (await getLocale()) as Locale;
  const { genplan } = site;

  return (
    <section
      id="genplan"
      aria-labelledby="genplan-title"
      className="relative overflow-hidden bg-ink section-y text-white"
    >
      <div aria-hidden className="atmosphere" />
      <div className="relative container-page">
        <Reveal>
          <SectionHeading
            id="genplan-title"
            tone="dark"
            eyebrow={tr(genplan.eyebrow, locale)}
            title={tr(genplan.title, locale)}
            subtitle={tr(genplan.subtitle, locale)}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <GenplanExplorer />
        </Reveal>
      </div>
    </section>
  );
}
