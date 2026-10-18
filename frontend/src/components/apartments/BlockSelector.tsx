"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import type { Block } from "@/lib/types";

type Props = {
  blocks: Block[] | undefined;
  loading: boolean;
  value: string | null;
  onChange: (letter: string) => void;
};

/** Step 1 — block picker: a segmented row of letters with free counts. */
export function BlockSelector({ blocks, loading, value, onChange }: Props) {
  const t = useTranslations("apartments");

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 eyebrow text-mist">
        <span className="text-gold">01</span> · {t("stepBlock")}
      </legend>
      <div className="-mx-4 scrollbar-thin overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-2 md:grid md:min-w-0 md:grid-cols-12">
          {loading || !blocks
            ? Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} className="h-[72px] w-16 rounded-2xl bg-white/10 md:w-auto" />
              ))
            : blocks.map((b) => {
                const active = b.letter === value;
                const soldOut = b.free_count === 0;
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange(b.letter)}
                    aria-label={`${b.name}: ${t("freeCount", { count: b.free_count })}`}
                    className={cn(
                      "relative flex h-[72px] w-16 flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-300 md:w-auto",
                      active
                        ? "bg-gold text-on-gold shadow-glow"
                        : "bg-white/[0.05] text-white ring-1 ring-white/[0.08] hover:bg-white/10 hover:text-gold",
                    )}
                  >
                    <span className="font-display text-xl leading-none font-extrabold">
                      {b.letter}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        active ? "text-on-gold/70" : soldOut ? "text-[#fca5a5]" : "text-mist",
                      )}
                    >
                      {b.free_count} {t("freeShort")}
                    </span>
                  </button>
                );
              })}
        </div>
      </div>
    </fieldset>
  );
}
