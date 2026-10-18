import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

export function Logo({
  tone = "dark",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-3", className)}
      aria-label={`${site.brand.name} — на главную`}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[14px] bg-white shadow-soft ring-1 transition-shadow duration-500",
          dark ? "ring-gold/40 group-hover:shadow-[0_0_24px_rgb(255_222_164/0.45)]" : "ring-ink/10",
        )}
      >
        <Image src={site.brand.logo} alt="" width={34} height={34} priority unoptimized />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[19px] font-extrabold tracking-[0.18em] uppercase",
            dark ? "text-gold" : "text-ink",
          )}
        >
          Zarafshon
        </span>
        <span
          className={cn(
            "mt-1.5 text-[9.5px] font-semibold tracking-[0.24em] uppercase",
            dark ? "text-mist" : "text-muted",
          )}
        >
          Sokhtmon · Residence
        </span>
      </span>
    </Link>
  );
}
