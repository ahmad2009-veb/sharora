"use client";

import { AnimatePresence, m } from "framer-motion";
import { MessageCircle, MessageSquareText, Phone, Send, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export const FEEDBACK_OPEN_EVENT = "zarafshon:feedback-open";
const OPEN_EVENT = FEEDBACK_OPEN_EVENT;

/** Opens the floating feedback menu from anywhere (e.g. the footer button). */
export function FeedbackTrigger({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className={buttonClasses("inverse", "md")}
    >
      <MessageSquareText className="size-4" aria-hidden />
      {label}
    </button>
  );
}

/** Floating "Предложение или жалоба" button with call / WhatsApp / Telegram links. No backend. */
export function FeedbackFab() {
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("a")?.focus());
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const channels = [
    {
      href: site.contact.phoneHref,
      label: tr(site.feedback.channels.call, locale),
      sub: site.contact.phoneDisplay,
      Icon: Phone,
    },
    {
      href: site.contact.whatsapp,
      label: tr(site.feedback.channels.whatsapp, locale),
      sub: "wa.me",
      Icon: MessageCircle,
      external: true,
    },
    {
      href: site.contact.telegram,
      label: tr(site.feedback.channels.telegram, locale),
      sub: "t.me",
      Icon: Send,
      external: true,
    },
  ];

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-[104px] z-[46] flex flex-col items-end gap-3 lg:right-6 lg:bottom-6 lg:z-30"
    >
      <AnimatePresence>
        {open && (
          <m.div
            id={panelId}
            role="region"
            aria-label={tr(site.feedback.title, locale)}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-[min(340px,calc(100vw-32px))] origin-bottom-right rounded-card bg-ink p-5 text-white shadow-deep ring-1 ring-gold/20"
          >
            <p className="font-display text-lg font-extrabold">{tr(site.feedback.title, locale)}</p>
            <p className="mt-1 text-sm text-mist">{tr(site.feedback.text, locale)}</p>
            <ul className="mt-4 space-y-1">
              {channels.map(({ href, label, sub, Icon, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-center gap-3 rounded-control p-2.5 transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-night text-gold ring-1 ring-white/10 transition-colors group-hover:bg-gold group-hover:text-on-gold">
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span className="text-sm text-mist">{sub}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={tr(site.actions.feedback, locale)}
        className={cn(
          "flex h-14 items-center gap-2.5 rounded-full bg-gold pr-6 pl-5 text-[13px] font-bold tracking-wider text-on-gold uppercase shadow-[0_10px_30px_rgb(255_222_164/0.45)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-gold-soft",
          "max-lg:hidden",
        )}
      >
        {open ? (
          <X className="size-5" aria-hidden />
        ) : (
          <MessageSquareText className="size-5" aria-hidden />
        )}
        <span className="hidden md:inline">{tr(site.actions.feedback, locale)}</span>
      </button>
    </div>
  );
}
