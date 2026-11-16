import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { site, telegramLink, tr, whatsappLink } from "@/content/site";
import type { Locale } from "@/i18n/routing";

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="rounded-card p-6 glass-dark">
      <span className="grid size-11 place-items-center rounded-2xl bg-gold text-on-gold">
        {icon}
      </span>
      <h2 className="mt-5 eyebrow text-gold">{title}</h2>
      <div className="mt-2 text-[15px] leading-relaxed text-white/85">{children}</div>
    </li>
  );
}

/** Phone, messengers, hours and address as plain server-rendered text (crawlable). */
export function ContactDetails({ locale }: { locale: Locale }) {
  const p = site.pages.contacts;
  const greeting = tr(site.contact.greeting, locale);
  const link = "font-display text-lg font-bold text-gold transition-colors hover:text-white";
  return (
    <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card icon={<Phone className="size-5" aria-hidden />} title={tr(p.phone, locale)}>
        <a href={site.contact.phoneHref} className={link}>
          {site.contact.phoneDisplay}
        </a>
        <p className="text-sm text-mist">{tr(site.contact.phoneNote, locale)}</p>
      </Card>
      <Card
        icon={<MessageCircle className="size-5" aria-hidden />}
        title={tr(p.messengers, locale)}
      >
        <a
          href={whatsappLink(greeting)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${link} block`}
        >
          WhatsApp
        </a>
        <a
          href={telegramLink(greeting)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${link} block`}
        >
          Telegram
        </a>
      </Card>
      <Card icon={<Clock className="size-5" aria-hidden />} title={tr(p.hours, locale)}>
        <p>{tr(site.contact.hours, locale)}</p>
      </Card>
      <Card icon={<MapPin className="size-5" aria-hidden />} title={tr(p.address, locale)}>
        <address className="not-italic">{tr(site.contact.address, locale)}</address>
        <p className="text-sm text-mist">{tr(site.contact.distance, locale)}</p>
      </Card>
    </ul>
  );
}
