import { ArrowUpRight, Car, MapPin, Phone } from "lucide-react";
import { getLocale } from "next-intl/server";

import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

export async function Location() {
  const locale = (await getLocale()) as Locale;
  const { lat, lon } = site.contact.map;
  const d = 0.03;
  // The bbox is centred on the site, so the gold beacon overlay sits exactly on it.
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d * 1.6},${lat - d},${lon + d * 1.6},${lat + d}&layer=mapnik`;
  const route = `https://www.openstreetmap.org/directions?to=${lat},${lon}#map=13/${lat}/${lon}`;

  return (
    <section
      id="location"
      aria-labelledby="location-title"
      className="relative overflow-hidden bg-ink section-y text-white"
    >
      <div aria-hidden className="atmosphere" />
      <div className="relative container-page">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="location-title"
            tone="dark"
            eyebrow={tr(site.location.eyebrow, locale)}
            title={tr(site.location.title, locale)}
            subtitle={tr(site.location.text, locale)}
          />
          <a
            href={route}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("inverse", "lg", "self-start lg:self-auto")}
          >
            {tr(site.location.route, locale)}
            <ArrowUpRight className="size-4 text-gold" aria-hidden />
          </a>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 md:mt-14">
          <div className="relative aspect-[4/5] overflow-hidden rounded-panel bg-night shadow-deep ring-1 ring-white/[0.06] sm:aspect-[16/10] lg:aspect-[21/9]">
            <iframe
              title={tr(site.location.mapTitle, locale)}
              src={embed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="map-dark absolute inset-0 h-full w-full border-0"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgb(10_15_28/0.65)_100%)]"
            />

            {/* Gold beacon on the site */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-[14px] flex-col items-center">
              <span className="beacon relative grid size-7 place-items-center rounded-full">
                <span className="relative size-7 rounded-full border-4 border-ink bg-gold shadow-[0_0_24px_#ffdea4]" />
              </span>
              <span className="mt-3 rounded-2xl px-4 py-2 text-center glass-dark">
                <span className="block eyebrow text-gold">
                  {tr(site.location.pinLabel, locale)}
                </span>
                <span className="text-xs text-white/80">{tr(site.contact.address, locale)}</span>
              </span>
            </div>

            <div className="absolute right-4 bottom-4 left-4 rounded-card p-5 glass-dark sm:right-auto sm:max-w-sm md:bottom-8 md:left-8 md:p-6">
              <div className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold text-on-gold">
                  <Car className="size-6" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-xl font-extrabold text-gold">
                    {tr(site.contact.distance, locale)}
                  </p>
                  <p className="text-sm text-mist">{tr(site.location.routeNote, locale)}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                <li className="flex items-start gap-2.5 text-white/85">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                  {tr(site.contact.address, locale)}
                </li>
                <li>
                  <a
                    href={site.contact.phoneHref}
                    className="flex items-center gap-2.5 font-semibold text-white hover:text-gold"
                  >
                    <Phone className="size-4 shrink-0 text-gold" aria-hidden />
                    {site.contact.phoneDisplay}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
