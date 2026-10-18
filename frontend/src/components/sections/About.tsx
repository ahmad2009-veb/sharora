import { BadgeCheck, MapPin, Phone, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { getLocale } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

import { FEATURE_ICONS } from "./featureIcons";

export async function About() {
  const locale = (await getLocale()) as Locale;
  const { about, contact } = site;

  return (
    <section id="about" aria-labelledby="about-title" className="overflow-hidden bg-sand section-y">
      <div className="container-page grid items-center gap-14 lg:grid-cols-12 lg:gap-12">
        {/* Visual column */}
        <Reveal className="relative lg:col-span-7">
          <div className="group relative aspect-[4/3] overflow-hidden rounded-panel bg-sand-deep shadow-deep">
            <Image
              src={about.image}
              alt={tr(about.imageAlt, locale)}
              fill
              sizes="(min-width: 1024px) 760px, 100vw"
              className="object-cover transition-transform duration-[1.6s] ease-out-soft group-hover:scale-[1.04]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent"
            />
            <div className="absolute right-4 bottom-4 left-4 flex items-center justify-between gap-4 rounded-card p-5 glass-light md:right-6 md:bottom-6 md:left-6 md:p-6">
              <div>
                <p className="eyebrow text-muted">{tr(about.developerLabel, locale)}</p>
                <p className="mt-1 font-display text-lg font-extrabold md:text-xl">
                  {site.brand.name}
                </p>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold text-on-gold shadow-glow">
                <BadgeCheck className="size-6" aria-hidden />
              </span>
            </div>
          </div>

          <div className="relative z-10 -mt-10 ml-4 w-fit rounded-card bg-ink p-5 text-white shadow-deep ring-1 ring-gold/15 md:-mt-12 md:-ml-8 md:p-6">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-night text-gold">
                <ShieldCheck className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-display text-lg font-extrabold text-gold">
                  {tr(about.safety, locale)}
                </p>
                <p className="text-sm text-mist">{tr(about.safetyText, locale)}</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Text column */}
        <Reveal delay={0.1} className="lg:col-span-5">
          <SectionHeading
            id="about-title"
            eyebrow={tr(about.eyebrow, locale)}
            title={tr(about.title, locale)}
          />
          <div className="mt-7 space-y-4 text-body text-muted">
            {about.paragraphs.map((p, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-lg leading-relaxed text-ink md:text-xl"
                    : i === about.paragraphs.length - 1
                      ? "font-medium text-ink"
                      : undefined
                }
              >
                {tr(p, locale)}
              </p>
            ))}
          </div>

          <dl className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-4 rounded-card bg-white p-5 shadow-soft">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-periwinkle text-ink">
                <MapPin className="size-5" aria-hidden />
              </span>
              <div>
                <dt className="eyebrow text-muted">{tr(about.addressLabel, locale)}</dt>
                <dd className="mt-1.5 leading-snug font-semibold">{tr(contact.address, locale)}</dd>
                <dd className="mt-1 text-sm text-muted">{tr(contact.distance, locale)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-card bg-ink p-5 text-white shadow-soft">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-on-gold">
                <Phone className="size-5" aria-hidden />
              </span>
              <div>
                <dt className="eyebrow text-mist">{tr(about.responsible, locale)}</dt>
                <dd className="mt-1.5">
                  <a
                    href={contact.phoneHref}
                    className="font-display text-lg font-extrabold whitespace-nowrap text-gold hover:text-white"
                  >
                    {contact.phoneDisplay}
                  </a>
                </dd>
                <dd className="mt-1 text-sm text-mist">{tr(contact.phoneNote, locale)}</dd>
              </div>
            </div>
          </dl>

          <ul className="mt-3 grid grid-cols-2 gap-3">
            {about.specs.map((spec) => {
              const Icon = FEATURE_ICONS[spec.icon];
              return (
                <li
                  key={spec.icon}
                  className="flex items-center gap-3 rounded-2xl bg-sand-deep/70 px-4 py-3.5 text-[15px] font-semibold"
                >
                  <Icon className="size-5 shrink-0 text-gold-deep" aria-hidden strokeWidth={1.75} />
                  {tr(spec.label, locale)}
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
