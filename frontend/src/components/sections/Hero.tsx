"use client";

import { m, useScroll, useTransform } from "framer-motion";
import { ArrowDown, Building2, Phone, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type CSSProperties } from "react";

import { CountUp, RevealText } from "@/components/motion/Reveal";
import { HeroBackdrop, HeroSlideIndicator } from "@/components/sections/HeroBackdrop";
import { buttonClasses } from "@/components/ui/Button";
import { site, tr } from "@/content/site";
import { cn } from "@/lib/cn";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

function preloaderActive() {
  return document.documentElement.dataset.preloader === "on";
}

/** CSS entrance (.hero-rise): rise by `px` over `duration` s, `at` s after the hero start. */
const rise = (px: number, duration: number, at = 0) =>
  ({ "--rise": `${px}px`, "--dur": `${duration}s`, "--at": `${at}s` }) as CSSProperties;

/**
 * Cinematic full-bleed hero: animated render (see HeroBackdrop) under a navy scrim, a gold-sheen
 * headline and a frosted metrics bar. The interactive 3D model lives in the genplan.
 */
export function Hero() {
  const locale = useLocale() as Locale;
  const t = useTranslations("home");
  const ref = useRef<HTMLElement>(null);
  const [textDelay] = useState(() =>
    typeof document !== "undefined" && preloaderActive() ? 0.95 : 0.15,
  );

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const [line1, line2] = site.hero.titleLines;

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-white lg:min-h-[max(100svh,820px)]"
    >
      <HeroBackdrop scrollYProgress={scrollYProgress} />
      <span className="sr-only">{tr(site.hero.imageAlt, locale)}</span>

      {/* Navy scrims for legibility + warm halo behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(10_15_28/0.65)_0%,rgb(19_27_46/0.35)_32%,rgb(19_27_46/0.7)_70%,#131b2e_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(10_15_28/0.8),rgb(10_15_28/0.25)_55%,transparent_80%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[1200px] -translate-x-1/2 rounded-full bg-gold/10 blur-[140px]"
      />
      <HeroSlideIndicator />

      <m.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="container-page flex flex-1 flex-col justify-center pt-36 pb-12 md:pt-40"
      >
        <div className="max-w-[1040px]">
          {/* Entrances below are CSS (globals.css → .hero-rise), so they start with the first
              paint instead of after hydration; the split-text reveals stay in GSAP. */}
          <p
            className="hero-rise inline-flex items-center gap-3 rounded-full bg-night/70 px-4 py-2 shadow-lg ring-1 ring-gold/20 backdrop-blur-md"
            style={rise(12, 0.7)}
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/70" />
              <span className="relative size-2 rounded-full bg-gold" />
            </span>
            <span className="eyebrow text-gold">{tr(site.hero.badge, locale)}</span>
          </p>

          <h1
            id="hero-title"
            className="mt-7 font-display text-h1 font-extrabold tracking-tight uppercase max-[400px]:text-[2.1rem]"
          >
            {/* Masked line rise: per-letter splitting would break background-clip:text. */}
            <span className="block overflow-hidden pb-1">
              <span className="hero-mask-rise block text-gold-gradient">{tr(line1, locale)}</span>
            </span>
            <RevealText
              as="span"
              split="chars"
              immediate
              delay={textDelay + 0.25}
              className="block text-white"
            >
              {tr(line2, locale)}
            </RevealText>
          </h1>

          <RevealText
            immediate
            delay={textDelay + 0.55}
            className="mt-7 max-w-[720px] text-lg leading-relaxed text-white/75 md:text-xl md:leading-relaxed"
          >
            {tr(site.hero.subtitle, locale)}
          </RevealText>

          <div
            className="hero-rise mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center"
            style={rise(16, 0.8, 0.8)}
          >
            <Link
              href="/apartments"
              data-magnetic
              className={buttonClasses("primary", "lg", "tracking-wider uppercase")}
            >
              {tr(site.actions.chooseApartment, locale)}
              <Building2 className="size-[18px]" aria-hidden />
            </Link>
            <a
              href={site.contact.phoneHref}
              data-magnetic
              className={buttonClasses("inverse", "lg")}
            >
              <Phone className="size-[18px] text-gold" aria-hidden />
              {site.contact.phoneDisplay}
            </a>
            <span className="flex items-center gap-2 text-sm text-white/70 sm:pl-2">
              <ShieldCheck className="size-[18px] text-gold" aria-hidden />
              {tr(site.hero.salesNote, locale)}
            </span>
          </div>
        </div>
      </m.div>

      {/* Floating glass metrics bar */}
      <div className="container-page pb-8 md:pb-12">
        <dl
          style={rise(28, 0.9, 0.95)}
          className="hero-rise grid grid-cols-2 gap-x-6 gap-y-7 rounded-panel p-6 glass-dark md:grid-cols-4 md:gap-0 md:p-8"
        >
          {site.hero.facts.map((fact, i) => {
            const word = typeof fact.value === "string" ? null : tr(fact.value, locale);
            const m = typeof fact.value === "string" ? fact.value.match(/^(\d+)(.*)$/) : null;
            return (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-1.5 md:border-l md:border-white/10 md:px-8 md:first:border-l-0 md:first:pl-0",
                  // Phones: the wide «100 км» and the word fact get a full row each.
                  i >= 2 && "max-md:col-span-2",
                  word && "@container",
                )}
              >
                <dt className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span
                    className={cn(
                      "font-display text-4xl font-extrabold tracking-tight whitespace-nowrap text-gold md:text-5xl",
                      // A word is ~6em wide: same figure size, shrunk only as far as needed to fit.
                      word && "text-[min(2.25rem,16cqi)] md:text-[min(3rem,16cqi)]",
                    )}
                  >
                    {word ??
                      (m ? (
                        <>
                          <CountUp value={Number(m[1])} />
                          {m[2]}
                        </>
                      ) : (
                        (fact.value as string)
                      ))}
                  </span>
                  {fact.label && (
                    <span className="eyebrow whitespace-nowrap text-gold-soft">
                      {tr(fact.label, locale)}
                    </span>
                  )}
                </dt>
                <dd className="text-sm leading-snug text-mist">{tr(fact.text, locale)}</dd>
              </div>
            );
          })}
        </dl>

        <a
          href="#about"
          className="mx-auto mt-6 hidden w-fit items-center gap-2 text-xs font-semibold tracking-[0.2em] text-white/50 uppercase transition-colors hover:text-gold md:flex"
        >
          <ArrowDown className="size-4 animate-bounce" aria-hidden />
          {t("scrollHint")}
        </a>
      </div>
    </section>
  );
}
