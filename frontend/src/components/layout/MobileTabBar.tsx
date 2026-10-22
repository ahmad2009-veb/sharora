"use client";

import { AnimatePresence, m, useDragControls, type PanInfo } from "framer-motion";
import {
  Building2,
  Calculator,
  ChevronRight,
  FileText,
  House,
  Info,
  Languages,
  LockKeyhole,
  MapPin,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  Send,
  Sofa,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useDialog } from "@/components/ui/useDialog";
import { useMounted } from "@/components/ui/useMounted";
import { site, telegramLink, tr, whatsappLink } from "@/content/site";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useInterestUnit } from "@/lib/contact-context";

import { FEEDBACK_OPEN_EVENT } from "./FeedbackMenu";
import { LocaleSwitcher } from "./LocaleSwitcher";

type Tab = "home" | "apartments" | "contact" | "more";
type Sheet = "contact" | "more";

const glass =
  "bg-[linear-gradient(180deg,rgb(255_255_255/0.14),rgb(255_255_255/0.04))] backdrop-blur-2xl backdrop-saturate-[180%] ring-1 ring-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_18px_40px_rgb(5_8_18/0.45)]";

/**
 * Phone navigation: a floating "liquid glass" pill with four tabs. «Заявка» and «Ещё»
 * open sheets above the bar. Hidden from `lg` up, where the header nav takes over.
 * The bar sits above modals (z-60) so «Заявка» works from an open apartment card.
 */
export function MobileTabBar() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  const [sheet, setSheet] = useState<Sheet | null>(null);

  useEffect(() => setSheet(null), [pathname]);
  // Lets modals keep their content clear of the bar (see [data-tabbar] in globals.css).
  useEffect(() => {
    document.documentElement.dataset.tabbar = "on";
    return () => {
      delete document.documentElement.dataset.tabbar;
    };
  }, []);

  const active: Tab | null =
    sheet ?? (pathname.startsWith("/apartments") ? "apartments" : pathname === "/" ? "home" : null);

  const tabs: { id: Tab; label: string; Icon: LucideIcon; href?: string }[] = [
    { id: "home", label: t("home"), Icon: House, href: "/" },
    { id: "apartments", label: t("apartments"), Icon: Building2, href: "/apartments" },
    { id: "contact", label: t("contact"), Icon: Send },
    { id: "more", label: t("more"), Icon: MoreHorizontal },
  ];

  const close = () => setSheet(null);

  return (
    <>
      <ContactSheet open={sheet === "contact"} onClose={close} />
      <MoreSheet open={sheet === "more"} onClose={close} />
      <nav
        aria-label={t("label")}
        className={cn(
          "fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-[60] rounded-[30px] bg-ink/78 p-1.5 lg:hidden",
          glass,
        )}
      >
        <ul className="grid grid-cols-4">
          {tabs.map(({ id, label, Icon, href }) => {
            const isActive = active === id;
            const inner = (
              <>
                {isActive && (
                  <m.span
                    layoutId="tab-capsule"
                    aria-hidden
                    className="absolute inset-0 rounded-[24px] bg-[linear-gradient(180deg,rgb(255_222_164/0.32),rgb(255_222_164/0.12))] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_0_22px_rgb(255_222_164/0.25)] ring-1 ring-gold/45"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon
                  className="relative size-[22px]"
                  strokeWidth={isActive ? 2.2 : 1.8}
                  aria-hidden
                />
                <span className="relative text-[10.5px] font-semibold tracking-wide">{label}</span>
              </>
            );
            const cls = cn(
              "relative flex h-[58px] w-full flex-col items-center justify-center gap-1 rounded-[24px] transition-colors duration-300",
              isActive ? "text-gold" : "text-white/55 active:text-white",
            );
            return (
              <li key={id}>
                {href ? (
                  <Link
                    href={href}
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                    className={cls}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-expanded={sheet === id}
                    aria-controls={`${id}-sheet`}
                    onClick={() => setSheet((s) => (s === id ? null : (id as Sheet)))}
                    className={cls}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/**
 * Glass sheet rising above the tab bar: drag handle (swipe down to close), ×, dimmed
 * backdrop. Portaled to <body> so it stacks above an open modal and is the top-most
 * dialog for Escape handling.
 */
function GlassSheet({
  id,
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const mounted = useMounted();
  const ref = useDialog(open, onClose);
  const drag = useDragControls();

  if (!mounted) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <m.div
            aria-hidden
            className="fixed inset-0 z-[58] bg-night/55 backdrop-blur-[3px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <m.div
            ref={ref}
            id={id}
            data-dialog
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.7 }}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn(
              "fixed inset-x-4 bottom-[calc(max(16px,env(safe-area-inset-bottom))+82px)] z-[59] flex max-h-[calc(100svh-140px)] flex-col rounded-[28px] bg-ink/85 text-white outline-none lg:hidden",
              glass,
            )}
          >
            {/* Drag zone: handle + header. Swiping down here closes the sheet. */}
            <div
              onPointerDown={(e) => drag.start(e)}
              className="shrink-0 cursor-grab touch-none px-5 pt-2.5 pb-3 active:cursor-grabbing"
            >
              <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-white/30" />
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-extrabold">{title}</p>
                  {subtitle && <p className="mt-1 text-sm leading-snug text-mist">{subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={t("close")}
                  className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors active:bg-white/20"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain px-3 pb-3">{children}</div>
          </m.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function TelegramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

/** «Заявка»: Telegram / WhatsApp / call, prefilled with the open apartment if any. */
function ContactSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("mobileNav");
  const locale = useLocale() as Locale;
  const unit = useInterestUnit();
  const message = unit
    ? tr(site.contact.unitGreeting, locale).replace("{unit}", unit)
    : tr(site.contact.greeting, locale);

  const actions: {
    href: string;
    label: string;
    icon: ReactNode;
    color: string;
    external?: boolean;
  }[] = [
    {
      href: telegramLink(message),
      label: t("telegram"),
      icon: <TelegramGlyph />,
      color: "bg-[#229ED9] text-white",
      external: true,
    },
    {
      href: whatsappLink(message),
      label: t("whatsapp"),
      icon: <MessageCircle className="size-[22px]" strokeWidth={2.2} aria-hidden />,
      color: "bg-[#25D366] text-white",
      external: true,
    },
    {
      href: site.contact.phoneHref,
      label: t("call"),
      icon: <Phone className="size-5" strokeWidth={2.2} aria-hidden />,
      color: "bg-gold text-on-gold",
    },
  ];

  return (
    <GlassSheet
      id="contact-sheet"
      open={open}
      onClose={onClose}
      title={t("contactTitle")}
      subtitle={t("contactText")}
    >
      {unit && (
        <p className="mx-1 mb-3 flex items-center gap-2 rounded-2xl bg-gold/10 px-3 py-2 text-xs font-semibold text-gold ring-1 ring-gold/25">
          <Building2 className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{unit}</span>
        </p>
      )}
      <ul className="space-y-2">
        {actions.map(({ href, label, icon, color, external }) => (
          <li key={label}>
            <a
              href={href}
              onClick={onClose}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex h-14 items-center gap-3.5 rounded-2xl bg-white/[0.07] pr-4 pl-2 text-[15px] font-bold ring-1 ring-white/10 transition-colors active:bg-white/15"
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", color)}>
                {icon}
              </span>
              {label}
              <ChevronRight className="ml-auto size-5 text-white/40" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 mb-1 text-center text-xs text-mist">
        <span className="font-semibold text-white/80 tabular-nums">
          {site.contact.phoneDisplay}
        </span>
        {" · "}
        {tr(site.contact.hours, locale)}
      </p>
    </GlassSheet>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("mobileNav");

  const links: { href: string; label: string; Icon: LucideIcon }[] = [
    { href: "/#about", label: t("about"), Icon: Info },
    { href: "/#features", label: t("features"), Icon: Sparkles },
    { href: "/#interior", label: t("interior"), Icon: Sofa },
    { href: "/#documents", label: t("documents"), Icon: FileText },
    { href: "/apartments?calc=1", label: t("calculator"), Icon: Calculator },
    { href: "/#location", label: t("location"), Icon: MapPin },
  ];

  const row =
    "flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left text-[15px] font-semibold text-white transition-colors active:bg-white/10";
  const icon = (Icon: LucideIcon, gold = false) => (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl ring-1",
        gold ? "bg-gold text-on-gold ring-gold" : "bg-white/[0.07] text-gold ring-white/10",
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
    </span>
  );
  const chevron = <ChevronRight className="ml-auto size-4 text-white/35" aria-hidden />;

  return (
    <GlassSheet id="more-sheet" open={open} onClose={onClose} title={t("more")}>
      <ul className="space-y-0.5">
        {links.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link href={href} onClick={onClose} className={row}>
              {icon(Icon)}
              {label}
              {chevron}
            </Link>
          </li>
        ))}
      </ul>

      <div className="my-2 h-px bg-white/10" />

      <ul className="space-y-0.5">
        <li>
          <a href={site.contact.phoneHref} className={row}>
            {icon(Phone, true)}
            <span>
              <span className="block">{t("contacts")}</span>
              <span className="text-sm font-medium text-gold">{site.contact.phoneDisplay}</span>
            </span>
            {chevron}
          </a>
        </li>
        <li>
          <button
            type="button"
            className={row}
            onClick={() => {
              onClose();
              window.dispatchEvent(new Event(FEEDBACK_OPEN_EVENT));
            }}
          >
            {icon(MessageSquareText)}
            {t("feedback")}
            {chevron}
          </button>
        </li>
        <li className={cn(row, "active:bg-transparent")}>
          {icon(Languages)}
          {t("language")}
          <LocaleSwitcher className="ml-auto" />
        </li>
        <li>
          <Link href="/admin-dashboard/login" onClick={onClose} className={cn(row, "text-white/70")}>
            {icon(LockKeyhole)}
            {t("managers")}
            {chevron}
          </Link>
        </li>
      </ul>
    </GlassSheet>
  );
}
