"use client";

import { ArrowRight, BedDouble, Lock, Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { statusClasses } from "@/components/ui/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mediaUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatArea, formatMoney } from "@/lib/format";
import type { UnitListItem } from "@/lib/types";

import { unitTotal } from "./price";

type Props = {
  unit: UnitListItem;
  blockLetter: string;
  hovered: boolean;
  onHover: (id: number | null) => void;
  onSelect: (unit: UnitListItem) => void;
};

export function UnitCard({ unit, blockLetter, hovered, onHover, onSelect }: Props) {
  const t = useTranslations("apartments");
  const ts = useTranslations("status");
  const total = unitTotal(unit);
  const sold = unit.status === "sold";
  const image = mediaUrl(unit.layout_image);

  return (
    <button
      type="button"
      onClick={() => onSelect(unit)}
      onMouseEnter={() => onHover(unit.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(unit.id)}
      onBlur={() => onHover(null)}
      className={cn(
        "group flex h-full w-full flex-col rounded-2xl p-3 text-left transition-[box-shadow,transform,background-color] duration-300 ease-out-soft sm:rounded-card sm:p-5",
        sold ? "bg-sand-deep/60" : "bg-white shadow-soft",
        // Phones: the whole card carries the status colour (2-column grid, no room for much else).
        statusClasses[unit.status].mobileSurface,
        hovered && !sold && "-translate-y-1 shadow-lift ring-2 ring-gold",
        hovered && sold && "ring-2 ring-status-sold-line/40",
      )}
    >
      <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <span className="min-w-0">
          <span className="block eyebrow text-muted">
            {t("stepBlock")} {blockLetter}
          </span>
          <span
            className={cn(
              "mt-1 block font-display text-base font-extrabold sm:text-xl",
              sold && "text-muted",
            )}
          >
            {unit.name}
          </span>
        </span>
        <StatusBadge status={unit.status} label={ts(unit.status)} className="shrink-0" />
      </span>

      <span
        className={cn(
          "relative my-3 grid h-28 place-items-center overflow-hidden rounded-xl bg-white/70 p-1.5 sm:my-4 sm:h-40 sm:rounded-2xl sm:bg-sand sm:p-2",
          sold && "grayscale",
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- drawing served by the API
          <img
            src={image}
            alt=""
            loading="lazy"
            className={cn(
              "h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.05]",
              sold && "opacity-40",
            )}
          />
        ) : unit.kind === "commercial" ? (
          <Store className="size-10 text-muted/40" aria-hidden />
        ) : (
          <BedDouble className="size-10 text-muted/40" aria-hidden />
        )}
        <span className="absolute right-2 bottom-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted uppercase">
          {unit.kind === "commercial"
            ? t("commercial")
            : t("roomsShort", { count: unit.rooms ?? 0 })}
        </span>
        {sold && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="rounded-full border-2 border-status-sold-line bg-status-sold-fill px-3 py-1 text-[11px] font-extrabold tracking-widest text-status-sold-text uppercase">
              {ts("sold")}
            </span>
          </span>
        )}
      </span>

      <span className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "font-display text-base font-extrabold tabular-nums sm:text-xl",
            sold && "text-muted",
          )}
        >
          {formatArea(unit.area)}
        </span>
        {total && !sold && (
          <span className="hidden text-xs font-semibold text-muted tabular-nums sm:inline">
            {formatMoney(unit.price_per_m2!)} / м²
          </span>
        )}
      </span>
      <span className="mt-auto block w-full pt-3" />
      <span className="flex items-baseline justify-between gap-2 border-t border-line pt-3">
        <span className="hidden eyebrow text-muted sm:inline">{t("price")}</span>
        <span
          className={cn(
            "font-display font-extrabold whitespace-nowrap tabular-nums",
            sold
              ? "text-sm text-muted"
              : total
                ? "text-[15px] text-gold-deep sm:text-lg"
                : "text-sm text-muted",
          )}
        >
          {sold ? "—" : total ? formatMoney(total) : t("priceOnRequest")}
        </span>
      </span>
      <span
        className={cn(
          "mt-3 flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors sm:mt-4 sm:h-11 sm:text-sm",
          sold
            ? "bg-sand-deep text-muted"
            : unit.status === "reserved"
              ? "bg-sand text-ink group-hover:bg-sand-deep"
              : "bg-ink text-white group-hover:bg-gold group-hover:text-on-gold",
        )}
      >
        {sold ? (
          <>
            {t("unavailable")}
            <Lock className="size-4" aria-hidden />
          </>
        ) : (
          <>
            {t("open")}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </>
        )}
      </span>
    </button>
  );
}
