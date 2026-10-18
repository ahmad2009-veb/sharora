"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, Building2, Phone, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { CountUp, RevealText } from "@/components/motion/Reveal";
import { buttonClasses } from "@/components/ui/Button";
import { site, tr } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

function preloaderActive() {
  return document.documentElement.dataset.preloader === "on";
}

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Cinematic full-bleed hero: slow Ken Burns render under a navy scrim, a gold-sheen
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
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const [line1, line2] = site.hero.titleLines;

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-white lg:min-h-[max(100svh,820px)]"
    >
      <motion.div aria-hidden className="absolute inset-0 -z-20" style={{ y }}>
        <div className="kenburns absolute inset-0">
          <Image
            src={site.hero.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_40%]"
          />
        </div>
      </motion.div>
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

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="container-page flex flex-1 flex-col justify-center pt-36 pb-12 md:pt-40"
      >
        <div className="max-w-[1040px]">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: textDelay, ease }}
            className="inline-flex items-center gap-3 rounded-full bg-night/70 px-4 py-2 shadow-lg ring-1 ring-gold/20 backdrop-blur-md"
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/70" />
              <span className="relative size-2 rounded-full bg-gold" />
            </span>
            <span className="eyebrow text-gold">{tr(site.hero.badge, locale)}</span>
          </motion.p>

          <h1
            id="hero-title"
            className="mt-7 font-display text-h1 font-extrabold tracking-tight uppercase"
          >
            {/* Masked line rise: per-letter splitting would break background-clip:text. */}
            <span className="block overflow-hidden pb-1">
              <motion.span
                initial={{ y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.1, delay: textDelay, ease: [0.16, 1, 0.3, 1] }}
                className="block text-gold-gradient"
              >
                {tr(line1, locale)}
              </motion.span>
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: textDelay + 0.8, ease }}
            className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center"
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
          </motion.div>
        </div>
      </motion.div>

      {/* Floating glass metrics bar */}
      <div className="container-page pb-8 md:pb-12">
        <motion.dl
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: textDelay + 0.95, ease }}
          className="grid grid-cols-2 gap-x-6 gap-y-7 rounded-panel p-6 glass-dark md:grid-cols-4 md:gap-0 md:p-8"
        >
          {site.hero.facts.map((fact, i) => {
            const m = fact.value.match(/^(\d+)(.*)$/);
            return (
              <div
                key={fact.value + i}
                className="flex flex-col gap-1.5 md:border-l md:border-white/10 md:px-8 md:first:border-l-0 md:first:pl-0"
              >
                <dt className="flex items-baseline gap-2.5">
                  <span className="font-display text-4xl font-extrabold tracking-tight whitespace-nowrap text-gold md:text-5xl">
                    {m ? (
                      <>
                        <CountUp value={Number(m[1])} />
                        {m[2]}
                      </>
                    ) : (
                      fact.value
                    )}
                  </span>
                  <span className="eyebrow text-gold-soft">{tr(fact.label, locale)}</span>
                </dt>
                <dd className="text-sm leading-snug text-mist">{tr(fact.text, locale)}</dd>
              </div>
            );
          })}
        </motion.dl>

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
