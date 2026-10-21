"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const LABELS: Record<Locale, { short: string; full: string }> = {
  ru: { short: "RU", full: "Русский" },
  tg: { short: "TJ", full: "Тоҷикӣ" },
};

export function LocaleSwitcher({
  tone = "dark",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const locale = useLocale() as Locale;
  const tc = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // Keep apartment selection (?block=&floor=&apt=) when switching language.
    const query = Object.fromEntries(new URLSearchParams(window.location.search));
    router.replace({ pathname, query }, { locale: next, scroll: false });
  }

  return (
    <div
      role="group"
      aria-label={tc("language")}
      className={cn(
        "inline-flex rounded-full p-1 text-[11px] font-bold tracking-wider",
        tone === "dark" ? "bg-night/70 ring-1 ring-white/10" : "bg-sand",
        className,
      )}
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={active}
            aria-label={`${LABELS[l].short} — ${LABELS[l].full}`}
            onClick={() => switchTo(l)}
            className={cn(
              "h-7 min-w-9 rounded-full px-2.5 transition-colors",
              active
                ? tone === "dark"
                  ? "bg-gold text-on-gold"
                  : "bg-ink text-white"
                : tone === "dark"
                  ? "text-mist hover:text-white"
                  : "text-muted hover:text-ink",
            )}
          >
            {LABELS[l].short}
          </button>
        );
      })}
    </div>
  );
}
