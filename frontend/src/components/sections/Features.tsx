import { Sparkles } from "lucide-react";
import { getLocale } from "next-intl/server";

import { CountUp } from "@/components/motion/Reveal";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

import { FEATURE_ICONS } from "./featureIcons";

export async function Features() {
  const locale = (await getLocale()) as Locale;
  const { features } = site;
  const wide = features.items.find((i) => "wide" in i && i.wide);
  const items = features.items.filter((i) => i !== wide);

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

        {wide && (
          <Reveal delay={0.05} className="mt-12 md:mt-16">
            <article className="relative overflow-hidden rounded-panel bg-gradient-to-br from-ink via-ink to-[#525d80]/40 p-7 shadow-deep ring-1 ring-white/[0.06] md:p-12">
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_80%_50%,rgb(255_222_164/0.12),transparent_60%)]"
              />
              <div className="relative grid items-center gap-10 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <p className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3.5 py-1.5 eyebrow text-gold">
                    <Sparkles className="size-4" aria-hidden />
                    {tr(features.wideBadge, locale)}
                  </p>
                  <h3 className="mt-5 font-display text-3xl leading-tight font-extrabold tracking-tight md:text-[2.75rem]">
                    {tr(wide.title, locale)}
                  </h3>
                  <p className="mt-4 max-w-2xl text-mist md:text-lg">{tr(wide.text, locale)}</p>
                  <blockquote className="mt-6 border-l-2 border-gold pl-5 font-display text-lg font-semibold text-white/90">
                    {tr(features.closing, locale)}
                  </blockquote>
                </div>
                {"stat" in wide && wide.stat && (
                  <div className="lg:col-span-4 lg:justify-self-end">
                    <div className="rounded-card p-7 glass-dark lg:text-right">
                      <p className="eyebrow text-mist">{tr(wide.stat.label, locale)}</p>
                      <p className="mt-2 font-display text-7xl leading-none font-extrabold text-gold md:text-8xl">
                        <CountUp value={Number(wide.stat.value)} />
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>
          </Reveal>
        )}

        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>
    </section>
  );
}
