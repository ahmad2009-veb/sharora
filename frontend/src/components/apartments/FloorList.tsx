"use client";

import { ArrowUpDown, Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import type { Floor } from "@/lib/types";

type Props = {
  floors: Floor[] | undefined;
  loading: boolean;
  value: number | null;
  onChange: (floorNumber: number) => void;
};

/** Step 2 — floors, top floor first (like a building section). Vertical on desktop, scrolling row on mobile. */
export function FloorList({ floors, loading, value, onChange }: Props) {
  const t = useTranslations("apartments");
  const ordered = floors ? [...floors].sort((a, b) => b.number - a.number) : [];

  return (
    <fieldset className="min-w-0 rounded-card bg-white p-4 shadow-soft">
      <legend className="sr-only">{t("stepFloor")}</legend>
      <div className="flex items-center justify-between border-b border-line px-1 pb-3">
        <span className="flex items-center gap-2 font-display font-extrabold">
          <ArrowUpDown className="size-4 text-gold-deep" aria-hidden />
          <span>
            <span className="text-gold-deep">02</span> · {t("stepFloor")}
          </span>
        </span>
        {floors && (
          <span className="eyebrow text-muted">{t("levels", { count: floors.length })}</span>
        )}
      </div>
      <div className="-mx-4 mt-3 [scrollbar-width:none] overflow-x-auto px-4 pb-1 lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max gap-1.5 lg:min-w-0 lg:flex-col">
          {loading || !floors
            ? Array.from({ length: 11 }, (_, i) => (
                <li key={i}>
                  <Skeleton className="h-12 w-32 lg:w-full" />
                </li>
              ))
            : ordered.map((f) => {
                const active = f.number === value;
                const commercial = f.kind === "commercial";
                const ratio = f.total_count ? f.free_count / f.total_count : 0;
                const dot =
                  f.free_count === 0
                    ? "bg-status-sold-line"
                    : ratio < 0.34
                      ? "bg-status-reserved-line"
                      : "bg-status-free-line";
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange(f.number)}
                      className={cn(
                        "relative flex h-12 w-40 items-center justify-between gap-3 rounded-xl px-3.5 text-left transition-all duration-200 lg:w-full",
                        active ? "bg-ink text-white shadow-lift" : "text-ink hover:bg-sand",
                      )}
                    >
                      <span className="flex items-center gap-2.5 text-[15px] font-semibold whitespace-nowrap">
                        <span
                          aria-hidden
                          className={cn(
                            "size-2 rounded-full",
                            active ? "size-2.5 bg-gold shadow-[0_0_8px_#ffdea4]" : dot,
                          )}
                        />
                        {commercial && (
                          <Store
                            className={cn("size-3.5", active ? "text-gold" : "text-gold-deep")}
                            aria-hidden
                          />
                        )}
                        <span className={cn(active && "text-gold")}>{f.label}</span>
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                          active ? "bg-gold/15 text-gold" : "text-muted",
                        )}
                      >
                        {commercial ? f.total_count : `${f.free_count} ${t("freeShort")}`}
                      </span>
                      <span className="sr-only">{t("freeCount", { count: f.free_count })}</span>
                    </button>
                  </li>
                );
              })}
        </ul>
      </div>
    </fieldset>
  );
}
