import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export function Logo({
  tone = "dark",
  size = "md",
  className,
}: {
  tone?: "light" | "dark";
  /** `lg` is the header size: bigger mark and wordmark from the `lg` breakpoint. */
  size?: "md" | "lg";
  className?: string;
}) {
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const tagline = tr(site.brand.tagline, locale);
  const dark = tone === "dark";
  const lg = size === "lg";
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-3", className)}
      // The name starts with the visible wordmark (WCAG «label in name»).
      aria-label={tc("homeLink", { name: `${site.brand.wordmark} · ${tagline}` })}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[14px] bg-white shadow-soft ring-1 transition-shadow duration-500",
          lg && "lg:size-[52px] lg:rounded-2xl",
          dark ? "ring-gold/40 group-hover:shadow-[0_0_24px_rgb(255_222_164/0.45)]" : "ring-ink/10",
        )}
      >
        <Image
          src={site.brand.logo}
          alt=""
          width={34}
          height={34}
          priority
          className={cn(lg && "lg:size-10")}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[19px] font-extrabold tracking-[0.18em] uppercase",
            lg && "lg:text-[22px]",
            dark ? "text-gold" : "text-ink",
          )}
        >
          {site.brand.wordmark}
        </span>{" "}
        <span
          className={cn(
            "mt-1.5 text-[9.5px] font-semibold tracking-[0.24em] uppercase",
            lg && "lg:text-[10.5px]",
            dark ? "text-mist" : "text-muted",
          )}
        >
          {tagline}
        </span>
      </span>
    </Link>
  );
}
