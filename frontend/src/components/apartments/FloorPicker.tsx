"use client";

import { ChevronLeft, ChevronRight, MoveHorizontal, Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import type { Floor } from "@/lib/types";

type Props = {
  floors: Floor[] | undefined;
  loading: boolean;
  value: number | null;
  /** `dir`: -1 = a floor down, 1 = a floor up (drives the slide animation). */
  onChange: (floorNumber: number, dir: -1 | 1) => void;
};

/**
 * Phones: the current floor large with ‹ › steppers, and every floor as a pill on one
 * line (no horizontal scrolling to reach a floor). FloorList is the tablet / desktop view.
 */
export function FloorPicker({ floors, loading, value, onChange }: Props) {
  const t = useTranslations("apartments");
  const ordered = floors ? [...floors].sort((a, b) => a.number - b.number) : [];
  const index = ordered.findIndex((f) => f.number === value);
  const current = ordered[index];
  const go = (i: number) => {
    const f = ordered[i];
    if (f && i !== index) onChange(f.number, i > index ? 1 : -1);
  };

  if (loading || !floors) return <Skeleton className="h-[164px] rounded-[24px] md:hidden" />;

  const stepper =
    "grid size-12 shrink-0 place-items-center rounded-full bg-sand text-ink transition-[background-color,transform,opacity] active:scale-95 active:bg-sand-deep disabled:opacity-30";

  return (
    <fieldset className="min-w-0 rounded-[24px] bg-white p-3 shadow-soft md:hidden">
      <legend className="sr-only">{t("stepFloor")}</legend>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index <= 0}
          aria-label={t("floorDown")}
          className={stepper}
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          {current && (
            <>
              <p className="font-display text-[28px] leading-tight font-extrabold tracking-tight">
                {t("floorN", { n: current.number })}
              </p>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-muted">
                {current.kind === "commercial" ? (
                  <>
                    <Store className="size-4 text-gold-deep" aria-hidden />
                    {t("shop")}
                  </>
                ) : (
                  t("floorOf", { free: current.free_count, total: current.total_count })
                )}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index < 0 || index >= ordered.length - 1}
          aria-label={t("floorUp")}
          className={stepper}
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      </div>

      <div
        role="group"
        aria-label={t("stepFloor")}
        className="relative mt-3 grid rounded-2xl bg-sand p-1"
        style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(0, 1fr))` }}
      >
        {index >= 0 && (
          <span
            aria-hidden
            className="absolute top-1 bottom-1 left-1 rounded-xl bg-ink shadow-[0_6px_16px_rgb(19_27_46/0.25)] transition-transform duration-300 ease-out-soft motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.5rem) / ${ordered.length})`,
              transform: `translateX(${index * 100}%)`,
            }}
          />
        )}
        {ordered.map((f, i) => {
          const active = i === index;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              aria-label={`${t("floorN", { n: f.number })}${f.kind === "commercial" ? ` · ${t("shop")}` : ""}, ${t("freeCount", { count: f.free_count })}`}
              onClick={() => go(i)}
              className="relative z-10 flex h-11 flex-col items-center justify-center gap-1 rounded-xl"
            >
              {f.kind === "commercial" && (
                <Store
                  className={cn(
                    "absolute top-1 right-1 size-2.5",
                    active ? "text-gold" : "text-gold-deep",
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "font-display text-[15px] leading-none font-extrabold tabular-nums transition-colors",
                  active ? "text-gold" : "text-ink",
                )}
              >
                {f.number}
              </span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  f.free_count > 0 ? "bg-status-free-line" : "bg-mist/60",
                )}
              />
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-muted">
        <MoveHorizontal className="size-3.5" aria-hidden />
        {t("swipeHint")}
      </p>
    </fieldset>
  );
}
