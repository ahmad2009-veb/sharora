import { getLocale } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

import { FEATURE_ICONS } from "./featureIcons";

export async function Features() {
  const locale = (await getLocale()) as Locale;
  const { features } = site;
  const { items } = features;

  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="relative overflow-hidden bg-night section-y text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-gold/[0.07] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 size-[28rem] rounded-full bg-[#525d80]/20 blur-[120px]"
      />

      <div className="relative container-page">
        <Reveal>
          <SectionHeading
            id="features-title"
            tone="dark"
            eyebrow={tr(features.eyebrow, locale)}
            title={tr(features.title, locale)}
            subtitle={tr(features.subtitle, locale)}
          />
        </Reveal>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = FEATURE_ICONS[item.icon];
            return (
              <Reveal as="li" key={item.icon} delay={(i % 4) * 0.06}>
                <article className="group relative h-full overflow-hidden rounded-card bg-ink p-7 ring-gold-hover hover:-translate-y-1">
                  <span
                    aria-hidden
                    className="absolute top-6 right-6 font-display text-sm font-bold text-white/15 tabular-nums"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="grid size-12 place-items-center rounded-2xl bg-night text-gold transition-colors duration-300 group-hover:bg-gold group-hover:text-on-gold">
                    <Icon className="size-6" aria-hidden strokeWidth={1.6} />
                  </span>
                  <h3 className="mt-6 font-display text-lg leading-snug font-extrabold">
                    {tr(item.title, locale)}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-mist">
                    {tr(item.text, locale)}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </ul>

        <Reveal delay={0.1}>
          <blockquote className="mt-12 max-w-3xl border-l-2 border-gold pl-5 font-display text-lg font-semibold text-white/90 md:text-xl">
            {tr(features.closing, locale)}
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}
