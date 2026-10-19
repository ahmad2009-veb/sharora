import { ArrowUpRight, Clock, MapPin, Phone } from "lucide-react";
import { getLocale } from "next-intl/server";

import { buttonClasses } from "@/components/ui/Button";
import { site, tr } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import { FeedbackTrigger } from "./FeedbackMenu";
import { Logo } from "./Logo";

export async function Footer() {
  const locale = (await getLocale()) as Locale;

  return (
    <footer id="contacts" className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-gold/10 blur-[120px]"
      />
      {/* Oversized wordmark watermark */}
      <p
        aria-hidden
        className="pointer-events-none absolute right-0 -bottom-[0.18em] left-0 text-center font-display text-[22vw] leading-none font-extrabold tracking-tighter text-white/[0.025] select-none"
      >
        ЗАРАФШОН
      </p>

      <div className="relative container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1fr_1fr] lg:py-24">
        <div className="space-y-6">
          <Logo />
          <p className="max-w-sm text-[15px] leading-relaxed text-mist">
            {tr(site.footer.about, locale)}
          </p>
          <FeedbackTrigger label={tr(site.actions.feedback, locale)} />
        </div>

        <nav aria-labelledby="footer-sections">
          <h2 id="footer-sections" className="mb-5 eyebrow text-gold">
            {tr(site.footer.sections, locale)}
          </h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-1">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[15px] text-mist transition-colors hover:text-gold"
                >
                  {tr(item.label, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-5 eyebrow text-gold">{tr(site.footer.contacts, locale)}</h2>
          <ul className="space-y-5 text-[15px]">
            <li>
              <a href={site.contact.phoneHref} className="group flex items-start gap-3">
                <Phone className="mt-1 size-4 shrink-0 text-gold" aria-hidden />
                <span>
                  <span className="block font-display text-lg font-bold text-gold group-hover:text-white">
                    {site.contact.phoneDisplay}
                  </span>
                  <span className="text-sm text-mist">{tr(site.contact.phoneNote, locale)}</span>
                </span>
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-1 size-4 shrink-0 text-gold" aria-hidden />
              <span>
                <span className="block text-white/90">{tr(site.contact.address, locale)}</span>
                <span className="text-sm text-mist">{tr(site.contact.distance, locale)}</span>
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-5 eyebrow text-gold">{tr(site.footer.visit, locale)}</h2>
          <p className="flex items-start gap-3 text-sm leading-relaxed text-mist">
            <Clock className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
            {tr(site.footer.visitText, locale)}
          </p>
          <Link
            href="/apartments"
            className={buttonClasses(
              "inverse",
              "md",
              "mt-6 text-gold ring-gold/40 hover:bg-gold hover:text-on-gold hover:ring-gold",
            )}
          >
            {tr(site.actions.chooseApartment, locale)}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="relative border-t border-white/[0.07]">
        <div className="container-page flex flex-col gap-3 pt-6 pb-32 text-sm text-mist md:flex-row md:items-center md:justify-between lg:pb-6">
          <p>{tr(site.footer.rights, locale)}</p>
          {/* Manager entry point lives here only — the public header has no login button. */}
          <Link
            href="/admin/login"
            className="text-xs text-mist/70 transition-colors hover:text-gold"
          >
            {tr(site.footer.managerLogin, locale)}
          </Link>
        </div>
      </div>
    </footer>
  );
}
