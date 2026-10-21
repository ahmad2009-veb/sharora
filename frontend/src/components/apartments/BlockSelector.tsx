"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/Skeleton";
import { statusClasses } from "@/components/ui/status";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import type { Block } from "@/lib/types";

type Props = {
  blocks: Block[] | undefined;
  loading: boolean;
  value: string | null;
  onChange: (letter: string) => void;
};

/** Step 1 — block picker: one large tile per block with free / reserved / sold counts. */
export function BlockSelector({ blocks, loading, value, onChange }: Props) {
  const t = useTranslations("apartments");

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 eyebrow text-mist">
        <span className="text-gold">01</span> · {t("stepBlock")}
      </legend>
      {/* Phones: one segmented control, both blocks side by side with free counts. */}
      {blocks && !loading ? (
        <div
          className="relative grid rounded-2xl bg-white/[0.06] p-1 ring-1 ring-white/10 md:hidden"
          style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))` }}
        >
          {blocks.some((b) => b.letter === value) && (
            <span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 rounded-xl bg-gold shadow-glow transition-transform duration-300 ease-out-soft motion-reduce:transition-none"
              style={{
                width: `calc((100% - 0.5rem) / ${blocks.length})`,
                transform: `translateX(${blocks.findIndex((b) => b.letter === value) * 100}%)`,
              }}
            />
          )}
          {blocks.map((b) => {
            const active = b.letter === value;
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(b.letter)}
                className={cn(
                  "relative z-10 flex min-h-14 flex-col items-center justify-center rounded-xl px-2 py-2 transition-colors duration-300",
                  active ? "text-on-gold" : "text-white",
                )}
              >
                <span className="font-display text-lg leading-tight font-extrabold">
                  {t("blockN", { n: b.letter })}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-[13px] font-semibold tabular-nums",
                    active ? "text-on-gold/75" : "text-mist",
                  )}
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-status-free-line" />
                  {b.free_count} {t("freeShort")}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Skeleton className="h-16 rounded-2xl bg-white/10 md:hidden" />
      )}
      <div className="max-md:hidden">
        <div className="grid grid-cols-2 gap-3 md:max-w-xl">
          {loading || !blocks
            ? Array.from({ length: site.genplan.blocks.length }, (_, i) => (
                <Skeleton key={i} className="h-[92px] rounded-2xl bg-white/10" />
              ))
            : blocks.map((b) => {
                const active = b.letter === value;
                const counts = [
                  { status: "free", count: b.free_count, label: t("freeShort") },
                  { status: "reserved", count: b.reserved_count, label: t("reservedShort") },
                  { status: "sold", count: b.sold_count, label: t("soldShort") },
                ] as const;
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange(b.letter)}
                    className={cn(
                      "relative flex min-h-[92px] flex-col items-center justify-center gap-2.5 rounded-2xl px-2 py-3 transition-all duration-300",
                      active
                        ? "bg-gold text-on-gold shadow-glow"
                        : "bg-white/[0.05] text-white ring-1 ring-white/[0.08] hover:bg-white/10 hover:text-gold",
                    )}
                  >
                    <span className="font-display text-xl leading-none font-extrabold">
                      {t("blockN", { n: b.letter })}
                    </span>
                    <span
                      className={cn(
                        "flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs font-semibold tabular-nums",
                        active ? "text-on-gold/75" : "text-mist",
                      )}
                    >
                      {counts.map((c) => (
                        <span key={c.status} className="flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className={cn("size-2 rounded-full", statusClasses[c.status].dot)}
                          />
                          {c.count} {c.label}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
        </div>
      </div>
    </fieldset>
  );
}
